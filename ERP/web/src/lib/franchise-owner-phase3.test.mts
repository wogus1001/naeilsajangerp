import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
    buildOwnerPhase3SourceKey,
    buildOwnerPhase3StoragePath,
    canTransitionOwnerSettlementStatus,
    isOwnerPhase3StoragePath
} from './franchise-owner-phase3';

const companyId = '0370fba6-364a-43a9-9cc4-0f133a9d2052';
const locationId = '92924bd6-b2a1-49bb-844b-05eabcc51bbf';
const sourceId = '19a7f698-5b5f-4aa7-bc66-23236019023d';
const uniqueId = '68c1f2d5-4e30-4e89-97f1-f683d7591fb0';
const migration = readFileSync(new URL('../../supabase_franchise_owner_phase3_migration.sql', import.meta.url), 'utf8');

function readMigrationFunction(name: string): string {
    const start = migration.indexOf(`create or replace function public.${name}`);
    assert.notEqual(start, -1, `${name} must exist in the Phase 3 migration`);
    const end = migration.indexOf('\n$$;', start);
    assert.notEqual(end, -1, `${name} must have a complete SQL body`);
    return migration.slice(start, end + 4);
}

test('phase 3 source keys stay company scoped and deterministic', () => {
    assert.equal(buildOwnerPhase3SourceKey({
        companyId,
        locationId,
        ownerAccountId: null,
        sourceType: 'content_item',
        sourceId
    }), `${companyId}:content_item:${sourceId}`);
});

test('private owner files include source, company, location and source id boundaries', () => {
    const path = buildOwnerPhase3StoragePath({
        companyId,
        fileName: '7월 정산 증빙.pdf',
        locationId,
        sourceId,
        sourceType: 'settlement',
        uniqueId
    });
    assert.equal(path, `settlement/${companyId}/${locationId}/${sourceId}/${uniqueId}-7.pdf`);
    assert.equal(isOwnerPhase3StoragePath({ companyId, locationId, path: path || '', sourceType: 'settlement' }), true);
    assert.equal(isOwnerPhase3StoragePath({ companyId: sourceId, locationId, path: path || '' }), false);
});

test('settlement review transitions reject terminal-state rewrites', () => {
    assert.equal(canTransitionOwnerSettlementStatus('draft', 'submitted'), true);
    assert.equal(canTransitionOwnerSettlementStatus('submitted', 'rejected'), true);
    assert.equal(canTransitionOwnerSettlementStatus('rejected', 'submitted'), true);
    assert.equal(canTransitionOwnerSettlementStatus('confirmed', 'rejected'), false);
    assert.equal(canTransitionOwnerSettlementStatus('draft', 'confirmed'), false);
});

test('settlement RLS limits direct staff reads to operational managers', () => {
    for (const table of [
        'franchise_owner_settlement_requests',
        'franchise_owner_settlement_submissions',
        'franchise_owner_settlement_files'
    ]) {
        assert.match(migration, new RegExp(`'${table}'`));
    }
    assert.match(migration, /p\.role in \(''manager'', ''sub_manager''\)/);
});

test('Given partially applied Phase 3 schema When rerunning migration Then audit and parent invariants remain idempotent', () => {
    assert.match(migration, /create table if not exists public\.franchise_owner_content_versions/);
    assert.match(migration, /create table if not exists public\.franchise_owner_content_version_attachments/);
    assert.match(migration, /create or replace function public\.enforce_franchise_owner_phase3_scope/);
    assert.match(migration, /drop trigger if exists franchise_owner_phase3_scope_guard/);
    assert.match(migration, /add column if not exists deletion_state/);
    assert.match(migration, /create table if not exists public\.franchise_owner_file_deletion_outbox/);
});

test('Given owner mutations When inspecting the migration Then receipts reminders settlements and files use transactional RPCs', () => {
    for (const rpc of [
        'mutate_franchise_owner_content',
        'record_franchise_owner_content_receipt',
        'create_franchise_owner_reminder_deliveries',
        'acknowledge_franchise_owner_reminder',
        'mutate_franchise_owner_settlement_submission',
        'review_franchise_owner_settlement_submission',
        'reserve_franchise_owner_settlement_file',
        'request_franchise_owner_settlement_file_deletion',
        'enqueue_franchise_owner_stale_file_cleanup'
    ]) {
        assert.match(migration, new RegExp(`create or replace function public\\.${rpc}`));
    }
    assert.match(migration, /for update/);
    assert.match(migration, /insert into public\.franchise_owner_portal_events/);
    assert.match(migration, /revoke execute on function[\s\S]+from public, anon, authenticated/);
});

