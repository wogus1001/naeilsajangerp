import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const migration = readFileSync(
    new URL('../../supabase_company_approvals_security_review_migration.sql', import.meta.url),
    'utf8'
);
const scheduleVisibilityMigration = readFileSync(
    new URL('../../supabase_franchise_schedule_visibility_migration.sql', import.meta.url),
    'utf8'
);
const workflowScheduleMigration = readFileSync(
    new URL('../../supabase_company_approvals_workflow_schedule_fix_migration.sql', import.meta.url),
    'utf8'
);

void test('Given an authenticated idempotent action When a cached request exists Then actor authorization runs before the cache lookup', () => {
    const functionStart = migration.indexOf('create or replace function public.perform_approval_document_action_idempotent');
    const functionEnd = migration.indexOf('\n$$;', functionStart);
    const functionBody = migration.slice(functionStart, functionEnd);
    const authorizationCheck = functionBody.indexOf('auth.uid() <> p_actor_profile_id');
    const cachedRequestLookup = functionBody.indexOf('select request.* into existing_request');

    assert.notEqual(functionStart, -1);
    assert.notEqual(authorizationCheck, -1);
    assert.notEqual(cachedRequestLookup, -1);
    assert.ok(authorizationCheck < cachedRequestLookup);
});

void test('Given a captured delegate When document access is checked Then the migration requires a currently active scoped delegation', () => {
    assert.match(migration, /delegation\.delegate_profile_id = auth\.uid\(\)/);
    assert.match(migration, /step\.action_kind = any\(delegation\.action_scope\)/);
    assert.match(migration, /delegation\.starts_at <= clock_timestamp\(\)/);
    assert.match(migration, /delegation\.ends_at >= clock_timestamp\(\)/);
});

void test('Given document RLS policies When legacy read access is evaluated Then the hardened access predicate is used', () => {
    const functionStart = migration.indexOf('create or replace function public.can_read_approval_document');
    const functionEnd = migration.indexOf('\n$$;', functionStart);
    const functionBody = migration.slice(functionStart, functionEnd);

    assert.notEqual(functionStart, -1);
    assert.match(functionBody, /public\.can_access_approval_document\(target_company_id, target_document_id\)/);
});

void test('Given an authenticated caller When checking current workflow access Then another actor cannot be probed', () => {
    const functionStart = migration.indexOf('create or replace function public.can_act_on_approval_document');
    const functionEnd = migration.indexOf('\n$$;', functionStart);
    const functionBody = migration.slice(functionStart, functionEnd);

    assert.notEqual(functionStart, -1);
    assert.match(functionBody, /auth\.uid\(\) = target_actor_profile_id/);
    assert.match(functionBody, /actor\.status = 'active'/);
    assert.match(functionBody, /actor\.role <> 'partner_vendor'/);
});

void test('Given a mirrored approval schedule When row access is checked Then current workflow access replaces captured metadata', () => {
    assert.match(scheduleVisibilityMigration, /can_act_on_approval_document\(company_id, source_id, auth\.uid\(\)\)/);
    assert.doesNotMatch(scheduleVisibilityMigration, /metadata -> 'targetProfileIds'/);
});

void test('Given workflow notifications When the final migration replaces policies Then read and update require current workflow access', () => {
    const selectPolicyStart = workflowScheduleMigration.indexOf('create policy "Users can view own franchise notifications"');
    const updatePolicyStart = workflowScheduleMigration.indexOf('create policy "Users can update own franchise notifications"');
    const selectPolicy = workflowScheduleMigration.slice(selectPolicyStart, updatePolicyStart);
    const updatePolicy = workflowScheduleMigration.slice(updatePolicyStart);
    const currentAccessPattern = /public\.can_act_on_approval_document\(\s*company_id,\s*coalesce\(data ->> 'documentId', ''\),\s*auth\.uid\(\)\s*\)/;

    assert.notEqual(selectPolicyStart, -1);
    assert.notEqual(updatePolicyStart, -1);
    assert.match(selectPolicy, currentAccessPattern);
    assert.match(updatePolicy, currentAccessPattern);
});
