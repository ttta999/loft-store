-- A receipt is evidence for review, not confirmed payment. Keep the quote reusable if that review expires.
create or replace function private.store_finalize_special_requests(p_order_id bigint) returns void
language plpgsql security invoker set search_path='' as $$
declare r public.china_requests%rowtype;
begin
 if not exists(select 1 from public.orders o where o.id=p_order_id and o.checkout_abandoned_at is null and o.status<>'Отменён'
   and (case when o.special_fulfillment then o.payment_status='paid' and o.paid_at is not null
     else o.payment_method<>'online_card' or o.receipt_submitted_at is not null or o.payment_status='paid' end)) then return; end if;
 for r in update public.china_requests set status='Оформлен',converted_to_order_id=p_order_id::text,reserved_order_id=null
   where reserved_order_id=p_order_id and status='Оценён' and converted_to_order_id is null returning * loop
   perform private.store_queue_special_status(r.id);
 end loop;
end $$;

create or replace function public.store_cancel_request(p_user text,p_id bigint) returns boolean
language plpgsql security invoker set search_path='' as $$
declare r public.china_requests%rowtype;
begin
 perform pg_advisory_xact_lock(hashtextextended('store-user:'||p_user,0));
 select * into r from public.china_requests where id=p_id and user_id=p_user for update;
 if not found then return false; end if;
 if r.status='Отменён' then return true; end if;
 if r.status not in ('На оценке','Оценён') or r.converted_to_order_id is not null then return false; end if;
 if r.reserved_order_id is not null and not public.store_cancel_order(p_user,r.reserved_order_id,false) then return false; end if;
 update public.china_requests set status='Отменён',reserved_order_id=null where id=p_id;
 perform private.store_queue_special_status(p_id);
 return true;
end $$;
