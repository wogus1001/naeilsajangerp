-- Realty external listing import MVP
-- Apply in Supabase SQL editor after the base schema.

create table if not exists public.realty_import_jobs (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  requester_id uuid references public.profiles(id),
  reference_property_id text references public.properties(id) on delete set null,
  source text default 'all' not null,
  region text,
  query text,
  listing_types text[] default array['store']::text[],
  status text default 'pending' not null,
  total_count integer default 0 not null,
  created_count integer default 0 not null,
  updated_count integer default 0 not null,
  duplicate_count integer default 0 not null,
  failed_count integer default 0 not null,
  warnings text[] default '{}'::text[],
  errors jsonb default '[]'::jsonb,
  started_at timestamp with time zone default timezone('utc'::text, now()) not null,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  data jsonb default '{}'::jsonb
);

create table if not exists public.external_property_listings (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  import_job_id uuid references public.realty_import_jobs(id) on delete set null,
  property_id text references public.properties(id) on delete set null,
  duplicate_of_property_id text references public.properties(id) on delete set null,
  source text not null,
  source_listing_id text not null,
  source_url text,
  title text,
  address text,
  region text,
  latitude numeric(12, 8),
  longitude numeric(12, 8),
  trade_type text,
  property_type text,
  deposit_amount numeric,
  monthly_rent numeric,
  sale_price numeric,
  maintenance_fee numeric,
  area_sqm numeric,
  area_pyeong text,
  floor_info text,
  image_urls text[] default '{}'::text[],
  status text default 'imported' not null,
  collected_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  raw jsonb default '{}'::jsonb,
  data jsonb default '{}'::jsonb
);

alter table public.realty_import_jobs enable row level security;
alter table public.external_property_listings enable row level security;

create policy "Company members can view realty_import_jobs" on public.realty_import_jobs
  for select using (company_id = get_my_company_id());

create policy "Company members can insert realty_import_jobs" on public.realty_import_jobs
  for insert with check (company_id = get_my_company_id());

create policy "Company members can update realty_import_jobs" on public.realty_import_jobs
  for update using (company_id = get_my_company_id())
  with check (company_id = get_my_company_id());

create policy "Company members can delete realty_import_jobs" on public.realty_import_jobs
  for delete using (company_id = get_my_company_id());

create policy "Company members can view external_property_listings" on public.external_property_listings
  for select using (company_id = get_my_company_id());

create policy "Company members can insert external_property_listings" on public.external_property_listings
  for insert with check (company_id = get_my_company_id());

create policy "Company members can update external_property_listings" on public.external_property_listings
  for update using (company_id = get_my_company_id())
  with check (company_id = get_my_company_id());

create policy "Company members can delete external_property_listings" on public.external_property_listings
  for delete using (company_id = get_my_company_id());

create index if not exists idx_realty_import_jobs_company_created
  on public.realty_import_jobs (company_id, created_at desc);

create index if not exists idx_realty_import_jobs_reference_property
  on public.realty_import_jobs (reference_property_id, created_at desc);

create unique index if not exists idx_external_property_listings_source_unique
  on public.external_property_listings (company_id, source, source_listing_id);

create index if not exists idx_external_property_listings_company_collected
  on public.external_property_listings (company_id, collected_at desc);

create index if not exists idx_external_property_listings_property
  on public.external_property_listings (property_id);

