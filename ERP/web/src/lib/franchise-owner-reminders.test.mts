import assert from 'node:assert/strict';
import test from 'node:test';

import {
    buildOwnerReminderIdempotencyKey,
    buildOwnerReminderPortalEvent,
    normalizeOwnerReminderLocationIds,
    parseOwnerReminderCreateInput,
    shouldIncludeAcknowledgedOwnerReminders,
    summarizeOwnerReminders,
    type OwnerReminderRow
} from './franchise-owner-reminders';

const companyId = '0370fba6-364a-43a9-9cc4-0f133a9d2052';
const locationId = '92924bd6-b2a1-49bb-844b-05eabcc51bbf';
const secondLocationId = '8d3e5ef1-a42e-4d4b-91ba-3bf2f0dfe8c9';
const ownerAccountId = '19a7f698-5b5f-4aa7-bc66-23236019023d';
const requestIdempotencyKey = '46eb499f-6127-47ac-b9cc-df04f47565d6';

test('reminder input normalizes duplicate location targets and snake-case fields', () => {
    const input = parseOwnerReminderCreateInput({
        source_type: 'content_item',
        source_id: 'content-1',
        source_version: 2,
        location_ids: [locationId, locationId],
        request_idempotency_key: requestIdempotencyKey,
        reminder_kind: 'due',
        due_at: '2026-07-23T00:00:00.000Z'
    });
    assert.deepEqual(input, {
        sourceType: 'content_item',
        sourceId: 'content-1',
        sourceVersion: 2,
        locationIds: [locationId],
        requestIdempotencyKey,
        reminderKind: 'due',
        message: '',
        dueAt: '2026-07-23T00:00:00.000Z'
    });
});

test('Given a Korean datetime-local deadline When parsing Then it is converted from KST', () => {
    const input = parseOwnerReminderCreateInput({
        sourceType: 'content_item', sourceId: 'content-1', sourceVersion: 1,
        locationIds: [locationId], requestIdempotencyKey, dueAt: '2026-07-23T09:30'
    });
    assert.equal(input?.dueAt, '2026-07-23T00:30:00.000Z');
});

test('reminder input rejects invalid or partially cross-scoped location targets', () => {
    assert.deepEqual(normalizeOwnerReminderLocationIds([locationId, locationId]), [locationId]);
    assert.equal(parseOwnerReminderCreateInput({
        sourceType: 'checklist_issue',
        sourceId: 'owner-checklist-issue-1',
        locationIds: [locationId, 'not-a-uuid']
    }), null);
    assert.equal(parseOwnerReminderCreateInput({ sourceType: 'settlement_request', sourceId: 'x', locationId }), null);
});

test('Given reminder retries When building request keys Then request idempotency stays separate from delivery identity', () => {
    const key = buildOwnerReminderIdempotencyKey({
        companyId,
        ownerAccountId,
        requestIdempotencyKey
    });
    assert.equal(key, `${companyId}:${ownerAccountId}:${requestIdempotencyKey}`);
});

test('reminder stats separate acknowledgement and location/source counts', () => {
    const rows: readonly OwnerReminderRow[] = [
        {
            id: 'reminder-1', company_id: companyId, location_id: locationId, owner_account_id: ownerAccountId,
            source_type: 'checklist_issue', source_id: 'issue-1', source_version: 1,
            request_idempotency_key: requestIdempotencyKey, delivery_id: 'a65bb035-b104-4c57-8ed4-7b3880a75871',
            reminder_kind: 'manual', message: '', due_at: null,
            sent_at: '2026-07-22T00:00:00.000Z', acknowledged_at: null, created_by: null, created_at: '2026-07-22T00:00:00.000Z'
        },
        {
            id: 'reminder-2', company_id: companyId, location_id: secondLocationId, owner_account_id: '68c1f2d5-4e30-4e89-97f1-f683d7591fb0',
            source_type: 'content_item', source_id: 'content-1', source_version: 2,
            request_idempotency_key: 'f4579cdf-0e48-48b9-a56d-1b1bb9034599', delivery_id: '41ec068b-9b1a-497d-8320-c535368ec35d',
            reminder_kind: 'manual', message: '', due_at: null,
            sent_at: '2026-07-22T00:00:00.000Z', acknowledged_at: '2026-07-22T01:00:00.000Z', created_by: null, created_at: '2026-07-22T00:00:00.000Z'
        }
    ];
    assert.deepEqual(summarizeOwnerReminders(rows), {
        total: 2,
        acknowledged: 1,
        unacknowledged: 1,
        ownerCount: 2,
        bySourceType: { checklist_issue: 1, content_item: 1 },
        byLocation: [
            { locationId, total: 1, acknowledged: 0, unacknowledged: 1 },
            { locationId: secondLocationId, total: 1, acknowledged: 1, unacknowledged: 0 }
        ]
    });
});

test('portal event keeps the reminder source and actor boundary', () => {
    const event = buildOwnerReminderPortalEvent({
        reminder: {
            id: 'reminder-1', company_id: companyId, location_id: locationId, owner_account_id: ownerAccountId,
            source_type: 'checklist_issue', source_id: 'issue-1', reminder_kind: 'manual'
        },
        eventType: 'reminder_acknowledged',
        occurredAt: '2026-07-22T02:00:00.000Z',
        actorId: ownerAccountId
    });
    assert.deepEqual(event, {
        company_id: companyId,
        location_id: locationId,
        owner_account_id: ownerAccountId,
        source_type: 'checklist_issue',
        source_id: 'issue-1',
        event_type: 'reminder_acknowledged',
        event_data: { reminder_id: 'reminder-1', reminder_kind: 'manual', actor_id: ownerAccountId },
        occurred_at: '2026-07-22T02:00:00.000Z'
    });
});

test('owner reminder listing defaults to unacknowledged and supports all mode', () => {
    assert.equal(shouldIncludeAcknowledgedOwnerReminders(new URLSearchParams()), false);
    assert.equal(shouldIncludeAcknowledgedOwnerReminders(new URLSearchParams('all=true')), true);
    assert.equal(shouldIncludeAcknowledgedOwnerReminders(new URLSearchParams('status=unacknowledged')), false);
});
