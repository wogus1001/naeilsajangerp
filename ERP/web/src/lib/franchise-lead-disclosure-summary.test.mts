import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildLeadDisclosureSummary } from './franchise-lead-disclosure-summary.js';

test('buildLeadDisclosureSummary marks missing delivery as not sent', () => {
    const summary = buildLeadDisclosureSummary([]);

    assert.equal(summary.state, 'none');
    assert.equal(summary.label, '미발송');
    assert.equal(summary.remainingDays, null);
});

test('buildLeadDisclosureSummary reports D-day countdown from successful sent delivery', () => {
    const summary = buildLeadDisclosureSummary([
        {
            id: 'delivery-1',
            sentAt: '2026-06-03T00:00:00.000Z',
            sendStatus: 'sent',
            documentTitle: '미카도 정보공개서',
            documentVersion: '2026'
        }
    ], new Date('2026-06-14T00:00:00.000Z'));

    assert.equal(summary.state, 'sent');
    assert.equal(summary.label, 'D-3');
    assert.equal(summary.remainingDays, 3);
    assert.equal(summary.latestDocumentTitle, '미카도 정보공개서');
});

test('buildLeadDisclosureSummary keeps failed send visible when no valid delivery exists', () => {
    const summary = buildLeadDisclosureSummary([
        {
            id: 'delivery-1',
            sentAt: '2026-06-03T00:00:00.000Z',
            sendStatus: 'failed'
        }
    ], new Date('2026-06-14T00:00:00.000Z'));

    assert.equal(summary.state, 'failed');
    assert.equal(summary.label, '발송 실패');
    assert.equal(summary.latestSendStatus, 'failed');
});

test('buildLeadDisclosureSummary marks delivery eligible after wait days', () => {
    const summary = buildLeadDisclosureSummary([
        {
            id: 'delivery-1',
            sentAt: '2026-06-01T00:00:00.000Z',
            sendStatus: 'sent',
            confirmedAt: '2026-06-02T00:00:00.000Z'
        }
    ], new Date('2026-06-16T00:00:00.000Z'));

    assert.equal(summary.state, 'eligible');
    assert.equal(summary.label, '계약 가능');
    assert.equal(summary.remainingDays, 0);
});
