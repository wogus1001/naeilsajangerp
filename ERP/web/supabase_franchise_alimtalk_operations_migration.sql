create table if not exists public.alimtalk_templates (
  id uuid default uuid_generate_v4() primary key,
  template_key text not null unique,
  name text not null,
  template_id text default '' not null,
  channel_id text default '' not null,
  status text default 'submitted' not null,
  enabled boolean default false not null,
  content text default '' not null,
  variables jsonb default '[]'::jsonb not null,
  review_note text default '' not null,
  button_label text default '' not null,
  button_url text default '' not null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint alimtalk_templates_status_check check (status in ('draft', 'submitted', 'approved', 'rejected', 'paused'))
);

create table if not exists public.alimtalk_scenarios (
  id uuid default uuid_generate_v4() primary key,
  scenario_key text not null unique,
  template_key text references public.alimtalk_templates(template_key) on delete restrict not null,
  name text not null,
  trigger_label text default '' not null,
  recipient_label text default '' not null,
  enabled boolean default false not null,
  fallback_channel text default 'none' not null,
  memo text default '' not null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint alimtalk_scenarios_fallback_check check (fallback_channel in ('none', 'sms'))
);

create table if not exists public.alimtalk_company_settings (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.companies(id) on delete cascade not null unique,
  enabled boolean default true not null,
  monthly_limit integer,
  warning_threshold integer,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint alimtalk_company_monthly_limit_check check (monthly_limit is null or monthly_limit >= 0),
  constraint alimtalk_company_warning_threshold_check check (warning_threshold is null or warning_threshold >= 0)
);

create table if not exists public.alimtalk_send_logs (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.companies(id) on delete set null,
  scenario_key text not null,
  template_key text not null,
  source_type text default '' not null,
  source_id text default '' not null,
  recipient_profile_id uuid references public.profiles(id) on delete set null,
  recipient_name text default '' not null,
  recipient_phone text default '' not null,
  status text not null,
  provider_message_id text default '' not null,
  error_message text default '' not null,
  variables jsonb default '{}'::jsonb not null,
  sent_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint alimtalk_send_logs_status_check check (status in ('success', 'failed', 'blocked', 'fallback_sms'))
);

create index if not exists idx_alimtalk_send_logs_company_sent
  on public.alimtalk_send_logs (company_id, sent_at desc);

create index if not exists idx_alimtalk_send_logs_scenario_sent
  on public.alimtalk_send_logs (scenario_key, sent_at desc);

create unique index if not exists idx_alimtalk_send_logs_source_once
  on public.alimtalk_send_logs (company_id, scenario_key, source_type, source_id, recipient_phone)
  where source_type <> '' and source_id <> '' and recipient_phone <> '';

alter table public.alimtalk_templates enable row level security;
alter table public.alimtalk_scenarios enable row level security;
alter table public.alimtalk_company_settings enable row level security;
alter table public.alimtalk_send_logs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'alimtalk_templates' and policyname = 'Admins can manage alimtalk templates'
  ) then
    create policy "Admins can manage alimtalk templates"
      on public.alimtalk_templates
      for all
      using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
      with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'alimtalk_scenarios' and policyname = 'Admins can manage alimtalk scenarios'
  ) then
    create policy "Admins can manage alimtalk scenarios"
      on public.alimtalk_scenarios
      for all
      using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
      with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'alimtalk_company_settings' and policyname = 'Admins can manage alimtalk company settings'
  ) then
    create policy "Admins can manage alimtalk company settings"
      on public.alimtalk_company_settings
      for all
      using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
      with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'alimtalk_send_logs' and policyname = 'Admins can view alimtalk send logs'
  ) then
    create policy "Admins can view alimtalk send logs"
      on public.alimtalk_send_logs
      for select
      using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
  end if;
end $$;

