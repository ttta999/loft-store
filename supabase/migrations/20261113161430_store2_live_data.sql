-- Content-free revisions: administrative events never contain order/customer data.
create table public.store_data_revisions (
 topic text primary key,
 revision bigint not null default 1,
 changed_at timestamptz not null default clock_timestamp()
);
alter table public.store_data_revisions enable row level security;
revoke all on public.store_data_revisions from anon, authenticated;
grant select on public.store_data_revisions to authenticated;
create policy store_revision_admin on public.store_data_revisions for select to authenticated
 using ((select public.store_is_admin()));

create function private.store_bump_revision() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.store_data_revisions(topic) values(tg_table_name)
 on conflict(topic) do update set revision=public.store_data_revisions.revision+1,changed_at=clock_timestamp();
 return null;
end $$;
revoke all on function private.store_bump_revision() from public,anon,authenticated;
do $$ declare t text; begin
 foreach t in array array['orders','china_requests','refunds','products','product_variants','product_colors','categories','subcategories','brands','settings'] loop
 execute format('create trigger store_data_revision after insert or update or delete on public.%I for each statement execute function private.store_bump_revision()',t);
 insert into public.store_data_revisions(topic) values(t);
 end loop;
end $$;
-- Only these content-free revisions enter Realtime, never financial/customer tables.
alter publication supabase_realtime add table public.store_data_revisions;
