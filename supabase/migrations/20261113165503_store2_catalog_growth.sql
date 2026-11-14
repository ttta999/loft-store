create table public.product_recommendations (
 product_id uuid not null references public.products(id) on delete cascade,
 target_id uuid not null references public.products(id) on delete cascade,
 kind text not null check(kind in ('similar','outfit')), position integer not null check(position between 0 and 11),
 primary key(product_id,kind,target_id),unique(product_id,kind,position),check(product_id<>target_id)
);
create index product_recommendations_target on public.product_recommendations(target_id);
alter table public.product_recommendations enable row level security;
revoke all on public.product_recommendations from anon,authenticated;
grant select on public.product_recommendations to anon,authenticated;
create policy recommendation_catalog_read on public.product_recommendations for select to anon,authenticated using(exists(select 1 from public.products p where p.id=product_id and p.is_active) and exists(select 1 from public.products p where p.id=target_id and p.is_active));
create policy recommendation_admin_read on public.product_recommendations for select to authenticated using((select public.store_is_admin()));
create function public.store_admin_save_product_recommendations(p_id uuid,p_product jsonb,p_colors jsonb,p_variants jsonb,p_expected jsonb,p_recommendations jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid; kind text; value jsonb; item jsonb;
begin
 if not public.store_is_admin() then raise insufficient_privilege;end if;
 if jsonb_typeof(p_recommendations) is distinct from 'object' then raise exception 'Invalid recommendations';end if;
 result:=public.store_admin_save_product(p_id,p_product,p_colors,p_variants,p_expected);
 delete from public.product_recommendations where product_id=result;
 foreach kind in array array['similar','outfit'] loop
  value:=coalesce(p_recommendations->kind,'[]'::jsonb);
  if jsonb_typeof(value)<>'array' or jsonb_array_length(value)>12 then raise exception 'Invalid recommendations';end if;
  if exists(select 1 from jsonb_array_elements_text(value) x where x::uuid=result or not exists(select 1 from public.products p where p.id=x::uuid and p.is_active)) then raise exception 'Invalid recommended product';end if;
  insert into public.product_recommendations(product_id,target_id,kind,position) select result,x::uuid,kind,(n-1)::integer from jsonb_array_elements_text(value) with ordinality r(x,n);
 end loop;
 return result;
end $$;
revoke all on function public.store_admin_save_product_recommendations(uuid,jsonb,jsonb,jsonb,jsonb,jsonb) from public,anon;
grant execute on function public.store_admin_save_product_recommendations(uuid,jsonb,jsonb,jsonb,jsonb,jsonb) to authenticated;
create trigger store_data_revision after insert or update or delete on public.product_recommendations for each statement execute function private.store_bump_revision();
insert into public.store_data_revisions(topic) values('product_recommendations');

create table private.store_restock_subscriptions (
 id uuid primary key default gen_random_uuid(),user_id text not null check(user_id ~ '^[1-9][0-9]{0,15}$'),variant_id uuid not null references public.product_variants(id) on delete cascade,
 status text not null default 'active' check(status in ('active','queued','sent','cancelled')),
 created_at timestamptz not null default clock_timestamp(),sent_at timestamptz
);
create unique index store_restock_once on private.store_restock_subscriptions(user_id,variant_id) where status in ('active','queued');
create index store_restock_variant on private.store_restock_subscriptions(variant_id) where status='active';
alter table private.store_restock_subscriptions enable row level security;
revoke all on private.store_restock_subscriptions from public,anon,authenticated;
grant all on private.store_restock_subscriptions to service_role;
create table private.store_restock_candidates(variant_id uuid primary key references public.product_variants(id) on delete cascade,cycle uuid not null default gen_random_uuid(),available_after timestamptz not null);
alter table private.store_restock_candidates enable row level security;
revoke all on private.store_restock_candidates from public,anon,authenticated;
grant all on private.store_restock_candidates to service_role;
create function private.store_restock_changed() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if old.stock<=0 and new.stock>0 then insert into private.store_restock_candidates(variant_id,available_after) values(new.id,clock_timestamp()+interval '60 seconds') on conflict(variant_id) do update set cycle=gen_random_uuid(),available_after=excluded.available_after;
 elsif new.stock<=0 then delete from private.store_restock_candidates where variant_id=new.id;end if;
 return new;
end $$;
revoke all on function private.store_restock_changed() from public,anon,authenticated;
create trigger store_restock_changed after update of stock on public.product_variants for each row execute function private.store_restock_changed();
create function public.store_restock(p_user text,p_action text,p_variant uuid default null,p_id uuid default null) returns jsonb language plpgsql set search_path='' as $$
declare result jsonb;
begin
 if p_user !~ '^[1-9][0-9]{0,15}$' then raise exception 'Invalid customer';end if;
 perform pg_advisory_xact_lock(hashtextextended('restock-user:'||p_user,0));
 if p_action='subscribe' then
  if not exists(select 1 from public.store_catalog_variants() v where v.id=p_variant and not v.available) then raise exception 'Variant unavailable for subscription';end if;
  if (select count(*) from private.store_restock_subscriptions where user_id=p_user and status in ('active','queued'))>=50 and not exists(select 1 from private.store_restock_subscriptions where user_id=p_user and variant_id=p_variant and status in ('active','queued')) then raise exception 'Subscription limit';end if;
  insert into private.store_restock_subscriptions(user_id,variant_id) values(p_user,p_variant) on conflict(user_id,variant_id) where status in ('active','queued') do nothing;
 elsif p_action='cancel' then update private.store_restock_subscriptions set status='cancelled' where user_id=p_user and id=p_id and status in ('active','queued');
 elsif p_action<>'list' then raise exception 'Invalid action';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'variant_id',v.id,'product_id',p.id,'name_ru',p.name_ru,'name_uz',p.name_uz,'size',v.size_value,'color_id',v.color_id,'color_ru',c.name_ru,'color_uz',c.name_uz,'image',p.images[1],'status',s.status) order by s.created_at desc),'[]'::jsonb) into result
 from private.store_restock_subscriptions s join public.product_variants v on v.id=s.variant_id join public.products p on p.id=v.product_id left join public.product_colors c on c.id=v.color_id where s.user_id=p_user and s.status in ('active','queued');
 return result;
