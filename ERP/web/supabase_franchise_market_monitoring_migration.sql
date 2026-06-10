-- Franchise market monitoring MVP
-- Stores company watchlist settings and daily Naver/SERP snapshots.

create extension if not exists "uuid-ossp";

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

drop policy if exists "Company members can view franchise_market_watchlist" on public.franchise_market_watchlist;
drop policy if exists "Company members can insert franchise_market_watchlist" on public.franchise_market_watchlist;
drop policy if exists "Company members can update franchise_market_watchlist" on public.franchise_market_watchlist;
drop policy if exists "Company members can delete franchise_market_watchlist" on public.franchise_market_watchlist;

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

drop policy if exists "Company members can view franchise_market_snapshots" on public.franchise_market_snapshots;
drop policy if exists "Company members can insert franchise_market_snapshots" on public.franchise_market_snapshots;
drop policy if exists "Company members can update franchise_market_snapshots" on public.franchise_market_snapshots;
drop policy if exists "Company members can delete franchise_market_snapshots" on public.franchise_market_snapshots;

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
