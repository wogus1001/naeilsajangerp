import assert from 'node:assert/strict';
import { test } from 'node:test';
import { syncNotificationSourceSchedules } from './franchise-notification-schedule-sync.js';

void test('Given an operational RPC outage When notification schedules sync Then the latest vendor schedule is queued', async () => {
    const rpcNames: string[] = [];
    const queuedRows: unknown[] = [];
    const profileQuery = {
        select() { return this; },
        eq() { return this; },
        in() { return this; },
        async returns() {
            return {
                data: [{ company_id: 'company-1', id: 'manager-1', role: 'manager', status: 'active' }],
                error: null
            };
        }
    };
    const client = {
        from(table: string) {
            if (table === 'profiles') return profileQuery;
            assert.equal(table, 'franchise_schedule_sync_jobs');
            return {
                async upsert(row: unknown) {
                    queuedRows.push(row);
                    return { error: null };
                }
            };
        },
        async rpc(name: string) {
            rpcNames.push(name);
            return { error: { message: 'temporary outage' } };
        }
    };

    await syncNotificationSourceSchedules(client as never, {
        leads: [],
        vendorContracts: [{
            companyId: 'company-1',
            contractEndDate: '2026-07-31',
            contractTitle: '물류 계약',
            id: 'contract-1',
            ownerProfileId: null,
            status: 'active',
            vendorName: '내일물류'
        }],
        vendorRecipients: [{ companyId: 'company-1', contractId: null, profileId: 'manager-1' }]
    });

    assert.deepEqual(rpcNames, ['sync_franchise_operational_schedule_from_payload']);
    assert.equal(queuedRows.length, 1);
});