test('Given authenticated table access When inspecting policies Then staff partner and direct settlement DML stay blocked', () => {
    assert.match(migration, /p\.role = ''admin'' or \(p\.company_id = %I\.company_id and p\.role in \(''manager'', ''sub_manager''\)\)/);
    assert.match(migration, /revoke insert, update, delete on table public\.franchise_owner_settlement_requests from authenticated/);
    assert.match(migration, /revoke insert, update, delete on table public\.franchise_owner_settlement_submissions from authenticated/);
    assert.match(migration, /revoke insert, update, delete on table public\.franchise_owner_settlement_files from authenticated/);
});

test('Given settlement file operations When inspecting routes Then manager downloads and DELETE query contracts are enforced', () => {
    const staffFilesRoute = readFileSync(new URL('../app/api/franchise-owner-portal/settlements/files/route.ts', import.meta.url), 'utf8');
    const ownerFilesRoute = readFileSync(new URL('../app/api/owner/settlements/files/route.ts', import.meta.url), 'utf8');
    const ownerPages = readFileSync(new URL('../app/owner/_components/OwnerPhase3Pages.tsx', import.meta.url), 'utf8');
    assert.match(staffFilesRoute, /isOwnerPortalManager/);
    assert.match(ownerFilesRoute, /request_franchise_owner_settlement_file_deletion/);
    assert.match(ownerPages, /\/api\/owner\/settlements\/files\?fileId=/);
    assert.match(ownerPages, /clientFileId/);
});

test('Given content history When rerunning the migration Then current attachments are not copied into older versions', () => {
    assert.match(migration, /join public\.franchise_owner_content_items current_content[\s\S]+current_content\.version = version_snapshot\.content_version/);
    assert.match(migration, /from public\.franchise_owner_content_versions version_snapshot[\s\S]+version_snapshot\.content_version = new\.source_version/);
});

test('Given a pending settlement upload When submitting Then the database blocks the state transition', () => {
    assert.match(migration, /p_action = 'submit'[\s\S]+upload_state = 'reserved'[\s\S]+OWNER_SETTLEMENT_FILE_PENDING/);
});

test('Given failed private file deletion When daily maintenance runs Then pending outbox jobs are retried', () => {
    const cronRoute = readFileSync(new URL('../app/api/franchise-notifications/cron/route.ts', import.meta.url), 'utf8');
    assert.match(cronRoute, /franchise_owner_file_deletion_outbox/);
    assert.match(cronRoute, /complete_franchise_owner_file_deletion/);
    assert.match(cronRoute, /record_franchise_owner_file_deletion_failure/);
});

test('Given legacy Phase 3 rows When rerunning the migration Then backfills run once without deleting or rewriting history', () => {
    assert.doesNotMatch(migration, /franchise_owner_phase3_backfill_flags/);
    assert.match(migration, /column_name = 'content_version'[\s\S]+alter table public\.franchise_owner_content_attachments[\s\S]+update public\.franchise_owner_content_attachments attachment/);
    assert.match(migration, /column_name = 'content_version'[\s\S]+alter table public\.franchise_owner_content_receipts[\s\S]+update public\.franchise_owner_content_receipts receipt/);
    assert.match(migration, /column_name = 'source_version'[\s\S]+alter table public\.franchise_owner_reminders[\s\S]+update public\.franchise_owner_reminders reminder/);
    assert.match(migration, /'migration_backfill'[\s\S]+on conflict \(content_id, content_version\) do nothing/);
    assert.equal(migration.match(/phase3_history_missing boolean := to_regclass\('public\.franchise_owner_content_versions'\) is null/g)?.length, 3);
    assert.doesNotMatch(migration, /delete from public\.franchise_owner_content_receipts/);
    assert.equal(migration.match(/set source_version = content\.version/g)?.length, 1);
});

