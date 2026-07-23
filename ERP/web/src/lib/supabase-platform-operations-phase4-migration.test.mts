import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationUrl = new URL('../../supabase_platform_operations_phase4_migration.sql', import.meta.url);

test('4단계 migration은 감사 이력과 관리자 전용 재처리 함수를 제공한다', async () => {
    const sql = await readFile(migrationUrl, 'utf8');

    assert.match(sql, /create table if not exists public\.platform_audit_events/i);
    assert.match(sql, /create or replace function public\.retry_platform_operation_job/i);
    assert.match(sql, /PLATFORM_OPERATIONS_ADMIN_REQUIRED/);
    assert.match(sql, /revoke all on function public\.retry_platform_operation_job[\s\S]+from authenticated/i);
    assert.match(sql, /grant execute on function public\.retry_platform_operation_job[\s\S]+to service_role/i);
});
