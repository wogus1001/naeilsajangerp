import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationUrl = new URL('./supabase_franchise_lead_source_options_migration.sql', import.meta.url);
const otherEditableMigrationUrl = new URL(
    './supabase_franchise_lead_source_other_editable_migration.sql',
    import.meta.url
);

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

test('Given the default 기타 source, when options are seeded or registered, then it remains editable', async () => {
    const sql = await readFile(migrationUrl, 'utf8');
    const protectFunction = sql.match(
        /create or replace function public\.protect_franchise_lead_source_option\(\)[\s\S]*?(?=drop trigger)/
    )?.[0] ?? '';
    const registerFunction = sql.match(
        /create or replace function public\.register_franchise_lead_source_option\(\)[\s\S]*?(?=drop trigger)/
    )?.[0] ?? '';

    assert.match(sql, /\('기타', '기타', false, 120\)/);
    assert.doesNotMatch(protectFunction, /'기타'/);
    assert.doesNotMatch(registerFunction, /'기타'/);
});

test('Given an existing company with a protected 기타 source, when applying the follow-up migration, then it becomes editable safely', async () => {
    const sql = await readFile(otherEditableMigrationUrl, 'utf8');
    const protectFunction = sql.match(
        /create or replace function public\.protect_franchise_lead_source_option\(\)[\s\S]*?(?=create trigger)/
    )?.[0] ?? '';
    const registerFunction = sql.match(
        /create or replace function public\.register_franchise_lead_source_option\(\)[\s\S]*?(?=commit;)/
    )?.[0] ?? '';
    const dropTriggerIndex = sql.indexOf(
        'drop trigger if exists protect_franchise_lead_source_option_before_write'
    );
    const updateIndex = sql.indexOf('is_system = false', dropTriggerIndex);
    const recreateTriggerIndex = sql.lastIndexOf(
        'create trigger protect_franchise_lead_source_option_before_write'
    );

    assert.ok(dropTriggerIndex >= 0);
    assert.ok(updateIndex > dropTriggerIndex);
    assert.ok(recreateTriggerIndex > updateIndex);
    assert.match(sql, /where code = '기타'\s+and is_system = true/);
    assert.match(sql, /\('기타', '기타', false, 120\)/);
    assert.doesNotMatch(protectFunction, /'기타'/);
    assert.doesNotMatch(registerFunction, /'기타'/);
});
