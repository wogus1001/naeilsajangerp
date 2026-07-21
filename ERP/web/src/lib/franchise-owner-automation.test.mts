import assert from 'node:assert/strict';
import test from 'node:test';
import {
    buildOwnerSubmissionSla,
    parseOwnerSubmissionActivitySummary,
    summarizeOwnerSubmissionActivity
} from './franchise-owner-automation.js';

test('Given a pending facility request When 24 hours pass Then it is marked overdue', () => {
    const now = new Date('2026-07-20T03:00:00.000Z');

    const sla = buildOwnerSubmissionSla({
        createdAt: '2026-07-19T03:00:00.000Z',
        reviewedAt: null,
        status: 'submitted',
        submissionType: 'facility_request'
    }, now);

    assert.equal(sla?.dueAt, '2026-07-20T03:00:00.000Z');
    assert.equal(sla?.isOverdue, true);
    assert.equal(sla?.resolutionHours, null);
});

test('Given a checklist completion submission When calculating SLA Then it is excluded from headquarters processing', () => {
    const sla = buildOwnerSubmissionSla({
        createdAt: '2026-07-19T03:00:00.000Z',
        reviewedAt: null,
        status: 'submitted',
        submissionType: 'opening_task_completion'
    }, new Date('2026-07-21T03:00:00.000Z'));

    assert.equal(sla, null);
});

test('Given a store information submission When calculating SLA Then it is excluded from the inquiry SLA', () => {
    const sla = buildOwnerSubmissionSla({
        createdAt: '2026-07-19T03:00:00.000Z',
        reviewedAt: null,
        status: 'submitted',
        submissionType: 'store_info'
    }, new Date('2026-07-21T03:00:00.000Z'));

    assert.equal(sla, null);
});

test('Given completed requests with fractional durations When summarizing Then raw durations are averaged before rounding', () => {
    const summary = summarizeOwnerSubmissionActivity([
        {
            createdAt: '2026-07-20T00:00:00.000Z',
            reviewedAt: '2026-07-20T01:02:24.000Z',
            status: 'resolved',
            submissionType: 'facility_request'
        },
        {
            createdAt: '2026-07-20T00:00:00.000Z',
            reviewedAt: '2026-07-20T01:03:00.000Z',
            status: 'resolved',
            submissionType: 'general_request'
        }
    ], new Date('2026-07-20T02:00:00.000Z'));

    assert.equal(summary.averageResolutionHours, 1);
});

test('Given completed submissions When summarizing activity Then recent volume and average resolution time are returned', () => {
    const now = new Date('2026-07-20T03:00:00.000Z');

    const summary = summarizeOwnerSubmissionActivity([
        {
            createdAt: '2026-07-19T00:00:00.000Z',
            reviewedAt: null,
            status: 'submitted',
            submissionType: 'facility_request'
        },
        {
            createdAt: '2026-07-18T00:00:00.000Z',
            reviewedAt: '2026-07-18T12:00:00.000Z',
            status: 'resolved',
            submissionType: 'facility_request'
        },
        {
            createdAt: '2026-07-17T00:00:00.000Z',
            reviewedAt: '2026-07-18T00:00:00.000Z',
            status: 'rejected',
            submissionType: 'general_request'
        },
        {
            createdAt: '2026-07-19T00:00:00.000Z',
            reviewedAt: null,
            status: 'submitted',
            submissionType: 'opening_task_completion'
        }
    ], now);

    assert.deepEqual(summary, {
        averageResolutionHours: 18,
        completedLast7Days: 2,
        overdueCount: 1,
        pendingCount: 1
    });
});

test('Given malformed timestamps When calculating SLA Then no invalid deadline is exposed', () => {
    const sla = buildOwnerSubmissionSla({
        createdAt: 'not-a-date',
        reviewedAt: null,
        status: 'submitted',
        submissionType: 'facility_request'
    }, new Date('2026-07-20T03:00:00.000Z'));

    assert.equal(sla, null);
});

test('Given a resubmitted request with an old review timestamp When summarizing activity Then it remains pending only', () => {
    const summary = summarizeOwnerSubmissionActivity([{
        createdAt: '2026-07-19T00:00:00.000Z',
        reviewedAt: '2026-07-19T01:00:00.000Z',
        status: 'submitted',
        submissionType: 'facility_request'
    }], new Date('2026-07-20T03:00:00.000Z'));

    assert.deepEqual(summary, {
        averageResolutionHours: null,
        completedLast7Days: 0,
        overdueCount: 1,
        pendingCount: 1
    });
});

test('Given a database activity summary When parsing Then counts and nullable average stay typed', () => {
    assert.deepEqual(parseOwnerSubmissionActivitySummary({
        averageResolutionHours: 3.4,
        completedLast7Days: 7,
        overdueCount: 2,
        pendingCount: 5
    }), {
        averageResolutionHours: 3.4,
        completedLast7Days: 7,
        overdueCount: 2,
        pendingCount: 5
    });
    assert.deepEqual(parseOwnerSubmissionActivitySummary(null), {
        averageResolutionHours: null,
        completedLast7Days: 0,
        overdueCount: 0,
        pendingCount: 0
    });
});
