-- Additive deployment: install before deploying the new Vercel backend.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table if not exists private.store_admins (user_id uuid primary key references auth.users(id));
alter table private.store_admins enable row level security;
-- Preserve the one existing admin account; new signups do not become admins.
insert into private.store_admins(user_id) values ('157d5707-f831-4853-bc29-80e0d904a3da') on conflict do nothing;
create or replace function public.store_is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from private.store_admins where user_id = (select auth.uid()));
$$;
revoke all on function public.store_is_admin() from public, anon;
grant execute on function public.store_is_admin() to authenticated;

create table if not exists private.store_limits (
  user_id text not null, action text not null, window_start timestamptz not null, hits integer not null,
  primary key(user_id,action)
);
alter table private.store_limits enable row level security;
grant usage on schema private to service_role;
grant all on private.store_limits to service_role;
create or replace function public.store_rate_limit(p_user text,p_action text,p_limit integer,p_seconds integer)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare n integer;
begin
  insert into private.store_limits as l values(p_user,p_action,clock_timestamp(),1)
  on conflict(user_id,action) do update set
    hits = case when l.window_start < clock_timestamp()-make_interval(secs=>p_seconds) then 1 else l.hits+1 end,
    window_start = case when l.window_start < clock_timestamp()-make_interval(secs=>p_seconds) then clock_timestamp() else l.window_start end
  returning hits into n;
  return n<=p_limit;
end $$;
revoke all on function public.store_rate_limit(text,text,integer,integer) from public,anon,authenticated;
grant execute on function public.store_rate_limit(text,text,integer,integer) to service_role;

alter table public.china_requests alter column converted_to_order_id type text using converted_to_order_id::text;
alter table public.orders add column if not exists request_key uuid;
alter table public.orders add column if not exists stock_released boolean not null default false;
create unique index if not exists orders_user_request_key on public.orders(user_id,request_key);
create table if not exists private.store_outbox (
  id bigint generated always as identity primary key,
  event_key text unique not null, user_id text not null, order_id bigint,
  kind text not null, created_at timestamptz not null default now(), sent_at timestamptz,
  claimed_at timestamptz, attempts integer not null default 0
);
alter table private.store_outbox enable row level security;
grant all on private.store_outbox to service_role;
grant usage,select on all sequences in schema private to service_role;

