-- Company-scoped franchise lead source options.
-- Apply after supabase_franchise_leads_migration.sql.

create extension if not exists "uuid-ossp";

create table if not exists public.franchise_lead_source_options (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  code text not null,
  label text not null,
  is_system boolean default false not null,
  is_active boolean default true not null,
  sort_order integer default 1000 not null,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint franchise_lead_source_options_code_not_blank check (btrim(code) <> ''),
  constraint franchise_lead_source_options_label_not_blank check (btrim(label) <> ''),
  constraint franchise_lead_source_options_company_code_unique unique (company_id, code)
);

create unique index if not exists idx_franchise_lead_source_options_company_label_unique
  on public.franchise_lead_source_options (company_id, lower(btrim(label)));

create index if not exists idx_franchise_lead_source_options_company_order
  on public.franchise_lead_source_options (company_id, is_active desc, sort_order, label);

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

select public.seed_franchise_lead_source_options(company.id)
from public.companies company;

insert into public.franchise_lead_source_options (
  company_id,
  code,
  label,
  is_system,
  sort_order
)
select distinct
  lead.company_id,
  btrim(lead.source),
  case
    when btrim(lead.source) = '프랜차이즈 매칭 요청' then '예비 창업자 등록'
    else btrim(lead.source)
  end,
  btrim(lead.source) in (
    'Meta Lead Ads',
    '고객DB',
    '명함DB',
    '가맹 희망자 등록',
    '프랜차이즈 매칭 요청'
  ),
  1000
from public.franchise_leads lead
where nullif(btrim(lead.source), '') is not null
on conflict do nothing;

create or replace function public.seed_franchise_lead_source_options_for_company()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.seed_franchise_lead_source_options(new.id);
  return new;
end;
$$;

drop trigger if exists seed_franchise_lead_source_options_after_company_insert on public.companies;
create trigger seed_franchise_lead_source_options_after_company_insert
after insert on public.companies
for each row execute function public.seed_franchise_lead_source_options_for_company();

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

drop trigger if exists protect_franchise_lead_source_option_before_write on public.franchise_lead_source_options;
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

drop trigger if exists register_franchise_lead_source_option_after_write on public.franchise_leads;
create trigger register_franchise_lead_source_option_after_write
after insert or update of source on public.franchise_leads
for each row execute function public.register_franchise_lead_source_option();

alter table public.franchise_lead_source_options enable row level security;

drop policy if exists "Company members can view franchise lead source options"
  on public.franchise_lead_source_options;
create policy "Company members can view franchise lead source options"
  on public.franchise_lead_source_options
  for select
  using (
    company_id = public.get_my_company_id()
    or public.get_my_role() = 'admin'
  );

drop policy if exists "Company managers can insert franchise lead source options"
  on public.franchise_lead_source_options;
create policy "Company managers can insert franchise lead source options"
  on public.franchise_lead_source_options
  for insert
  with check (
    company_id = public.get_my_company_id()
    and public.get_my_role() in ('manager', 'sub_manager')
  );

drop policy if exists "Company managers can update franchise lead source options"
  on public.franchise_lead_source_options;
create policy "Company managers can update franchise lead source options"
  on public.franchise_lead_source_options
  for update
  using (
    company_id = public.get_my_company_id()
    and public.get_my_role() in ('manager', 'sub_manager')
  )
  with check (
    company_id = public.get_my_company_id()
    and public.get_my_role() in ('manager', 'sub_manager')
  );
