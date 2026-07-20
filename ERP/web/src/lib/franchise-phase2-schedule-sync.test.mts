import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    safelySyncOwnerSubmissionSchedule,
    syncFranchiseOperationalSchedule
} from './franchise-phase2-schedule-sync.js';
import type { FranchiseSourceScheduleInput } from './franchise-source-schedules.js';

function fakeSupabase(
    activeProfileIds: readonly string[] = ['staff-1', 'staff-2'],
    operationalRpcError: { readonly message: string } | null = null
) {
    const operationOrder: string[] = [];
    const rpcPayloads: unknown[] = [];
    const queuedRows: unknown[] = [];
    const profileQuery = {
        select() { return this; },
        eq() { return this; },
        in() { return this; },
        async returns() {
            return {
                data: activeProfileIds.map(id => ({
                    company_id: 'company-1',
                    id,
                    role: id.startsWith('manager-') ? 'manager' : 'staff',
                    status: 'active'
                })),
                error: null
            };
        }
    };
    return {
        rpcPayloads,
        queuedRows,
        client: {
            from(table: string) {
                if (table === 'profiles') return profileQuery;
                assert.equal(table, 'franchise_schedule_sync_jobs');
                return {
                    async upsert(rows: unknown) {
                        operationOrder.push('queue');
                        queuedRows.push(rows);
                        return { error: null };
                    }
                };
            },
            async rpc(name: string, args: unknown) {
                operationOrder.push('sync');
                assert.equal(name, 'sync_franchise_operational_schedule_from_payload');
                rpcPayloads.push(args);
                return { error: operationalRpcError };
            }
        },
        operationOrder
    };
}

const activeSchedule: FranchiseSourceScheduleInput = {
    assigneeProfileId: 'staff-1',
    companyId: 'company-1',
    date: '2026-07-15',
    details: '방문 일정을 확인합니다.',
    dueAt: '2026-07-15T23:59:59+09:00',
    metadata: { actionUrl: '/dashboard/franchise-supervision' },
    sourceId: 'visit-1',
    sourceType: 'supervision-visit',
    status: '예정',
    title: '강남점 정기점검'
};

void test('Given repeated source sync When persisting Then schedule and notification retain one stable source identity', async () => {
    const fake = fakeSupabase();

    await syncFranchiseOperationalSchedule(fake.client as never, activeSchedule);
    await syncFranchiseOperationalSchedule(fake.client as never, activeSchedule);

    assert.equal(fake.rpcPayloads.length, 2);
    const firstCall = fake.rpcPayloads[0] as { readonly schedule_payload?: { readonly source_id?: string } };
    const secondCall = fake.rpcPayloads[1] as { readonly schedule_payload?: { readonly source_id?: string } };
    assert.equal(firstCall.schedule_payload?.source_id, 'visit-1');
    assert.equal(secondCall.schedule_payload?.source_id, 'visit-1');
    assert.equal(fake.queuedRows.length, 2);
});

void test('Given a completed source task When syncing Then the atomic RPC receives its terminal state', async () => {
    const fake = fakeSupabase();

    await syncFranchiseOperationalSchedule(fake.client as never, {
        ...activeSchedule,
        completedAt: '2026-07-15T05:00:00.000Z',
        status: '완료'
    });

    const rpcCall = fake.rpcPayloads[0] as { readonly schedule_payload?: { readonly status?: string } };
    assert.equal(rpcCall.schedule_payload?.status, '완료');
});

void test('Given an active source task When syncing Then the atomic payload retains its recipient', async () => {
    const fake = fakeSupabase();

    await syncFranchiseOperationalSchedule(fake.client as never, activeSchedule);

    const rpcCall = fake.rpcPayloads[0] as { readonly schedule_payload?: { readonly assignee_profile_id?: string | null } };
    assert.equal(rpcCall.schedule_payload?.assignee_profile_id, 'staff-1');
});

void test('Given an operational task is reassigned When syncing Then removed recipients stay dismissed', async () => {
    const fake = fakeSupabase();

    await syncFranchiseOperationalSchedule(fake.client as never, {
        ...activeSchedule,
        assigneeProfileId: 'staff-2',
        userId: 'staff-2'
    });

    const rpcCall = fake.rpcPayloads[0] as { readonly schedule_payload?: { readonly assignee_profile_id?: string | null } };
    assert.equal(rpcCall.schedule_payload?.assignee_profile_id, 'staff-2');
});

void test('Given an inactive stored assignee When syncing Then the schedule and notification omit that profile', async () => {
    const fake = fakeSupabase([]);

    await syncFranchiseOperationalSchedule(fake.client as never, activeSchedule);

    const rpcCall = fake.rpcPayloads[0] as { readonly schedule_payload?: { readonly assignee_profile_id?: string | null } };
    assert.equal(rpcCall.schedule_payload?.assignee_profile_id, null);
    assert.equal(fake.queuedRows.length, 1);
});

void test('Given an inactive location manager When syncing owner work Then an active company manager is used', async () => {
    const fake = fakeSupabase(['manager-active']);

    await safelySyncOwnerSubmissionSchedule({
        companyId: 'company-1',
        locationName: '강남점',
        managerProfileId: 'manager-inactive',
        status: 'submitted',
        submissionId: 'submission-1',
        submissionType: 'facility_request',
        submittedAt: '2026-07-15T01:00:00.000Z',
        supabaseAdmin: fake.client as never,
        title: '냉장고 고장'
    });

    const rpcCall = fake.rpcPayloads[0] as { readonly schedule_payload?: { readonly manager_profile_id?: string | null } };
    assert.equal(rpcCall.schedule_payload?.manager_profile_id, 'manager-active');
});

void test('Given a transient operational RPC failure When syncing Then the latest payload is queued for retry', async () => {
    const fake = fakeSupabase(['staff-1'], { message: 'temporary outage' });

    await syncFranchiseOperationalSchedule(fake.client as never, activeSchedule);

    assert.equal(fake.rpcPayloads.length, 1);
    assert.equal(fake.queuedRows.length, 1);
    const queued = fake.queuedRows[0] as {
        readonly last_error?: string;
        readonly source_id?: string;
        readonly status?: string;
    };
    assert.equal(queued.source_id, 'visit-1');
    assert.equal(queued.status, 'pending');
    assert.equal(queued.last_error, '');
});

void test('Given a source schedule sync When processing Then the durable queue is written before the schedule RPC', async () => {
    const fake = fakeSupabase();

    await syncFranchiseOperationalSchedule(fake.client as never, activeSchedule);

    assert.deepEqual(fake.operationOrder, ['queue', 'sync']);
    const rpcCall = fake.rpcPayloads[0] as {
        readonly schedule_payload?: {
            readonly _sync_job_token?: string;
            readonly _sync_job_updated_at?: string;
        };
    };
    assert.match(rpcCall.schedule_payload?._sync_job_token || '', /^[0-9a-f-]{36}$/);
    assert.match(rpcCall.schedule_payload?._sync_job_updated_at || '', /^\d{4}-\d{2}-\d{2}T/);
});
