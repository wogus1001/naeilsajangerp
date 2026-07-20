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
const durableSyncMigration = readFileSync(
    new URL('../../supabase_franchise_schedule_durable_sync_migration.sql', import.meta.url),
    'utf8'
);
const visibilityMigration = readFileSync(
    new URL('../../supabase_franchise_schedule_visibility_migration.sql', import.meta.url),
    'utf8'
);
const durableReviewFixMigration = readFileSync(
    new URL('../../supabase_franchise_schedule_durable_sync_review_fix_migration.sql', import.meta.url),
    'utf8'
);

void test('Given the source schedule RPC When permissions are installed Then only service role can execute it', () => {
    assert.match(migration, /revoke all on function public\.normalize_franchise_schedule_status\(text, timestamp with time zone, text\) from public, anon, authenticated/);
    assert.match(migration, /grant execute on function public\.normalize_franchise_schedule_status\(text, timestamp with time zone, text\) to service_role/);
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

void test('Given authenticated schedule policies When visibility helpers are installed Then anonymous direct execution is denied', () => {
    for (const signature of [
        'is_active_franchise_schedule_member(uuid)',
        'can_manage_franchise_schedules(uuid)',
        'is_assignable_franchise_schedule_profile(uuid, uuid, boolean)'
    ]) {
        assert.match(visibilityMigration, new RegExp(`revoke all on function public\\.${signature.replace(/[()]/g, '\\$&')} from public, anon`));
        assert.match(visibilityMigration, new RegExp(`grant execute on function public\\.${signature.replace(/[()]/g, '\\$&')} to authenticated`));
    }
});

void test('Given operational schedule writes When durable sync is installed Then schedule and recipients share one locked transaction', () => {
    assert.match(durableSyncMigration, /create table if not exists public\.franchise_schedule_sync_jobs/);
    assert.match(durableSyncMigration, /pg_advisory_xact_lock/);
    assert.match(
        durableSyncMigration,
        /public\.normalize_franchise_schedule_status\(\s*schedule_payload->>'status',\s*nullif\(schedule_payload->>'completed_at', ''\)::timestamp with time zone,\s*'예정'\s*\)/
    );
    assert.match(durableSyncMigration, /public\.upsert_franchise_schedule_from_payload\([\s\S]*schedule_payload - '_sync_job_id' - '_sync_job_token' - '_sync_job_updated_at'[\s\S]*\)/);
    assert.match(durableSyncMigration, /insert into public\.franchise_notifications/);
    assert.match(durableSyncMigration, /on conflict \(company_id, recipient_profile_id, source_type, source_id\)/);
});

void test('Given queued failures and elapsed dates When the daily cron runs Then jobs are claimed once and late schedules are promoted', () => {
    assert.match(durableSyncMigration, /for update skip locked/);
    assert.match(durableSyncMigration, /candidate\.status = 'processing'[\s\S]*candidate\.updated_at <= timezone\('utc'::text, now\(\)\) - interval '15 minutes'/);
    assert.match(durableSyncMigration, /create or replace function public\.reconcile_franchise_schedule_lateness/);
    assert.match(durableSyncMigration, /status in \('예정', '진행중'\)/);
    assert.match(durableSyncMigration, /grant execute on function public\.claim_franchise_schedule_sync_jobs\(integer\) to service_role/);
});

void test('Given the durable migration was already applied When installing the review fix Then stale leases and helper permissions are corrected', () => {
    assert.match(durableReviewFixMigration, /candidate\.status = 'processing'[\s\S]*interval '15 minutes'/);
    assert.match(durableReviewFixMigration, /revoke all on function public\.normalize_franchise_schedule_status/);
    assert.match(durableReviewFixMigration, /grant execute on function public\.claim_franchise_schedule_sync_jobs\(integer\) to service_role/);
    assert.match(durableReviewFixMigration, /_sync_job_updated_at/);
    assert.match(durableReviewFixMigration, /lease_token = sync_job_token/);
    assert.match(durableReviewFixMigration, /delete from public\.franchise_schedule_sync_jobs/);
    assert.match(durableReviewFixMigration, /auth\.uid\(\)[\s\S]*target_company_id/);
});
