import assert from 'node:assert/strict';
import { test } from 'node:test';
import { summarizeElectronicContractUsage } from './usage-summary.js';

test('Given companies and electronic contracts When summarizing usage Then company totals and status buckets are returned', () => {
    const summaries = summarizeElectronicContractUsage(
        [
            { id: 'company-1', name: '가맹 본부' },
            { id: 'company-2', name: '상담 파트너' }
        ],
        [
            { id: 'contract-1', company_id: 'company-1', status: 'sent', sent_at: '2026-06-20T10:00:00.000Z', completed_at: null, created_at: '2026-06-20T09:00:00.000Z' },
            { id: 'contract-2', company_id: 'company-1', status: 'completed', sent_at: '2026-06-21T10:00:00.000Z', completed_at: '2026-06-22T10:00:00.000Z', created_at: '2026-06-21T09:00:00.000Z' },
            { id: 'contract-3', company_id: 'company-1', status: 'send_failed', sent_at: null, completed_at: null, created_at: '2026-06-23T09:00:00.000Z' },
            { id: 'contract-4', company_id: null, status: 'canceled', sent_at: '2026-06-23T10:00:00.000Z', completed_at: null, created_at: '2026-06-23T09:00:00.000Z' }
        ]
    );

    assert.deepEqual(summaries[0], {
        companyId: 'company-1',
        companyName: '가맹 본부',
        total: 3,
        draft: 0,
        inProgress: 1,
        completed: 1,
        failed: 1,
        canceled: 0,
        recentSentAt: '2026-06-23T09:00:00.000Z',
        recentCompletedAt: '2026-06-22T10:00:00.000Z'
    });
    assert.equal(summaries[1].companyId, 'unassigned');
    assert.equal(summaries[1].canceled, 1);
    assert.equal(summaries[2].companyId, 'company-2');
    assert.equal(summaries[2].total, 0);
});
