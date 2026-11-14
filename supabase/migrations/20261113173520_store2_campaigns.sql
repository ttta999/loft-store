alter table private.store_customer_preferences add column marketing_enabled boolean not null default false,add column marketing_consent_at timestamptz,add column marketing_updated_at timestamptz;
create index store_marketing_opt_in on private.store_customer_preferences(user_id) where marketing_enabled;
create table private.store_marketing_consent_events(id uuid primary key default gen_random_uuid(),user_id text not null,enabled boolean not null,created_at timestamptz not null default clock_timestamp());
alter table private.store_marketing_consent_events enable row level security;
revoke all on private.store_marketing_consent_events from public,anon,authenticated;
grant select,insert on private.store_marketing_consent_events to service_role;
create table private.store_bot_delivery_state(user_id text primary key,blocked boolean not null default false,blocked_at timestamptz,last_error text);
alter table private.store_bot_delivery_state enable row level security;
revoke all on private.store_bot_delivery_state from public,anon,authenticated;
grant all on private.store_bot_delivery_state to service_role;
create function public.store_marketing_consent(p_user text,p_enabled boolean) returns jsonb language plpgsql set search_path='' as $$
declare oldrow private.store_customer_preferences%rowtype;
begin
 if p_user !~ '^[1-9][0-9]{0,15}$' or p_enabled is null then raise exception 'Invalid consent';end if;
 perform pg_advisory_xact_lock(hashtextextended('store-profile:'||p_user,0));
 insert into private.store_customer_preferences(user_id) values(p_user) on conflict do nothing;
 select * into oldrow from private.store_customer_preferences where user_id=p_user;
 if oldrow.marketing_enabled is distinct from p_enabled then
  update private.store_customer_preferences set marketing_enabled=p_enabled,marketing_updated_at=clock_timestamp(),marketing_consent_at=case when p_enabled then clock_timestamp() else marketing_consent_at end,version=version+1,updated_at=clock_timestamp() where user_id=p_user;
  insert into private.store_marketing_consent_events(user_id,enabled) values(p_user,p_enabled);
  -- Explicit re-consent permits one new attempt; only a real Bot API response proves reachability.
  if p_enabled then update private.store_bot_delivery_state set blocked=false where user_id=p_user;end if;
 end if;
 return public.store_customer_preferences(p_user);
end $$;
revoke all on function public.store_marketing_consent(text,boolean) from public,anon,authenticated;
grant execute on function public.store_marketing_consent(text,boolean) to service_role;

-- Brand snapshots are metadata only; no prices, stock or previous orders change.
create function private.store_order_brand_snapshot() returns trigger language plpgsql security definer set search_path='' as $$
declare item jsonb;items jsonb:='[]';brand text;
begin
 if jsonb_typeof(new.items) is distinct from 'array' then return new;end if;
 for item in select value from jsonb_array_elements(new.items) loop
  if coalesce(item->>'isSpecialOrder','false')<>'true' then
   select p.brand into brand from public.products p where p.id::text=item->>'productId';
   if found then item:=item||jsonb_build_object('brand',brand);end if;
  end if;
  items:=items||jsonb_build_array(item);
 end loop;
 new.items:=items;return new;
end $$;
revoke all on function private.store_order_brand_snapshot() from public,anon,authenticated;
create trigger store_order_brand_snapshot before insert on public.orders for each row execute function private.store_order_brand_snapshot();

