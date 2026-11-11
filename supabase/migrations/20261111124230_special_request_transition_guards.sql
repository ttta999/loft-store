alter table public.china_requests drop constraint store_special_status_valid;
alter table public.china_requests add constraint store_special_status_valid check(status is not null and status in ('На оценке','Оценён','Оформлен','Отменён','Отклонён'));

create or replace function public.store_admin_request_status(p_id bigint,p_status text,p_extra jsonb default '{}',p_notice jsonb default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.china_requests%rowtype; price numeric; quote_comment text; reason text;
begin
 if not public.store_is_admin() then raise insufficient_privilege; end if;
 select * into r from public.china_requests where id=p_id;
 if not found then raise exception 'Спецзаказ недоступен'; end if;
 perform pg_advisory_xact_lock(hashtextextended('store-user:'||r.user_id,0));
 select * into r from public.china_requests where id=p_id for update;
 if p_status is null or p_status not in ('Оценён','Отклонён') then raise exception 'Недопустимый статус спецзаказа'; end if;
 quote_comment:=btrim(coalesce(p_extra->>'manager_comment','')); reason:=btrim(coalesce(p_extra->>'rejection_reason',p_extra->>'manager_comment',''));
 if p_status='Оценён' then
   price:=(p_extra->>'manager_price')::numeric;
   if price is null or not(price>0 and price<=1000000) or price<>round(price,2) or length(quote_comment)>2000 then raise exception 'Укажите корректную цену и комментарий'; end if;
 elsif length(reason) not between 1 and 2000 then raise exception 'Укажите причину отказа'; end if;
 -- Retire a notification token from an old admin client, so it cannot send the obsolete template as well.
 if p_notice is not null then
   insert into private.store_outbox(event_key,user_id,kind,payload,sent_at)
   values('admin:'||auth.uid()||':'||(p_notice->>'key')::uuid,r.user_id,'custom',jsonb_build_object('message',regexp_replace(p_notice->>'message','</?(b|i|u|s|code|pre)>','','g')),clock_timestamp())
   on conflict(event_key) do update set sent_at=excluded.sent_at;
 end if;
 if r.status=p_status and ((p_status='Оценён' and r.manager_price=price and coalesce(r.manager_comment,'')=quote_comment) or (p_status='Отклонён' and r.rejection_reason=reason)) then return to_jsonb(r); end if;
 if r.status<>'На оценке' or r.converted_to_order_id is not null or r.reserved_order_id is not null then raise exception 'Заявка уже изменена. Обновите список.'; end if;
 update public.china_requests set status=p_status,
   manager_price=case when p_status='Оценён' then price else manager_price end,
   manager_comment=case when p_status='Оценён' then nullif(quote_comment,'') else manager_comment end,
   rejection_reason=case when p_status='Отклонён' then reason else null end where id=p_id returning * into r;
 perform private.store_queue_special_status(r.id);
 begin perform private.store_wake_worker(); exception when others then null; end;
 return to_jsonb(r);
end $$;

