import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const sql = readFileSync(new URL('./supabase_franchise_work_intake_deleted_records_migration.sql', import.meta.url), 'utf8');

test('Given work intake delete history migration When inspected Then deleted record table and RPC are present', () => {
    assert.match(sql, /create table if not exists public\.franchise_work_intake_deleted_records/);
    assert.match(sql, /create or replace function public\.delete_franchise_work_intake_record_with_snapshot/);
    assert.match(sql, /insert into public\.franchise_work_intake_deleted_records/);
    assert.match(sql, /delete from public\.properties/);
    assert.match(sql, /delete from public\.franchise_lead_registration_requests/);
    assert.match(sql, /delete from public\.franchise_leads/);
    assert.match(sql, /for update/);
    assert.match(sql, /get diagnostics v_deleted_count = row_count/);
    assert.match(sql, /create unique index if not exists franchise_work_intake_deleted_source_uidx/);
    assert.match(sql, /jsonb_build_object\('sourceTable', v_source_table, 'row', v_source_row\)/);
});
