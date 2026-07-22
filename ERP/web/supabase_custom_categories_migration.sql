create extension if not exists "uuid-ossp";

create table if not exists public.custom_categories (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid not null references public.companies(id) on delete cascade,
  category_type text not null default 'industry_detail',
  parent_category text,
  sub_category text,
  name text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint custom_categories_name_not_blank check (length(btrim(name)) > 0),
  constraint custom_categories_type_not_blank check (length(btrim(category_type)) > 0)
);

alter table public.custom_categories enable row level security;

drop policy if exists "Company members can view custom_categories" on public.custom_categories;
drop policy if exists "Company members can insert custom_categories" on public.custom_categories;
drop policy if exists "Company members can update custom_categories" on public.custom_categories;
drop policy if exists "Company members can delete custom_categories" on public.custom_categories;

revoke all on table public.custom_categories from anon, authenticated;

create index if not exists idx_custom_categories_company_hierarchy_name
  on public.custom_categories (
    company_id,
    category_type,
    coalesce(parent_category, ''),
    coalesce(sub_category, ''),
    lower(btrim(name))
  );

create index if not exists idx_custom_categories_company_type_created
  on public.custom_categories (company_id, category_type, created_at desc);

notify pgrst, 'reload schema';
