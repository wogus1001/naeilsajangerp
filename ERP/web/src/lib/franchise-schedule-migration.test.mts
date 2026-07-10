import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const root = process.cwd();
const prepare = readSql('supabase_franchise_schedule_prepare_migration.sql');
const cutover = readSql('supabase_franchise_schedule_cutover_migration.sql');
const rollback = readSql('supabase_franchise_schedule_cutover_rollback.sql');

function readSql(fileName: string): string {
    return readFileSync(join(root, fileName), 'utf8');
}

function assertContains(haystack: string, needle: string): void {
    assert.equal(haystack.includes(needle), true, `missing SQL fragment: ${needle}`);
}

void test('Given migration SQL When inspecting docs and locks Then required rollout structure is explicit', () => {
    for (const sql of [prepare, cutover, rollback]) {
        assertContains(sql, 'SQL 등록 필요');
        assertContains(sql, "pg_advisory_xact_lock(hashtext('franchise_schedule_migration'))");
    }
    assertContains(prepare, 'prepare SQL -> code deploy -> cutover SQL -> authenticated QA');
    assertContains(cutover, "phase = 'cutover'");
    assertContains(rollback, "phase = 'prepared'");
});

void test('Given prepare SQL When inspecting schema Then table, indexes, RLS, and grants are pinned', () => {
    for (const fragment of [
        'create table if not exists public.franchise_schedules',
        'idx_franchise_schedules_source_unique',
        'idx_franchise_schedules_company_due',
        'idx_franchise_schedules_assignee_due',
        'idx_franchise_schedules_manager_due',
        'idx_franchise_schedules_company_status_due',
        'Company members can view franchise schedules',
        'Company members can insert manual franchise schedules',
        'Company members can update manual franchise schedules',
        'Company members can delete manual franchise schedules',
        'grant execute on function public.persist_franchise_approval_with_schedule(jsonb) to service_role',
        'revoke execute on function public.create_franchise_visit_with_schedule(jsonb) from public, anon, authenticated'
    ]) {
        assertContains(prepare, fragment);
    }
});

void test('Given migration SQL When inspecting candidate rules Then excluded and rollback marker rows are not moved accidentally', () => {
    for (const sql of [prepare, cutover]) {
        assertContains(sql, "s.source_type in ('approval-document', 'supervision-visit')");
        assertContains(sql, "s.source_id = 'franchise-manual:' || s.id");
        assertContains(sql, "s.metadata->>'franchise_manual_origin' = 'true'");
        assertContains(sql, 'excluded_source');
        assertContains(sql, 'FRANCHISE_SCHEDULE_PARTIAL_SOURCE_ABORT');
    }
    assert.equal(/delete\s+from\s+public\.schedules/i.test(prepare), false);
    assert.equal(/trigger\s+sync|dual[- ]write/i.test(`${prepare}\n${cutover}`), false);
});

void test('Given migration SQL When inspecting status and company guards Then invalid data aborts before cutover mutation', () => {
    for (const status of ['scheduled', 'pending', 'progress', 'in_progress', 'ongoing', '승인대기', '보고서대기', 'completed', 'done', 'delayed', 'overdue', 'cancelled', 'canceled']) {
        assertContains(prepare, status);
    }
    assertContains(prepare, 'UNSUPPORTED_FRANCHISE_SCHEDULE_STATUS_ABORT');
    assertContains(cutover, 'FRANCHISE_SCHEDULE_VISIT_COMPANY_OR_SOURCE_MISMATCH');
    assertContains(cutover, 'FRANCHISE_SCHEDULE_VISIT_COMPANY_MISMATCH');
    assert.ok(cutover.indexOf('FRANCHISE_SCHEDULE_BACKUP_OR_COPY_MISSING') < cutover.indexOf('delete from public.schedules'));
});

void test('Given RPC SQL When inspecting contracts Then service role functions accept the planned payloads', () => {
    for (const fragment of [
        'public.create_franchise_visit_with_schedule(payload jsonb)',
        'public.persist_franchise_approval_with_schedule(payload jsonb)',
        "payload->>'scheduleOperation'",
        "operation = 'upsert'",
        "operation = 'complete'",
        'public.persist_franchise_report_with_schedule(payload jsonb)',
        'public.persist_franchise_corrective_action(payload jsonb)',
        "operation not in ('insert', 'update')"
    ]) {
        assertContains(prepare, fragment);
    }
});
