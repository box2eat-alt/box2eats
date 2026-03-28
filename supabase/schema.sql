-- =============================================
-- Box2eats — full schema + RLS + seed + storage
-- Safe to run more than once (idempotent where possible).
-- Run in: Supabase Dashboard → SQL Editor → New query → Paste → Run
-- =============================================

-- 1. Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  phone_number text,
  delivery_address text,
  dietary_preferences text[] default '{}',
  saved_addresses jsonb default '[]',
  role text default 'user' check (role in ('user', 'admin')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. Products
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text default '',
  price numeric(10,2) not null default 0,
  image_url text,
  category text check (category in ('breakfast','lunch','dinner','snacks','drinks','desserts')),
  categories text[] default '{}',
  dietary_tags text[] default '{}',
  calories integer,
  protein integer,
  in_stock boolean default true,
  featured boolean default false,
  variants jsonb default '[]',
  cost numeric(10,2),
  large_price numeric(10,2),
  large_cost numeric(10,2),
  regular_variant text,
  large_variant text,
  images text[] default '{}',
  shopify_id text,
  shopify_variant_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. Orders
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null,
  user_id uuid references auth.users(id) on delete set null,
  user_email text not null,
  items jsonb not null default '[]',
  total numeric(10,2) not null default 0,
  status text default 'pending' check (status in ('pending','confirmed','preparing','out_for_delivery','delivered','cancelled')),
  delivery_address text,
  delivery_instructions text,
  phone_number text,
  order_type text default 'pickup',
  pickup_location text,
  pickup_address text,
  customer_first_name text,
  customer_last_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. Cart items
create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  product_name text not null,
  product_price numeric(10,2) not null,
  product_image text,
  quantity integer default 1,
  created_at timestamptz default now()
);

-- 5. Favorites
create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, product_id)
);

-- 6. Reviews
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  user_email text,
  user_name text default 'Anonymous',
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamptz default now()
);

-- Indexes
create index if not exists idx_products_in_stock on public.products(in_stock);
create index if not exists idx_products_category on public.products(category);
create index if not exists idx_orders_user_id on public.orders(user_id);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_cart_items_user_id on public.cart_items(user_id);
create index if not exists idx_favorites_user_id on public.favorites(user_id);
create index if not exists idx_reviews_product_id on public.reviews(product_id);

-- =============================================
-- Row Level Security
-- =============================================

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.cart_items enable row level security;
alter table public.favorites enable row level security;
alter table public.reviews enable row level security;

-- Profiles
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Admins can view all profiles" on public.profiles;

create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Admins can view all profiles"
  on public.profiles for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Only admins may change profile.role; others keep existing role on update (trigger).
create or replace function public.enforce_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and (new.role is distinct from old.role) then
    if not exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    ) then
      new.role := old.role;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists on_profile_role_guard on public.profiles;
create trigger on_profile_role_guard
  before update on public.profiles
  for each row
  execute function public.enforce_profile_role_change();

drop policy if exists "Admins can update all profiles" on public.profiles;
create policy "Admins can update all profiles"
  on public.profiles for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
    and role in ('user', 'admin')
  );

-- Products
drop policy if exists "Anyone can view products" on public.products;
drop policy if exists "Admins can insert products" on public.products;
drop policy if exists "Admins can update products" on public.products;
drop policy if exists "Admins can delete products" on public.products;

create policy "Anyone can view products"
  on public.products for select using (true);

create policy "Admins can insert products"
  on public.products for insert with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Admins can update products"
  on public.products for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Admins can delete products"
  on public.products for delete using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Orders
drop policy if exists "Users can view own orders" on public.orders;
drop policy if exists "Users can create orders" on public.orders;
drop policy if exists "Admins can view all orders" on public.orders;
drop policy if exists "Admins can update orders" on public.orders;

create policy "Users can view own orders"
  on public.orders for select using (auth.uid() = user_id);

create policy "Users can create orders"
  on public.orders for insert with check (auth.uid() = user_id);

create policy "Admins can view all orders"
  on public.orders for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Admins can update orders"
  on public.orders for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Cart
drop policy if exists "Users can view own cart" on public.cart_items;
drop policy if exists "Users can add to cart" on public.cart_items;
drop policy if exists "Users can update own cart" on public.cart_items;
drop policy if exists "Users can delete own cart items" on public.cart_items;

create policy "Users can view own cart"
  on public.cart_items for select using (auth.uid() = user_id);

create policy "Users can add to cart"
  on public.cart_items for insert with check (auth.uid() = user_id);

create policy "Users can update own cart"
  on public.cart_items for update using (auth.uid() = user_id);

create policy "Users can delete own cart items"
  on public.cart_items for delete using (auth.uid() = user_id);

-- Favorites
drop policy if exists "Users can view own favorites" on public.favorites;
drop policy if exists "Users can add favorites" on public.favorites;
drop policy if exists "Users can delete own favorites" on public.favorites;

create policy "Users can view own favorites"
  on public.favorites for select using (auth.uid() = user_id);

create policy "Users can add favorites"
  on public.favorites for insert with check (auth.uid() = user_id);

create policy "Users can delete own favorites"
  on public.favorites for delete using (auth.uid() = user_id);

-- Reviews
drop policy if exists "Anyone can view reviews" on public.reviews;
drop policy if exists "Users can create reviews" on public.reviews;