create or replace function public.store_create_order(p_user text,p_payload jsonb,p_key uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  o public.orders%rowtype; r public.china_requests%rowtype; p public.products%rowtype;
  v public.product_variants%rowtype; item jsonb; items jsonb := '[]'; q integer;
  rate numeric; sale boolean; price numeric; subtotal numeric := 0; delivery numeric := 0; threshold numeric;
  special text; color_name text; delivery_method text := p_payload->>'delivery_method';
  payment_method text := p_payload->>'payment_method';
begin
  if p_user !~ '^[1-9][0-9]{0,15}$' or p_key is null then raise exception 'Invalid customer'; end if;
  perform pg_advisory_xact_lock(hashtextextended('store-user:'||p_user,0));
  select * into o from public.orders where user_id=p_user and request_key=p_key;
  if found then return to_jsonb(o); end if;
  if length(p_payload->>'client_name') not between 3 and 120
     or coalesce(p_payload->>'client_phone','') !~ '^\+998[0-9]{9}$'
     or delivery_method not in ('pickup','delivery') or payment_method not in ('online_card','upon_receipt')
     or p_payload->>'order_currency' not in ('USD','UZS')
     or (delivery_method='delivery' and (length(coalesce(p_payload->>'delivery_address','')) not between 5 and 500 or payment_method<>'online_card'))
     then raise exception 'Invalid order'; end if;
  if jsonb_typeof(p_payload->'items') is distinct from 'array' or jsonb_array_length(p_payload->'items') not between 1 and 50 then raise exception 'Invalid items'; end if;
  select (value->>'rate')::numeric into rate from public.settings where key='exchange_rate';
  if rate is null or rate<=0 then raise exception 'Exchange rate unavailable'; end if;
  select coalesce((value->>'enabled')::boolean,false) into sale from public.settings where key='sale_mode_enabled';
  special := nullif(p_payload->>'special_order_id','');
  if special is not null then
    if jsonb_array_length(p_payload->'items')<>1 or payment_method<>'online_card' then raise exception 'Invalid special order'; end if;
    select * into r from public.china_requests where id::text=special and user_id=p_user for update;
    if not found or r.status<>'Оценён' or r.manager_price is null or r.manager_price<=0 or r.converted_to_order_id is not null then raise exception 'Special order unavailable'; end if;
    subtotal:=r.manager_price;
    items:=jsonb_build_array(jsonb_build_object('productId','special-'||r.id,'name',coalesce(r.product_name,'Спецзаказ №'||r.id),
      'size',coalesce(r.size_color,'—'),'quantity',1,'priceUsd',r.manager_price,'priceUzs',round(r.manager_price*rate),
      'image',r.image_url,'isSpecialOrder',true,'specialRequestId',r.id));
  else
    -- Stable lock ordering prevents deadlocks between overlapping carts.
    for item in select value from jsonb_array_elements(p_payload->'items') order by value->>'productId',value->>'size',value->>'colorId' loop
      if jsonb_typeof(item->'quantity') is distinct from 'number' or (item->>'quantity') !~ '^[1-9][0-9]{0,2}$' then raise exception 'Invalid quantity'; end if;
      q:=(item->>'quantity')::integer;
      if q>99 then raise exception 'Invalid quantity'; end if;
      if coalesce((item->>'isSpecialOrder')::boolean,false) then raise exception 'Invalid item'; end if;
      select * into p from public.products where id::text=item->>'productId' and is_active=true for share;
      if not found then raise exception 'Product unavailable'; end if;
      if not exists(select 1 from public.categories where id=p.category and is_active)
        or (p.subcategory is not null and not exists(select 1 from public.subcategories where id=p.subcategory and is_active)) then raise exception 'Product unavailable'; end if;
      select * into strict v from public.product_variants where product_id=p.id and size_value=item->>'size'
        and color_id::text is not distinct from nullif(item->>'colorId','') for update;
      if v.stock<q then raise exception 'Not enough stock'; end if;
      update public.product_variants set stock=stock-q where id=v.id;
      price:=case when sale and p.sale_price>0 then p.sale_price else p.price_usd end;
      if price<0 then raise exception 'Invalid price'; end if;
      select name_ru into color_name from public.product_colors where id=v.color_id and product_id=p.id;
      subtotal:=subtotal+price*q;
      items:=items||jsonb_build_array(jsonb_build_object('productId',p.id,'variantId',v.id,'name',p.name_ru,'size',v.size_value,
        'colorId',v.color_id,'colorName',color_name,'quantity',q,'priceUsd',price,'priceUzs',round(price*rate),'image',p.images[1]));
    end loop;
  end if;
  if delivery_method='delivery' then
    select coalesce((value->>'price')::numeric,0) into delivery from public.settings where key='delivery_price';
    select coalesce((value->>'amount')::numeric,0) into threshold from public.settings where key='free_delivery_threshold';
    delivery:=coalesce(delivery,0);
    if threshold>0 and round(subtotal*rate)>=threshold then delivery:=0; end if;
  end if;
  if delivery<0 then raise exception 'Invalid delivery'; end if;
  -- Do not silently charge a different total from the checkout the customer reviewed.
  if p_payload->>'expected_total_usd' is null or abs((p_payload->>'expected_total_usd')::numeric-(subtotal+delivery/rate))>0.011 then raise exception 'Price changed'; end if;
  insert into public.orders(user_id,user_chat_id,client_name,client_phone,delivery_method,delivery_address,payment_method,
    total_price_usd,total_price_uzs,exchange_rate_at_order,order_currency,items,status,payment_status,special_order_id,request_key)
  values(p_user,p_user,p_payload->>'client_name',p_payload->>'client_phone',delivery_method,
    case when delivery_method='delivery' then p_payload->>'delivery_address' else null end,payment_method,
    round(subtotal+delivery/rate,2),round(subtotal*rate+delivery),rate,p_payload->>'order_currency',items,
    case when payment_method='online_card' then 'Ожидает оплаты' else 'Активный' end,'pending',special,p_key)
  returning * into o;
  if special is not null then update public.china_requests set converted_to_order_id=o.id::text,status='Ожидает оплаты' where id=r.id; end if;
  insert into private.store_outbox(event_key,user_id,order_id,kind) values('order:'||o.id,p_user,o.id,'order'),('order-client:'||o.id,p_user,o.id,'order_client');
  return to_jsonb(o);
end $$;
revoke all on function public.store_create_order(text,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.store_create_order(text,jsonb,uuid) to service_role;

create or replace function public.store_cancel_order(p_user text,p_order_id bigint,p_delete boolean default false)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare o public.orders%rowtype; item jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended('store-user:'||p_user,0));
  select * into o from public.orders where id=p_order_id and user_id=p_user for update;
  if not found then return false; end if;
  if o.status='Отменён' then return true; end if;
  if coalesce(o.payment_status,'pending')<>'pending' or o.paid_at is not null or o.status not in ('Ожидает оплаты','Активный') then return false; end if;
  if p_delete and o.payment_screenshot_url is not null then return false; end if;
  if not o.stock_released then
    for item in select value from jsonb_array_elements(o.items) order by value->>'productId',value->>'size',value->>'colorId' loop
      if not coalesce((item->>'isSpecialOrder')::boolean,false) then
        update public.product_variants set stock=stock+(item->>'quantity')::integer
        where product_id::text=item->>'productId' and size_value=item->>'size'
          and color_id::text is not distinct from nullif(item->>'colorId','');
      end if;
    end loop;
  end if;
  if o.special_order_id is not null then
    update public.china_requests set status='Оценён',converted_to_order_id=null
      where id::text=o.special_order_id and user_id=p_user and converted_to_order_id=o.id::text;
  end if;
  -- Keep a tombstone so retries of create/cancel cannot reserve/release stock twice.
  update public.orders set status='Отменён',payment_status='cancelled',stock_released=true where id=o.id;
  return true;
end $$;
revoke all on function public.store_cancel_order(text,bigint,boolean) from public,anon,authenticated;
grant execute on function public.store_cancel_order(text,bigint,boolean) to service_role;

create or replace function public.store_save_screenshot(p_user text,p_order_id bigint,p_path text)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('store-user:'||p_user,0));
  update public.orders set payment_screenshot_url=p_path where id=p_order_id and user_id=p_user
    and payment_status='pending' and payment_method='online_card' and status='Ожидает оплаты';
  return found;
