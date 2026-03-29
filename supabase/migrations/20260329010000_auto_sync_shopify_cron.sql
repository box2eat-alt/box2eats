-- Enable pg_cron and pg_net extensions for scheduled HTTP calls
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- Schedule Shopify sync to run every hour
-- Mary updates products on Fridays, but we run hourly to catch changes quickly
select cron.schedule(
  'sync-shopify-products',
  '0 * * * *',  -- every hour on the hour
  $$
  select net.http_post(
    url := 'https://opbljeqvphjmnbkgoppt.supabase.co/functions/v1/sync-shopify-products',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
