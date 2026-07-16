import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runFranchiseScheduleMaintenance } from './franchise-schedule-reconciliation.js';

function schedulePayload(sourceId: string) {
    return {
        assignee_profile_id: 'profile-1',
        color: '#3182f6',
        company_id: 'company-1',
        completed_at: null,
        creator_profile_id: 'profile-1',
        date: '2026-07-15',
        details: '확인',
        due_at: '2026-07-15T14:59:59.000Z',
        id: `supervision-visit:${sourceId}`,
        manager_profile_id: null,
        metadata: {},
        remind_at: null,
        source_id: sourceId,
        source_type: 'supervision-visit',
        status: '예정',
        title: '방문 일정',
        type: 'SV 방문'
    };
}

void test('Given late schedules and queued sync jobs When maintenance runs Then successful jobs clear and failures back off', async () => {
    const deletedIds: string[] = [];
    const failedUpdates: Array<Readonly<Record<string, unknown>>> = [];
    const rpcNames: string[] = [];
    const client = {
        async rpc(name: string) {
            rpcNames.push(name);
            if (name === 'reconcile_franchise_schedule_lateness') return { data: 2, error: null };
            if (name === 'claim_franchise_schedule_sync_jobs') {
                return {
                    data: [
                        { id: 'job-1', attempt_count: 0, schedule_payload: schedulePayload('visit-1') },
                        { id: 'job-2', attempt_count: 1, schedule_payload: schedulePayload('visit-2') }
                    ],
                    error: null
                };
            }
            const failed = rpcNames.filter(value => value === 'sync_franchise_operational_schedule_from_payload').length === 2;
            return failed ? { data: null, error: { message: 'retry me' } } : { data: 'schedule-1', error: null };
        },
        from(table: string) {
            assert.equal(table, 'franchise_schedule_sync_jobs');
            return {
                delete() {
                    return {
                        async eq(column: string, value: string) {
                            assert.equal(column, 'id');
                            deletedIds.push(value);
                            return { error: null };
                        }
                    };
                },
                update(payload: Readonly<Record<string, unknown>>) {
                    failedUpdates.push(payload);
                    return {
                        async eq(column: string, value: string) {
                            assert.equal(column, 'id');
                            assert.equal(value, 'job-2');
                            return { error: null };
                        }
                    };
                }
            };
        }
    };

    const result = await runFranchiseScheduleMaintenance(client as never, new Date('2026-07-16T00:00:00.000Z'));

    assert.deepEqual(result, { delayedCount: 2, failedCount: 1, processedCount: 2 });
    assert.deepEqual(deletedIds, ['job-1']);
    assert.equal(failedUpdates[0]?.status, 'failed');
    assert.equal(failedUpdates[0]?.attempt_count, 2);
});
