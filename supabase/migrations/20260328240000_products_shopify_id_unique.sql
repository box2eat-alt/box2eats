-- Add unique constraint on shopify_id so upsert works correctly
alter table public.products
  drop constraint if exists products_shopify_id_unique;

alter table public.products
  add constraint products_shopify_id_unique unique (shopify_id);
