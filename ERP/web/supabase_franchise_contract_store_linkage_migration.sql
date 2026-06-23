alter table public.franchise_locations
    add column if not exists contract_lead_id uuid,
    add column if not exists source_location_id uuid,
    add column if not exists source_external_listing_id uuid,
    add column if not exists contracted_at timestamp with time zone;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'franchise_locations_contract_lead_id_fkey'
    ) then
        alter table public.franchise_locations
            add constraint franchise_locations_contract_lead_id_fkey
            foreign key (contract_lead_id)
            references public.franchise_leads(id)
            on delete set null;
    end if;

    if not exists (
        select 1
        from pg_constraint
        where conname = 'franchise_locations_source_location_id_fkey'
    ) then
        alter table public.franchise_locations
            add constraint franchise_locations_source_location_id_fkey
            foreign key (source_location_id)
            references public.franchise_locations(id)
            on delete set null;
    end if;

    if to_regclass('public.external_property_listings') is not null
        and not exists (
            select 1
            from pg_constraint
            where conname = 'franchise_locations_source_external_listing_id_fkey'
        )
    then
        alter table public.franchise_locations
            add constraint franchise_locations_source_external_listing_id_fkey
            foreign key (source_external_listing_id)
            references public.external_property_listings(id)
            on delete set null;
    end if;
end $$;

create unique index if not exists idx_franchise_locations_contract_lead_unique
    on public.franchise_locations (company_id, contract_lead_id)
    where contract_lead_id is not null;

create index if not exists idx_franchise_locations_contract_lead_id
    on public.franchise_locations (contract_lead_id)
    where contract_lead_id is not null;

create index if not exists idx_franchise_locations_source_location_id
    on public.franchise_locations (source_location_id)
    where source_location_id is not null;

create index if not exists idx_franchise_locations_source_external_listing_id
    on public.franchise_locations (source_external_listing_id)
    where source_external_listing_id is not null;

comment on column public.franchise_locations.contract_lead_id is
    '계약완료 lead에서 생성된 운영 가맹점 연결 ID';
comment on column public.franchise_locations.source_location_id is
    '가맹점으로 전환할 때 복사한 원본 후보지 franchise_locations.id';
comment on column public.franchise_locations.source_external_listing_id is
    '가맹점으로 전환할 때 복사한 외부 상가 매물 ID';
comment on column public.franchise_locations.contracted_at is
    '계약완료 lead를 가맹점 마스터로 전환한 시각';
