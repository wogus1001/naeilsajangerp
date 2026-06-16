import assert from 'node:assert/strict';
import { test } from 'node:test';
import { transformLeadDisclosureDelivery, type DisclosureDeliveryRow } from './franchise-lead-disclosure-records.js';

test('Given a disclosure delivery row with open tracking When transforming Then openedAt is exposed separately from confirmedAt', () => {
    const row = {
        id: 'delivery-1',
        company_id: 'company-1',
        lead_id: 'lead-1',
        document_id: 'document-1',
        sent_by: 'profile-1',
        sent_at: '2026-06-16T04:00:00.000Z',
        channel: 'email',
        recipient_name: '',
        recipient_contact: 'lead@example.com',
        document_title: '미카도 정보공개서',
        document_version: '2026',
        evidence_url: 'https://example.com/disclosure.pdf',
        send_status: 'sent',
        gmail_connection_id: 'gmail-1',
        gmail_message_id: 'message-1',
        gmail_thread_id: 'thread-1',
        gmail_sender_email: 'sender@example.com',
        recipient_email: 'lead@example.com',
        opened_at: '2026-06-16T04:05:00.000Z',
        confirmed_at: null,
        send_error: null,
        memo: null,
        created_at: '2026-06-16T04:00:00.000Z',
        updated_at: '2026-06-16T04:05:00.000Z',
        data: {}
    } satisfies DisclosureDeliveryRow;

    const delivery = transformLeadDisclosureDelivery(row);

    assert.equal(delivery.openedAt, '2026-06-16T04:05:00.000Z');
    assert.equal(delivery.confirmedAt, null);
    assert.equal(delivery.recipientEmail, 'lead@example.com');
});
