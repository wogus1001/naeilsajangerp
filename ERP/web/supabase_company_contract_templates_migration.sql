-- Company uploaded electronic contract templates v2
-- Apply manually in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.company_contract_templates (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    name text not null,
    description text,
    status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
    active_version_id uuid,
    created_by uuid references public.profiles(id) on delete set null,
    archived_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.company_contract_template_versions (
    id uuid primary key default gen_random_uuid(),
    template_id uuid not null references public.company_contract_templates(id) on delete cascade,
    company_id uuid not null references public.companies(id) on delete cascade,
    version_number integer not null default 1,
    status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
    source_file_url text,
    source_file_path text,
    source_file_name text,
    source_file_size integer,
    page_count integer not null default 1 check (page_count between 1 and 30),
    direct_ucansign_supported boolean not null default false,
    ucansign_template_id text,
    created_by uuid references public.profiles(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (template_id, version_number)
);

create table if not exists public.company_contract_template_roles (
    id uuid primary key default gen_random_uuid(),
    template_version_id uuid not null references public.company_contract_template_versions(id) on delete cascade,
    role_key text not null,
    label text not null,
    signing_order integer not null default 1,
    required boolean not null default true,
    created_at timestamptz not null default now(),
    unique (template_version_id, role_key)
);

create table if not exists public.company_contract_template_fields (
    id uuid primary key default gen_random_uuid(),
    template_version_id uuid not null references public.company_contract_template_versions(id) on delete cascade,
    field_key text not null,
    label text not null,
    field_type text not null check (field_type in ('text', 'money', 'date', 'checkbox', 'signature', 'stamp')),
    page integer not null default 1,
    x numeric not null default 0,
    y numeric not null default 0,
    width numeric not null default 24,
    height numeric not null default 8,
    required boolean not null default false,
    role_key text,
    default_value text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (template_version_id, field_key)
);

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'company_contract_templates_active_version_fk'
    ) then
        alter table public.company_contract_templates
            add constraint company_contract_templates_active_version_fk
            foreign key (active_version_id)
            references public.company_contract_template_versions(id)
            on delete set null;
    end if;
end $$;

alter table public.electronic_contracts
    add column if not exists template_source text not null default 'premium_rights_builtin',
    add column if not exists company_template_id uuid references public.company_contract_templates(id) on delete set null,
    add column if not exists company_template_version_id uuid references public.company_contract_template_versions(id) on delete set null;

create index if not exists idx_company_contract_templates_company_status
    on public.company_contract_templates(company_id, status, updated_at desc);

create index if not exists idx_company_contract_template_versions_template
    on public.company_contract_template_versions(template_id, version_number desc);

create index if not exists idx_company_contract_template_fields_version
    on public.company_contract_template_fields(template_version_id, page, y, x);

alter table public.company_contract_templates enable row level security;
alter table public.company_contract_template_versions enable row level security;
alter table public.company_contract_template_roles enable row level security;
alter table public.company_contract_template_fields enable row level security;

drop policy if exists "company_contract_templates_select" on public.company_contract_templates;
drop policy if exists "company_contract_templates_manage" on public.company_contract_templates;
drop policy if exists "company_contract_template_versions_select" on public.company_contract_template_versions;
drop policy if exists "company_contract_template_versions_manage" on public.company_contract_template_versions;
drop policy if exists "company_contract_template_roles_select" on public.company_contract_template_roles;
drop policy if exists "company_contract_template_roles_manage" on public.company_contract_template_roles;
drop policy if exists "company_contract_template_fields_select" on public.company_contract_template_fields;
drop policy if exists "company_contract_template_fields_manage" on public.company_contract_template_fields;

create policy "company_contract_templates_select"
on public.company_contract_templates
for select
using (
    exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and (p.role = 'admin' or (p.company_id = company_contract_templates.company_id and p.role <> 'partner_vendor'))
    )
);

create policy "company_contract_templates_manage"
on public.company_contract_templates
for all
using (
    exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and (p.role = 'admin' or (p.company_id = company_contract_templates.company_id and p.role <> 'partner_vendor'))
    )
)
with check (
    exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and (p.role = 'admin' or (p.company_id = company_contract_templates.company_id and p.role <> 'partner_vendor'))
    )
);

create policy "company_contract_template_versions_select"
on public.company_contract_template_versions
for select
using (
    exists (
        select 1
        from public.company_contract_templates t
        join public.profiles p on p.id = auth.uid()
        where t.id = company_contract_template_versions.template_id
          and (p.role = 'admin' or (p.company_id = t.company_id and p.role <> 'partner_vendor'))
    )
);

create policy "company_contract_template_versions_manage"
on public.company_contract_template_versions
for all
using (
    exists (
        select 1
        from public.company_contract_templates t
        join public.profiles p on p.id = auth.uid()
        where t.id = company_contract_template_versions.template_id
          and (p.role = 'admin' or (p.company_id = t.company_id and p.role <> 'partner_vendor'))
    )
)
with check (
    exists (
        select 1
        from public.company_contract_templates t
        join public.profiles p on p.id = auth.uid()
        where t.id = company_contract_template_versions.template_id
          and (p.role = 'admin' or (p.company_id = t.company_id and p.role <> 'partner_vendor'))
    )
);

create policy "company_contract_template_roles_select"
on public.company_contract_template_roles
for select
using (
    exists (
        select 1
        from public.company_contract_template_versions v
        join public.company_contract_templates t on t.id = v.template_id
        join public.profiles p on p.id = auth.uid()
        where v.id = company_contract_template_roles.template_version_id
          and (p.role = 'admin' or (p.company_id = t.company_id and p.role <> 'partner_vendor'))
    )
);

create policy "company_contract_template_roles_manage"
on public.company_contract_template_roles
for all
using (
    exists (
        select 1
        from public.company_contract_template_versions v
        join public.company_contract_templates t on t.id = v.template_id
        join public.profiles p on p.id = auth.uid()
        where v.id = company_contract_template_roles.template_version_id
          and (p.role = 'admin' or (p.company_id = t.company_id and p.role <> 'partner_vendor'))
    )
)
with check (
    exists (
        select 1
        from public.company_contract_template_versions v
        join public.company_contract_templates t on t.id = v.template_id
        join public.profiles p on p.id = auth.uid()
        where v.id = company_contract_template_roles.template_version_id
          and (p.role = 'admin' or (p.company_id = t.company_id and p.role <> 'partner_vendor'))
    )
);

create policy "company_contract_template_fields_select"
on public.company_contract_template_fields
for select
using (
    exists (
        select 1
        from public.company_contract_template_versions v
        join public.company_contract_templates t on t.id = v.template_id
        join public.profiles p on p.id = auth.uid()
        where v.id = company_contract_template_fields.template_version_id
          and (p.role = 'admin' or (p.company_id = t.company_id and p.role <> 'partner_vendor'))
    )
);

create policy "company_contract_template_fields_manage"
on public.company_contract_template_fields
for all
using (
    exists (
        select 1
        from public.company_contract_template_versions v
        join public.company_contract_templates t on t.id = v.template_id
        join public.profiles p on p.id = auth.uid()
        where v.id = company_contract_template_fields.template_version_id
          and (p.role = 'admin' or (p.company_id = t.company_id and p.role <> 'partner_vendor'))
    )
)
with check (
    exists (
        select 1
        from public.company_contract_template_versions v
        join public.company_contract_templates t on t.id = v.template_id
        join public.profiles p on p.id = auth.uid()
        where v.id = company_contract_template_fields.template_version_id
          and (p.role = 'admin' or (p.company_id = t.company_id and p.role <> 'partner_vendor'))
    )
);
