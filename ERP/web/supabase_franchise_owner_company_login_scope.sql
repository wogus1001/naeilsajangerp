do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.franchise_owner_accounts'::regclass
      and conname = 'franchise_owner_accounts_login_id_normalized_key'
  ) then
    alter table public.franchise_owner_accounts
      drop constraint franchise_owner_accounts_login_id_normalized_key;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.franchise_owner_accounts'::regclass
      and conname = 'franchise_owner_accounts_company_id_login_id_normalized_key'
  ) then
    alter table public.franchise_owner_accounts
      add constraint franchise_owner_accounts_company_id_login_id_normalized_key
      unique (company_id, login_id_normalized);
  end if;
end $$;