test('Given concurrent reminder retries When a request key is reused Then one locked ledger atomically validates the fingerprint', () => {
    const reminderRpc = readMigrationFunction('create_franchise_owner_reminder_deliveries');
    assert.match(migration, /create table if not exists public\.franchise_owner_reminder_requests/);
    assert.match(migration, /drop function if exists public\.create_franchise_owner_reminder_deliveries\([\s\S]+uuid, jsonb[\s\S]+\);/);
    assert.match(reminderRpc, /insert into public\.franchise_owner_reminder_requests[\s\S]+on conflict \(company_id, request_idempotency_key\) do nothing/);
    assert.match(reminderRpc, /from public\.franchise_owner_reminder_requests reminder_request[\s\S]+for update;[\s\S]+OWNER_REMINDER_IDEMPOTENCY_MISMATCH/);
    assert.match(reminderRpc, /canonical_location_ids::text/);
    assert.match(reminderRpc, /if request_created is distinct from true then[\s\S]+request_idempotency_key = p_request_idempotency_key[\s\S]+return jsonb_build_object/);
});

test('Given a content reminder race When deliveries are created Then the RPC locks and validates the current published source version', () => {
    const reminderRpc = readMigrationFunction('create_franchise_owner_reminder_deliveries');
    assert.match(reminderRpc, /from public\.franchise_owner_content_items content[\s\S]+for share;/);
    assert.match(reminderRpc, /current_content\.status <> 'published'[\s\S]+current_content\.version <> p_source_version/);
    assert.match(reminderRpc, /OWNER_REMINDER_CONTENT_STALE/);
});

test('Given a legacy reminder for archived content When it is acknowledged Then the scope trigger accepts the immutable source version', () => {
    const scopeTrigger = readMigrationFunction('enforce_franchise_owner_phase3_scope');
    assert.match(scopeTrigger, /version_snapshot\.content_version = new\.source_version/);
    assert.doesNotMatch(scopeTrigger, /version_snapshot\.status = 'published'/);
});

test('Given concurrent draft and attachment changes When mutating content Then every write advances the locked version and scope stays stable', () => {
    const contentRpc = readMigrationFunction('mutate_franchise_owner_content');
    const attachmentRpc = readMigrationFunction('register_franchise_owner_content_attachment');
    const attachmentRoute = readFileSync(new URL('../app/api/franchise-owner-portal/content/attachments/route.ts', import.meta.url), 'utf8');
    assert.match(contentRpc, /if p_expected_version is null or p_expected_version <> current_content\.version/);
    assert.match(contentRpc, /next_version := current_content\.version \+ 1/);
    assert.match(contentRpc, /p_action = 'publish'[\s\S]+version = current_content\.version \+ 1/);
    assert.match(attachmentRpc, /current_content\.location_id is distinct from p_expected_location_id/);
    assert.match(attachmentRpc, /next_version := current_content\.version \+ 1/);
    assert.match(attachmentRoute, /p_expected_location_id: content\.location_id/);
});

test('Given an existing settlement draft When saving Then updated_at is required and compared after the row lock', () => {
    const settlementRpc = readMigrationFunction('mutate_franchise_owner_settlement_submission');
    assert.match(settlementRpc, /p_expected_updated_at timestamptz default null/);
    assert.match(settlementRpc, /from public\.franchise_owner_settlement_submissions submission[\s\S]+for update;[\s\S]+p_expected_updated_at is null[\s\S]+current_submission\.updated_at is distinct from p_expected_updated_at[\s\S]+OWNER_SETTLEMENT_STALE_VERSION/);
    assert.match(migration, /grant execute on function public\.mutate_franchise_owner_settlement_submission\(uuid, uuid, uuid, uuid, text, numeric, text, timestamptz\) to service_role/);
});

test('Given stale private uploads and orphaned content When cron enqueues cleanup Then tenant-scoped outbox jobs are returned as a count', () => {
    const cleanupRpc = readMigrationFunction('enqueue_franchise_owner_stale_file_cleanup');
    assert.match(cleanupRpc, /\(\)\s*returns integer/);
    assert.match(cleanupRpc, /interval '24 hours'/);
    assert.match(cleanupRpc, /set deletion_state = 'pending'[\s\S]+upload_state = 'reserved'/);
    assert.match(cleanupRpc, /from storage\.objects storage_object[\s\S]+not exists[\s\S]+attachment\.deletion_state = 'active'/);
    assert.match(cleanupRpc, /split_part\(storage_object\.name, '\/', 2\)::uuid[\s\S]+substring\(split_part\(storage_object\.name, '\/', 5\) from 1 for 36\)::uuid/);
    assert.match(cleanupRpc, /franchise_owner_content_version_attachments snapshot[\s\S]+snapshot\.storage_path = candidate\.storage_path/);
    assert.match(migration, /grant execute on function public\.enqueue_franchise_owner_stale_file_cleanup\(\) to service_role/);
});

