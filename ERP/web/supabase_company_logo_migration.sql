alter table public.companies
  add column if not exists logo_url text,
  add column if not exists logo_path text,
  add column if not exists logo_file_name text,
  add column if not exists logo_file_size integer,
  add column if not exists logo_mime_type text,
  add column if not exists logo_updated_at timestamp with time zone;

create index if not exists idx_companies_logo_updated_at
  on public.companies(logo_updated_at);
