begin;

alter table public.organization_memberships
  drop constraint if exists organization_memberships_company_id_unit_id_fkey;

alter table public.organization_memberships
  add constraint organization_memberships_company_id_unit_id_fkey
  foreign key (company_id, unit_id)
  references public.organization_units(company_id, id)
  on delete restrict;

alter table public.approval_role_assignments
  drop constraint if exists approval_role_assignments_company_id_unit_id_fkey;

alter table public.approval_role_assignments
  add constraint approval_role_assignments_company_id_unit_id_fkey
  foreign key (company_id, unit_id)
  references public.organization_units(company_id, id)
  on delete restrict;

commit;
