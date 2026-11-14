-- Invoker worker RPCs need these helpers; no browser role receives them.
grant execute on function public.store_catalog_variants() to service_role;
grant execute on function private.store_tasks(),private.store_task_details(),private.store_within_work_hours() to service_role;
