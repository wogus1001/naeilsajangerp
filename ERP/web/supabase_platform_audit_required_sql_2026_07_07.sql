-- FC ERP platform audit required SQL
-- Source: docs/platform-audit-2026-07-07.md
--
-- SQL 등록 필요:
-- - H-8: share_links.revoked_at 컬럼
-- - L-2: system_settings 파일 기반 설정의 DB 테이블 이전
-- - L-13: franchise leads 전화번호 / alimtalk send-log 중복 방지 unique 제약
--
-- 적용 전 먼저 "0. Preflight" 쿼리 결과를 확인하세요.
-- duplicate rows가 반환되면 unique index 생성 전 운영 정책에 맞게 중복 데이터를 정리해야 합니다.

create extension if not exists "uuid-ossp";

-- 0. Preflight: unique index 적용 전 중복 데이터 확인
-- 결과가 없으면 아래 적용 SQL을 그대로 실행할 수 있습니다.

-- L-13 / franchise_leads: 회사별 동일 휴대폰 중복 확인
select
  company_id,
  mobile_normalized,
  count(*) as duplicate_count,
  array_agg(id order by created_at desc) as lead_ids
from public.franchise_leads
where mobile_normalized is not null
  and mobile_normalized <> ''
group by company_id, mobile_normalized
having count(*) > 1;

-- L-13 / alimtalk_send_logs: 같은 source/recipient에 대한 중복 발송 로그 확인
select
  company_id,
  scenario_key,
  source_type,
  source_id,
  recipient_phone,
  count(*) as duplicate_count,
  array_agg(id order by sent_at desc) as log_ids
from public.alimtalk_send_logs
where source_type <> ''
  and source_id <> ''
  and recipient_phone <> ''
group by company_id, scenario_key, source_type, source_id, recipient_phone
having count(*) > 1;

-- 1. H-8: share_links revoked_at 추가
alter table public.share_links
  add column if not exists revoked_at timestamp with time zone;

create index if not exists idx_share_links_active_token
  on public.share_links (token)
  where revoked_at is null;

create index if not exists idx_share_links_company_revoked
  on public.share_links (company_id, revoked_at, created_at desc);

comment on column public.share_links.revoked_at is
  '보안 감사 H-8: 공유 링크 폐기 시각. null이면 활성 링크로 간주한다.';

-- 2. L-2: system_settings DB 테이블
-- 현재 src/data/system_settings.json의 기본 구조를 global row로 이관할 수 있게 설계합니다.
create table if not exists public.system_settings (
  setting_key text primary key,
  settings jsonb default '{}'::jsonb not null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.system_settings enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'system_settings'
      and policyname = 'Admins can manage system settings'
  ) then
    create policy "Admins can manage system settings"
      on public.system_settings
      for all
      using (
        exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role = 'admin'
        )
      )
      with check (
        exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role = 'admin'
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'system_settings'
      and policyname = 'Authenticated users can view system settings'
  ) then
    create policy "Authenticated users can view system settings"
      on public.system_settings
      for select
      using (auth.uid() is not null);
  end if;
end $$;

insert into public.system_settings (setting_key, settings)
values (
  'global',
  '{
    "announcement": {
      "message": "",
      "level": "info",
      "active": false
    },
    "features": {
      "electronicContracts": true,
      "mapService": true
    },
    "maintenance": {
      "active": false,
      "message": "현재 서비스 정기 점검 중입니다. 잠시 후 다시 이용해주세요."
    },
    "systemInfo": {
      "version": "1.2.0",
      "lastUpdated": "2024-12-31"
    },
    "dataManagement": {
      "properties": {
        "bulkUpload": false,
        "excelUpload": false,
        "dbSync": false
      },
      "customers": {
        "excelUpload": false,
        "dbSync": false
      },
      "businessCards": {
        "excelUpload": false,
        "dbSync": false
      }
    }
  }'::jsonb
)
on conflict (setting_key) do nothing;

comment on table public.system_settings is
  '보안 감사 L-2: Vercel 읽기전용 파일 시스템 대신 시스템 설정을 저장하기 위한 테이블.';

-- 3. L-13: 중복 생성 race 방지 unique index
-- 기존 마이그레이션에 이미 있는 경우가 있어 if not exists로 재적용 안전하게 둡니다.
-- Preflight에서 중복 row가 나오면 아래 unique index 생성이 실패합니다.

create unique index if not exists idx_franchise_leads_company_mobile_unique
  on public.franchise_leads (company_id, mobile_normalized)
  where mobile_normalized is not null and mobile_normalized <> '';

create unique index if not exists idx_alimtalk_send_logs_source_once
  on public.alimtalk_send_logs (company_id, scenario_key, source_type, source_id, recipient_phone)
  where source_type <> '' and source_id <> '' and recipient_phone <> '';

-- 4. 확인 쿼리
select
  'share_links.revoked_at' as item,
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'share_links'
      and column_name = 'revoked_at'
  ) as applied;

select
  'system_settings' as item,
  exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'system_settings'
  ) as applied;

select
  indexname,
  tablename
from pg_indexes
where schemaname = 'public'
  and indexname in (
    'idx_franchise_leads_company_mobile_unique',
    'idx_alimtalk_send_logs_source_once',
    'idx_share_links_active_token',
    'idx_share_links_company_revoked'
  )
order by tablename, indexname;
