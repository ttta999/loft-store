CREATE OR REPLACE FUNCTION public.store_claim_custom_notification(p_id bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare event private.store_outbox%rowtype;
begin
  update private.store_outbox set claimed_at=now(),attempts=attempts+1 where id=p_id and kind='custom' and sent_at is null
    and (claimed_at is null or claimed_at<now()-make_interval(secs=>least(3600,greatest(60,attempts*60)))) returning * into event;
  if not found then return null; end if;
  return to_jsonb(event);
end $function$;

CREATE OR REPLACE FUNCTION public.store_claim_notification(p_user text, p_kind text, p_id bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare event private.store_outbox%rowtype;
begin
  update private.store_outbox set claimed_at=now(),attempts=attempts+1
  where user_id=p_user and kind=p_kind and order_id=p_id and sent_at is null
    and (claimed_at is null or claimed_at<now()-make_interval(secs=>least(3600,greatest(60,attempts*60)))) returning * into event;
  if not found then return null; end if;
  return to_jsonb(event);
end $function$;
