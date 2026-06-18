-- Partner vendor signup and franchise location access migration.
-- Apply this after franchise location/message/opening-project migrations.

alter table public.profiles
  add column if not exists phone text,
  add column if not exists phone_normalized text;

create index if not exists idx_profiles_company_phone_normalized
  on public.profiles (company_id, phone_normalized)
  where phone_normalized is not null and phone_normalized <> '';

revoke select (phone, phone_normalized) on public.profiles from anon, authenticated;

create index if not exists idx_profiles_company_role_status
  on public.profiles (company_id, role, status);

create or replace function public.prevent_profile_privilege_self_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and coalesce(auth.role(), '') <> 'service_role' then
    if new.id <> auth.uid() then
      raise exception 'profiles row update is not allowed';
    end if;

    if new.role is distinct from old.role
      or new.status is distinct from old.status
      or new.company_id is distinct from old.company_id
      or new.email is distinct from old.email then
      raise exception 'profile role, status, company, and email are managed by administrators';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_profile_privilege_self_update on public.profiles;
create trigger prevent_profile_privilege_self_update
before update on public.profiles
for each row execute function public.prevent_profile_privilege_self_update();

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid());

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, phone, phone_normalized, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'phone',
    regexp_replace(coalesce(new.raw_user_meta_data->>'phone_normalized', new.raw_user_meta_data->>'phone', ''), '\D', '', 'g'),
    'staff'
  );
  return new;
end;
$$;

alter table public.franchise_locations
  add column if not exists created_by uuid references public.profiles(id) on delete set null;

create index if not exists idx_franchise_locations_company_creator_updated
  on public.franchise_locations (company_id, created_by, updated_at desc);

alter table public.franchise_leads
  add column if not exists created_by uuid references public.profiles(id) on delete set null;

create index if not exists idx_franchise_leads_company_creator_updated
  on public.franchise_leads (company_id, created_by, updated_at desc);

alter table public.franchise_lead_registration_requests
  add column if not exists created_by uuid references public.profiles(id) on delete set null;

create index if not exists idx_franchise_lead_registration_requests_company_creator_created
  on public.franchise_lead_registration_requests (company_id, created_by, created_at desc);

create or replace function public.get_my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.can_access_franchise_location(
  target_company_id uuid,
  target_created_by uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'admin'
        or (
          p.company_id = target_company_id
          and (
            p.role in ('manager', 'sub_manager', 'staff')
            or (p.role = 'partner_vendor' and target_created_by = auth.uid())
          )
        )
      )
  );
$$;

create or replace function public.can_access_franchise_lead(
  target_company_id uuid,
  target_created_by uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'admin'
        or (
          p.company_id = target_company_id
          and (
            p.role in ('manager', 'sub_manager', 'staff')
            or (p.role = 'partner_vendor' and target_created_by = auth.uid())
          )
        )
      )
  );
$$;

drop policy if exists "Company members can view franchise_leads" on public.franchise_leads;
drop policy if exists "Company members can insert franchise_leads" on public.franchise_leads;
drop policy if exists "Company members can update franchise_leads" on public.franchise_leads;
drop policy if exists "Company members can delete franchise_leads" on public.franchise_leads;

create policy "Company members can view franchise_leads" on public.franchise_leads
  for select using (public.can_access_franchise_lead(company_id, created_by));

create policy "Company members can insert franchise_leads" on public.franchise_leads
  for insert with check (public.can_access_franchise_lead(company_id, created_by));

create policy "Company members can update franchise_leads" on public.franchise_leads
  for update using (public.can_access_franchise_lead(company_id, created_by))
  with check (public.can_access_franchise_lead(company_id, created_by));

create policy "Company members can delete franchise_leads" on public.franchise_leads
  for delete using (public.can_access_franchise_lead(company_id, created_by));

drop policy if exists "Company members can view franchise_lead_registration_requests" on public.franchise_lead_registration_requests;
drop policy if exists "Company members can insert franchise_lead_registration_requests" on public.franchise_lead_registration_requests;
drop policy if exists "Company members can update franchise_lead_registration_requests" on public.franchise_lead_registration_requests;
drop policy if exists "Company members can delete franchise_lead_registration_requests" on public.franchise_lead_registration_requests;

create policy "Company members can view franchise_lead_registration_requests" on public.franchise_lead_registration_requests
  for select using (public.can_access_franchise_lead(company_id, created_by));

create policy "Company members can insert franchise_lead_registration_requests" on public.franchise_lead_registration_requests
  for insert with check (public.can_access_franchise_lead(company_id, created_by));

create policy "Company members can update franchise_lead_registration_requests" on public.franchise_lead_registration_requests
  for update using (public.can_access_franchise_lead(company_id, created_by))
  with check (public.can_access_franchise_lead(company_id, created_by));