test('Given an upload reservation When activation races with request closure Then the database checks the parent request again', () => {
    const activationRpc = readMigrationFunction('activate_franchise_owner_settlement_file');
    assert.match(activationRpc, /join public\.franchise_owner_settlement_requests request_row[\s\S]+for update of request_row;[\s\S]+settlement_request\.status <> 'open'[\s\S]+OWNER_SETTLEMENT_REQUEST_CLOSED/);
});

test('Given concurrent settlement file retries When reserving Then the parent request is open and immutable fields are compared atomically', () => {
    const reservationRpc = readMigrationFunction('reserve_franchise_owner_settlement_file');
    assert.match(migration, /drop function if exists public\.reserve_franchise_owner_settlement_file\([\s\S]+uuid, text, text, bigint, text, text[\s\S]+\);/);
    assert.match(reservationRpc, /from public\.franchise_owner_settlement_requests settlement_request[\s\S]+for update;[\s\S]+settlement_request\.status <> 'open'[\s\S]+OWNER_SETTLEMENT_REQUEST_CLOSED/);
    assert.match(reservationRpc, /insert into public\.franchise_owner_settlement_files[\s\S]+on conflict \(submission_id, owner_account_id, client_file_id\) do nothing/);
    assert.match(reservationRpc, /from public\.franchise_owner_settlement_files settlement_file[\s\S]+for update;[\s\S]+file_row\.company_id <> p_company_id[\s\S]+file_row\.storage_path <> p_storage_path[\s\S]+OWNER_SETTLEMENT_FILE_RETRY_MISMATCH/);
});

test('Given immutable content snapshots When service-role permissions are granted Then update and delete remain revoked', () => {
    assert.match(migration, /grant select, insert on table public\.franchise_owner_content_versions to service_role/);
    assert.match(migration, /revoke update, delete on table public\.franchise_owner_content_versions from service_role/);
    assert.match(migration, /revoke update, delete on table public\.franchise_owner_content_version_attachments from service_role/);
    assert.match(migration, /foreign key \(content_id\) references public\.franchise_owner_content_items\(id\) on delete restrict/);
    assert.match(migration, /revoke delete on table public\.franchise_owner_content_items from service_role/);
    const deletionRpc = readMigrationFunction('request_franchise_owner_content_attachment_deletion');
    assert.match(deletionRpc, /franchise_owner_content_version_attachments snapshot[\s\S]+preserve_history/);
    assert.match(deletionRpc, /if preserve_history then[\s\S]+historyPreserved/);
});

test('Given retried settlement requests When the same key is reused Then payload equality is checked under a row lock', () => {
    const requestRpc = readMigrationFunction('create_franchise_owner_settlement_request');
    assert.match(requestRpc, /on conflict \(company_id, request_idempotency_key\) do nothing/);
    assert.match(requestRpc, /for update;[\s\S]+OWNER_SETTLEMENT_IDEMPOTENCY_MISMATCH/);
});

test('Given the same settlement file retry key When content differs Then the database rejects the hash mismatch', () => {
    const reservationRpc = readMigrationFunction('reserve_franchise_owner_settlement_file');
    assert.match(reservationRpc, /file_row\.content_sha256 <> p_content_sha256/);
});

test('Given an ambiguous settlement upload failure When a reservation exists Then the route preserves it for idempotent retry', () => {
    const ownerFilesRoute = readFileSync(new URL('../app/api/owner/settlements/files/route.ts', import.meta.url), 'utf8');
    assert.doesNotMatch(ownerFilesRoute, /cleanupReservedSettlementFile/);
    assert.match(ownerFilesRoute, /retryResult\.data\?\.upload_state === 'active'/);
    assert.match(ownerFilesRoute, /upsert: false/);
});

test('Given a settlement schedule queue failure When maintenance runs Then source submissions are reconciled again', () => {
    const cronRoute = readFileSync(new URL('../app/api/franchise-notifications/cron/route.ts', import.meta.url), 'utf8');
    assert.match(cronRoute, /franchise_owner_settlement_submissions/);
    assert.match(cronRoute, /safelySyncOwnerSettlementSchedule/);
    assert.match(cronRoute, /\.range\(offset, offset \+ SETTLEMENT_RECONCILIATION_BATCH_SIZE - 1\)/);
    assert.match(cronRoute, /needsOwnerSettlementScheduleReconciliation/);
    assert.match(cronRoute, /phase3SettlementScheduleReconciliation/);
});
