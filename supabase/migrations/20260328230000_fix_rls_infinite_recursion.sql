-- Fix infinite recursion in profiles RLS policies.
-- The "Admins can view all profiles" policy was querying the profiles table
-- inside its own USING clause, causing infinite recursion (PG error 42P17).
--
-- Fix: use a SECURITY DEFINER function to check admin status.
-- SECURITY DEFINER bypasses RLS, so the check doesn't recurse.

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'::public.app_role
  );
$$;

-- Recreate all policies that referenced profiles inside profiles
drop policy if exists "Admins can view all profiles" on public.profiles;
drop policy if exists "Admins can update all profiles" on public.profiles;
drop policy if exists "Admins can insert products" on public.products;
drop policy if exists "Admins can update products" on public.products;
drop policy if exists "Admins can delete products" on public.products;
drop policy if exists "Admins can view all orders" on public.orders;
drop policy if exists "Admins can update orders" on public.orders;
drop policy if exists "Admins upload product images" on storage.objects;
drop policy if exists "Admins update product images" on storage.objects;
drop policy if exists "Admins delete product images" on storage.objects;

-- Profiles
create policy "Admins can view all profiles"
  on public.profiles for select
  using (public.is_admin());

create policy "Admins can update all profiles"
  on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin());

-- Products
create policy "Admins can insert products"
  on public.products for insert
  with check (public.is_admin());

create policy "Admins can update products"
  on public.products for update
  using (public.is_admin());

create policy "Admins can delete products"
  on public.products for delete
  using (public.is_admin());

-- Orders
create policy "Admins can view all orders"
  on public.orders for select
  using (public.is_admin());

create policy "Admins can update orders"
  on public.orders for update
  using (public.is_admin());

-- Storage
create policy "Admins upload product images"
  on storage.objects for insert
  with check (
    bucket_id = 'product-images' and public.is_admin()
  );

create policy "Admins update product images"
  on storage.objects for update
  using (
    bucket_id = 'product-images' and public.is_admin()
  );

create policy "Admins delete product images"
  on storage.objects for delete
  using (
    bucket_id = 'product-images' and public.is_admin()
  );
