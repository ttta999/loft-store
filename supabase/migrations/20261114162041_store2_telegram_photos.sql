-- Originals are untouched. Each public derivative has a deterministic bounded source hash.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('telegram-products','telegram-products',true,5242880,array['image/jpeg']) on conflict(id) do nothing;
create table private.store_telegram_photos(source_key text primary key,product_id uuid not null references public.products(id) on delete cascade,photo_path text not null,thumb_path text not null,width integer not null check(width>0),height integer not null check(height>0),created_at timestamptz not null default clock_timestamp());
alter table private.store_telegram_photos enable row level security;
revoke all on private.store_telegram_photos from public,anon,authenticated;
grant all on private.store_telegram_photos to service_role;
-- This service-only RPC returns metadata only for the exact approved public source hash.
create function public.store_telegram_photo(p_key text,p_product uuid,p_value jsonb default null) returns jsonb language plpgsql set search_path='' as $$
begin
 if p_key !~ '^[a-f0-9]{64}$' then raise exception 'Invalid image key';end if;
 if p_value is not null then
  if p_value->>'photo_path'<>p_key||'/photo.jpg' or p_value->>'thumb_path'<>p_key||'/thumb.jpg' or (p_value->>'width')::int not between 1 and 1280 or (p_value->>'height')::int not between 1 and 1280 then raise exception 'Invalid image metadata';end if;
  insert into private.store_telegram_photos(source_key,product_id,photo_path,thumb_path,width,height) values(p_key,p_product,p_value->>'photo_path',p_value->>'thumb_path',(p_value->>'width')::int,(p_value->>'height')::int) on conflict(source_key) do nothing;
 end if;
 return(select to_jsonb(p)-'product_id' from private.store_telegram_photos p where source_key=p_key and product_id=p_product);
end $$;
revoke all on function public.store_telegram_photo(text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.store_telegram_photo(text,uuid,jsonb) to service_role;
