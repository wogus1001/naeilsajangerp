create table if not exists public.company_menu_features (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  feature_key text not null,
  enabled boolean default true not null,
  updated_by uuid references public.profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (company_id, feature_key)
);

create index if not exists idx_company_menu_features_company_id
  on public.company_menu_features (company_id);

alter table public.company_menu_features enable row level security;

drop policy if exists "Users can view own company menu features" on public.company_menu_features;
create policy "Users can view own company menu features" on public.company_menu_features
  for select using (
    company_id = get_my_company_id()
    or exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role = 'admin'
    )
  );

drop policy if exists "Admins can manage company menu features" on public.company_menu_features;
create policy "Admins can manage company menu features" on public.company_menu_features
  for all using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role = 'admin'
    )
  );
