-- Transaction-only fixture: never call Telegram or commit test events.
do $$
declare event_id bigint; claimed jsonb; fixture_key text:='claim-fixture:'||gen_random_uuid();
begin
 if public.store_claim_notification('missing-fixture','order',-1) is not null then raise exception 'Missing order claim must be SQL NULL'; end if;
 if public.store_claim_custom_notification(-1) is not null then raise exception 'Missing custom claim must be SQL NULL'; end if;
 insert into private.store_outbox(event_key,user_id,order_id,kind) values(fixture_key,'claim-fixture',-1,'order') returning id into event_id;
 claimed:=public.store_claim_notification('claim-fixture','order',-1);
 if (claimed->>'id')::bigint is distinct from event_id then raise exception 'First claim failed'; end if;
 if public.store_claim_notification('claim-fixture','order',-1) is not null then raise exception 'Concurrent duplicate claim accepted'; end if;
 update private.store_outbox set claimed_at=now()-interval '2 hours' where id=event_id;
 if public.store_claim_notification('claim-fixture','order',-1) is null then raise exception 'Expired lease cannot retry'; end if;
 perform public.store_complete_notification(event_id);
 if public.store_claim_notification('claim-fixture','order',-1) is not null then raise exception 'Sent event reclaimed'; end if;
 insert into private.store_outbox(event_key,user_id,kind,payload) values(fixture_key||':custom','claim-fixture','custom','{"message":"Never send this rollback fixture"}') returning id into event_id;
 if public.store_claim_custom_notification(event_id) is null then raise exception 'Custom claim failed'; end if;
 if public.store_claim_custom_notification(event_id) is not null then raise exception 'Concurrent custom claim accepted'; end if;
 perform public.store_complete_notification(event_id);
 if public.store_claim_custom_notification(event_id) is not null then raise exception 'Sent custom event reclaimed'; end if;
end $$;
