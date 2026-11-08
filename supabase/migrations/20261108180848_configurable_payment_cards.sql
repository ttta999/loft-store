-- Public receiving details; editing remains protected by the existing MFA admin policy.
alter table public.settings add constraint store_payment_cards_valid check (
  key <> 'payment_cards' or coalesce(
    jsonb_typeof(value) = 'object' and value ?& array['UZS','USD']
    and value - 'UZS' - 'USD' = '{}'::jsonb
    and jsonb_typeof(value->'UZS') = 'object' and jsonb_typeof(value->'USD') = 'object'
    and (value->'UZS') - 'number' - 'holder' = '{}'::jsonb
    and (value->'USD') - 'number' - 'holder' = '{}'::jsonb
    and jsonb_typeof(value#>'{UZS,number}') = 'string' and (value#>>'{UZS,number}') ~ '^[0-9]{16}$'
    and jsonb_typeof(value#>'{USD,number}') = 'string' and (value#>>'{USD,number}') ~ '^[0-9]{16}$'
    and jsonb_typeof(value#>'{UZS,holder}') = 'string' and length(btrim(value#>>'{UZS,holder}')) between 1 and 100
    and jsonb_typeof(value#>'{USD,holder}') = 'string' and length(btrim(value#>>'{USD,holder}')) between 1 and 100,
  false)
);
insert into public.settings(key,value) values('payment_cards','{"UZS":{"number":"5614382959503289","holder":"Otabek Khusanov"},"USD":{"number":"4023057010852969","holder":"Khusan Raximov"}}') on conflict(key) do nothing;
alter policy storefront_settings on public.settings using (key = any(array['exchange_rate','sale_mode_enabled','delivery_price','free_delivery_threshold','payment_cards']));
