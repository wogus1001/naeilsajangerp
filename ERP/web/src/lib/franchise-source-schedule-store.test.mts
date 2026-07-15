import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    FRANCHISE_SCHEDULE_UPSERT_RPC,
    buildFranchiseSourceSchedulePayload,
    executeFranchiseSourceScheduleUpsert
} from './franchise-source-schedule-store.js';

test('Given a franchise source task When building the storage payload Then only the franchise schedule RPC contract is used', () => {
    const payload = buildFranchiseSourceSchedulePayload({
        assigneeProfileId: '11111111-1111-1111-1111-111111111111',
        companyId: '22222222-2222-2222-2222-222222222222',
        date: '2026-07-31',
        details: '계약 만료 전 갱신 여부를 확인합니다.',
        sourceId: 'contract-31',
        sourceType: 'vendor-contract-renewal',
        status: '예정',
        title: '업체 계약 갱신 확인',
        userId: '11111111-1111-1111-1111-111111111111'
    });

    assert.equal(FRANCHISE_SCHEDULE_UPSERT_RPC, 'upsert_franchise_schedule_from_payload');
    assert.equal(payload?.id, 'vendor-contract-renewal:contract-31');
    assert.equal(payload?.source_type, 'vendor-contract-renewal');
    assert.equal(payload?.source_id, 'contract-31');
});

test('Given an incomplete source task When building the storage payload Then no schedule is produced', () => {
    const payload = buildFranchiseSourceSchedulePayload({
        companyId: '22222222-2222-2222-2222-222222222222',
        sourceId: '',
        sourceType: 'vendor-contract-renewal',
        title: '업체 계약 갱신 확인'
    });

    assert.equal(payload, null);
});

void test('Given a valid source task When persisted Then the franchise-only RPC receives the scoped payload once', async () => {
    const calls: Array<{ readonly name: string; readonly companyId: string; readonly sourceId: string }> = [];

    await executeFranchiseSourceScheduleUpsert({
        companyId: '22222222-2222-2222-2222-222222222222',
        date: '2026-07-31',
        sourceId: 'contract-31',
        sourceType: 'vendor-contract-renewal',
        title: '업체 계약 갱신 확인'
    }, async (name, args) => {
        calls.push({
            companyId: args.schedule_payload.company_id,
            name,
            sourceId: args.schedule_payload.source_id
        });
        return { error: null };
    });

    assert.deepEqual(calls, [{
        companyId: '22222222-2222-2222-2222-222222222222',
        name: FRANCHISE_SCHEDULE_UPSERT_RPC,
        sourceId: 'contract-31'
    }]);
});

void test('Given a rejected source upsert When persisted Then the RPC failure is not hidden', async () => {
    await assert.rejects(
        executeFranchiseSourceScheduleUpsert({
            companyId: '22222222-2222-2222-2222-222222222222',
            date: '2026-07-31',
            sourceId: 'contract-31',
            sourceType: 'vendor-contract-renewal',
            title: '업체 계약 갱신 확인'
        }, async () => ({ error: { message: 'company scope rejected' } })),
        /company scope rejected/
    );
});
