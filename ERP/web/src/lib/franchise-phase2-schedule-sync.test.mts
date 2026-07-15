import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    safelySyncOwnerSubmissionSchedule,
    syncFranchiseOperationalSchedule
} from './franchise-phase2-schedule-sync.js';
import type { FranchiseSourceScheduleInput } from './franchise-source-schedules.js';

function fakeSupabase(activeProfileIds: readonly string[] = ['staff-1', 'staff-2']) {
    const rpcPayloads: unknown[] = [];
    const notificationRows: unknown[] = [];
    const dismissFilters: Array<readonly [string, string]> = [];
    const updatePayloads: Array<Readonly<Record<string, unknown>>> = [];
    const recipientFilters: string[][] = [];
    const dismissQuery = {
        update(payload: Readonly<Record<string, unknown>>) {
            updatePayloads.push(payload);
            return this;
        },
        eq(column: string, value: string) {
            dismissFilters.push([column, value]);
            return this;
        },
        in(column: string, values: string[]) {
            assert.equal(column, 'recipient_profile_id');
            recipientFilters.push(values);
            return this;
        },
        then(resolve: (value: { readonly error: null }) => void) {
            resolve({ error: null });
        }
    };
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
        dismissFilters,
        notificationRows,
        recipientFilters,
        rpcPayloads,
        updatePayloads,
        client: {
            from(table: string) {
                if (table === 'profiles') return profileQuery;
                assert.equal(table, 'franchise_notifications');
                return {
                    async upsert(rows: unknown) {
                        notificationRows.push(rows);
                        return { error: null };
                    },
                    update(payload: Readonly<Record<string, unknown>>) {
                        return dismissQuery.update(payload);
                    }
                };
            },
            async rpc(name: string, args: unknown) {
                assert.equal(name, 'upsert_franchise_schedule_from_payload');
                rpcPayloads.push(args);
                return { error: null };
            }
        }
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
    assert.equal(fake.notificationRows.length, 2);
    const readSourceId = (value: unknown): unknown => Array.isArray(value) ? value[0]?.source_id : null;
    assert.equal(readSourceId(fake.notificationRows[0]), 'supervision-visit:visit-1:active');
    assert.equal(readSourceId(fake.notificationRows[1]), 'supervision-visit:visit-1:active');
});

void test('Given a completed source task When syncing Then its active in-app notification is dismissed', async () => {
    const fake = fakeSupabase();

    await syncFranchiseOperationalSchedule(fake.client as never, {
        ...activeSchedule,
        completedAt: '2026-07-15T05:00:00.000Z',
        status: '완료'
    });

    assert.deepEqual(fake.dismissFilters, [
        ['company_id', 'company-1'],
        ['source_type', 'workflow-schedule'],
        ['source_id', 'supervision-visit:visit-1:active']
    ]);
    assert.equal(fake.notificationRows.length, 0);
});

void test('Given a dismissed source task When it becomes active again Then the in-app notification is reactivated', async () => {
    const fake = fakeSupabase();

    await syncFranchiseOperationalSchedule(fake.client as never, activeSchedule);

    const payload = fake.updatePayloads[1];
    assert.ok(payload);
    assert.equal(payload.dismissed_at, null);
    assert.equal(payload.read_at, null);
    assert.deepEqual(fake.recipientFilters, [['staff-1']]);
    assert.equal(fake.notificationRows.length, 1);
});

void test('Given an operational task is reassigned When syncing Then removed recipients stay dismissed', async () => {
    const fake = fakeSupabase();

    await syncFranchiseOperationalSchedule(fake.client as never, {
        ...activeSchedule,
        assigneeProfileId: 'staff-2',
        userId: 'staff-2'
    });

    assert.notEqual(fake.updatePayloads[0]?.dismissed_at, null);
    assert.equal(fake.updatePayloads[1]?.dismissed_at, null);
    assert.deepEqual(fake.recipientFilters, [['staff-2']]);
});

void test('Given an inactive stored assignee When syncing Then the schedule and notification omit that profile', async () => {
    const fake = fakeSupabase([]);

    await syncFranchiseOperationalSchedule(fake.client as never, activeSchedule);

    const rpcCall = fake.rpcPayloads[0] as { readonly schedule_payload?: { readonly assignee_profile_id?: string | null } };
    assert.equal(rpcCall.schedule_payload?.assignee_profile_id, null);
    assert.equal(fake.notificationRows.length, 0);
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
