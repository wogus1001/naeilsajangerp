-- Company-scoped login IDs for ERP sign-in.
-- Apply manually in Supabase SQL Editor.

alter table public.profiles
    add column if not exists login_id text,
    add column if not exists login_id_normalized text;

update public.profiles
set
    login_id = coalesce(nullif(trim(login_id), ''), split_part(email, '@', 1)),
    login_id_normalized = lower(coalesce(nullif(trim(login_id_normalized), ''), split_part(email, '@', 1)))
where email is not null
  and (
    login_id is null
    or trim(login_id) = ''
    or login_id_normalized is null
    or trim(login_id_normalized) = ''
  );

do $$
begin
    if exists (
        select 1
        from (
            select company_id, login_id_normalized, count(*) as duplicate_count
            from public.profiles
            where company_id is not null
              and login_id_normalized is not null
              and trim(login_id_normalized) <> ''
            group by company_id, login_id_normalized
            having count(*) > 1
        ) duplicates
    ) then
        raise exception 'Duplicate login_id_normalized exists in the same company. Resolve duplicate profile login IDs before creating the unique index.';
    end if;
end $$;

create unique index if not exists profiles_company_login_id_normalized_unique
    on public.profiles (company_id, login_id_normalized)
    where company_id is not null
      and login_id_normalized is not null
      and trim(login_id_normalized) <> '';

create index if not exists profiles_login_id_normalized_idx
    on public.profiles (login_id_normalized)
    where login_id_normalized is not null
      and trim(login_id_normalized) <> '';
