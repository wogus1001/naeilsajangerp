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
                        { id: 'job-1', attempt_count: 0, lease_token: 'lease-1', schedule_payload: schedulePayload('visit-1'), updated_at: '2026-07-15T23:59:00.000Z' },
                        { id: 'job-2', attempt_count: 1, lease_token: 'lease-2', schedule_payload: schedulePayload('visit-2'), updated_at: '2026-07-15T23:59:30.000Z' }
                    ],
                    error: null
                };
            }
            const failed = rpcNames.filter(value => value === 'sync_franchise_operational_schedule_from_payload').length === 2;
            return failed ? { data: null, error: { message: 'retry me' } } : { data: 'schedule-1', error: null };
        },
        from(table: string) {
            if (table === 'profiles') {
                return {
                    select() { return this; },
                    eq() { return this; },
                    in() { return this; },
                    async returns() {
                        return {
                            data: [{ company_id: 'company-1', id: 'profile-1', role: 'staff', status: 'active' }],
                            error: null
                        };
                    }
                };
            }
            assert.equal(table, 'franchise_schedule_sync_jobs');
            return {
                delete() {
                    return {
                        async match(criteria: Readonly<Record<string, unknown>>) {
                            deletedIds.push(String(criteria.id));
                            assert.deepEqual(criteria, {
                                id: 'job-1',
                                status: 'processing',
                                updated_at: '2026-07-15T23:59:00.000Z'
                            });
                            return { error: null };
                        }
                    };
                },
                update(payload: Readonly<Record<string, unknown>>) {
                    failedUpdates.push(payload);
                    return {
                        async match(criteria: Readonly<Record<string, unknown>>) {
                            assert.deepEqual(criteria, {
                                id: 'job-2',
                                status: 'processing',
                                updated_at: '2026-07-15T23:59:30.000Z'
                            });
                            return { error: null };
                        }
                    };
                }
            };
        }
    };

    const result = await runFranchiseScheduleMaintenance(client as never, new Date('2026-07-16T00:00:00.000Z'));

    assert.deepEqual(result, { delayedCount: 2, failedCount: 1, processedCount: 2 });
    assert.deepEqual(deletedIds, []);
    assert.equal(failedUpdates[0]?.status, 'failed');
    assert.equal(failedUpdates[0]?.attempt_count, 2);
});

void test('Given a queued recipient became inactive When maintenance retries Then replay omits that recipient and carries its lease', async () => {
    const replayAssigneeIds: unknown[] = [];
    const replayJobIds: unknown[] = [];
    const replayJobTokens: unknown[] = [];
    const replayLeaseTimes: unknown[] = [];
    const profileQuery = {
        select() { return this; },
        eq() { return this; },
        in() { return this; },
        async returns() { return { data: [], error: null }; }
    };
    const client = {
        async rpc(name: string, args?: Readonly<Record<string, unknown>>) {
            if (name === 'reconcile_franchise_schedule_lateness') return { data: 0, error: null };
            if (name === 'claim_franchise_schedule_sync_jobs') {
                return {
                    data: [{
                        id: 'job-1',
                        attempt_count: 0,
                        lease_token: 'lease-1',
                        schedule_payload: schedulePayload('visit-1'),
                        updated_at: '2026-07-15T23:59:00.000Z'
                    }],
                    error: null
                };
            }
            const payload = args?.schedule_payload;
            if (typeof payload === 'object' && payload !== null && !Array.isArray(payload)) {
                if ('assignee_profile_id' in payload) replayAssigneeIds.push(payload.assignee_profile_id);
                if ('_sync_job_id' in payload) replayJobIds.push(payload._sync_job_id);
                if ('_sync_job_token' in payload) replayJobTokens.push(payload._sync_job_token);
                if ('_sync_job_updated_at' in payload) replayLeaseTimes.push(payload._sync_job_updated_at);
            }
            return { data: 'schedule-1', error: null };
        },
        from(table: string) {
            assert.equal(table, 'profiles');
            return profileQuery;
        }
    };

    await runFranchiseScheduleMaintenance(client as never, new Date('2026-07-16T00:00:00.000Z'));

    assert.deepEqual(replayAssigneeIds, [null]);
    assert.deepEqual(replayJobIds, ['job-1']);
    assert.deepEqual(replayJobTokens, ['lease-1']);
    assert.deepEqual(replayLeaseTimes, ['2026-07-15T23:59:00.000Z']);
});

