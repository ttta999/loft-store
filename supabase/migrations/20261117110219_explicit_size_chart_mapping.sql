-- Explicit, opt-in mappings. Existing tables and historical sizes are unchanged.
alter table public.size_charts add column size_mapping jsonb default null;
alter table public.size_charts add constraint size_chart_mapping_valid check(case
 when size_mapping is null then true
 when jsonb_typeof(size_mapping)='object'
  and jsonb_typeof(size_mapping->'source_column')='number' and jsonb_typeof(size_mapping->'target_column')='number'
  and (size_mapping->>'source_column') ~ '^[0-9]{1,2}$' and (size_mapping->>'target_column') ~ '^[0-9]{1,2}$'
  and size_mapping->>'source_system' in ('numeric','alphabetical','EU','UK','US','IT')
  and size_mapping->>'target_system' in ('numeric','alphabetical','EU','UK','US','IT')
 then (size_mapping->>'source_column')::int < jsonb_array_length(columns_ru)
  and (size_mapping->>'target_column')::int < jsonb_array_length(columns_ru)
  and size_mapping->>'source_column'<>size_mapping->>'target_column'
 else false end);
grant select(size_mapping) on public.size_charts to anon,authenticated;
create or replace function public.store_admin_size_chart(p_id uuid,p_value jsonb default null) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid; col jsonb; row jsonb; mapping jsonb;
begin
 if not public.store_is_admin() then raise insufficient_privilege;end if;
 if p_value is null then update public.size_charts set is_active=false,updated_at=clock_timestamp(),updated_by=auth.uid() where id=p_id returning id into result;return result;end if;
 mapping:=nullif(p_value->'size_mapping','null'::jsonb);
 if mapping is not null then
  if jsonb_typeof(mapping)<>'object' or jsonb_typeof(mapping->'source_column') is distinct from 'number' or jsonb_typeof(mapping->'target_column') is distinct from 'number'
   or coalesce(mapping->>'source_system','') not in ('numeric','alphabetical','EU','UK','US','IT')
   or coalesce(mapping->>'target_system','') not in ('numeric','alphabetical','EU','UK','US','IT')
   or (mapping->>'source_column') !~ '^[0-9]{1,2}$' or (mapping->>'target_column') !~ '^[0-9]{1,2}$'
   or jsonb_typeof(p_value->'columns_ru') is distinct from 'array' then raise exception 'Invalid size mapping';end if;
  if (mapping->>'source_column')::int >= jsonb_array_length(p_value->'columns_ru') or (mapping->>'target_column')::int >= jsonb_array_length(p_value->'columns_ru')
   or mapping->>'source_column'=mapping->>'target_column' then raise exception 'Invalid size mapping columns';end if;
 end if;
 if p_value->>'title_ru' is null or p_value->>'title_uz' is null or jsonb_typeof(p_value->'columns_ru') is distinct from 'array' or jsonb_typeof(p_value->'columns_uz') is distinct from 'array' or jsonb_typeof(p_value->'rows') is distinct from 'array' then raise exception 'Invalid size chart';end if;
 for col in select value from jsonb_array_elements(p_value->'columns_ru') union all select value from jsonb_array_elements(p_value->'columns_uz') loop
  if jsonb_typeof(col)<>'string' or length(col#>>'{}') not between 1 and 80 then raise exception 'Invalid column';end if;
 end loop;
 for row in select value from jsonb_array_elements(p_value->'rows') loop
  if jsonb_typeof(row)<>'array' or jsonb_array_length(row)<>jsonb_array_length(p_value->'columns_ru') then raise exception 'Invalid row';end if;
  for col in select value from jsonb_array_elements(row) loop
   if jsonb_typeof(col)<>'string' or length(col#>>'{}')>200 then raise exception 'Invalid cell';end if;
  end loop;
 end loop;
 if nullif(p_value->>'subcategory_id','') is not null and not exists(select 1 from public.subcategories s where s.id=p_value->>'subcategory_id' and s.category_id=p_value->>'category_id') then raise exception 'Invalid subcategory';end if;
 if nullif(p_value->>'product_id','') is not null and not exists(select 1 from public.products p where p.id=(p_value->>'product_id')::uuid and p.category=p_value->>'category_id' and (nullif(p_value->>'subcategory_id','') is null or p.subcategory=p_value->>'subcategory_id')) then raise exception 'Invalid product';end if;
 insert into public.size_charts(id,title_ru,title_uz,category_id,subcategory_id,brand_id,product_id,columns_ru,columns_uz,rows,is_active,updated_by,size_mapping)
 values(coalesce(p_id,gen_random_uuid()),p_value->>'title_ru',p_value->>'title_uz',p_value->>'category_id',nullif(p_value->>'subcategory_id',''),nullif(p_value->>'brand_id','')::uuid,nullif(p_value->>'product_id','')::uuid,p_value->'columns_ru',p_value->'columns_uz',p_value->'rows',true,auth.uid(),mapping)
 on conflict(id) do update set title_ru=excluded.title_ru,title_uz=excluded.title_uz,category_id=excluded.category_id,subcategory_id=excluded.subcategory_id,brand_id=excluded.brand_id,product_id=excluded.product_id,columns_ru=excluded.columns_ru,columns_uz=excluded.columns_uz,rows=excluded.rows,size_mapping=excluded.size_mapping,is_active=true,updated_at=clock_timestamp(),updated_by=auth.uid() returning id into result;
 return result;
end $$;
create or replace function public.store_customer_preferences(p_user text,p_patch jsonb default null,p_version bigint default null)
returns jsonb language plpgsql set search_path='' as $$
declare row private.store_customer_preferences%rowtype; a jsonb; s jsonb; seen text[]:='{}'; defaults integer:=0;
begin
 if p_user !~ '^[1-9][0-9]{0,15}$' then raise exception 'Invalid customer'; end if;
 perform pg_advisory_xact_lock(hashtextextended('store-profile:'||p_user,0));
 select * into row from private.store_customer_preferences where user_id=p_user;
 if p_patch is null then return case when row.user_id is not null then to_jsonb(row)-'user_id' else jsonb_build_object('name','','phone','','delivery_method','pickup','addresses','[]'::jsonb,'sizes','[]'::jsonb,'version',0) end;end if;
 if jsonb_typeof(p_patch)<>'object' or p_version is distinct from coalesce(row.version,0) then raise exception 'Profile changed';end if;
 if exists(select 1 from jsonb_object_keys(p_patch) k where k not in ('name','phone','delivery_method','addresses','sizes')) then raise exception 'Invalid preferences';end if;
 if p_patch ? 'name' and (jsonb_typeof(p_patch->'name')<>'string' or (length(p_patch->>'name') not between 3 and 120 and p_patch->>'name'<>'')) then raise exception 'Invalid name';end if;
 if p_patch ? 'phone' and (jsonb_typeof(p_patch->'phone')<>'string' or (p_patch->>'phone'<>'' and p_patch->>'phone' !~ '^\+998[0-9]{9}$')) then raise exception 'Invalid phone';end if;
 if p_patch ? 'delivery_method' and coalesce(p_patch->>'delivery_method','') not in ('pickup','delivery') then raise exception 'Invalid method';end if;
 if p_patch ? 'addresses' then
  if jsonb_typeof(p_patch->'addresses')<>'array' or jsonb_array_length(p_patch->'addresses')>10 then raise exception 'Invalid addresses';end if;
  for a in select value from jsonb_array_elements(p_patch->'addresses') loop
   if jsonb_typeof(a)<>'object' or coalesce(a->>'id','') !~ '^[a-f0-9-]{36}$' or a->>'id'=any(seen)
    or length(coalesce(a->>'label','')) not between 1 and 80 or length(coalesce(a->>'address','')) not between 5 and 500
    or length(coalesce(a->>'comment',''))>500 or jsonb_typeof(a->'is_default') is distinct from 'boolean' then raise exception 'Invalid address';end if;
   seen:=array_append(seen,a->>'id');if (a->>'is_default')::boolean then defaults:=defaults+1;end if;
  end loop;
  if defaults>1 then raise exception 'Multiple default addresses';end if;
 end if;
 if p_patch ? 'sizes' then
  if jsonb_typeof(p_patch->'sizes')<>'array' or jsonb_array_length(p_patch->'sizes')>50 then raise exception 'Invalid sizes';end if;
  seen:='{}';
  for s in select value from jsonb_array_elements(p_patch->'sizes') loop
   if jsonb_typeof(s)<>'object' or ((s->>'subcategory')||':'||(s->>'system'))=any(seen) or not exists(select 1 from public.subcategories sub where sub.id=s->>'subcategory' and sub.category_id=s->>'category' and sub.is_active and (
    (sub.size_type=s->>'system' and sub.sizes ? (s->>'size')) or
    (s->>'system' in ('numeric','alphabetical','EU','UK','US','IT') and exists(
     select 1 from public.size_charts c cross join lateral jsonb_array_elements(c.rows) r
     where c.is_active and c.category_id=sub.category_id and (c.subcategory_id is null or c.subcategory_id=sub.id)
      and c.size_mapping->>'source_system'=s->>'system'
      and r->>((c.size_mapping->>'source_column')::int)=s->>'size'
    ))
   )) then raise exception 'Invalid size';end if;
   seen:=array_append(seen,(s->>'subcategory')||':'||(s->>'system'));
  end loop;
 end if;
 insert into private.store_customer_preferences(user_id) values(p_user) on conflict do nothing;
 update private.store_customer_preferences set name=coalesce(p_patch->>'name',name),phone=coalesce(p_patch->>'phone',phone),delivery_method=coalesce(p_patch->>'delivery_method',delivery_method),addresses=coalesce(p_patch->'addresses',addresses),sizes=coalesce(p_patch->'sizes',sizes),version=version+1,updated_at=clock_timestamp() where user_id=p_user returning * into row;
 return to_jsonb(row)-'user_id';
end $$;
