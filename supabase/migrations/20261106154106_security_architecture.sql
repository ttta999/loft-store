-- Atomic catalogue writes and guarded order workflows. No historical payments are rewritten.
alter table public.products add column if not exists catalog_version bigint not null default 0;
alter table public.product_variants add constraint store_nonnegative_stock check (stock >= 0) not valid;
alter table public.product_variants validate constraint store_nonnegative_stock;

create or replace function public.store_admin_save_product(p_id uuid, p_product jsonb, p_colors jsonb, p_variants jsonb, p_expected jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare target uuid; c jsonb; v jsonb; color_map jsonb:='{}'; color_uuid uuid;
  keep_colors uuid[]:='{}'; keep_variants uuid[]:='{}'; variant_uuid uuid; actual jsonb; old_version bigint;
begin
  if not public.store_is_admin() then raise insufficient_privilege; end if;
  if jsonb_typeof(p_colors) is distinct from 'array' or jsonb_array_length(p_colors)>30
    or jsonb_typeof(p_variants) is distinct from 'array' or jsonb_array_length(p_variants)>600
    or length(btrim(p_product->>'name_ru')) not between 1 and 200
    or (p_product->>'price_usd')::numeric<=0 or (p_product->>'price_usd')::numeric::text in ('NaN','Infinity','-Infinity')
    or ((p_product->>'sale_price') is not null and ((p_product->>'sale_price')::numeric<=0 or (p_product->>'sale_price')::numeric >= (p_product->>'price_usd')::numeric))
    then raise exception 'Некорректные данные товара'; end if;
  if not exists(select 1 from public.subcategories where id=p_product->>'subcategory' and category_id=p_product->>'category') then
    raise exception 'Подкатегория не соответствует категории'; end if;
  if p_id is not null then
    select catalog_version into old_version from public.products where id=p_id for update;
    if not found then raise exception 'Товар недоступен'; end if;
    perform id from public.product_variants where product_id=p_id order by id for update;
    select coalesce(jsonb_agg(jsonb_build_object('id',id,'stock',stock) order by id),'[]') into actual from public.product_variants where product_id=p_id;
    if p_expected is null or p_expected->>'version' is distinct from old_version::text or p_expected->'variants' is distinct from actual then
      raise exception 'Товар или остатки изменились. Обновите список и откройте товар заново.'; end if;
    target:=p_id;
    update public.products set name_ru=p_product->>'name_ru',name_uz=coalesce(nullif(p_product->>'name_uz',''),p_product->>'name_ru'),
      description_ru=p_product->>'description_ru',description_uz=p_product->>'description_uz',category=p_product->>'category',
      subcategory=p_product->>'subcategory',brand=nullif(p_product->>'brand',''),price_usd=(p_product->>'price_usd')::numeric,
      sale_price=(p_product->>'sale_price')::numeric,images=array(select jsonb_array_elements_text(p_product->'images')),
      size_type=p_product->>'size_type',catalog_version=catalog_version+1 where id=target;
  else
    insert into public.products(name_ru,name_uz,description_ru,description_uz,category,subcategory,brand,price_usd,sale_price,images,size_type,is_active)
    values(p_product->>'name_ru',coalesce(nullif(p_product->>'name_uz',''),p_product->>'name_ru'),p_product->>'description_ru',p_product->>'description_uz',
      p_product->>'category',p_product->>'subcategory',nullif(p_product->>'brand',''),(p_product->>'price_usd')::numeric,(p_product->>'sale_price')::numeric,
      array(select jsonb_array_elements_text(p_product->'images')),p_product->>'size_type',true) returning id into target;
  end if;
  for c in select value from jsonb_array_elements(p_colors) loop
    if length(btrim(c->>'name_ru')) not between 1 and 100 or color_map ? (c->>'key') then raise exception 'Некорректный цвет'; end if;
    select id into color_uuid from public.product_colors where product_id=target and id::text=c->>'key';
    if color_uuid is null then
      insert into public.product_colors(product_id,name_ru,name_uz,hex_code,images,sort_order)
      values(target,c->>'name_ru',c->>'name_uz',c->>'hex_code',array(select jsonb_array_elements_text(c->'images')),(c->>'sort_order')::integer)
      returning id into color_uuid;
    else
      update public.product_colors set name_ru=c->>'name_ru',name_uz=c->>'name_uz',hex_code=c->>'hex_code',
        images=array(select jsonb_array_elements_text(c->'images')),sort_order=(c->>'sort_order')::integer where id=color_uuid;
    end if;
    color_map:=color_map||jsonb_build_object(c->>'key',color_uuid); keep_colors:=array_append(keep_colors,color_uuid);
  end loop;
  for v in select value from jsonb_array_elements(p_variants) loop
    if (v->>'stock') !~ '^[0-9]{1,7}$' or length(btrim(v->>'size_value')) not between 1 and 100 then raise exception 'Некорректный остаток'; end if;
    color_uuid:=null;
    if nullif(v->>'color_key','') is not null then
      color_uuid:=(color_map->>(v->>'color_key'))::uuid;
      if color_uuid is null then raise exception 'Некорректный цвет размера'; end if;
    end if;
    select id into variant_uuid from public.product_variants where product_id=target and size_value=v->>'size_value' and color_id is not distinct from color_uuid;
    if variant_uuid=any(keep_variants) then raise exception 'Повторяющийся размер'; end if;
    if variant_uuid is null then
      insert into public.product_variants(product_id,color_id,size_value,stock) values(target,color_uuid,v->>'size_value',(v->>'stock')::integer) returning id into variant_uuid;
    else update public.product_variants set stock=(v->>'stock')::integer where id=variant_uuid;
    end if;
    keep_variants:=array_append(keep_variants,variant_uuid);
  end loop;
  -- A reserved variant must survive editing, even when its available stock is zero.
  for v in select to_jsonb(pv) from public.product_variants pv where product_id=target and not(id=any(keep_variants)) loop
    if exists(select 1 from public.orders o cross join lateral jsonb_array_elements(o.items) i
      where not o.stock_released and o.status<>'Отменён' and i->>'productId'=target::text
      and i->>'size'=v->>'size_value' and nullif(i->>'colorId','') is not distinct from nullif(v->>'color_id','')) then
      if v->>'color_id' is not null and not((v->>'color_id')::uuid=any(keep_colors)) then
        raise exception 'Цвет используется в действующем заказе. Сначала завершите или отмените заказ.'; end if;
      update public.product_variants set stock=0 where id=(v->>'id')::uuid;
    else delete from public.product_variants where id=(v->>'id')::uuid;
    end if;
  end loop;
  delete from public.product_colors where product_id=target and not(id=any(keep_colors));
  return target;
end $$;
revoke all on function public.store_admin_save_product(uuid,jsonb,jsonb,jsonb,jsonb) from public,anon;
grant execute on function public.store_admin_save_product(uuid,jsonb,jsonb,jsonb,jsonb) to authenticated;

create or replace function public.store_admin_product_visibility(p_id uuid,p_active boolean)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  if not public.store_is_admin() then raise insufficient_privilege; end if;
  update public.products set is_active=p_active,catalog_version=catalog_version+1 where id=p_id;
  return found;
end $$;
revoke all on function public.store_admin_product_visibility(uuid,boolean) from public,anon;
grant execute on function public.store_admin_product_visibility(uuid,boolean) to authenticated;

create or replace function public.store_admin_order_status(p_id bigint,p_status text,p_courier text default null,p_notice jsonb default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.orders%rowtype; allowed text[]; cancelled jsonb;
begin
  if not public.store_is_admin() then raise insufficient_privilege; end if;
  if p_status='Отменён' then
    cancelled:=public.store_admin_cancel_order(p_id);
    if cancelled is not null then perform private.store_admin_notice(cancelled->>'user_id',p_notice); end if;
    return cancelled;
  end if;
  select * into o from public.orders where id=p_id;
  if not found then raise exception 'Заказ недоступен'; end if;
  perform pg_advisory_xact_lock(hashtextextended('store-user:'||o.user_id,0));
  select * into o from public.orders where id=p_id for update;
  if o.status=p_status then perform private.store_admin_notice(o.user_id,p_notice); return to_jsonb(o); end if;
  if o.status='Отменён' or o.stock_released or o.payment_status in ('cancelled','refund_pending') then raise exception 'Отменённый заказ нельзя возобновить'; end if;
  if o.payment_method='online_card' and (o.payment_status is distinct from 'paid' or o.paid_at is null) then raise exception 'Сначала подтвердите оплату'; end if;
  allowed:=case o.status when 'Активный' then array['В обработке','Готов','Выдан'] when 'В обработке' then array['Готов','Выдан'] when 'Готов' then array['Выдан'] when 'Выдан' then array['Доставлен'] else array[]::text[] end;
  if not p_status=any(allowed) or (p_status='Доставлен' and o.delivery_method<>'delivery') then raise exception 'Недопустимый переход статуса'; end if;
  if p_status='Выдан' and o.delivery_method='delivery' and (p_courier is null or p_courier !~ '^https?://' or length(p_courier)>2000) then raise exception 'Укажите ссылку курьера'; end if;
  update public.orders set status=p_status,courier_link=coalesce(p_courier,courier_link),
    payment_status=case when o.payment_method='upon_receipt' and p_status='Выдан' then 'paid' else payment_status end,
    paid_at=case when o.payment_method='upon_receipt' and p_status='Выдан' then coalesce(paid_at,now()) else paid_at end,
    payment_provider=case when o.payment_method='upon_receipt' and p_status='Выдан' then 'manual' else payment_provider end
    where id=p_id returning * into o;
  perform private.store_admin_notice(o.user_id,p_notice);
  return to_jsonb(o);
end $$;
revoke all on function public.store_admin_order_status(bigint,text,text,jsonb) from public,anon;
grant execute on function public.store_admin_order_status(bigint,text,text,jsonb) to authenticated;

create or replace function public.store_admin_request_status(p_id bigint,p_status text,p_extra jsonb default '{}',p_notice jsonb default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.china_requests%rowtype;
begin
  if not public.store_is_admin() then raise insufficient_privilege; end if;
  select * into r from public.china_requests where id=p_id;
  if not found then raise exception 'Спецзаказ недоступен'; end if;
  perform pg_advisory_xact_lock(hashtextextended('store-user:'||r.user_id,0));
  select * into r from public.china_requests where id=p_id for update;
  if r.converted_to_order_id is not null or r.status not in ('На рассмотрении','Оценён') or p_status not in ('Оценён','Отклонён') then raise exception 'Спецзаказ уже изменён'; end if;
  if p_status='Оценён' and (coalesce((p_extra->>'manager_price')::numeric,0)<=0 or (p_extra->>'manager_price')::numeric::text in ('NaN','Infinity','-Infinity')) then raise exception 'Укажите корректную цену'; end if;
  update public.china_requests set status=p_status,manager_price=case when p_status='Оценён' then (p_extra->>'manager_price')::numeric else manager_price end,
    manager_comment=left(p_extra->>'manager_comment',2000) where id=p_id returning * into r;
  perform private.store_admin_notice(r.user_id,p_notice);
  return to_jsonb(r);
end $$;
revoke all on function public.store_admin_request_status(bigint,text,jsonb,jsonb) from public,anon;
grant execute on function public.store_admin_request_status(bigint,text,jsonb,jsonb) to authenticated;

-- All admin writes affecting inventory or money must go through the checked transactions above.
-- Legacy grants are revoked by the enforcement migration after both deployments are healthy.

create or replace function public.store_admin_delete_product(p_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  if not public.store_is_admin() then raise insufficient_privilege; end if;
  perform id from public.products where id=p_id for update;
  if exists(select 1 from public.orders o cross join lateral jsonb_array_elements(o.items)i where not o.stock_released and i->>'productId'=p_id::text) then
    raise exception 'Товар используется в заказах. Скройте его вместо удаления.'; end if;
  delete from public.products where id=p_id;
  return found;
end $$;
revoke all on function public.store_admin_delete_product(uuid) from public,anon;
grant execute on function public.store_admin_delete_product(uuid) to authenticated;

-- Private, revocable customer sessions. Only the server stores a hash, never the bearer token.
create table private.store_sessions(token_hash text primary key check(token_hash ~ '^[a-f0-9]{64}$'),user_id text not null,expires_at timestamptz not null,revoked_at timestamptz);
alter table private.store_sessions enable row level security;
revoke all on private.store_sessions from public,anon,authenticated;
grant select,insert,update,delete on private.store_sessions to service_role;
create or replace function public.store_register_session(p_hash text,p_user text)
returns void language sql security invoker set search_path='' as $$
  insert into private.store_sessions(token_hash,user_id,expires_at) values(p_hash,p_user,now()+interval '12 hours') on conflict do nothing;
$$;
create or replace function public.store_validate_session(p_hash text,p_user text)
returns boolean language sql stable security invoker set search_path='' as $$
  select exists(select 1 from private.store_sessions where token_hash=p_hash and user_id=p_user and revoked_at is null and expires_at>now());
$$;
create or replace function public.store_admin_revoke_customer_sessions(p_user text)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.store_is_admin() then raise insufficient_privilege; end if;
  update private.store_sessions set revoked_at=now() where user_id=p_user and revoked_at is null;
end $$;
revoke all on function public.store_register_session(text,text),public.store_validate_session(text,text) from public,anon,authenticated;
grant execute on function public.store_register_session(text,text),public.store_validate_session(text,text) to service_role;
revoke all on function public.store_admin_revoke_customer_sessions(text) from public,anon;
grant execute on function public.store_admin_revoke_customer_sessions(text) to authenticated;

alter table public.orders add column if not exists receipt_submitted_at timestamptz;
create or replace function public.store_save_screenshot(p_user text,p_order_id bigint,p_path text)
returns boolean language plpgsql security invoker set search_path='' as $$
declare submitted timestamptz:=clock_timestamp();
begin
  perform pg_advisory_xact_lock(hashtextextended('store-user:'||p_user,0));
  update public.orders set payment_screenshot_url=p_path,
    receipt_submitted_at=coalesce(receipt_submitted_at,submitted),
    reservation_expires_at=coalesce(receipt_submitted_at,submitted)+interval '24 hours'
    where id=p_order_id and user_id=p_user and payment_status='pending' and payment_method='online_card' and status='Ожидает оплаты'
    and (reservation_expires_at is null or reservation_expires_at>clock_timestamp());
  return found;
end $$;
revoke all on function public.store_save_screenshot(text,bigint,text) from public,anon,authenticated;
grant execute on function public.store_save_screenshot(text,bigint,text) to service_role;

create table private.store_uploads(path text primary key,user_id text not null,bucket text not null check(bucket in ('payment-screenshots','china-requests')),
  bytes integer not null check(bytes between 1 and 2097152),created_at timestamptz not null default now(),uploaded boolean not null default false,deleting boolean not null default false);
alter table private.store_uploads enable row level security;
revoke all on private.store_uploads from public,anon,authenticated;
grant all on private.store_uploads to service_role;
create index store_upload_customer on private.store_uploads(user_id,created_at);
create or replace function public.store_reserve_upload(p_user text,p_bucket text,p_path text,p_bytes integer)
returns boolean language plpgsql security invoker set search_path='' as $$
declare daily bigint; total bigint;
begin
  if p_path not like p_user||'/%' or p_path like '%..%' then return false; end if;
  perform pg_advisory_xact_lock(hashtextextended('store-upload:'||p_user,0));
  select coalesce(sum(bytes),0) into daily from private.store_uploads where user_id=p_user and created_at>now()-interval '24 hours';
  select coalesce(sum((metadata->>'size')::bigint),0) into total from storage.objects where bucket_id in ('payment-screenshots','china-requests') and name like p_user||'/%';
  total:=total+(select coalesce(sum(bytes),0) from private.store_uploads where user_id=p_user and not uploaded);
  if daily+p_bytes>52428800 or total+p_bytes>209715200 then return false; end if;
  insert into private.store_uploads(path,user_id,bucket,bytes) values(p_path,p_user,p_bucket,p_bytes);
  return true;
end $$;
create or replace function public.store_finish_upload(p_user text,p_path text,p_success boolean)
returns void language plpgsql security invoker set search_path='' as $$
begin
  if p_success then update private.store_uploads set uploaded=true where path=p_path and user_id=p_user;
  else delete from private.store_uploads where path=p_path and user_id=p_user;
  end if;
end $$;
revoke all on function public.store_reserve_upload(text,text,text,integer),public.store_finish_upload(text,text,boolean) from public,anon,authenticated;
grant execute on function public.store_reserve_upload(text,text,text,integer),public.store_finish_upload(text,text,boolean) to service_role;

-- Product images are public, but upload permission still requires the verified admin.
update storage.buckets set file_size_limit=10485760,allowed_mime_types=array['image/jpeg','image/png','image/webp','image/avif'] where id='product-images';

-- Hide unpublished catalogue data in the database, including parent-category visibility.
drop policy catalog_read on public.categories;
create policy catalog_read on public.categories for select to anon,authenticated using (is_active=true);
drop policy catalog_read on public.subcategories;
create policy catalog_read on public.subcategories for select to anon,authenticated using (is_active=true and exists(select 1 from public.categories c where c.id=category_id and c.is_active));
drop policy catalog_read on public.brands;
create policy catalog_read on public.brands for select to anon,authenticated using (is_active=true);
drop policy catalog_read on public.products;
create policy catalog_read on public.products for select to anon,authenticated using (is_active=true and exists(select 1 from public.categories c where c.id=category and c.is_active)
  and (subcategory is null or exists(select 1 from public.subcategories s where s.id=subcategory and s.is_active)));
drop policy catalog_read on public.product_colors;
create policy catalog_read on public.product_colors for select to anon,authenticated using (exists(select 1 from public.products p where p.id=product_id));
drop policy catalog_read on public.product_variants;
create policy catalog_read on public.product_variants for select to anon,authenticated using (exists(select 1 from public.products p where p.id=product_id));

-- Counts used by the storefront represent completed payment, not unpaid reservations.
create or replace function public.get_product_popularity()
returns table(product_id text,sold_count bigint) language sql stable security definer set search_path='' as $$
  select item->>'productId',sum((item->>'quantity')::bigint)
  from public.orders o cross join lateral jsonb_array_elements(case when jsonb_typeof(items)='array' then items else '[]'::jsonb end)item
  where o.status in ('Активный','В обработке','Готов','Выдан','Доставлен') and o.payment_status='paid' and o.paid_at is not null
    and coalesce(item->>'isSpecialOrder','false')='false' and item->>'quantity' ~ '^[1-9][0-9]{0,2}$'
    and exists(select 1 from public.products p where p.id::text=item->>'productId' and p.is_active)
  group by item->>'productId';
$$;
revoke all on function public.get_product_popularity() from public;
grant execute on function public.get_product_popularity() to anon,authenticated,service_role;



-- Publish availability, not the exact inventory count. Admin reads remain MFA-gated.
-- Legacy grants are revoked by the enforcement migration after both deployments are healthy.
create or replace function public.store_available_sizes(p_product uuid,p_color uuid default null)
returns table(size_value text,color_id uuid) language sql stable security definer set search_path='' as $$
  select v.size_value,v.color_id from public.product_variants v join public.products p on p.id=v.product_id
  where p.id=p_product and p.is_active and v.stock>0 and v.color_id is not distinct from p_color
    and exists(select 1 from public.categories c where c.id=p.category and c.is_active)
    and (p.subcategory is null or exists(select 1 from public.subcategories s where s.id=p.subcategory and s.is_active));
$$;
create or replace function public.store_product_available(p_product uuid,p_size text,p_quantity integer,p_color uuid default null)
returns boolean language sql stable security definer set search_path='' as $$
  select p_quantity between 1 and 99 and exists(select 1 from public.product_variants v join public.products p on p.id=v.product_id
    where p.id=p_product and p.is_active and v.size_value=p_size and v.color_id is not distinct from p_color and v.stock>=p_quantity
      and exists(select 1 from public.categories c where c.id=p.category and c.is_active)
      and (p.subcategory is null or exists(select 1 from public.subcategories s where s.id=p.subcategory and s.is_active)));
$$;
create or replace function public.store_admin_variants()
returns setof public.product_variants language plpgsql stable security definer set search_path='' as $$
begin
  if not public.store_is_admin() then raise insufficient_privilege; end if;
  return query select * from public.product_variants order by id;
end $$;
revoke all on function public.store_available_sizes(uuid,uuid),public.store_product_available(uuid,text,integer,uuid) from public;
grant execute on function public.store_available_sizes(uuid,uuid),public.store_product_available(uuid,text,integer,uuid) to anon,authenticated;
revoke all on function public.store_admin_variants() from public,anon;
grant execute on function public.store_admin_variants() to authenticated;

-- The maintenance bearer is generated in Vault and never placed in source or a client bundle.
create extension if not exists pg_net with schema extensions;
do $$ begin
  if not exists(select 1 from vault.secrets where name='loft_maintenance_bearer') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'),'loft_maintenance_bearer');
  end if;
end $$;
create or replace function public.store_worker_authorized(p_token text)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from vault.decrypted_secrets where name='loft_maintenance_bearer' and decrypted_secret=p_token);
$$;
revoke all on function public.store_worker_authorized(text) from public,anon,authenticated;
grant execute on function public.store_worker_authorized(text) to service_role;
create or replace function private.store_wake_worker()
returns void language plpgsql security definer set search_path='' as $$
begin
  perform net.http_post(url:='https://loft-store-24bz.vercel.app/api/maintenance',
    headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='loft_maintenance_bearer')),
    body:='{}'::jsonb,timeout_milliseconds:=30000);
end $$;
revoke all on function private.store_wake_worker() from public,anon,authenticated,service_role;
create or replace function public.store_wake_worker()
returns void language sql security definer set search_path='' as $$ select private.store_wake_worker(); $$;
revoke all on function public.store_wake_worker() from public,anon,authenticated;
grant execute on function public.store_wake_worker() to service_role;

alter table private.store_outbox add column if not exists payload jsonb;
grant select on private.store_admins to service_role;
create or replace function public.store_pending_notifications()
returns setof private.store_outbox language sql security invoker set search_path='' as $$
  select * from private.store_outbox where sent_at is null and (claimed_at is null or claimed_at<now()-make_interval(secs=>least(3600,greatest(60,attempts*60)))) order by id limit 10;
$$;
revoke all on function public.store_pending_notifications() from public,anon,authenticated;
grant execute on function public.store_pending_notifications() to service_role;
create or replace function public.store_queue_admin_message(p_actor uuid,p_user text,p_message text,p_key uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare event private.store_outbox%rowtype;
begin
  if not exists(select 1 from private.store_admins where user_id=p_actor) or length(p_message) not between 1 and 4000
    or not(exists(select 1 from public.orders where user_id=p_user) or exists(select 1 from public.china_requests where user_id=p_user)) then raise insufficient_privilege; end if;
  insert into private.store_outbox(event_key,user_id,kind,payload) values('admin:'||p_actor||':'||p_key,p_user,'custom',jsonb_build_object('message',p_message))
    on conflict(event_key) do update set event_key=excluded.event_key returning * into event;
  return to_jsonb(event);
end $$;
revoke all on function public.store_queue_admin_message(uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function public.store_queue_admin_message(uuid,text,text,uuid) to service_role;
create or replace function public.store_claim_custom_notification(p_id bigint)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare event private.store_outbox%rowtype;
begin
  update private.store_outbox set claimed_at=now(),attempts=attempts+1 where id=p_id and kind='custom' and sent_at is null
    and (claimed_at is null or claimed_at<now()-make_interval(secs=>least(3600,greatest(60,attempts*60)))) returning * into event;
  return to_jsonb(event);
end $$;
revoke all on function public.store_claim_custom_notification(bigint) from public,anon,authenticated;
grant execute on function public.store_claim_custom_notification(bigint) to service_role;

create table private.store_notification_config(key text primary key,value text not null);
alter table private.store_notification_config enable row level security;
revoke all on private.store_notification_config from public,anon,authenticated;
grant select on private.store_notification_config to service_role;
create or replace function public.store_manager_chat()
returns text language sql stable security invoker set search_path='' as $$ select value from private.store_notification_config where key='manager_chat_id'; $$;
revoke all on function public.store_manager_chat() from public,anon,authenticated;
grant execute on function public.store_manager_chat() to service_role;

-- Public Supabase signup is not used by Telegram customers. Restrict user creation to
-- explicitly invited email hashes without changing existing login/MFA or the visual login form.
create table private.store_registration_invites(email_hash text primary key,expires_at timestamptz not null);
alter table private.store_registration_invites enable row level security;
revoke all on private.store_registration_invites from public,anon,authenticated,service_role;
create or replace function public.store_admin_allow_registration(p_email text)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.store_is_admin() then raise insufficient_privilege; end if;
  if length(p_email)>254 or p_email !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' then raise exception 'Invalid email'; end if;
  insert into private.store_registration_invites(email_hash,expires_at) values(encode(extensions.digest(lower(btrim(p_email)),'sha256'),'hex'),now()+interval '24 hours')
    on conflict(email_hash) do update set expires_at=excluded.expires_at;
end $$;
revoke all on function public.store_admin_allow_registration(text) from public,anon;
grant execute on function public.store_admin_allow_registration(text) to authenticated;
create or replace function private.store_guard_registration()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from private.store_registration_invites where email_hash=encode(extensions.digest(lower(btrim(new.email)),'sha256'),'hex') and expires_at>now()) then
    raise exception 'Public registration is disabled'; end if;
  return new;
end $$;
revoke all on function private.store_guard_registration() from public,anon,authenticated,service_role;
create trigger store_registration_guard before insert on auth.users for each row execute function private.store_guard_registration();

create or replace function private.store_file_referenced(p_bucket text,p_name text)
returns boolean language sql stable security invoker set search_path='' as $$
  select exists(select 1 from public.orders o where o.payment_screenshot_url='private:'||p_bucket||'/'||p_name or o.payment_screenshot_url like '%/object/public/'||p_bucket||'/'||p_name)
    or exists(select 1 from public.china_requests r where r.image_url='private:'||p_bucket||'/'||p_name or r.image_url like '%/object/public/'||p_bucket||'/'||p_name)
    or exists(select 1 from public.orders o cross join lateral jsonb_array_elements(o.items)i where i->>'image'='private:'||p_bucket||'/'||p_name or i->>'image' like '%/object/public/'||p_bucket||'/'||p_name);
$$;
revoke all on function private.store_file_referenced(text,text) from public,anon,authenticated;
grant execute on function private.store_file_referenced(text,text) to service_role;
create or replace function public.store_orphan_files()
returns table(bucket_id text,name text) language plpgsql security invoker set search_path='' as $$
declare f record;
begin
  for f in select o.bucket_id,o.name from storage.objects o join private.store_uploads u on u.path=o.name and u.bucket=o.bucket_id where o.bucket_id in ('payment-screenshots','china-requests') and o.created_at<now()-interval '24 hours'
    and not private.store_file_referenced(o.bucket_id,o.name) order by o.created_at limit 20 loop
    if not pg_try_advisory_xact_lock(hashtextextended('store-upload:'||split_part(f.name,'/',1),0)) then continue; end if;
    if private.store_file_referenced(f.bucket_id,f.name) then continue; end if;
    update private.store_uploads u set deleting=true where u.path=f.name and u.bucket=f.bucket_id;
    bucket_id:=f.bucket_id; name:=f.name; return next;
  end loop;
end $$;
revoke all on function public.store_orphan_files() from public,anon,authenticated;
grant execute on function public.store_orphan_files() to service_role;

create or replace function private.store_housekeeping()
returns void language plpgsql security invoker set search_path='' as $$
begin
  delete from private.store_sessions where expires_at<now()-interval '1 day';
  delete from private.store_limits where window_start<now()-interval '7 days';
  delete from private.store_uploads u where created_at<now()-interval '24 hours' and not exists(select 1 from storage.objects f where f.bucket_id=u.bucket and f.name=u.path);
  perform private.store_wake_worker();
end $$;
revoke all on function private.store_housekeeping() from public,anon,authenticated,service_role;
-- Enable only after the matching application deployment is healthy.
select cron.schedule('loft-maintenance','* * * * *','select private.store_housekeeping();');
select cron.alter_job((select jobid from cron.job where jobname='loft-maintenance'),active:=false);

create or replace function private.store_expire_reservations(p_user text default null)
returns integer language plpgsql security invoker set search_path = '' as $$
declare candidate record; current_order public.orders%rowtype; expired integer:=0;
begin
  -- One worker at a time; request-time cleanup must not wait while holding customer locks.
  if not pg_try_advisory_xact_lock(hashtextextended('store-reservation-worker',0)) then return 0; end if;
  for candidate in select id,user_id from public.orders
    where reservation_expires_at<=clock_timestamp() and payment_method='online_card' and payment_status='pending'
      and status='Ожидает оплаты' and stock_released=false
      and (p_user is null or user_id=p_user)
    order by user_id,id limit 100
  loop
    begin
    -- Acquire customer lock before order/variant locks, matching cancellation and receipt upload.
    if not pg_try_advisory_xact_lock(hashtextextended('store-user:'||candidate.user_id,0)) then continue; end if;
    select * into current_order from public.orders where id=candidate.id for update;
    if current_order.reservation_expires_at<=clock_timestamp() and current_order.payment_method='online_card'
      and current_order.payment_status='pending' and current_order.status='Ожидает оплаты'
      and not current_order.stock_released then
      -- Never wait for variant locks while retaining locks from an earlier expired order.
      -- A busy cart is retried on the next tick; other checkouts can continue.
      perform v.id from public.product_variants v
        where exists(select 1 from jsonb_array_elements(current_order.items) i
          where coalesce(i->>'isSpecialOrder','false')='false'
            and v.product_id::text=i->>'productId' and v.size_value=i->>'size'
            and v.color_id::text is not distinct from nullif(i->>'colorId',''))
        order by v.product_id,v.size_value,v.color_id for update nowait;
      if public.store_cancel_order(candidate.user_id,candidate.id,false) then
        update public.orders set reservation_expired_at=clock_timestamp() where id=candidate.id;
        expired:=expired+1;
      end if;
    end if;
    exception when lock_not_available then null;
    end;
  end loop;
  return expired;
end $$;
revoke all on function private.store_expire_reservations(text) from public,anon,authenticated;
grant execute on function private.store_expire_reservations(text) to service_role;

create or replace function public.store_create_request(p_user text,p_payload jsonb,p_key uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare r public.china_requests%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended('store-user:'||p_user,0));
  select * into r from public.china_requests where user_id=p_user and request_key=p_key;
  if found then return to_jsonb(r); end if;
  if (select count(*) from public.china_requests where user_id=p_user and status in ('На рассмотрении','Оценён','Ожидает оплаты'))>=5
    or (select count(*) from public.china_requests where user_id=p_user and created_at>now()-interval '24 hours')>=30 then raise exception 'Лимит заявок исчерпан'; end if;
  perform pg_advisory_xact_lock(hashtextextended('store-upload:'||p_user,0));
  if nullif(p_payload->>'image_url','') is not null and not exists(select 1 from storage.objects f where f.bucket_id='china-requests'
    and 'private:china-requests/'||f.name=p_payload->>'image_url' and f.name like p_user||'/%'
    and not exists(select 1 from private.store_uploads u where u.path=f.name and u.bucket=f.bucket_id and (not u.uploaded or u.deleting))) then raise exception 'Изображение недоступно. Загрузите его заново.'; end if;
  insert into public.china_requests(user_id,product_name,link,size_color,comment,image_url,status,request_key)
  values(p_user,p_payload->>'product_name',coalesce(p_payload->>'link',''),p_payload->>'size_color',p_payload->>'comment',p_payload->>'image_url','На рассмотрении',p_key)
  returning * into r;
  insert into private.store_outbox(event_key,user_id,order_id,kind) values('request:'||r.id,p_user,r.id,'request');
  return to_jsonb(r);
end $$;
revoke all on function public.store_create_request(text,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.store_create_request(text,jsonb,uuid) to service_role;

-- Transactional notifications: state and its message commit together. The immediate
-- HTTP sender and background worker share the same event key and claim protocol.
create or replace function private.store_admin_notice(p_user text,p_notice jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare message text; key uuid;
begin
  if p_notice is null then return; end if;
  if not public.store_is_admin() then raise insufficient_privilege; end if;
  message:=regexp_replace(p_notice->>'message','</?(b|i|u|s|code|pre)>','','g'); key:=(p_notice->>'key')::uuid;
  if message is null or length(btrim(message)) not between 1 and 4000 or key is null then raise exception 'Invalid notification'; end if;
  insert into private.store_outbox(event_key,user_id,kind,payload) values('admin:'||auth.uid()||':'||key,p_user,'custom',jsonb_build_object('message',message)) on conflict(event_key) do nothing;
  perform private.store_wake_worker();
end $$;
revoke all on function private.store_admin_notice(text,jsonb) from public,anon,authenticated,service_role;
create or replace function public.store_admin_confirm_payment_with_notice(p_order_id bigint,p_notice jsonb default null)
returns boolean language plpgsql security definer set search_path='' as $$
declare owner_id text;
begin
  if not public.store_is_admin() then raise insufficient_privilege; end if;
  if not public.store_admin_confirm_payment(p_order_id) then return false; end if;
  select user_id into owner_id from public.orders where id=p_order_id;
  perform private.store_admin_notice(owner_id,p_notice);
  return true;
end $$;
revoke all on function public.store_admin_confirm_payment_with_notice(bigint,jsonb) from public,anon;
grant execute on function public.store_admin_confirm_payment_with_notice(bigint,jsonb) to authenticated;

create or replace function public.store_claim_notification(p_user text,p_kind text,p_id bigint)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare event private.store_outbox%rowtype;
begin
  update private.store_outbox set claimed_at=now(),attempts=attempts+1
  where user_id=p_user and kind=p_kind and order_id=p_id and sent_at is null
    and (claimed_at is null or claimed_at<now()-make_interval(secs=>least(3600,greatest(60,attempts*60)))) returning * into event;
  return to_jsonb(event);
end $$;
revoke all on function public.store_claim_notification(text,text,bigint) from public,anon,authenticated;
grant execute on function public.store_claim_notification(text,text,bigint) to service_role;

-- Public popularity reads must not aggregate the private orders table on every visit.
create table public.product_popularity(product_id uuid primary key references public.products(id) on delete cascade,sold_count bigint not null check(sold_count>=0));
alter table public.product_popularity enable row level security;
revoke all on public.product_popularity from public,anon,authenticated;
grant select on public.product_popularity to anon,authenticated,service_role;
create policy catalog_read on public.product_popularity for select to anon,authenticated using (exists(select 1 from public.products p where p.id=product_id));
lock table public.orders in share row exclusive mode;
insert into public.product_popularity(product_id,sold_count)
select p.id,sum((i->>'quantity')::bigint) from public.orders o cross join lateral jsonb_array_elements(o.items)i join public.products p on p.id::text=i->>'productId'
where o.status in ('Активный','В обработке','Готов','Выдан','Доставлен') and o.payment_status='paid' and o.paid_at is not null
  and coalesce(i->>'isSpecialOrder','false')='false' and i->>'quantity' ~ '^[1-9][0-9]{0,2}$' group by p.id;
create or replace function private.store_update_popularity()
returns trigger language plpgsql security definer set search_path='' as $$
declare previous jsonb:='[]'; current_items jsonb:='[]'; delta record;
begin
  if tg_op<>'INSERT' and old.payment_status='paid' and old.paid_at is not null and old.status in ('Активный','В обработке','Готов','Выдан','Доставлен') then previous:=old.items; end if;
  if tg_op<>'DELETE' and new.payment_status='paid' and new.paid_at is not null and new.status in ('Активный','В обработке','Готов','Выдан','Доставлен') then current_items:=new.items; end if;
  for delta in select p.id,sum(x.quantity)::bigint as quantity from (
    select i->>'productId' as id,-(i->>'quantity')::bigint as quantity from jsonb_array_elements(previous)i where coalesce(i->>'isSpecialOrder','false')='false' and i->>'quantity' ~ '^[1-9][0-9]{0,2}$'
    union all select i->>'productId',(i->>'quantity')::bigint from jsonb_array_elements(current_items)i where coalesce(i->>'isSpecialOrder','false')='false' and i->>'quantity' ~ '^[1-9][0-9]{0,2}$'
  )x join public.products p on p.id::text=x.id group by p.id having sum(x.quantity)<>0 order by p.id loop
    insert into public.product_popularity(product_id,sold_count) values(delta.id,greatest(0,delta.quantity))
      on conflict(product_id) do update set sold_count=greatest(0,public.product_popularity.sold_count+delta.quantity);
  end loop;
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;
revoke all on function private.store_update_popularity() from public,anon,authenticated,service_role;
create trigger store_popularity_counter after insert or update or delete on public.orders for each row execute function private.store_update_popularity();
create or replace function public.get_product_popularity()
returns table(product_id text,sold_count bigint) language sql stable security invoker set search_path='' as $$
  select p.product_id::text,p.sold_count from public.product_popularity p where p.sold_count>0;
$$;
revoke all on function public.get_product_popularity() from public;
grant execute on function public.get_product_popularity() to anon,authenticated,service_role;

-- Queued request headers contain the maintenance bearer. They are not a public API.
revoke all on all tables in schema net from public,anon,authenticated,service_role;
revoke all on vault.decrypted_secrets from public,anon,authenticated,service_role;
do $$ declare f record; begin
  for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='net' and p.proname in ('http_get','http_post','http_delete') loop
    execute format('revoke all on function %s from public,anon,authenticated,service_role',f.signature);
  end loop;
end $$;