create table public.campaigns(
 id uuid primary key default gen_random_uuid(),name text not null,title text not null,message text not null,image_ref text,
 button_label text not null,target_type text not null check(target_type in ('product','brand','category','new','sale','home')),target_id text,
 audience_type text not null check(audience_type in ('all','buyers','brand')),audience_brand_id uuid,
 status text not null default 'draft' check(status in ('draft','scheduled','sending','completed','completed_errors','cancelled')),
 scheduled_at timestamptz,started_at timestamptz,completed_at timestamptz,
 created_by uuid not null references auth.users(id),created_at timestamptz not null default clock_timestamp(),updated_at timestamptz not null default clock_timestamp(),version bigint not null default 1,
 recipient_count integer not null default 0,sent_count integer not null default 0,failed_count integer not null default 0,skipped_count integer not null default 0,uncertain_count integer not null default 0,
 check(length(name) between 1 and 120),check(length(title) between 1 and 200),check(length(message) between 1 and 3800),check(length(button_label) between 1 and 64),
 check(length(title)+length(message)+4<=case when image_ref is null then 4096 else 1024 end)
);
create index campaigns_due on public.campaigns(scheduled_at) where status='scheduled';
alter table public.campaigns enable row level security;
revoke all on public.campaigns from anon,authenticated;
grant select on public.campaigns to authenticated;
grant all on public.campaigns to service_role;
create policy campaign_admin_read on public.campaigns for select to authenticated using((select public.store_is_admin()));
create trigger store_data_revision after insert or update or delete on public.campaigns for each statement execute function private.store_bump_revision();
insert into public.store_data_revisions(topic) values('campaigns');
create table private.store_campaign_recipients(
 id uuid primary key default gen_random_uuid(),campaign_id uuid not null references public.campaigns(id),user_id text not null,
 status text not null default 'pending' check(status in ('pending','sending','sent','failed','skipped','uncertain')),
 attempts integer not null default 0,next_attempt_at timestamptz not null default clock_timestamp(),lease uuid,lease_expires_at timestamptz,
 sent_at timestamptz,message_id bigint,last_error text,unique(campaign_id,user_id)
);
create index campaign_recipients_pending on private.store_campaign_recipients(campaign_id,next_attempt_at,id) where status='pending';
create index campaign_recipients_expired on private.store_campaign_recipients(lease_expires_at) where status='sending';
alter table private.store_campaign_recipients enable row level security;
revoke all on private.store_campaign_recipients from public,anon,authenticated;
grant all on private.store_campaign_recipients to service_role;
create table private.store_campaign_tests(
 id uuid primary key default gen_random_uuid(),campaign_id uuid not null references public.campaigns(id),actor uuid not null references auth.users(id),request_key uuid not null unique,
 snapshot jsonb not null,status text not null default 'pending' check(status in ('pending','sending','sent','failed','skipped','uncertain')),
 created_at timestamptz not null default clock_timestamp(),sent_at timestamptz,last_error text,lease uuid,lease_expires_at timestamptz
);
create index campaign_tests_pending on private.store_campaign_tests(created_at) where status='pending';
alter table private.store_campaign_tests enable row level security;
revoke all on private.store_campaign_tests from public,anon,authenticated;
grant all on private.store_campaign_tests to service_role;
create table private.store_campaign_throttle(singleton boolean primary key default true check(singleton),next_at timestamptz not null default clock_timestamp());
insert into private.store_campaign_throttle(singleton) values(true);
alter table private.store_campaign_throttle enable row level security;
revoke all on private.store_campaign_throttle from public,anon,authenticated;
grant all on private.store_campaign_throttle to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('campaign-media','campaign-media',false,2097152,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy campaign_media_admin on storage.objects for all to authenticated using(bucket_id='campaign-media' and (select public.store_is_admin())) with check(bucket_id='campaign-media' and (select public.store_is_admin()));

create function private.store_campaign_target(p_type text,p_id text) returns boolean language plpgsql stable set search_path='' as $$
begin
 if p_type='home' then return p_id is null or p_id='';end if;
 if p_type='new' then return (p_id is null or p_id='') and exists(select 1 from public.store_catalog_variants());end if;
 if p_type='sale' then return (p_id is null or p_id='') and exists(select 1 from public.settings where key='sale_mode_enabled' and value->>'enabled'='true') and exists(select 1 from public.products p join public.store_catalog_variants() v on v.product_id=p.id where p.sale_price>0);end if;
 if p_type='category' then return exists(select 1 from public.categories c where c.id=p_id and c.is_active);end if;
 if p_type in ('product','brand') and coalesce(p_id,'') !~ '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$' then return false;end if;
 if p_type='brand' then return exists(select 1 from public.brands b where b.id=p_id::uuid and b.is_active);end if;
 if p_type='product' then return exists(select 1 from public.products p where p.id=p_id::uuid and p.is_active and exists(select 1 from public.categories c where c.id=p.category and c.is_active) and (p.subcategory is null or exists(select 1 from public.subcategories s where s.id=p.subcategory and s.is_active)));end if;
 return false;
end $$;
revoke all on function private.store_campaign_target(text,text) from public,anon,authenticated;
grant execute on function private.store_campaign_target(text,text) to service_role;
create function private.store_campaign_audience(p_type text,p_brand uuid) returns table(user_id text,can_send boolean) language sql stable set search_path='' as $$
 select p.user_id,exists(select 1 from public.subscribers s where s.user_id=p.user_id and s.is_subscribed) and not coalesce(b.blocked,false) from private.store_customer_preferences p left join private.store_bot_delivery_state b on b.user_id=p.user_id
 where p.marketing_enabled and (p_type='all' or (p_type in ('buyers','brand') and exists(select 1 from public.orders o where o.user_id=p.user_id and o.payment_status='paid' and o.paid_at is not null and o.status<>'Отменён' and o.checkout_abandoned_at is null
 and (p_type='buyers' or exists(select 1 from jsonb_array_elements(case when jsonb_typeof(o.items)='array' then o.items else '[]'::jsonb end) i left join public.products product on product.id::text=i->>'productId' join public.brands brand on brand.id=p_brand where coalesce(nullif(i->>'brand',''),product.brand)=brand.name)))));
$$;
revoke all on function private.store_campaign_audience(text,uuid) from public,anon,authenticated;
grant execute on function private.store_campaign_audience(text,uuid) to service_role;

create function private.store_campaign_recount(p_id uuid) returns void language plpgsql set search_path='' as $$
declare total integer;sent integer;failed integer;skipped integer;uncertain integer;remaining integer;
begin
 select count(*),count(*) filter(where status='sent'),count(*) filter(where status='failed'),count(*) filter(where status='skipped'),count(*) filter(where status='uncertain'),count(*) filter(where status in ('pending','sending')) into total,sent,failed,skipped,uncertain,remaining from private.store_campaign_recipients where campaign_id=p_id;
 update public.campaigns set recipient_count=total,sent_count=sent,failed_count=failed,skipped_count=skipped,uncertain_count=uncertain,updated_at=clock_timestamp(),status=case when status='sending' and remaining=0 then case when failed+uncertain>0 then 'completed_errors' else 'completed' end else status end,completed_at=case when status='sending' and remaining=0 then clock_timestamp() else completed_at end where id=p_id;
end $$;
revoke all on function private.store_campaign_recount(uuid) from public,anon,authenticated;
grant execute on function private.store_campaign_recount(uuid) to service_role;
create function private.store_campaign_freeze(p_id uuid,p_when timestamptz) returns void language plpgsql set search_path='' as $$
declare c public.campaigns%rowtype;
begin
 select * into c from public.campaigns where id=p_id for update;
 if not found or c.status<>'draft' then return;end if;
 if not private.store_campaign_target(c.target_type,c.target_id) then raise exception 'Целевая страница недоступна';end if;
 insert into private.store_campaign_recipients(campaign_id,user_id,status,last_error,next_attempt_at) select c.id,a.user_id,case when a.can_send then 'pending' else 'skipped' end,case when a.can_send then null else 'Нет доступного чата или бот заблокирован' end,coalesce(p_when,clock_timestamp()) from private.store_campaign_audience(c.audience_type,c.audience_brand_id) a on conflict(campaign_id,user_id) do nothing;
 update public.campaigns set status=case when p_when is null then 'sending' else 'scheduled' end,scheduled_at=p_when,started_at=case when p_when is null then clock_timestamp() end,updated_at=clock_timestamp(),version=version+1 where id=c.id;
 perform private.store_campaign_recount(c.id);
end $$;
revoke all on function private.store_campaign_freeze(uuid,timestamptz) from public,anon,authenticated;
grant execute on function private.store_campaign_freeze(uuid,timestamptz) to service_role;
create function private.store_wake_campaigns() returns void language plpgsql security definer set search_path='' as $$
begin
 if (select next_at>clock_timestamp() from private.store_campaign_throttle where singleton) or exists(select 1 from public.store_pending_notifications()) then return;end if;
 if not exists(select 1 from public.campaigns c where (c.status='scheduled' and c.scheduled_at<=now()) or (c.status in ('sending','cancelled') and exists(select 1 from private.store_campaign_recipients r where r.campaign_id=c.id and ((r.status='pending' and r.next_attempt_at<=now()) or (r.status='sending' and r.lease_expires_at<now()))))) and not exists(select 1 from private.store_campaign_tests t where t.status='pending' or (t.status='sending' and t.lease_expires_at<now())) then return;end if;
 perform net.http_post(url:='https://loft-store-24bz.vercel.app/api/campaignWorker',headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='loft_maintenance_bearer')),body:='{}'::jsonb,timeout_milliseconds:=55000);
