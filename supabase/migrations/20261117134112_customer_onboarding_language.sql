-- Account preferences only. No order timestamps, amounts, schedules or outbox keys change.
alter table private.store_customer_preferences
 add column language_source text check(language_source in ('explicit','telegram')),
 add column telegram_language text check(telegram_language in ('ru','uz')),
 add column onboarding_completed_at timestamptz;
update private.store_customer_preferences set language_source='explicit' where language in ('ru','uz');
create or replace function public.store_customer_language(p_user text,p_language text default null) returns text language plpgsql set search_path='' as $$
begin
 if p_user is null or p_user !~ '^[1-9][0-9]{0,15}$' then raise exception 'Invalid customer';end if;
 if p_language is not null then
  if p_language not in ('ru','uz') then raise exception 'Invalid language';end if;
  insert into private.store_customer_preferences(user_id,language,language_source,version) values(p_user,p_language,'explicit',0)
  on conflict(user_id) do update set language=excluded.language,language_source='explicit',updated_at=clock_timestamp();
 end if;
 return coalesce((select coalesce(case when language_source='explicit' then language end,telegram_language) from private.store_customer_preferences where user_id=p_user),'ru');
end $$;
create function public.store_customer_telegram_language(p_user text,p_language text) returns void language plpgsql set search_path='' as $$
begin
 if p_user is null or p_user !~ '^[1-9][0-9]{0,15}$' then raise exception 'Invalid customer';end if;
 if p_language not in ('ru','uz') or p_language is null then return;end if;
 insert into private.store_customer_preferences(user_id,telegram_language,version) values(p_user,p_language,0)
 on conflict(user_id) do update set telegram_language=excluded.telegram_language;
end $$;
alter function public.store_customer_preferences(text,jsonb,bigint) set schema private;
alter function private.store_customer_preferences(text,jsonb,bigint) rename to store_customer_preferences_before_onboarding;
create function public.store_customer_preferences(p_user text,p_patch jsonb default null,p_version bigint default null) returns jsonb language plpgsql set search_path='' as $$
declare result jsonb;
begin
 result:=private.store_customer_preferences_before_onboarding(p_user,p_patch,p_version);
 return result||jsonb_build_object('language',public.store_customer_language(p_user),'language_source',(select language_source from private.store_customer_preferences where user_id=p_user),'onboarding_completed_at',(select onboarding_completed_at from private.store_customer_preferences where user_id=p_user));
end $$;
create function public.store_complete_onboarding(p_user text) returns jsonb language plpgsql set search_path='' as $$
begin
 if p_user is null or p_user !~ '^[1-9][0-9]{0,15}$' then raise exception 'Invalid customer';end if;
 update private.store_customer_preferences set onboarding_completed_at=coalesce(onboarding_completed_at,clock_timestamp()) where user_id=p_user and language_source='explicit' and language in ('ru','uz');
 if not found then raise exception 'Choose language first';end if;
 return public.store_customer_preferences(p_user);
end $$;
revoke all on function public.store_customer_language(text,text),public.store_customer_telegram_language(text,text),public.store_customer_preferences(text,jsonb,bigint),public.store_complete_onboarding(text),private.store_customer_preferences_before_onboarding(text,jsonb,bigint) from public,anon,authenticated;
grant execute on function public.store_customer_language(text,text),public.store_customer_telegram_language(text,text),public.store_customer_preferences(text,jsonb,bigint),public.store_complete_onboarding(text),private.store_customer_preferences_before_onboarding(text,jsonb,bigint) to service_role;
