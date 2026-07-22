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

test('reminder input normalizes duplicate location targets and snake-case fields', () => {
    const input = parseOwnerReminderCreateInput({
        source_type: 'content_item',
        source_id: 'content-1',
        location_ids: [locationId, locationId],
        reminder_kind: 'due',
        due_at: '2026-07-23T00:00:00.000Z'
    });
    assert.deepEqual(input, {
        sourceType: 'content_item',
        sourceId: 'content-1',
        locationIds: [locationId],
        reminderKind: 'due',
        message: '',
        dueAt: '2026-07-23T00:00:00.000Z'
    });
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

test('reminder idempotency key includes company, owner, source and kind', () => {
    const key = buildOwnerReminderIdempotencyKey({
        companyId,
        ownerAccountId,
        sourceType: 'checklist_issue',
        sourceId: 'owner-checklist-issue-1',
        reminderKind: 'due'
    });
    assert.equal(key, `${companyId}:checklist_issue:owner-checklist-issue-1:${ownerAccountId}:due`);
});

test('reminder stats separate acknowledgement and location/source counts', () => {
    const rows: readonly OwnerReminderRow[] = [
        {
            id: 'reminder-1', company_id: companyId, location_id: locationId, owner_account_id: ownerAccountId,
            source_type: 'checklist_issue', source_id: 'issue-1', reminder_kind: 'manual', message: '', due_at: null,
            sent_at: '2026-07-22T00:00:00.000Z', acknowledged_at: null, created_by: null, created_at: '2026-07-22T00:00:00.000Z'
        },
        {
            id: 'reminder-2', company_id: companyId, location_id: secondLocationId, owner_account_id: '68c1f2d5-4e30-4e89-97f1-f683d7591fb0',
            source_type: 'content_item', source_id: 'content-1', reminder_kind: 'manual', message: '', due_at: null,
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