end $$;
revoke all on function private.store_wake_campaigns() from public,anon,authenticated,service_role;
create function public.store_wake_campaigns() returns void language sql security definer set search_path='' as $$select private.store_wake_campaigns()$$;
revoke all on function public.store_wake_campaigns() from public,anon,authenticated;
grant execute on function public.store_wake_campaigns() to service_role;

create function public.store_admin_campaign_audience(p_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare c public.campaigns%rowtype;matched integer;available integer;
begin
 if not public.store_is_admin() then raise insufficient_privilege;end if;
 select * into c from public.campaigns where id=p_id;if not found then raise exception 'Рассылка недоступна';end if;
 select count(*),count(*) filter(where can_send) into matched,available from private.store_campaign_audience(c.audience_type,c.audience_brand_id);
 return jsonb_build_object('matched',matched,'available',available,'version',c.version,'audience_type',c.audience_type);
end $$;
revoke all on function public.store_admin_campaign_audience(uuid) from public,anon;
grant execute on function public.store_admin_campaign_audience(uuid) to authenticated;
create function public.store_admin_campaign_tests(p_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.store_is_admin() then raise insufficient_privilege;end if;
 return coalesce((select jsonb_agg(t order by t.created_at desc) from(select id,status,created_at,sent_at,last_error from private.store_campaign_tests where campaign_id=p_id order by created_at desc limit 10)t),'[]'::jsonb);
end $$;
revoke all on function public.store_admin_campaign_tests(uuid) from public,anon;
grant execute on function public.store_admin_campaign_tests(uuid) to authenticated;
create function public.store_admin_campaign_action(p_action text,p_id uuid default null,p_value jsonb default null,p_version bigint default null,p_when text default null,p_key uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.campaigns%rowtype;before_value jsonb;result uuid;photo text;brand uuid;moment timestamptz;zone text;matched integer;available integer;testrow private.store_campaign_tests%rowtype;
begin
 if not public.store_is_admin() then raise insufficient_privilege;end if;
 if p_id is not null then select * into c from public.campaigns where id=p_id for update;if not found then raise exception 'Рассылка недоступна';end if;end if;
 before_value:=case when c.id is not null then to_jsonb(c) end;
 if p_action='save' then
  if c.id is not null and (c.status<>'draft' or p_version is distinct from c.version) then raise exception 'Рассылка изменилась или уже запущена';end if;
  if jsonb_typeof(p_value) is distinct from 'object' or length(btrim(coalesce(p_value->>'name',''))) not between 1 and 120 or length(btrim(coalesce(p_value->>'title',''))) not between 1 and 200 or length(btrim(coalesce(p_value->>'message',''))) not between 1 and 3800 or length(btrim(coalesce(p_value->>'button_label',''))) not between 1 and 64 or coalesce(p_value->>'audience_type','') not in ('all','buyers','brand') then raise exception 'Проверьте название, текст и аудиторию';end if;
  photo:=nullif(p_value->>'image_ref','');
  if photo is not null and (photo !~ '^private:campaign-media/[a-f0-9-]{36}/[a-f0-9-]{36}\.(jpg|png|webp)$' or not exists(select 1 from storage.objects where bucket_id='campaign-media' and name=substr(photo,length('private:campaign-media/')+1))) then raise exception 'Загрузите фотографию в хранилище рассылок';end if;
  if length(p_value->>'title')+length(p_value->>'message')+4>(case when photo is null then 4096 else 1024 end) then raise exception 'Текст превышает ограничение Telegram для выбранного типа сообщения';end if;
  if not private.store_campaign_target(p_value->>'target_type',nullif(p_value->>'target_id','')) then raise exception 'Целевая страница недоступна';end if;
  if p_value->>'audience_type'='brand' then
   if coalesce(p_value->>'audience_brand_id','') !~ '^[a-fA-F0-9-]{36}$' then raise exception 'Выберите бренд аудитории';end if;
   brand:=(p_value->>'audience_brand_id')::uuid;
   if not exists(select 1 from public.brands where id=brand and is_active) then raise exception 'Бренд аудитории недоступен';end if;
  end if;
  if c.id is null then
   insert into public.campaigns(name,title,message,image_ref,button_label,target_type,target_id,audience_type,audience_brand_id,created_by) values(btrim(p_value->>'name'),btrim(p_value->>'title'),btrim(p_value->>'message'),photo,btrim(p_value->>'button_label'),p_value->>'target_type',nullif(p_value->>'target_id',''),p_value->>'audience_type',brand,auth.uid()) returning id into result;
  else
   update public.campaigns set name=btrim(p_value->>'name'),title=btrim(p_value->>'title'),message=btrim(p_value->>'message'),image_ref=photo,button_label=btrim(p_value->>'button_label'),target_type=p_value->>'target_type',target_id=nullif(p_value->>'target_id',''),audience_type=p_value->>'audience_type',audience_brand_id=brand,version=version+1,updated_at=clock_timestamp() where id=c.id returning id into result;
  end if;
 elsif p_action='copy' then
  if c.id is null then raise exception 'Рассылка недоступна';end if;
  insert into public.campaigns(name,title,message,image_ref,button_label,target_type,target_id,audience_type,audience_brand_id,created_by) values(left(c.name||' — копия',120),c.title,c.message,c.image_ref,c.button_label,c.target_type,c.target_id,c.audience_type,c.audience_brand_id,auth.uid()) returning id into result;
 elsif p_action in ('start','schedule') then
  if c.id is null then raise exception 'Рассылка недоступна';end if;
  if c.status<>'draft' then return to_jsonb(c);end if;
  if p_version is distinct from c.version then raise exception 'Рассылка изменилась. Проверьте предпросмотр';end if;
  select count(*),count(*) filter(where can_send) into matched,available from private.store_campaign_audience(c.audience_type,c.audience_brand_id);
  if matched=0 or available=0 then raise exception 'Нет получателей, доступных для отправки';end if;
  if matched>50000 then raise exception 'Аудитория превышает размер одного запуска';end if;
  if jsonb_typeof(p_value->'confirmed_count') is distinct from 'number' or (p_value->>'confirmed_count')::numeric<>matched or jsonb_typeof(p_value->'confirmed_available') is distinct from 'number' or (p_value->>'confirmed_available')::numeric<>available then raise exception 'Количество получателей изменилось. Пересчитайте аудиторию';end if;
  if p_action='schedule' then
   if coalesce(p_when,'') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}$' then raise exception 'Укажите дату и время';end if;
   select value->>'timezone' into zone from private.store_reminder_settings;
   moment:=p_when::timestamp at time zone zone;if moment<=clock_timestamp() then raise exception 'Выберите будущее время магазина';end if;
  end if;
  perform private.store_campaign_freeze(c.id,moment);result:=c.id;perform private.store_wake_campaigns();
 elsif p_action='cancel' then
  if c.id is null then raise exception 'Рассылка недоступна';end if;
  if c.status in ('completed','completed_errors','cancelled') then return to_jsonb(c);end if;
  update public.campaigns set status='cancelled',version=version+1,updated_at=clock_timestamp(),completed_at=clock_timestamp() where id=c.id;
  update private.store_campaign_recipients set status='skipped',last_error='Рассылка остановлена' where campaign_id=c.id and status='pending';
  update private.store_campaign_tests set status='skipped',last_error='Рассылка остановлена' where campaign_id=c.id and status='pending';
  perform private.store_campaign_recount(c.id);result:=c.id;
 elsif p_action='test' then
  if c.id is null or p_key is null or p_version is distinct from c.version then raise exception 'Сохраните черновик перед тестом';end if;
  select * into testrow from private.store_campaign_tests where request_key=p_key;
  if found then if testrow.campaign_id<>c.id or testrow.actor<>auth.uid() then raise exception 'Ключ теста уже использован';end if;return jsonb_build_object('id',testrow.id,'status',testrow.status);end if;
  if (select count(*) from private.store_campaign_tests where actor=auth.uid() and created_at>now()-interval '1 minute')>=3 then raise exception 'Повторите тестовую отправку через минуту';end if;
  insert into private.store_campaign_tests(campaign_id,actor,request_key,snapshot) values(c.id,auth.uid(),p_key,to_jsonb(c)) returning * into testrow;
  insert into private.store_admin_action_audit(manager_id,action,entity_id,after_value) values(auth.uid(),'campaign_test',c.id::text,jsonb_build_object('test_id',testrow.id));
  perform private.store_wake_campaigns();return jsonb_build_object('id',testrow.id,'status',testrow.status);
 else raise exception 'Неизвестное действие рассылки';end if;
 select * into c from public.campaigns where id=result;
 insert into private.store_admin_action_audit(manager_id,action,entity_id,before_value,after_value) values(auth.uid(),'campaign_'||p_action,c.id::text,before_value,to_jsonb(c));
 return to_jsonb(c);
end $$;
revoke all on function public.store_admin_campaign_action(text,uuid,jsonb,bigint,text,uuid) from public,anon;
grant execute on function public.store_admin_campaign_action(text,uuid,jsonb,bigint,text,uuid) to authenticated;

create function public.store_campaign_claim() returns jsonb language plpgsql set search_path='' as $$
declare c public.campaigns%rowtype;r private.store_campaign_recipients%rowtype;t private.store_campaign_tests%rowtype;token uuid;
begin
 if not pg_try_advisory_xact_lock(hashtextextended('store-campaign-claim',0)) then return null;end if;
 -- A process that disappeared after claiming may already have sent. Never replay it automatically.
 for c in select * from public.campaigns where status in ('sending','scheduled','cancelled') and (status in ('sending','cancelled') or scheduled_at<=clock_timestamp()) order by created_at limit 20 for update skip locked loop
  if c.status='scheduled' then update public.campaigns set status='sending',started_at=clock_timestamp(),updated_at=clock_timestamp() where id=c.id;end if;
  update private.store_campaign_recipients set status='uncertain',last_error='Обработчик завершился без подтверждения результата' where campaign_id=c.id and status='sending' and lease_expires_at<clock_timestamp();
  update private.store_campaign_recipients r2 set status='skipped',last_error='Согласие отозвано или чат недоступен' where r2.campaign_id=c.id and r2.status='pending' and (not exists(select 1 from private.store_customer_preferences p where p.user_id=r2.user_id and p.marketing_enabled) or exists(select 1 from private.store_bot_delivery_state b where b.user_id=r2.user_id and b.blocked));
  if not private.store_campaign_target(c.target_type,c.target_id) then update private.store_campaign_recipients set status='skipped',last_error='Целевая страница недоступна' where campaign_id=c.id and status='pending';end if;
  perform private.store_campaign_recount(c.id);
 end loop;
 update private.store_campaign_tests set status='uncertain',last_error='Обработчик завершился без подтверждения результата' where status='sending' and lease_expires_at<clock_timestamp();
 if exists(select 1 from public.store_pending_notifications()) then return null;end if;
 if (select next_at>clock_timestamp() from private.store_campaign_throttle where singleton) then return null;end if;
 select * into t from private.store_campaign_tests where status='pending' order by created_at limit 1 for update skip locked;
 if found then
  token:=gen_random_uuid();update private.store_campaign_tests set status='sending',lease=token,lease_expires_at=clock_timestamp()+interval '2 minutes' where id=t.id;
  update private.store_campaign_throttle set next_at=clock_timestamp()+interval '400 milliseconds' where singleton;
  return jsonb_build_object('kind','test','id',t.id,'lease',token,'payload',t.snapshot);
 end if;
 for c in select * from public.campaigns where status='sending' and exists(select 1 from private.store_campaign_recipients r2 where r2.campaign_id=campaigns.id and r2.status='pending' and r2.next_attempt_at<=clock_timestamp()) order by created_at limit 20 for update skip locked loop
  select * into r from private.store_campaign_recipients where campaign_id=c.id and status='pending' and next_attempt_at<=clock_timestamp() order by next_attempt_at,id limit 1 for update skip locked;
  if found then
   token:=gen_random_uuid();update private.store_campaign_recipients set status='sending',attempts=attempts+1,lease=token,lease_expires_at=clock_timestamp()+interval '2 minutes' where id=r.id;
   update private.store_campaign_throttle set next_at=clock_timestamp()+interval '400 milliseconds' where singleton;
   return jsonb_build_object('kind','campaign','id',r.id,'lease',token,'user_id',r.user_id,'payload',to_jsonb(c));
  end if;
 end loop;
 return null;
end $$;
revoke all on function public.store_campaign_claim() from public,anon,authenticated;
grant execute on function public.store_campaign_claim() to service_role;
create function public.store_campaign_preflight(p_kind text,p_id uuid,p_lease uuid) returns boolean language plpgsql stable set search_path='' as $$
declare r private.store_campaign_recipients%rowtype;t private.store_campaign_tests%rowtype;c public.campaigns%rowtype;
begin
 if p_kind='test' then
  select * into t from private.store_campaign_tests where id=p_id and lease=p_lease and status='sending' and lease_expires_at>clock_timestamp();
  return found and exists(select 1 from public.campaigns where id=t.campaign_id and status<>'cancelled') and private.store_campaign_target(t.snapshot->>'target_type',t.snapshot->>'target_id');
 end if;
 if p_kind<>'campaign' then return false;end if;
 select * into r from private.store_campaign_recipients where id=p_id and lease=p_lease and status='sending' and lease_expires_at>clock_timestamp();if not found then return false;end if;
 select * into c from public.campaigns where id=r.campaign_id;
 return c.status='sending' and exists(select 1 from private.store_customer_preferences where user_id=r.user_id and marketing_enabled) and not exists(select 1 from private.store_bot_delivery_state where user_id=r.user_id and blocked) and private.store_campaign_target(c.target_type,c.target_id);
end $$;
revoke all on function public.store_campaign_preflight(text,uuid,uuid) from public,anon,authenticated;
grant execute on function public.store_campaign_preflight(text,uuid,uuid) to service_role;
create function public.store_campaign_finish(p_kind text,p_id uuid,p_lease uuid,p_outcome text,p_error text default null,p_retry_after integer default null,p_message_id bigint default null,p_blocked boolean default false)
returns boolean language plpgsql set search_path='' as $$
declare r private.store_campaign_recipients%rowtype;t private.store_campaign_tests%rowtype;campaign uuid;outcome text;delay integer;
begin
 if p_outcome not in ('sent','failed','skipped','uncertain','retry') then raise exception 'Invalid outcome';end if;
 if p_kind='test' then
  select * into t from private.store_campaign_tests where id=p_id and lease=p_lease for update;if not found then return false;end if;
  if t.status not in ('sending','uncertain') then return true;end if;
  if p_retry_after is not null then update private.store_campaign_throttle set next_at=greatest(next_at,clock_timestamp()+make_interval(secs=>least(86400,greatest(1,p_retry_after)))) where singleton;end if;

  update private.store_campaign_tests set status=case when p_outcome='retry' then 'failed' else p_outcome end,last_error=left(p_error,500),sent_at=case when p_outcome='sent' then clock_timestamp() else sent_at end where id=t.id;
  return true;
 end if;
 if p_kind<>'campaign' then return false;end if;
 select campaign_id into campaign from private.store_campaign_recipients where id=p_id and lease=p_lease;if not found then return false;end if;
 perform 1 from public.campaigns where id=campaign for update;
 select * into r from private.store_campaign_recipients where id=p_id and lease=p_lease for update;if not found then return false;end if;
 if r.status not in ('sending','uncertain') then return true;end if;
 if p_retry_after is not null then update private.store_campaign_throttle set next_at=greatest(next_at,clock_timestamp()+make_interval(secs=>least(86400,greatest(1,p_retry_after)))) where singleton;end if;

 outcome:=case when p_outcome='retry' and r.attempts>=5 then 'failed' when p_outcome='retry' then 'pending' else p_outcome end;
 if outcome='pending' and not exists(select 1 from public.campaigns where id=r.campaign_id and status='sending') then outcome:='skipped';end if;
 delay:=coalesce(p_retry_after,case when r.attempts=1 then 30 when r.attempts=2 then 120 when r.attempts=3 then 600 else 3600 end);
 update private.store_campaign_recipients set status=outcome,last_error=left(p_error,500),message_id=coalesce(p_message_id,message_id),sent_at=case when outcome='sent' then clock_timestamp() else sent_at end,next_attempt_at=case when outcome='pending' then clock_timestamp()+make_interval(secs=>least(86400,greatest(1,delay))) else next_attempt_at end where id=r.id;
 if p_blocked then insert into private.store_bot_delivery_state(user_id,blocked,blocked_at,last_error) values(r.user_id,true,clock_timestamp(),'Бот недоступен для пользователя') on conflict(user_id) do update set blocked=true,blocked_at=excluded.blocked_at,last_error=excluded.last_error;end if;
 perform private.store_campaign_recount(r.campaign_id);return true;
end $$;
revoke all on function public.store_campaign_finish(text,uuid,uuid,text,text,integer,bigint,boolean) from public,anon,authenticated;
grant execute on function public.store_campaign_finish(text,uuid,uuid,text,text,integer,bigint,boolean) to service_role;
-- Cron performs no HTTP calls while there are no due, explicitly approved jobs.
select cron.schedule('loft-campaign-worker','* * * * *','select public.store_wake_campaigns()');
