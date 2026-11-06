-- Run only after the new storefront and admin deployments are ready.
revoke insert,update,delete on public.orders,public.china_requests,public.products,public.product_colors,public.product_variants from authenticated;
revoke select on public.product_variants from anon,authenticated;
select cron.alter_job((select jobid from cron.job where jobname='loft-maintenance'),active:=true);
