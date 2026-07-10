create extension if not exists "uuid-ossp";

create table if not exists public.franchise_location_meeting_tool_versions (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  location_id uuid references public.franchise_locations(id) on delete cascade not null,
  version_number integer not null,
  title text not null default '',
  meeting_tool jsonb default '{}'::jsonb not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (location_id, version_number)
);

create index if not exists idx_franchise_location_meeting_tool_versions_location_version
  on public.franchise_location_meeting_tool_versions (location_id, version_number desc);

create index if not exists idx_franchise_location_meeting_tool_versions_company_location_created
  on public.franchise_location_meeting_tool_versions (company_id, location_id, created_at desc);

alter table public.franchise_location_meeting_tool_versions enable row level security;

drop policy if exists "Company members can view meeting tool versions" on public.franchise_location_meeting_tool_versions;
drop policy if exists "Company members can insert meeting tool versions" on public.franchise_location_meeting_tool_versions;
drop policy if exists "Company members can delete meeting tool versions" on public.franchise_location_meeting_tool_versions;

create policy "Company members can view meeting tool versions" on public.franchise_location_meeting_tool_versions
  for select using (
    exists (
      select 1
      from public.franchise_locations fl
      where fl.id = franchise_location_meeting_tool_versions.location_id
        and fl.company_id = franchise_location_meeting_tool_versions.company_id
        and public.can_access_franchise_location(fl.company_id, fl.created_by)
    )
  );

create policy "Company members can insert meeting tool versions" on public.franchise_location_meeting_tool_versions
  for insert with check (
    exists (
      select 1
      from public.franchise_locations fl
      where fl.id = franchise_location_meeting_tool_versions.location_id
        and fl.company_id = franchise_location_meeting_tool_versions.company_id
        and public.can_access_franchise_location(fl.company_id, fl.created_by)
    )
  );

create policy "Company members can delete meeting tool versions" on public.franchise_location_meeting_tool_versions
  for delete using (
    exists (
      select 1
      from public.franchise_locations fl
      where fl.id = franchise_location_meeting_tool_versions.location_id
        and fl.company_id = franchise_location_meeting_tool_versions.company_id
        and public.can_access_franchise_location(fl.company_id, fl.created_by)
    )
  );

comment on table public.franchise_location_meeting_tool_versions is
  '출점 후보지별 검토 리포트 버전 스냅샷';
comment on column public.franchise_location_meeting_tool_versions.meeting_tool is
  '목표매출 시나리오, 비용 항목, 검토 의견을 포함한 후보지별 출점 검토 리포트 스냅샷';