create policy "Anyone can view reviews"
  on public.reviews for select using (true);

create policy "Users can create reviews"
  on public.reviews for insert with check (auth.uid() = user_id);

-- =============================================
-- Storage: product images (admin uploads in AdminProducts)
-- =============================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read product images" on storage.objects;
drop policy if exists "Admins upload product images" on storage.objects;
drop policy if exists "Admins update product images" on storage.objects;
drop policy if exists "Admins delete product images" on storage.objects;

create policy "Public read product images"
  on storage.objects for select
  using (bucket_id = 'product-images');

create policy "Admins upload product images"
  on storage.objects for insert
  with check (
    bucket_id = 'product-images'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Admins update product images"
  on storage.objects for update
  using (
    bucket_id = 'product-images'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Admins delete product images"
  on storage.objects for delete
  using (
    bucket_id = 'product-images'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- =============================================
-- Seed products (only if table is empty)
-- =============================================
do $$
begin
  if not exists (select 1 from public.products limit 1) then
    insert into public.products (name, description, price, image_url, category, calories, protein, in_stock, featured, dietary_tags) values
      ('The Good Morning', 'You get it all in this one! A high protein waffle, a half and half scramble of whole eggs and egg whites and two turkey sausages.', 0.10, 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=800&q=80', 'breakfast', 520, 42, true, true, array['high-protein']::text[]),
      ('Taco Bowl', 'Lean ground beef simmered in tangy taco and salsa seasoning, served with Spanish rice and bean salad. Topped with cheese.', 15.00, 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?auto=format&fit=crop&w=800&q=80', 'lunch', 610, 38, true, false, array['high-protein']::text[]),
      ('Steak and eggs', 'Steak and eggs is a breakfast classic! Pan seared steak bites with half and half whole egg and egg whites paired with hash browns.', 16.50, 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80', 'breakfast', 680, 52, true, true, array['high-protein','keto']::text[]),
      ('Protein Power balls', 'The wait is over - Protein bites are back! With 7g of protein and only 95 calories each, these protein bites make the perfect snack.', 13.50, 'https://images.unsplash.com/photo-1604908176997-125f25cc500f?auto=format&fit=crop&w=800&q=80', 'snacks', 285, 21, true, true, array['high-protein','gluten-free']::text[]),
      ('Protein donuts (3 donuts for $12)', 'The high protein snack you didn''t know you needed! These delicious donuts only run about 96 calories and contain 10g of protein.', 13.50, 'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=800&q=80', 'desserts', 288, 30, true, false, array['high-protein']::text[]),
      ('Pro-oats', 'This is the easiest and most delicious breakfast you will eat! It''s a solid staple in my breakfast rotation for sure.', 12.00, 'https://images.unsplash.com/photo-1517673400267-0251440c45dc?auto=format&fit=crop&w=800&q=80', 'breakfast', 420, 28, true, false, array['vegetarian']::text[]),
      ('Power Mini muffins', 'Power muffins! The perfect little burst of energy when you need a pick me up during the day! Made with banana and oats.', 13.50, 'https://images.unsplash.com/photo-1558303926-f5b2079ceeb1?auto=format&fit=crop&w=800&q=80', 'snacks', 180, 12, true, false, array['vegetarian']::text[]),
      ('The Loaded Breakfast bowl', 'The Perfect start to your day! This breakfast bowl contains 40g protein per serving and is made with whole eggs and egg whites.', 15.00, 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=800&q=80', 'breakfast', 550, 40, true, true, array['high-protein']::text[]),
      ('Peanut butter protein cookie dough', 'If you love munching on cookie dough then this is the snack for you! Perfect for after workout, before workout or anytime.', 6.50, 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=800&q=80', 'snacks', 220, 18, true, false, array['high-protein','vegetarian']::text[]),
      ('Mango Raz chia pudding', 'Chia seed pudding made with coconut milk and maple syrup and a fresh mango and raspberry compote. 100 Cals. 8g protein.', 10.50, 'https://images.unsplash.com/photo-1546548970-71785318a17b?auto=format&fit=crop&w=800&q=80', 'desserts', 100, 8, true, false, array['vegan','gluten-free']::text[]),
      ('Kids Cheesy Mac', 'No kid can resist my cheesy macaroni! 3 ingredients. Cheese, milk, flour. Choose plain or add-ons like veggies or chicken.', 10.50, 'https://images.unsplash.com/photo-1543339494-b4cd4f7ba686?auto=format&fit=crop&w=800&q=80', 'lunch', 380, 14, true, false, array['vegetarian']::text[]),
      ('Honey Lime Chicken Power bowl', 'Honey lime chicken power bowl! The perfect meal if you''re looking for something light and low carb! Tender pieces of chicken.', 15.00, 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80', 'dinner', 480, 44, true, true, array['high-protein','gluten-free']::text[]),
      ('High Protein pancakes', 'These satisfying pancakes are the perfect start to your morning. Made with egg whites and oats they are high protein and delicious.', 13.50, 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=800&q=80', 'breakfast', 440, 36, true, false, array['high-protein','vegetarian']::text[]),
      ('Grilled Steak and seasonal veg', 'Premium grilled steak served with a medley of seasonal roasted vegetables and herb butter.', 18.00, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80', 'dinner', 620, 48, true, false, array['high-protein','keto','gluten-free']::text[]);
  end if;
end $$;
