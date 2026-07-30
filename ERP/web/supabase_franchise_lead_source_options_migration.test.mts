import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationUrl = new URL('./supabase_franchise_lead_source_options_migration.sql', import.meta.url);

test('Given the source option migration, when reviewing protected records, then system sources cannot be updated or deleted', async () => {
    const sql = await readFile(migrationUrl, 'utf8');

    assert.match(sql, /old\.is_system/);
    assert.match(sql, /raise exception 'protected franchise lead source options cannot be changed'/);
    assert.match(sql, /before insert or update or delete/);
    assert.match(sql, /new\.code in \(\s*'Meta Lead Ads'/);
});

test('Given a new lead source, when it is saved from any intake path, then the company option is registered automatically', async () => {
    const sql = await readFile(migrationUrl, 'utf8');

    assert.match(sql, /after insert or update of source on public\.franchise_leads/);
    assert.match(sql, /insert into public\.franchise_lead_source_options/);
    assert.match(sql, /on conflict \(company_id, code\) do nothing/);
});

test('Given source option rows, when company members access them, then RLS keeps the data company scoped', async () => {
    const sql = await readFile(migrationUrl, 'utf8');

    assert.match(sql, /alter table public\.franchise_lead_source_options enable row level security/);
    assert.match(sql, /company_id = public\.get_my_company_id\(\)/);
});
