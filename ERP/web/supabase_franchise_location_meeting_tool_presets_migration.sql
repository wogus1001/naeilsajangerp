create extension if not exists "uuid-ossp";

create table if not exists public.franchise_location_meeting_tool_presets (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  name text not null,
  data jsonb default '{}'::jsonb not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (company_id, name)
);

create index if not exists idx_franchise_location_meeting_tool_presets_company_updated
  on public.franchise_location_meeting_tool_presets (company_id, updated_at desc);

alter table public.franchise_location_meeting_tool_presets enable row level security;

drop policy if exists "Company members can view meeting tool presets" on public.franchise_location_meeting_tool_presets;
drop policy if exists "Company members can insert meeting tool presets" on public.franchise_location_meeting_tool_presets;
drop policy if exists "Company members can update meeting tool presets" on public.franchise_location_meeting_tool_presets;
drop policy if exists "Company members can delete meeting tool presets" on public.franchise_location_meeting_tool_presets;

create policy "Company members can view meeting tool presets" on public.franchise_location_meeting_tool_presets
  for select using (
    company_id = get_my_company_id()
    or exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role = 'admin'
    )
  );

create policy "Company members can insert meeting tool presets" on public.franchise_location_meeting_tool_presets
  for insert with check (
    company_id = get_my_company_id()
    or exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role = 'admin'
    )
  );

create policy "Company members can update meeting tool presets" on public.franchise_location_meeting_tool_presets
  for update using (
    company_id = get_my_company_id()
    or exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role = 'admin'
    )
  )
  with check (
    company_id = get_my_company_id()
    or exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role = 'admin'
    )
  );

create policy "Company members can delete meeting tool presets" on public.franchise_location_meeting_tool_presets
  for delete using (
    company_id = get_my_company_id()
    or exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role = 'admin'
    )
  );

create or replace function public.set_franchise_location_meeting_tool_presets_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_franchise_location_meeting_tool_presets_updated_at
  on public.franchise_location_meeting_tool_presets;
create trigger trg_franchise_location_meeting_tool_presets_updated_at
before update on public.franchise_location_meeting_tool_presets
for each row execute function public.set_franchise_location_meeting_tool_presets_updated_at();

comment on table public.franchise_location_meeting_tool_presets is
  '회사별 출점 검토 수익분석표 공용 프리셋';
comment on column public.franchise_location_meeting_tool_presets.data is
  '목표매출 변화 차수, 비용 항목 금액/비율/메모 등 재사용 가능한 수익분석표 입력값';
