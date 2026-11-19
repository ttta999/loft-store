-- Store configuration only. Never convert product variants or historic order sizes.
update public.subcategories set size_type='numeric',sizes='["36","38","40","42","44","46","48","50","52","54","56"]'::jsonb
where category_id='clothes' and id in ('pants','trousers','jeans');
