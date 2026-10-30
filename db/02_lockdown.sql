-- Apply ONLY after the new Vercel backend and server-only env are verified.
-- This deliberately removes the legacy anonymous checkout and public uploads.
do $$ declare policy record; begin
  for policy in select schemaname,tablename,policyname from pg_policies
    where schemaname='public' or (schemaname='storage' and tablename='objects')
  loop execute format('drop policy %I on %I.%I',policy.policyname,policy.schemaname,policy.tablename); end loop;
end $$;
do $$ declare t text; begin
  foreach t in array array['products','product_variants','product_colors','brands','categories','subcategories','settings','orders','china_requests','subscribers','category_change_logs'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon,authenticated',t);
    execute format('grant all on public.%I to service_role',t);
    execute format('grant select,insert,update,delete on public.%I to authenticated',t);
    execute format('create policy store_admin on public.%I for all to authenticated using ((select public.store_is_admin())) with check ((select public.store_is_admin()))',t);
  end loop;
  foreach t in array array['products','product_variants','product_colors','brands','categories','subcategories'] loop
    execute format('grant select on public.%I to anon',t);
    execute format('create policy catalog_read on public.%I for select to anon,authenticated using (true)',t);
  end loop;
end $$;
grant select on public.settings to anon;
create policy storefront_settings on public.settings for select to anon,authenticated
  using (key in ('exchange_rate','sale_mode_enabled','delivery_price','free_delivery_threshold'));
-- Manager writes to identity columns continue to work; anonymous clients cannot use sequences.
revoke all on all sequences in schema public from anon;
grant usage,select on all sequences in schema public to authenticated,service_role;
revoke all on function public.delete_unpaid_order(bigint) from public,anon,authenticated,service_role;
create or replace function public.get_product_popularity()
returns table(product_id text,sold_count bigint) language sql stable security definer set search_path = '' as $$
  select item->>'productId',sum((item->>'quantity')::bigint)
  from public.orders cross join lateral jsonb_array_elements(case when jsonb_typeof(items)='array' then items else '[]'::jsonb end) item
  where status is distinct from 'Отменён' and coalesce(item->>'isSpecialOrder','false')='false'
    and item->>'quantity' ~ '^[1-9][0-9]{0,2}$' and item->>'productId' is not null
  group by item->>'productId' having sum((item->>'quantity')::bigint)>0;
$$;
revoke all on function public.get_product_popularity() from public;
grant execute on function public.get_product_popularity() to anon,authenticated,service_role;
update storage.buckets set public=false,file_size_limit=2097152,allowed_mime_types=array['image/jpeg','image/png','image/webp']
where id in ('payment-screenshots','china-requests');
create policy public_product_images on storage.objects for select to anon,authenticated using (bucket_id='product-images');
create policy store_admin_files on storage.objects for all to authenticated
  using (bucket_id in ('product-images','payment-screenshots','china-requests') and (select public.store_is_admin()))
  with check (bucket_id in ('product-images','payment-screenshots','china-requests') and (select public.store_is_admin()));