void test('Given one queued job cannot refresh its recipient When maintenance runs Then that job fails and the next job continues', async () => {
    const failedUpdates: Array<Readonly<Record<string, unknown>>> = [];
    const replayedSourceIds: string[] = [];
    let profileLookupCount = 0;
    const profileQuery = {
        select() { return this; },
        eq() { return this; },
        in() { return this; },
        async returns() {
            profileLookupCount += 1;
            if (profileLookupCount === 1) {
                return { data: null, error: { message: 'profile lookup failed' } };
            }
            return {
                data: [{ company_id: 'company-1', id: 'profile-1', role: 'staff', status: 'active' }],
                error: null
            };
        }
    };
    const client = {
        async rpc(name: string, args?: Readonly<Record<string, unknown>>) {
            if (name === 'reconcile_franchise_schedule_lateness') return { data: 0, error: null };
            if (name === 'claim_franchise_schedule_sync_jobs') {
                return {
                    data: [
                        { id: 'job-1', attempt_count: 0, lease_token: 'lease-1', schedule_payload: schedulePayload('visit-1'), updated_at: '2026-07-15T23:59:00.000Z' },
                        { id: 'job-2', attempt_count: 0, lease_token: 'lease-2', schedule_payload: schedulePayload('visit-2'), updated_at: '2026-07-15T23:59:30.000Z' }
                    ],
                    error: null
                };
            }
            const payload = args?.schedule_payload;
            if (typeof payload === 'object' && payload !== null && !Array.isArray(payload) && 'source_id' in payload) {
                replayedSourceIds.push(String(payload.source_id));
            }
            return { data: 'schedule-2', error: null };
        },
        from(table: string) {
            if (table === 'profiles') return profileQuery;
            assert.equal(table, 'franchise_schedule_sync_jobs');
            return {
                update(payload: Readonly<Record<string, unknown>>) {
                    failedUpdates.push(payload);
                    return {
                        async match() { return { error: null }; }
                    };
                }
            };
        }
    };

    const result = await runFranchiseScheduleMaintenance(client as never, new Date('2026-07-16T00:00:00.000Z'));

    assert.deepEqual(result, { delayedCount: 0, failedCount: 1, processedCount: 2 });
    assert.equal(failedUpdates[0]?.last_error, 'profile lookup failed');
    assert.deepEqual(replayedSourceIds, ['visit-2']);
});

void test('Given a claimed job has a malformed payload When maintenance runs Then the job is failed instead of silently discarded', async () => {
    const failedUpdates: Array<Readonly<Record<string, unknown>>> = [];
    const client = {
        async rpc(name: string) {
            if (name === 'reconcile_franchise_schedule_lateness') return { data: 0, error: null };
            if (name === 'claim_franchise_schedule_sync_jobs') {
                return {
                    data: [{
                        id: 'job-malformed',
                        attempt_count: 0,
                        lease_token: 'lease-malformed',
                        schedule_payload: { company_id: 'company-1' },
                        updated_at: '2026-07-15T23:59:00.000Z'
                    }],
                    error: null
                };
            }
            return { data: null, error: null };
        },
        from(table: string) {
            assert.equal(table, 'franchise_schedule_sync_jobs');
            return {
                update(payload: Readonly<Record<string, unknown>>) {
                    failedUpdates.push(payload);
                    return { async match() { return { error: null }; } };
                }
            };
        }
    };

    const result = await runFranchiseScheduleMaintenance(client as never, new Date('2026-07-16T00:00:00.000Z'));

    assert.deepEqual(result, { delayedCount: 0, failedCount: 1, processedCount: 1 });
    assert.equal(failedUpdates[0]?.last_error, 'Malformed franchise schedule sync payload');
});