insert into public.alimtalk_templates (template_key, name, status, enabled, content, variables, review_note)
values
  ('signup_request', '회원가입 승인 요청', 'submitted', false, '[FC ERP] 회원가입 승인 요청 안내\n\n#{회사명} #{신청자명}님이 #{가입유형} 가입을 요청했습니다.\n요청일: #{요청일}\n\n관리자 화면에서 승인 여부를 확인해 주세요.', '["회사명","신청자명","가입유형","요청일"]'::jsonb, 'FC ERP 회원가입 승인 요청 안내용 알림톡입니다. 회사 구성원이 가입을 요청한 경우 관리자 또는 팀장에게 승인 처리를 안내하기 위해 발송되는 정보성 메시지입니다. 광고성 내용은 포함하지 않습니다.'),
  ('signup_approved', '회원가입 승인 완료', 'submitted', false, '[FC ERP] 회원가입 승인 완료\n\n#{신청자명}님, #{회사명} 계정 승인이 완료되었습니다.\n이제 FC ERP에 로그인해 서비스를 이용할 수 있습니다.', '["회사명","신청자명"]'::jsonb, 'FC ERP 회원가입 승인 완료 안내용 알림톡입니다. 회사 관리자가 가입 요청을 승인한 경우 신청자에게 계정 사용 가능 상태를 안내하기 위해 발송되는 정보성 메시지입니다. 광고성 내용은 포함하지 않습니다.'),
  ('disclosure_email_sent', '정보공개서 이메일 발송 안내', 'submitted', false, '[FC ERP] 정보공개서 확인 안내\n\n#{후보자명}님, #{브랜드명} 정보공개서가 이메일로 발송되었습니다.\n가맹계약 전 필수 확인 문서이므로 이메일을 확인해 주세요.\n정보공개서 수령 확인일을 기준으로 법정 숙고기간이 계산됩니다.\n\n확인 후 수령 확인을 진행해 주세요.', '["후보자명","브랜드명"]'::jsonb, 'FC ERP 정보공개서 이메일 발송 안내용 알림톡입니다. 가맹 희망자에게 정보공개서가 이메일로 발송되었음을 안내하고, 수령 확인을 요청하기 위해 발송되는 정보성 메시지입니다. 광고성 내용은 포함하지 않습니다.'),
  ('disclosure_confirmed', '정보공개서 수령 확인 완료', 'submitted', false, '[FC ERP] 정보공개서 수령 확인 완료\n\n#{후보자명}님이 #{브랜드명} 정보공개서 수령 확인을 완료했습니다.\n확인일: #{확인일}\n\n후속 계약 가능일과 체크 항목을 확인해 주세요.', '["후보자명","브랜드명","확인일"]'::jsonb, 'FC ERP 정보공개서 수령 확인 완료 안내용 알림톡입니다. 가맹 희망자가 이메일로 발송된 정보공개서의 수령 확인을 완료한 경우, 담당자 또는 팀장에게 후속 계약 진행 상태 확인을 안내하기 위해 발송되는 정보성 메시지입니다. 광고성 내용은 포함하지 않습니다.'),
  ('franchise_contract_eligible', '가맹계약 가능일 도래', 'submitted', false, '[FC ERP] 가맹계약 가능 상태 안내\n\n#{후보자명}님의 정보공개서 숙고기간이 종료되어 가맹계약 진행이 가능합니다.\n계약 가능일: #{계약가능일}\n\n계약 전 확인 항목을 점검해 주세요.', '["후보자명","계약가능일"]'::jsonb, 'FC ERP 가맹계약 가능 상태 안내용 알림톡입니다. 정보공개서 수령 확인 후 법정 숙고기간이 종료된 경우, 담당자 또는 팀장에게 가맹계약 진행 가능 상태와 후속 확인 업무를 안내하기 위해 발송되는 정보성 메시지입니다. 광고성 내용은 포함하지 않습니다.'),
  ('vendor_contract_due', '업체계약 만료 안내', 'submitted', false, '[FC ERP] 업체 계약 만료 안내\n\n#{업체명} #{계약명}의 만료일이 다가왔습니다.\n만료일: #{만료일}\n남은 기간: #{남은기간}\n\n갱신, 종료, 보관 여부를 확인해 주세요.', '["업체명","계약명","만료일","남은기간"]'::jsonb, 'FC ERP 업체 계약 만료 안내용 알림톡입니다. 회사에서 등록한 외부 업체 계약의 만료일이 다가온 경우, 계약 담당자 또는 팀장에게 갱신, 종료, 보관 여부 확인을 안내하기 위해 발송되는 정보성 메시지입니다. 광고성 내용은 포함하지 않습니다.')
on conflict (template_key) do nothing;

insert into public.alimtalk_scenarios (scenario_key, template_key, name, trigger_label, recipient_label, enabled, fallback_channel, memo)
values
  ('signup_request', 'signup_request', '회원가입 승인 요청', '회원가입 신청 접수 시', '플랫폼 관리자', false, 'sms', '기존 관리자 SMS 알림과 같은 업무 흐름'),
  ('signup_approved', 'signup_approved', '회원가입 승인 완료', '관리자가 가입 승인 처리 시', '가입 신청자', false, 'sms', '기존 신청자 SMS 알림과 같은 업무 흐름'),
  ('disclosure_email_sent', 'disclosure_email_sent', '정보공개서 이메일 발송 안내', 'Gmail 정보공개서 발송 성공 시', '예비 창업자', false, 'none', '이메일 발송 사실과 수령 확인 안내'),
  ('disclosure_confirmed', 'disclosure_confirmed', '정보공개서 수령 확인 완료', '수령 확인 링크 클릭 시', '담당자 및 팀장', false, 'none', '후속 계약 가능일 확인 안내'),
  ('franchise_contract_eligible', 'franchise_contract_eligible', '가맹계약 가능일 도래', '법정 숙고기간 종료일', '담당자 및 팀장', false, 'none', '일 1회 cron 대상'),
  ('vendor_contract_due', 'vendor_contract_due', '업체계약 만료 D-30/D-7', '업체 계약 만료 30일/7일 전', '계약 담당자 및 팀장', false, 'none', '일 1회 cron 대상')
on conflict (scenario_key) do nothing;
