-- Make the default "기타" lead source editable for databases that already
-- applied supabase_franchise_lead_source_options_migration.sql.

begin;

drop trigger if exists protect_franchise_lead_source_option_before_write
  on public.franchise_lead_source_options;

update public.franchise_lead_source_options
set
  is_system = false,
  updated_at = timezone('utc'::text, now())
where code = '기타'
  and is_system = true;

create or replace function public.seed_franchise_lead_source_options(target_company_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.franchise_lead_source_options (
    company_id,
    code,
    label,
    is_system,
    sort_order
  )
  select
    target_company_id,
    source.code,
    source.label,
    source.is_system,
    source.sort_order
  from (
    values
      ('네이버폼', '네이버폼', false, 10),
      ('랜딩페이지', '랜딩페이지', false, 20),
      ('박람회', '박람회', false, 30),
      ('소개', '소개', false, 40),
      ('광고', '광고', false, 50),
      ('Meta Lead Ads', 'Meta Lead Ads', true, 60),
      ('전화문의', '전화문의', false, 70),
      ('고객DB', '고객DB', true, 80),
      ('명함DB', '명함DB', true, 90),
      ('가맹 희망자 등록', '가맹 희망자 등록', true, 100),
      ('프랜차이즈 매칭 요청', '예비 창업자 등록', true, 110),
      ('기타', '기타', false, 120)
  ) as source(code, label, is_system, sort_order)
  on conflict (company_id, code) do nothing;
$$;

create or replace function public.protect_franchise_lead_source_option()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.code in (
      'Meta Lead Ads',
      '고객DB',
      '명함DB',
      '가맹 희망자 등록',
      '프랜차이즈 매칭 요청'
    ) and not new.is_system then
      raise exception 'protected franchise lead source options must remain system managed';
    end if;

    return new;
  end if;

  if old.is_system then
    raise exception 'protected franchise lead source options cannot be changed';
  end if;

  if tg_op = 'DELETE' then
    raise exception 'franchise lead source options cannot be deleted; deactivate instead';
  end if;

  if new.company_id is distinct from old.company_id
    or new.code is distinct from old.code
    or new.is_system is distinct from old.is_system then
    raise exception 'franchise lead source option identity cannot be changed';
  end if;

  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

create trigger protect_franchise_lead_source_option_before_write
before insert or update or delete on public.franchise_lead_source_options
for each row execute function public.protect_franchise_lead_source_option();

create or replace function public.register_franchise_lead_source_option()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_source text := btrim(coalesce(new.source, ''));
begin
  if normalized_source = '' then
    return new;
  end if;

  insert into public.franchise_lead_source_options (
    company_id,
    code,
    label,
    is_system,
    sort_order,
    created_by,
    updated_by
  )
  values (
    new.company_id,
    normalized_source,
    case
      when normalized_source = '프랜차이즈 매칭 요청' then '예비 창업자 등록'
      else normalized_source
    end,
    normalized_source in (
      'Meta Lead Ads',
      '고객DB',
      '명함DB',
      '가맹 희망자 등록',
      '프랜차이즈 매칭 요청'
    ),
    1000,
    new.created_by,
    new.created_by
  )
  on conflict do nothing;

  return new;
end;
$$;

commit;
