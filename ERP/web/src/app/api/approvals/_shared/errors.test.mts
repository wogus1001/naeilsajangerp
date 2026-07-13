import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ApprovalInputError, isRecord } from './boundary.js';
import { approvalErrorResponse } from './errors.js';

async function payload(response: Response): Promise<Record<string, unknown>> {
    const value: unknown = await response.json();
    return isRecord(value) ? value : {};
}

test('Given a migration-owned table or RPC is unavailable When handling the error Then setup is explicit', async () => {
    const response = approvalErrorResponse({
        code: 'PGRST202',
        message: 'Could not find the function public.perform_approval_document_action in the schema cache'
    }, 'fallback');
    const body = await payload(response);

    assert.equal(response.status, 503);
    assert.match(String(body.message), /supabase_company_approvals_v2_migration\.sql/);
});

test('Given the organization schema is unavailable When handling the error Then the same migration is named', async () => {
    const response = approvalErrorResponse({
        code: 'PGRST205',
        message: 'Could not find the table public.organization_units in the schema cache'
    }, 'fallback');
    const body = await payload(response);

    assert.equal(response.status, 503);
    assert.match(String(body.message), /supabase_company_approvals_v2_migration\.sql/);
});

test('Given invalid boundary input When handling the error Then the API returns a validation envelope', async () => {
    const response = approvalErrorResponse(new ApprovalInputError('title', 'title is required'), 'fallback');
    const body = await payload(response);

    assert.equal(response.status, 400);
    assert.equal(body.code, 'VALIDATION_ERROR');
    assert.equal(body.message, 'title is required');
});

test('Given a linked organization row appears during deletion When handling the FK error Then the API returns conflict', async () => {
    const response = approvalErrorResponse({
        code: '23503',
        message: '연결된 조직 데이터가 있어 삭제할 수 없습니다.'
    }, 'fallback');
    const body = await payload(response);

    assert.equal(response.status, 409);
    assert.equal(body.code, 'CONFLICT');
    assert.match(String(body.message), /연결된 항목/);
});
