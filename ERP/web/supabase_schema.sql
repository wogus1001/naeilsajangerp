-- Enable UUID extension
create extension if not exists "uuid-ossp";
create extension if not exists pg_trgm;

-- 1. COMPANIES Table (Tenants)
create table if not exists public.companies (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  business_number text,
  owner_id uuid, -- Link to auth.users later
  status text default 'active', -- active, non_payment, blocked
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. PROFILES Table (Extends auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  company_id uuid references public.companies(id),
  email text,
  name text,
  role text default 'staff', -- admin, manager, staff
  status text default 'pending', -- active, pending
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. RLS (Row Level Security) Helper Function
-- Function to get the current user's company_id
create or replace function get_my_company_id()
returns uuid
language sql
security definer
as $$
  select company_id from public.profiles where id = auth.uid();
$$;

-- 4. ENABLE RLS
alter table public.companies enable row level security;
alter table public.profiles enable row level security;

-- 5. RLS POLICIES

-- Companies: Users can only view their own company
create policy "Users can view own company" on public.companies
  for select using (id = get_my_company_id());

-- Profiles: Users can view profiles from the same company
create policy "Users can view members of same company" on public.profiles
  for select using (company_id = get_my_company_id());

-- Profiles: Users can update their own profile
create policy "Users can update own profile" on public.profiles
  for update using (id = auth.uid());

-- 6. AUTH TRIGGER (Auto-create profile)
-- Note: This trigger handles new user signups via Supabase Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'name', 'staff');
  return new;
end;
$$;

-- Drop existing trigger if exists to allow update
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 7. MEMOS Table
create table if not exists public.memos (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  content text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. NOTICES Table
create table if not exists public.notices (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.companies(id) on delete cascade, -- Null if system notice
  title text not null,
  content text,
  type text default 'team', -- team, system
  author_id uuid, -- informational only
  is_pinned boolean default false,
  views integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. PHASE 2 RLS POLICIES
alter table public.memos enable row level security;
alter table public.notices enable row level security;

-- Memos: Private to user
create policy "Users can manage own memos" on public.memos
  for all using (user_id = auth.uid());

-- Notices: View (System wide OR My Company)
create policy "Users can view relevant notices" on public.notices
  for select using (
    company_id is null 
    or 
    company_id = get_my_company_id()
  );

-- Notices: Create/Update (Admins/Managers of their company)
-- Simplified: Allow any auth user to create for now, restricted by logic later or refine policy
create policy "Users can create notices for their company" on public.notices
  for insert with check (
    -- System notice: only if super admin (skip implementation for now, allow null for logic)
    -- Team notice: company_id match
    company_id = get_my_company_id()
  );

-- 10. FIXES & ALTERATIONS
-- Add missing FK for author_id in notices to enable joins
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'notices_author_id_fkey') then
    alter table public.notices
    add constraint notices_author_id_fkey
    foreign key (author_id)
    references public.profiles (id);
  end if;
end $$;

-- 11. PROPERTIES Table (Hybrid: Core Cols + JSONB)
create table if not exists public.properties (
  id text primary key, -- Legacy ID preservation
  company_id uuid references public.companies(id) on delete cascade not null,
  manager_id uuid references public.profiles(id), -- Can be null?
  name text,
  status text, -- progress/grade
  operation_type text, -- type
  address text,
  is_favorite boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  data jsonb default '{}'::jsonb -- Full payload for detail fields
);

-- 12. CUSTOMERS Table
create table if not exists public.customers (
  id text primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  manager_id uuid references public.profiles(id),
  name text,
  grade text, -- progress/status
  mobile text, 
  is_favorite boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  data jsonb default '{}'::jsonb
);

-- 13. CONTRACTS Table
create table if not exists public.contracts (
  id text primary key,
  company_id uuid references public.companies(id) on delete cascade, 
  user_id uuid references public.profiles(id), -- Manager who owns contract
  property_id text references public.properties(id) on delete set null,
  name text,
  status text, -- on_going, etc
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  data jsonb default '{}'::jsonb
);

-- 14. PHASE 3 RLS
alter table public.properties enable row level security;
alter table public.customers enable row level security;
alter table public.contracts enable row level security;

-- Properties: View/Manage own company's data
create policy "Company members can view properties" on public.properties
  for select using (company_id = get_my_company_id());

create policy "Company members can insert properties" on public.properties
  for insert with check (company_id = get_my_company_id());

create policy "Company members can update properties" on public.properties
  for update using (company_id = get_my_company_id());

create policy "Company members can delete properties" on public.properties
  for delete using (company_id = get_my_company_id());

-- Customers
create policy "Company members can view customers" on public.customers
  for select using (company_id = get_my_company_id());

create policy "Company members can insert customers" on public.customers
  for insert with check (company_id = get_my_company_id());

create policy "Company members can update customers" on public.customers
  for update using (company_id = get_my_company_id());

create policy "Company members can delete customers" on public.customers
  for delete using (company_id = get_my_company_id());

-- Contracts
create policy "Company members can view contracts" on public.contracts
  for select using (company_id = get_my_company_id());

create policy "Company members can insert contracts" on public.contracts
  for insert with check (company_id = get_my_company_id());

create policy "Company members can update contracts" on public.contracts
  for update using (company_id = get_my_company_id());

create policy "Company members can delete contracts" on public.contracts
  for delete using (company_id = get_my_company_id());



-- 15. UCANSIGN INTEGRATION
alter table public.profiles add column if not exists ucansign_expires_at bigint; -- Store as timestamp ms


-- 16. SCHEDULES Table (Work History)
create table if not exists public.schedules (
  id text primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  user_id uuid references public.profiles(id),
  customer_id text references public.customers(id) on delete set null,
  property_id text references public.properties(id) on delete set null,
  business_card_id text, -- No FK yet
  title text,
  date text, -- YYYY-MM-DD
  scope text, -- work, public, personal
  status text, -- progress, done, etc
  type text, -- work, schedule
  color text,
  details text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Schedules
alter table public.schedules enable row level security;

create policy "Company members can view schedules" on public.schedules
  for select using (company_id = get_my_company_id());

create policy "Company members can insert schedules" on public.schedules
  for insert with check (company_id = get_my_company_id());

create policy "Company members can update schedules" on public.schedules
  for update using (company_id = get_my_company_id());

create policy "Company members can delete schedules" on public.schedules
  for delete using (company_id = get_my_company_id());


-- 17. SHARE LINKS Table (Secret Briefing)
create table if not exists public.share_links (
  id bigint generated by default as identity primary key,
  token text unique not null,
  property_id text references public.properties(id) on delete cascade not null,
  consultant_id uuid references public.profiles(id) not null,
  company_id uuid references public.companies(id) not null, -- Added for RLS
  options jsonb, -- { "memo": "Recipient Name", "hide_address": true, "show_briefing_price": true }
  view_count int default 0,
  expires_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Share Links
alter table public.share_links enable row level security;

-- Consultants can view/manage their own links (or company links)
create policy "Company members can view share_links" on public.share_links
  for select using (company_id = get_my_company_id());

create policy "Company members can insert share_links" on public.share_links
  for insert with check (company_id = get_my_company_id());
  
create policy "Company members can update share_links" on public.share_links
  for update using (company_id = get_my_company_id());

create policy "Company members can delete share_links" on public.share_links
  for delete using (company_id = get_my_company_id());

-- Public Access (Anonymous users with valid token)
-- Note: This is tricky with standard RLS if auth.uid() is null.
-- We might need a security definer function or open up public select with token match?
-- For now, allow public select on ALL rows? No, that's unsafe.
-- Strategy: Route Handler will use Service Role Key to fetch data, so public RLS might not be needed for direct client access if we proxy via API.
-- If we use API Route (backend), we bypass RLS using Service Role or we ensure the user is authenticated.
-- Since the receiver is anonymous, we will rely on the Server-Side API endpoint to fetch with admin privileges (Service Role) and return sanitized data.
-- So we DO NOT add a public select policy here to keep it secure. Only authenticated company members can see the raw rows.

-- 18. FRANCHISE LEADS Table (Franchise HQ lead CRM)
create table if not exists public.franchise_leads (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  manager_id uuid references public.profiles(id),
  name text not null,
  mobile text,
  mobile_normalized text,
  source text,
  status text default '문의접수' not null,
  grade text,
  desired_region text,
  budget_min numeric,
  budget_max numeric,
  interested_brand text,
  memo text,
  next_contact_at timestamp with time zone,
  last_contacted_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  data jsonb default '{}'::jsonb
);

alter table public.franchise_leads enable row level security;

create policy "Company members can view franchise_leads" on public.franchise_leads
  for select using (company_id = get_my_company_id());

create policy "Company members can insert franchise_leads" on public.franchise_leads
  for insert with check (company_id = get_my_company_id());

create policy "Company members can update franchise_leads" on public.franchise_leads
  for update using (company_id = get_my_company_id());

create policy "Company members can delete franchise_leads" on public.franchise_leads
  for delete using (company_id = get_my_company_id());

create index if not exists idx_franchise_leads_company_created
  on public.franchise_leads (company_id, created_at desc);

create index if not exists idx_franchise_leads_company_status
  on public.franchise_leads (company_id, status);

create index if not exists idx_franchise_leads_company_manager
  on public.franchise_leads (company_id, manager_id);

create unique index if not exists idx_franchise_leads_company_mobile_unique
  on public.franchise_leads (company_id, mobile_normalized)
  where mobile_normalized is not null and mobile_normalized <> '';

-- 19. FRANCHISE LOCATION MASTER Tables
create table if not exists public.franchise_locations (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  manager_id uuid references public.profiles(id),
  name text not null,
  location_type text default '예정점' not null,
  brand text,
  status text default '검토중' not null,
  region text,
  address text,
  latitude numeric,
  longitude numeric,
  opened_at date,
  source_property_id text references public.properties(id) on delete set null,
  memo text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  data jsonb default '{}'::jsonb
);

alter table public.franchise_locations enable row level security;

create policy "Company members can view franchise_locations" on public.franchise_locations
  for select using (company_id = get_my_company_id());

create policy "Company members can insert franchise_locations" on public.franchise_locations
  for insert with check (company_id = get_my_company_id());

create policy "Company members can update franchise_locations" on public.franchise_locations
  for update using (company_id = get_my_company_id())
  with check (company_id = get_my_company_id());

create policy "Company members can delete franchise_locations" on public.franchise_locations
  for delete using (company_id = get_my_company_id());

create index if not exists idx_franchise_locations_company_updated
  on public.franchise_locations (company_id, updated_at desc);

create index if not exists idx_franchise_locations_company_type_status
  on public.franchise_locations (company_id, location_type, status);

create index if not exists idx_franchise_locations_company_region
  on public.franchise_locations (company_id, region);

-- 20. FRANCHISE BRAND MASTER Tables
create table if not exists public.franchise_brands (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.companies(id) on delete cascade,
  brand_name text not null,
  franchisor_name text,
  disclosure_brand_id text,
  industry text,
  business_type text,
  category_major text,
  category_middle text,
  category_small text,
  recommended_keywords text[] default '{}'::text[],
  source text default 'manual',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  data jsonb default '{}'::jsonb
);

alter table public.franchise_brands enable row level security;

create policy "Company members can view franchise_brands" on public.franchise_brands
  for select using (company_id is null or company_id = get_my_company_id());

create policy "Company members can insert franchise_brands" on public.franchise_brands
  for insert with check (company_id = get_my_company_id());

create policy "Company members can update franchise_brands" on public.franchise_brands
  for update using (company_id = get_my_company_id())
  with check (company_id = get_my_company_id());

create policy "Company members can delete franchise_brands" on public.franchise_brands
  for delete using (company_id = get_my_company_id());

create unique index if not exists idx_franchise_brands_company_name
  on public.franchise_brands (coalesce(company_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(brand_name));

create index if not exists idx_franchise_brands_name
  on public.franchise_brands using gin (brand_name gin_trgm_ops);

create index if not exists idx_franchise_brands_company_updated
  on public.franchise_brands (company_id, updated_at desc);

-- 21. FRANCHISE MARKET MONITORING Tables
create table if not exists public.franchise_market_watchlist (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  brand_id uuid references public.franchise_brands(id) on delete set null,
  brand_name text not null,
  region text not null,
  keyword text not null,
  own_store_name text,
  risk_keywords text[] default array['폐점', '위생', '불친절', '환불', '컴플레인', '사기', '논란']::text[],
  is_active boolean default true not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  data jsonb default '{}'::jsonb
);

alter table public.franchise_market_watchlist enable row level security;

create policy "Company members can view franchise_market_watchlist" on public.franchise_market_watchlist
  for select using (company_id = get_my_company_id());

create policy "Company members can insert franchise_market_watchlist" on public.franchise_market_watchlist
  for insert with check (company_id = get_my_company_id());

create policy "Company members can update franchise_market_watchlist" on public.franchise_market_watchlist
  for update using (company_id = get_my_company_id())
  with check (company_id = get_my_company_id());

create policy "Company members can delete franchise_market_watchlist" on public.franchise_market_watchlist
  for delete using (company_id = get_my_company_id());

create unique index if not exists idx_franchise_market_watchlist_unique
  on public.franchise_market_watchlist (
    company_id,
    lower(brand_name),
    lower(region),
    lower(keyword),
    coalesce(own_store_name, '')
  );

create index if not exists idx_franchise_market_watchlist_company_active
  on public.franchise_market_watchlist (company_id, is_active, updated_at desc);

create table if not exists public.franchise_market_snapshots (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  watchlist_id uuid references public.franchise_market_watchlist(id) on delete set null,
  brand_id uuid references public.franchise_brands(id) on delete set null,
  brand_name text not null,
  region text not null,
  keyword text not null,
  snapshot_date date default current_date not null,
  provider text default 'naver-official' not null,
  naver_query text,
  naver_blog_total integer default 0 not null,
  naver_news_total integer default 0 not null,
  naver_trend_latest numeric,
  naver_trend_delta numeric,
  naver_local_top5 jsonb default '[]'::jsonb,
  serp_provider text,
  serp_query text,
  serp_results jsonb default '[]'::jsonb,
  own_store_name text,
  own_store_rank integer,
  own_store_visible boolean default false not null,
  risk_mentions jsonb default '[]'::jsonb,
  summary jsonb default '{}'::jsonb,
  raw jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.franchise_market_snapshots enable row level security;

create policy "Company members can view franchise_market_snapshots" on public.franchise_market_snapshots
  for select using (company_id = get_my_company_id());

create policy "Company members can insert franchise_market_snapshots" on public.franchise_market_snapshots
  for insert with check (company_id = get_my_company_id());

create policy "Company members can update franchise_market_snapshots" on public.franchise_market_snapshots
  for update using (company_id = get_my_company_id())
  with check (company_id = get_my_company_id());

create policy "Company members can delete franchise_market_snapshots" on public.franchise_market_snapshots
  for delete using (company_id = get_my_company_id());

create index if not exists idx_franchise_market_snapshots_company_date
  on public.franchise_market_snapshots (company_id, snapshot_date desc, created_at desc);

create index if not exists idx_franchise_market_snapshots_watchlist_date
  on public.franchise_market_snapshots (watchlist_id, snapshot_date desc);

create index if not exists idx_franchise_market_snapshots_brand_region
  on public.franchise_market_snapshots (company_id, lower(brand_name), lower(region), snapshot_date desc);

-- 22. META LEAD ADS INTEGRATION Tables
create table if not exists public.meta_lead_connections (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  connected_by uuid references public.profiles(id),
  meta_user_id text,
  meta_page_id text not null,
  meta_page_name text,
  access_token_encrypted text not null,
  token_expires_at timestamp with time zone,
  status text default 'connected' not null,
  last_sync_at timestamp with time zone,
  last_webhook_at timestamp with time zone,
  last_error text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  data jsonb default '{}'::jsonb
);

create table if not exists public.meta_lead_forms (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  connection_id uuid references public.meta_lead_connections(id) on delete cascade not null,
  meta_form_id text not null,
  meta_form_name text,
  enabled boolean default false not null,
  default_manager_id uuid references public.profiles(id),
  field_mapping jsonb default '{}'::jsonb,
  last_synced_at timestamp with time zone,
  last_error text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  data jsonb default '{}'::jsonb
);

create table if not exists public.meta_lead_imports (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  connection_id uuid references public.meta_lead_connections(id) on delete cascade,
  form_id uuid references public.meta_lead_forms(id) on delete set null,
  meta_lead_id text not null,
  franchise_lead_id uuid references public.franchise_leads(id) on delete set null,
  status text default 'received' not null,
  error_message text,
  payload jsonb default '{}'::jsonb,
  received_at timestamp with time zone default timezone('utc'::text, now()) not null,
  imported_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.meta_lead_connections enable row level security;
alter table public.meta_lead_forms enable row level security;
alter table public.meta_lead_imports enable row level security;

create policy "Company members can view meta_lead_connections" on public.meta_lead_connections
  for select using (company_id = get_my_company_id());

create policy "Company managers can manage meta_lead_connections" on public.meta_lead_connections
  for all using (
    company_id = get_my_company_id()
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.company_id = meta_lead_connections.company_id
        and p.role in ('manager', 'admin')
    )
  )
  with check (
    company_id = get_my_company_id()
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.company_id = meta_lead_connections.company_id
        and p.role in ('manager', 'admin')
    )
  );

create policy "Company members can view meta_lead_forms" on public.meta_lead_forms
  for select using (company_id = get_my_company_id());

create policy "Company managers can manage meta_lead_forms" on public.meta_lead_forms
  for all using (
    company_id = get_my_company_id()
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.company_id = meta_lead_forms.company_id
        and p.role in ('manager', 'admin')
    )
  )
  with check (
    company_id = get_my_company_id()
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.company_id = meta_lead_forms.company_id
        and p.role in ('manager', 'admin')
    )
  );

create policy "Company members can view meta_lead_imports" on public.meta_lead_imports
  for select using (company_id = get_my_company_id());

create unique index if not exists idx_meta_lead_connections_company_page_unique
  on public.meta_lead_connections (company_id, meta_page_id);

create index if not exists idx_meta_lead_connections_company_status
  on public.meta_lead_connections (company_id, status);

create unique index if not exists idx_meta_lead_forms_company_form_unique
  on public.meta_lead_forms (company_id, meta_form_id);

create index if not exists idx_meta_lead_forms_connection_enabled
  on public.meta_lead_forms (connection_id, enabled);

create unique index if not exists idx_meta_lead_imports_company_lead_unique
  on public.meta_lead_imports (company_id, meta_lead_id);

create index if not exists idx_meta_lead_imports_company_created
  on public.meta_lead_imports (company_id, created_at desc);

-- 23. REALTY EXTERNAL LISTING IMPORT Tables
create table if not exists public.realty_import_jobs (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.companies(id) on delete cascade,
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
  company_id uuid references public.companies(id) on delete cascade,
  requester_id uuid references public.profiles(id),
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

create policy "Requesters can view own realty_import_jobs" on public.realty_import_jobs
  for select using (requester_id = auth.uid());

create policy "Company members can insert realty_import_jobs" on public.realty_import_jobs
  for insert with check (company_id = get_my_company_id());

create policy "Requesters can insert own realty_import_jobs" on public.realty_import_jobs
  for insert with check (requester_id = auth.uid());

create policy "Company members can update realty_import_jobs" on public.realty_import_jobs
  for update using (company_id = get_my_company_id())
  with check (company_id = get_my_company_id());

create policy "Requesters can update own realty_import_jobs" on public.realty_import_jobs
  for update using (requester_id = auth.uid())
  with check (requester_id = auth.uid());

create policy "Company members can delete realty_import_jobs" on public.realty_import_jobs
  for delete using (company_id = get_my_company_id());

create policy "Requesters can delete own realty_import_jobs" on public.realty_import_jobs
  for delete using (requester_id = auth.uid());

create policy "Company members can view external_property_listings" on public.external_property_listings
  for select using (company_id = get_my_company_id());

create policy "Requesters can view own external_property_listings" on public.external_property_listings
  for select using (requester_id = auth.uid());

create policy "Company members can insert external_property_listings" on public.external_property_listings
  for insert with check (company_id = get_my_company_id());

create policy "Requesters can insert own external_property_listings" on public.external_property_listings
  for insert with check (requester_id = auth.uid());

create policy "Company members can update external_property_listings" on public.external_property_listings
  for update using (company_id = get_my_company_id())
  with check (company_id = get_my_company_id());

create policy "Requesters can update own external_property_listings" on public.external_property_listings
  for update using (requester_id = auth.uid())
  with check (requester_id = auth.uid());

create policy "Company members can delete external_property_listings" on public.external_property_listings
  for delete using (company_id = get_my_company_id());

create policy "Requesters can delete own external_property_listings" on public.external_property_listings
  for delete using (requester_id = auth.uid());

create index if not exists idx_realty_import_jobs_company_created
  on public.realty_import_jobs (company_id, created_at desc);

create index if not exists idx_realty_import_jobs_reference_property
  on public.realty_import_jobs (reference_property_id, created_at desc);

create unique index if not exists idx_external_property_listings_source_unique
  on public.external_property_listings (company_id, source, source_listing_id);

create unique index if not exists idx_external_property_listings_scope_source_unique
  on public.external_property_listings (
    coalesce(company_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(case when company_id is null then requester_id else null end, '00000000-0000-0000-0000-000000000000'::uuid),
    source,
    source_listing_id
  );

create index if not exists idx_external_property_listings_company_collected
  on public.external_property_listings (company_id, collected_at desc);

create index if not exists idx_external_property_listings_requester_collected
  on public.external_property_listings (requester_id, collected_at desc);

create index if not exists idx_external_property_listings_property
  on public.external_property_listings (property_id);
