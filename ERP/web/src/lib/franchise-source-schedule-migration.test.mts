import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const migration = readFileSync(
    new URL('../../supabase_franchise_source_schedule_upsert_migration.sql', import.meta.url),
    'utf8'
);
const profileSecurityMigration = readFileSync(
    new URL('../../supabase_franchise_source_schedule_profile_security_migration.sql', import.meta.url),
    'utf8'
);

void test('Given the source schedule RPC When permissions are installed Then only service role can execute it', () => {
    assert.match(migration, /revoke all on function public\.upsert_franchise_schedule_from_payload\(jsonb\) from public, anon, authenticated/);
    assert.match(migration, /grant execute on function public\.upsert_franchise_schedule_from_payload\(jsonb\) to service_role/);
});

void test('Given a source schedule payload When company scope is invalid Then the RPC rejects the write', () => {
    assert.match(migration, /create unique index if not exists idx_franchise_schedules_source_unique/);
    assert.match(migration, /create or replace function public\.normalize_franchise_schedule_status/);
    assert.match(migration, /FRANCHISE_SCHEDULE_PROFILE_COMPANY_MISMATCH/);
    assert.match(migration, /FRANCHISE_SCHEDULE_SOURCE_REQUIRED/);
    assert.match(migration, /on conflict \(company_id, source_type, source_id\)/);
});

void test('Given an already completed source schedule When it is synchronized again Then the original completion time is preserved', () => {
    assert.match(
        migration,
        /coalesce\(\s*public\.franchise_schedules\.completed_at,\s*excluded\.completed_at,\s*timezone\('utc'::text, now\(\)\)\s*\)/
    );
});

void test('Given source schedule profile assignments When the security follow-up is installed Then inactive and partner profiles are rejected', () => {
    assert.match(profileSecurityMigration, /p\.status = 'active'/);
    assert.match(profileSecurityMigration, /coalesce\(p\.role, ''\) <> 'partner_vendor'/);
    assert.match(profileSecurityMigration, /p\.role in \('admin', 'manager'\)/);
    assert.match(profileSecurityMigration, /FRANCHISE_SCHEDULE_PROFILE_NOT_ASSIGNABLE/);
    assert.match(profileSecurityMigration, /FRANCHISE_SCHEDULE_MANAGER_NOT_ASSIGNABLE/);
    assert.match(profileSecurityMigration, /grant execute on function public\.upsert_franchise_schedule_from_payload\(jsonb\) to service_role/);
});