create policy "Company members can delete franchise_lead_registration_requests" on public.franchise_lead_registration_requests
  for delete using (public.can_access_franchise_lead(company_id, created_by));

drop policy if exists "Company members can view franchise_locations" on public.franchise_locations;
drop policy if exists "Company members can insert franchise_locations" on public.franchise_locations;
drop policy if exists "Company members can update franchise_locations" on public.franchise_locations;
drop policy if exists "Company members can delete franchise_locations" on public.franchise_locations;

create policy "Company members can view franchise_locations" on public.franchise_locations
  for select using (public.can_access_franchise_location(company_id, created_by));

create policy "Company members can insert franchise_locations" on public.franchise_locations
  for insert with check (public.can_access_franchise_location(company_id, created_by));

create policy "Company members can update franchise_locations" on public.franchise_locations
  for update using (public.can_access_franchise_location(company_id, created_by))
  with check (public.can_access_franchise_location(company_id, created_by));

create policy "Company members can delete franchise_locations" on public.franchise_locations
  for delete using (public.can_access_franchise_location(company_id, created_by));

drop policy if exists "Company members can view franchise_location_messages" on public.franchise_location_messages;
drop policy if exists "Company members can insert franchise_location_messages" on public.franchise_location_messages;
drop policy if exists "Company members can update franchise_location_messages" on public.franchise_location_messages;

create policy "Company members can view franchise_location_messages" on public.franchise_location_messages
  for select using (
    exists (
      select 1
      from public.franchise_locations fl
      where fl.id = franchise_location_messages.location_id
        and fl.company_id = franchise_location_messages.company_id
        and public.can_access_franchise_location(fl.company_id, fl.created_by)
    )
  );

create policy "Company members can insert franchise_location_messages" on public.franchise_location_messages
  for insert with check (
    exists (
      select 1
      from public.franchise_locations fl
      where fl.id = franchise_location_messages.location_id
        and fl.company_id = franchise_location_messages.company_id
        and public.can_access_franchise_location(fl.company_id, fl.created_by)
    )
  );

create policy "Company members can update franchise_location_messages" on public.franchise_location_messages
  for update using (
    exists (
      select 1
      from public.franchise_locations fl
      where fl.id = franchise_location_messages.location_id
        and fl.company_id = franchise_location_messages.company_id
        and public.can_access_franchise_location(fl.company_id, fl.created_by)
    )
  )
  with check (
    exists (
      select 1
      from public.franchise_locations fl
      where fl.id = franchise_location_messages.location_id
        and fl.company_id = franchise_location_messages.company_id
        and public.can_access_franchise_location(fl.company_id, fl.created_by)
    )
  );

drop policy if exists "Company members can view franchise_opening_projects" on public.franchise_opening_projects;
drop policy if exists "Company members can insert franchise_opening_projects" on public.franchise_opening_projects;
drop policy if exists "Company members can update franchise_opening_projects" on public.franchise_opening_projects;
drop policy if exists "Company members can delete franchise_opening_projects" on public.franchise_opening_projects;

create policy "Company members can view franchise_opening_projects" on public.franchise_opening_projects
  for select using (
    exists (
      select 1
      from public.franchise_locations fl
      where fl.id = franchise_opening_projects.location_id
        and fl.company_id = franchise_opening_projects.company_id
        and public.can_access_franchise_location(fl.company_id, fl.created_by)
    )
  );

create policy "Company members can insert franchise_opening_projects" on public.franchise_opening_projects
  for insert with check (
    exists (
      select 1
      from public.franchise_locations fl
      where fl.id = franchise_opening_projects.location_id
        and fl.company_id = franchise_opening_projects.company_id
        and public.can_access_franchise_location(fl.company_id, fl.created_by)
    )
  );

create policy "Company members can update franchise_opening_projects" on public.franchise_opening_projects
  for update using (
    exists (
      select 1
      from public.franchise_locations fl
      where fl.id = franchise_opening_projects.location_id
        and fl.company_id = franchise_opening_projects.company_id
        and public.can_access_franchise_location(fl.company_id, fl.created_by)
    )
  )
  with check (
    exists (
      select 1
      from public.franchise_locations fl
      where fl.id = franchise_opening_projects.location_id
        and fl.company_id = franchise_opening_projects.company_id
        and public.can_access_franchise_location(fl.company_id, fl.created_by)
    )
  );

create policy "Company members can delete franchise_opening_projects" on public.franchise_opening_projects
  for delete using (
    exists (
      select 1
      from public.franchise_locations fl
      where fl.id = franchise_opening_projects.location_id
        and fl.company_id = franchise_opening_projects.company_id
        and public.can_access_franchise_location(fl.company_id, fl.created_by)
    )
  );
