-- Transaction-only fixture: never call Telegram or commit test events.
do $$
declare oid bigint; owner_id text:=(800000000000000+floor(random()*100000000000000))::bigint::text; event_id bigint; claimed jsonb; fixture_key text:='claim-fixture:'||gen_random_uuid();
begin
 if public.store_claim_notification('missing-fixture','order',-1) is not null then raise exception 'Missing order claim must be SQL NULL'; end if;
 if public.store_claim_custom_notification(-1) is not null then raise exception 'Missing custom claim must be SQL NULL'; end if;
 insert into public.orders(user_id,client_name,client_phone,delivery_method,payment_method,total_price_usd,items,status,payment_status) values(owner_id,'Claim fixture','+998901234567','pickup','upon_receipt',1,'[]','Активный','pending') returning id into oid;
 insert into private.store_outbox(event_key,user_id,order_id,kind) values(fixture_key,owner_id,oid,'order') returning id into event_id;
 claimed:=public.store_claim_notification(owner_id,'order',oid);
 if (claimed->>'id')::bigint is distinct from event_id then raise exception 'First claim failed'; end if;
 if public.store_claim_notification(owner_id,'order',oid) is not null then raise exception 'Concurrent duplicate claim accepted'; end if;
 update private.store_outbox set claimed_at=now()-interval '2 hours' where id=event_id;
 if public.store_claim_notification(owner_id,'order',oid) is null then raise exception 'Expired lease cannot retry'; end if;
 perform public.store_complete_notification(event_id);
 if public.store_claim_notification(owner_id,'order',oid) is not null then raise exception 'Sent event reclaimed'; end if;
 insert into private.store_outbox(event_key,user_id,kind,payload) values(fixture_key||':custom','claim-fixture','custom','{"message":"Never send this rollback fixture"}') returning id into event_id;
 if public.store_claim_custom_notification(event_id) is null then raise exception 'Custom claim failed'; end if;
 if public.store_claim_custom_notification(event_id) is not null then raise exception 'Concurrent custom claim accepted'; end if;
 perform public.store_complete_notification(event_id);
 if public.store_claim_custom_notification(event_id) is not null then raise exception 'Sent custom event reclaimed'; end if;
end $$;
