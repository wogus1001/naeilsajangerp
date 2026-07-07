create extension if not exists "uuid-ossp";

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.franchise_supervision_report_templates (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  name text not null,
  description text,
  inspection_items jsonb default '[]'::jsonb not null,
  active boolean default true not null,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.franchise_inspection_reports
  add column if not exists template_id uuid references public.franchise_supervision_report_templates(id) on delete set null;

create table if not exists public.franchise_supervision_report_events (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  report_id uuid references public.franchise_inspection_reports(id) on delete cascade not null,
  event_type text not null,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  memo text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.franchise_corrective_action_events (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  corrective_action_id uuid references public.franchise_corrective_actions(id) on delete cascade not null,
  event_type text not null,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  from_status text,
  to_status text,
  memo text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'franchise_supervision_report_events_type_check') then
    alter table public.franchise_supervision_report_events
      add constraint franchise_supervision_report_events_type_check
      check (event_type in ('임시저장', '제출', '승인', '반려'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'franchise_corrective_action_events_type_check') then
    alter table public.franchise_corrective_action_events
      add constraint franchise_corrective_action_events_type_check
      check (event_type in ('생성', '상태변경', '메모변경'));
  end if;
end $$;

create unique index if not exists idx_franchise_supervision_templates_one_active
  on public.franchise_supervision_report_templates (company_id)
  where active = true;

create index if not exists idx_franchise_supervision_templates_company
  on public.franchise_supervision_report_templates (company_id, active, created_at desc);

create index if not exists idx_franchise_supervision_report_events_report
  on public.franchise_supervision_report_events (company_id, report_id, created_at desc);

create index if not exists idx_franchise_corrective_action_events_action
  on public.franchise_corrective_action_events (company_id, corrective_action_id, created_at desc);

alter table public.franchise_supervision_report_templates enable row level security;
alter table public.franchise_supervision_report_events enable row level security;
alter table public.franchise_corrective_action_events enable row level security;

drop policy if exists "Company members can view franchise_supervision_report_templates" on public.franchise_supervision_report_templates;
drop policy if exists "Company managers can write franchise_supervision_report_templates" on public.franchise_supervision_report_templates;
drop policy if exists "Company members can view franchise_supervision_report_events" on public.franchise_supervision_report_events;
drop policy if exists "Company members can write franchise_supervision_report_events" on public.franchise_supervision_report_events;
drop policy if exists "Company members can insert franchise_supervision_report_events" on public.franchise_supervision_report_events;
drop policy if exists "Company members can view franchise_corrective_action_events" on public.franchise_corrective_action_events;
drop policy if exists "Company members can write franchise_corrective_action_events" on public.franchise_corrective_action_events;
drop policy if exists "Company members can insert franchise_corrective_action_events" on public.franchise_corrective_action_events;

create policy "Company members can view franchise_supervision_report_templates" on public.franchise_supervision_report_templates
  for select using (
    company_id = public.get_my_company_id()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Company managers can write franchise_supervision_report_templates" on public.franchise_supervision_report_templates
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.role = 'admin' or (p.role = 'manager' and p.company_id = franchise_supervision_report_templates.company_id))
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.role = 'admin' or (p.role = 'manager' and p.company_id = franchise_supervision_report_templates.company_id))
    )
  );