end $$;
revoke all on function public.store_save_screenshot(text,bigint,text) from public,anon,authenticated;
grant execute on function public.store_save_screenshot(text,bigint,text) to service_role;

alter table public.china_requests add column if not exists request_key uuid;
create unique index if not exists china_user_request_key on public.china_requests(user_id,request_key);
create or replace function public.store_create_request(p_user text,p_payload jsonb,p_key uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare r public.china_requests%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended('store-user:'||p_user,0));
  select * into r from public.china_requests where user_id=p_user and request_key=p_key;
  if found then return to_jsonb(r); end if;
  insert into public.china_requests(user_id,product_name,link,size_color,comment,image_url,status,request_key)
  values(p_user,p_payload->>'product_name',coalesce(p_payload->>'link',''),p_payload->>'size_color',p_payload->>'comment',p_payload->>'image_url','На рассмотрении',p_key)
  returning * into r;
  insert into private.store_outbox(event_key,user_id,order_id,kind) values('request:'||r.id,p_user,r.id,'request');
  return to_jsonb(r);
end $$;
revoke all on function public.store_create_request(text,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.store_create_request(text,jsonb,uuid) to service_role;

create or replace function public.store_claim_notification(p_user text,p_kind text,p_id bigint)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare event private.store_outbox%rowtype;
begin
  update private.store_outbox set claimed_at=now(),attempts=attempts+1
  where user_id=p_user and kind=p_kind and order_id=p_id and sent_at is null and attempts<5
    and (claimed_at is null or claimed_at<now()-interval '5 minutes') returning * into event;
  return to_jsonb(event);
end $$;
revoke all on function public.store_claim_notification(text,text,bigint) from public,anon,authenticated;
grant execute on function public.store_claim_notification(text,text,bigint) to service_role;
create or replace function public.store_complete_notification(p_event_id bigint)
returns void language sql security invoker set search_path = '' as $$
  update private.store_outbox set sent_at=now() where id=p_event_id;
$$;
revoke all on function public.store_complete_notification(bigint) from public,anon,authenticated;
grant execute on function public.store_complete_notification(bigint) to service_role;
