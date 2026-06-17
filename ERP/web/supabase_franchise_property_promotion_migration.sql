create unique index if not exists idx_franchise_locations_company_source_property_unique
  on public.franchise_locations (company_id, source_property_id)
  where source_property_id is not null;