create policy "Company members can view franchise_supervision_report_events" on public.franchise_supervision_report_events
  for select using (
    company_id = public.get_my_company_id()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Company members can insert franchise_supervision_report_events" on public.franchise_supervision_report_events
  for insert
  with check (
    actor_profile_id = auth.uid()
    and exists (
      select 1
      from public.franchise_inspection_reports r
      join public.profiles p on p.id = auth.uid()
      where r.id = franchise_supervision_report_events.report_id
        and r.company_id = franchise_supervision_report_events.company_id
        and (
          p.role = 'admin'
          or p.company_id = franchise_supervision_report_events.company_id
        )
    )
  );

create policy "Company members can view franchise_corrective_action_events" on public.franchise_corrective_action_events
  for select using (
    company_id = public.get_my_company_id()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Company members can insert franchise_corrective_action_events" on public.franchise_corrective_action_events
  for insert
  with check (
    actor_profile_id = auth.uid()
    and exists (
      select 1
      from public.franchise_corrective_actions a
      join public.profiles p on p.id = auth.uid()
      where a.id = franchise_corrective_action_events.corrective_action_id
        and a.company_id = franchise_corrective_action_events.company_id
        and (
          p.role = 'admin'
          or p.company_id = franchise_corrective_action_events.company_id
        )
    )
  );

drop trigger if exists trg_franchise_supervision_report_templates_updated_at on public.franchise_supervision_report_templates;
create trigger trg_franchise_supervision_report_templates_updated_at
before update on public.franchise_supervision_report_templates
for each row execute function public.update_updated_at_column();

do $$
begin
  if to_regclass('public.alimtalk_templates') is not null
     and to_regclass('public.alimtalk_scenarios') is not null then
    insert into public.alimtalk_templates (
      template_key, name, status, enabled, content, variables, review_note, button_label, button_url
    )
    values
      (
        'supervision_visit_due',
        '[프랜차이즈 본부 ERP] SV 방문 일정 안내',
        'draft',
        false,
        '[프랜차이즈 본부 ERP] SV 방문 일정 안내\n\n#{담당자명}님, #{운영점명} 방문 일정이 예정되어 있습니다.\n\n방문일: #{방문일}\n목적: #{방문목적}\n\n방문 후 점검 보고서를 제출해 주세요.',
        '["담당자명", "운영점명", "방문일", "방문목적"]'::jsonb,
        '내부 SV/담당자에게 방문 D-1 또는 D-day 기준으로 발송되는 운영 알림입니다.',
        '프랜차이즈 본부 ERP 바로가기',
        ''
      ),
      (
        'supervision_report_missing',
        '[프랜차이즈 본부 ERP] SV 보고서 미제출 안내',
        'draft',
        false,
        '[프랜차이즈 본부 ERP] SV 보고서 미제출 안내\n\n#{운영점명} 방문 후 점검 보고서가 아직 제출되지 않았습니다.\n\n방문일: #{방문일}\n담당자: #{담당자명}\n\n점검 보고서를 작성해 주세요.',
        '["운영점명", "방문일", "담당자명"]'::jsonb,
        '방문 완료 후 보고서가 미제출 상태로 남아 있을 때 내부 담당자에게 발송됩니다.',
        '프랜차이즈 본부 ERP 바로가기',
        ''
      ),
      (
        'supervision_report_reviewed',
        '[프랜차이즈 본부 ERP] SV 점검 보고서 처리 안내',
        'draft',
        false,
        '[프랜차이즈 본부 ERP] SV 점검 보고서 처리 안내\n\n#{운영점명} 점검 보고서가 #{처리상태} 처리되었습니다.\n\n처리일: #{처리일}\n\n반려된 경우 사유를 확인해 다시 제출해 주세요.',
        '["운영점명", "처리상태", "처리일"]'::jsonb,
        '팀장/관리자가 점검 보고서를 승인 또는 반려했을 때 내부 작성자에게 발송됩니다.',
        '프랜차이즈 본부 ERP 바로가기',
        ''
      ),
      (
        'supervision_corrective_action_due',
        '[프랜차이즈 본부 ERP] 시정요청 처리 안내',
        'draft',
        false,
        '[프랜차이즈 본부 ERP] 시정요청 처리 안내\n\n#{운영점명} 시정요청 기한이 다가왔습니다.\n\n항목: #{시정항목}\n기한: #{기한}\n\n처리 상태를 업데이트해 주세요.',
        '["운영점명", "시정항목", "기한"]'::jsonb,
        '시정요청 등록 또는 기한 임박 시 내부 담당자에게 발송됩니다.',
        '프랜차이즈 본부 ERP 바로가기',
        ''
      )
    on conflict (template_key) do nothing;

    insert into public.alimtalk_scenarios (
      scenario_key, template_key, name, trigger_label, recipient_label, enabled, fallback_channel, memo
    )
    values
      ('supervision_visit_due', 'supervision_visit_due', 'SV 방문 D-1/D-day 안내', '방문 예정일 D-1 또는 D-day', 'SV 및 내부 담당자', false, 'none', '슈퍼바이징 2차 내부 운영 알림'),
      ('supervision_report_missing', 'supervision_report_missing', 'SV 보고서 미제출 안내', '방문 후 보고서대기 상태', 'SV 및 팀장', false, 'none', '슈퍼바이징 2차 내부 운영 알림'),
      ('supervision_report_reviewed', 'supervision_report_reviewed', 'SV 보고서 승인/반려 안내', '보고서 승인 또는 반려 처리', '보고서 작성자', false, 'none', '슈퍼바이징 2차 내부 운영 알림'),
      ('supervision_corrective_action_due', 'supervision_corrective_action_due', '시정요청 등록/기한 임박 안내', '시정요청 생성 또는 기한 임박', '담당자 및 팀장', false, 'none', '슈퍼바이징 2차 내부 운영 알림')
    on conflict (scenario_key) do nothing;
  end if;
end $$;