end $$;
revoke all on function public.store_restock(text,text,uuid,uuid) from public,anon,authenticated;
grant execute on function public.store_restock(text,text,uuid,uuid) to service_role;
-- Run after service notifications. Stabilization avoids momentary reserve/release spam.
create function public.store_queue_restocks() returns void language plpgsql set search_path='' as $$
declare candidate record; s record;
begin
 for candidate in select c.* from private.store_restock_candidates c where c.available_after<=clock_timestamp() order by c.available_after limit 10 for update skip locked loop
  if exists(select 1 from public.store_catalog_variants() v where v.id=candidate.variant_id and v.available) then
   for s in select sub.id,sub.user_id,p.id product_id,p.name_ru,v.size_value,col.name_ru color from private.store_restock_subscriptions sub join public.product_variants v on v.id=sub.variant_id join public.products p on p.id=v.product_id left join public.product_colors col on col.id=v.color_id where sub.variant_id=candidate.variant_id and sub.status='active' order by sub.id limit 100 for update of sub skip locked loop
    insert into private.store_outbox(event_key,user_id,kind,payload) values('restock:'||s.id||':'||candidate.cycle,s.user_id,'custom',jsonb_build_object('restock',jsonb_build_object('subscription_id',s.id,'variant_id',candidate.variant_id,'product_id',s.product_id,'name',s.name_ru,'size',s.size_value,'color',s.color))) on conflict(event_key) do nothing;
    update private.store_restock_subscriptions set status='queued' where id=s.id;
   end loop;
  end if;
  if not exists(select 1 from private.store_restock_subscriptions where variant_id=candidate.variant_id and status='active') or not exists(select 1 from public.product_variants where id=candidate.variant_id and stock>0) then delete from private.store_restock_candidates where variant_id=candidate.variant_id;
  else update private.store_restock_candidates set available_after=clock_timestamp()+interval '1 hour' where variant_id=candidate.variant_id;end if;
 end loop;
end $$;
revoke all on function public.store_queue_restocks() from public,anon,authenticated;
grant execute on function public.store_queue_restocks() to service_role;
create function public.store_restock_delivery(p_event bigint,p_finish boolean default false) returns boolean language plpgsql set search_path='' as $$
declare subscription private.store_restock_subscriptions%rowtype; event private.store_outbox%rowtype;
begin
 select * into event from private.store_outbox where id=p_event and sent_at is null;
 if event.id is null then return false;end if;
 select * into subscription from private.store_restock_subscriptions where id=(event.payload#>>'{restock,subscription_id}')::uuid and user_id=event.user_id for update;
 if subscription.id is null or subscription.status<>'queued' then return false;end if;
 if p_finish then update private.store_restock_subscriptions set status='sent',sent_at=clock_timestamp() where id=subscription.id;return true;end if;
 if not exists(select 1 from public.store_catalog_variants() v where v.id=subscription.variant_id and v.available) then update private.store_restock_subscriptions set status='active' where id=subscription.id;return false;end if;
 return true;
end $$;
revoke all on function public.store_restock_delivery(bigint,boolean) from public,anon,authenticated;
grant execute on function public.store_restock_delivery(bigint,boolean) to service_role;

-- Restock notices never delay transactional service notifications.
CREATE OR REPLACE FUNCTION public.store_pending_notifications()
 RETURNS SETOF private.store_outbox
 LANGUAGE sql
 SET search_path TO ''
AS $function$
 select e.* from private.store_outbox e where e.sent_at is null
 and (e.claimed_at is null or e.claimed_at<now()-make_interval(secs=>least(3600,greatest(60,e.attempts*60))))
 and (e.kind not in ('order','order_client') or exists(select 1 from public.orders o where o.id=e.order_id and o.user_id=e.user_id and o.checkout_abandoned_at is null and o.status<>'Отменён' and (o.payment_method<>'online_card' or o.receipt_submitted_at is not null or o.payment_status='paid')))
 and (e.payload->'special_request' is null or not exists(select 1 from private.store_outbox prior where prior.id<e.id and prior.sent_at is null and prior.payload#>>'{special_request,id}'=e.payload#>>'{special_request,id}'))
 and (e.payload->'special_order' is null or not exists(select 1 from private.store_outbox prior where prior.id<e.id and prior.sent_at is null and prior.payload#>>'{special_order,id}'=e.payload#>>'{special_order,id}'))
 and (e.order_id is null or coalesce(e.payload->>'recipient','client')='manager' or not(e.payload ?| array['ordinary_order','cancellation','refund','special_order']) or not exists(
 select 1 from private.store_outbox prior where prior.order_id=e.order_id and prior.user_id=e.user_id and prior.id<e.id and prior.sent_at is null
 and coalesce(prior.payload->>'recipient','client')<>'manager' and prior.payload ?| array['ordinary_order','cancellation','refund','special_order']))
 order by case when e.payload ? 'restock' then 1 else 0 end,e.id limit 10;
$function$;

