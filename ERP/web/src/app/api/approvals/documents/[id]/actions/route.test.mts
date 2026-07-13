import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { ApprovalContext } from '../../../_shared/access';
import { isRecord } from '../../../_shared/boundary';
import { handleApprovalActionPOST } from './route.js';

const companyId = '11111111-1111-4111-8111-111111111111';
const actorId = '22222222-2222-4222-8222-222222222222';
const authorId = '33333333-3333-4333-8333-333333333333';
const documentId = '44444444-4444-4444-8444-444444444444';

function documentRow(authorProfileId = authorId) {
    return {
        id: documentId, company_id: companyId, template_id: null, source_type: null, source_id: null,
        title: '구매 품의', status: '제출', author_profile_id: authorProfileId,
        approver_profile_id: actorId, reviewer_profile_id: null, values: {}, reject_reason: null,
        category: 'general', security_level: 'company', retention_until: null,
        current_version_id: null, current_step_order: 1, due_at: null,
        submitted_at: '2026-07-13T00:00:00.000Z', reviewed_at: null, completed_at: null,
        withdrawn_at: null, data: {}, created_by: authorProfileId, updated_by: authorProfileId,
        created_at: '2026-07-13T00:00:00.000Z', updated_at: '2026-07-13T00:00:00.000Z'
    };
}

function fakeContext(options: { readonly authorProfileId?: string } = {}) {
    const calls: Array<{ readonly name: string; readonly args: Record<string, unknown> }> = [];
    const fakeQuery = {
        select() { return this; },
        eq() { return this; },
        async maybeSingle() { return { data: documentRow(options.authorProfileId), error: null }; }
    };
    const fakeSupabase = {
        from(table: string) {
            assert.equal(table, 'approval_documents');
            return fakeQuery;
        },
        async rpc(name: string, args: Record<string, unknown>) {
            calls.push({ name, args });
            return { data: { status: '승인' }, error: null };
        }
    };
    const context: ApprovalContext = {
        approvalAdmin: true,
        companyId,
        requester: { company_id: companyId, id: actorId, role: 'staff' },
        supabase: fakeSupabase as never
    };
    return { calls, context };
}

function request(body: Record<string, unknown>): Request {
    return new Request('http://localhost/api/approvals/documents/id/actions', {
        body: JSON.stringify(body), method: 'POST', headers: { 'content-type': 'application/json' }
    });
}

async function payload(response: Response): Promise<Record<string, unknown>> {
    const value: unknown = await response.json();
    return isRecord(value) ? value : {};
}

test('Given a valid approval action When posting Then the migration RPC receives the scoped actor atomically', async () => {
    const fake = fakeContext();
    const response = await handleApprovalActionPOST(
        request({ action: 'approve', memo: '확인' }),
        { params: Promise.resolve({ id: documentId }) },
        { resolveContext: async () => fake.context }
    );

    assert.equal(response.status, 200);
    assert.deepEqual(fake.calls, [{
        name: 'perform_approval_document_action',
        args: {
            p_action: 'approve', p_actor_profile_id: actorId, p_company_id: companyId,
            p_document_id: documentId, p_memo: '확인'
        }
    }]);
});

test('Given reject without a reason When posting Then validation blocks the RPC', async () => {
    const fake = fakeContext();
    const response = await handleApprovalActionPOST(
        request({ action: 'reject' }),
        { params: Promise.resolve({ id: documentId }) },
        { resolveContext: async () => fake.context }
    );
    const body = await payload(response);

    assert.equal(response.status, 400);
    assert.equal(body.code, 'VALIDATION_ERROR');
    assert.equal(fake.calls.length, 0);
});

test('Given the author attempts approval When posting Then self approval is denied before the RPC', async () => {
    const fake = fakeContext({ authorProfileId: actorId });
    const response = await handleApprovalActionPOST(
        request({ action: 'approve' }),
        { params: Promise.resolve({ id: documentId }) },
        { resolveContext: async () => fake.context }
    );

    assert.equal(response.status, 403);
    assert.equal(fake.calls.length, 0);
});
