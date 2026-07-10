do $$
declare
  target_company_id uuid;
  target_profile_id uuid;
begin
  select c.id
    into target_company_id
  from public.companies c
  where c.name in ('주식회사 내일사장', '내일사장')
     or c.name ilike '%내일사장%'
  order by
    case
      when c.name = '주식회사 내일사장' then 0
      when c.name = '내일사장' then 1
      else 2
    end,
    c.created_at asc
  limit 1;

  if target_company_id is null then
    raise exception '내일사장 회사를 찾지 못했습니다. companies.name을 확인한 뒤 회사명 조건을 수정하세요.';
  end if;

  select p.id
    into target_profile_id
  from public.profiles p
  where p.company_id = target_company_id
    and coalesce(p.status, 'active') = 'active'
  order by
    case
      when p.role = 'manager' then 0
      when p.role = 'admin' then 1
      when p.role = 'sub_manager' then 2
      else 3
    end,
    p.created_at asc
  limit 1;

  insert into public.franchise_vendors (
    company_id,
    category,
    vendor_name,
    contact_name,
    contact_phone,
    contact_email,
    business_number,
    status,
    memo,
    data,
    created_by,
    updated_by
  )
  select
    target_company_id,
    sample.category,
    sample.vendor_name,
    sample.contact_name,
    sample.contact_phone,
    sample.contact_email,
    sample.business_number,
    'active',
    sample.memo,
    jsonb_build_object('seed', 'vendor-management-samples-20260701'),
    target_profile_id,
    target_profile_id
  from (
    values
      ('food_material', '내일식자재', '김식자', '010-2000-1001', 'food@example.com', '100-00-00001', '식자재 공급 및 단가 협의 담당'),
      ('interior', '하남인테리어', '박인테리어', '010-2000-1002', 'interior@example.com', '100-00-00002', '점포 시공 및 유지보수 담당'),
      ('logistics', '수도권물류', '이물류', '010-2000-1003', 'logistics@example.com', '100-00-00003', '냉장/냉동 물류 운영 담당'),
      ('marketing', '미사마케팅', '최마케팅', '010-2000-1004', 'marketing@example.com', '100-00-00004', '오픈 프로모션 광고 담당')
  ) as sample(
    category,
    vendor_name,
    contact_name,
    contact_phone,
    contact_email,
    business_number,
    memo
  )
  where not exists (
    select 1
    from public.franchise_vendors existing
    where existing.company_id = target_company_id
      and lower(existing.vendor_name) = lower(sample.vendor_name)
  );

  insert into public.franchise_vendor_contracts (
    company_id,
    vendor_id,
    owner_profile_id,
    created_by,
    updated_by,
    category,
    vendor_name,
    contract_title,
    contract_start_date,
    contract_end_date,
    status,
    document_source,
    memo,
    data
  )
  select
    target_company_id,
    vendor_master.id,
    target_profile_id,
    target_profile_id,
    target_profile_id,
    sample.category,
    sample.vendor_name,
    sample.contract_title,
    sample.contract_start_date,
    sample.contract_end_date,
    sample.status,
    'manual',
    sample.memo,
    jsonb_build_object(
      'seed', 'vendor-management-samples-20260701',
      'managerNote', sample.manager_note
    )
  from (
    values
      (
        'food_material',
        '내일식자재',
        '식자재 공급 기본계약',
        current_date - 180,
        current_date + 18,
        'renewal_due',
        '단가표 갱신 전까지 발주량 변동 추이를 확인합니다.',
        'D-30/D-7 갱신 알림 확인용 샘플'
      ),
      (
        'food_material',
        '내일식자재',
        '시즌 메뉴 원재료 단가 합의서',
        current_date - 60,
        current_date + 120,
        'active',
        '시즌 메뉴 원가율 비교용 부속 계약입니다.',
        '동일 업체 다중 계약 집계 확인용 샘플'
      ),
      (
        'interior',
        '하남인테리어',
        '점포 인테리어 유지보수 계약',
        current_date - 400,
        current_date - 7,
        'expired',
        '만료 계약 처리 흐름 확인이 필요합니다.',
        '만료 위험 업체 정렬 확인용 샘플'
      ),
      (
        'logistics',
        '수도권물류',
        '수도권 냉장 물류 위탁 계약',
        current_date - 90,
        current_date + 210,
        'active',
        '수도권 직영/가맹점 공통 물류 계약입니다.',
        '정상 운영 업체 확인용 샘플'
      ),
      (
        'marketing',
        '미사마케팅',
        '오픈 프로모션 광고 대행 계약',
        current_date - 45,
        current_date + 45,
        'active',
        '오픈 예정 점포 프로모션 집행 계약입니다.',
        '마케팅 카테고리 필터 확인용 샘플'
      )
  ) as sample(
    category,
    vendor_name,
    contract_title,
    contract_start_date,
    contract_end_date,
    status,
    memo,
    manager_note
  )
  left join public.franchise_vendors vendor_master
    on vendor_master.company_id = target_company_id
   and lower(vendor_master.vendor_name) = lower(sample.vendor_name)
  where not exists (
    select 1
    from public.franchise_vendor_contracts existing
    where existing.company_id = target_company_id
      and existing.vendor_name = sample.vendor_name
      and existing.contract_title = sample.contract_title
  );
end $$;

select
  c.name as company_name,
  fvc.vendor_name,
  fvc.contract_title,
  fvc.category,
  fvc.status,
  fvc.contract_end_date
from public.franchise_vendor_contracts fvc
join public.companies c on c.id = fvc.company_id
where c.name in ('주식회사 내일사장', '내일사장')
   or c.name ilike '%내일사장%'
order by fvc.vendor_name asc, fvc.contract_end_date asc;
