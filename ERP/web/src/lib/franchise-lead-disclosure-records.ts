import {
    normalizeDisclosureChannel,
    normalizeDisclosureSendStatus,
    type FranchiseLeadDisclosureDelivery
} from './franchise-disclosure-deliveries';

export type DisclosureDeliveryRow = {
    readonly id: string;
    readonly company_id: string;
    readonly lead_id: string;
    readonly document_id: string | null;
    readonly sent_by: string | null;
    readonly sent_at: string;
    readonly channel: string | null;
    readonly recipient_name: string | null;
    readonly recipient_contact: string | null;
    readonly document_title: string | null;
    readonly document_version: string | null;
    readonly evidence_url: string | null;
    readonly send_status: string | null;
    readonly gmail_connection_id: string | null;
    readonly gmail_message_id: string | null;
    readonly gmail_thread_id: string | null;
    readonly gmail_sender_email: string | null;
    readonly recipient_email: string | null;
    readonly opened_at: string | null;
    readonly confirmed_at: string | null;
    readonly send_error: string | null;
    readonly memo: string | null;
    readonly created_at: string;
    readonly updated_at: string;
    readonly data: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function readDisclosureJsonRecord(value: unknown): Record<string, unknown> {
    return isRecord(value) ? value : {};
}

export function transformLeadDisclosureDelivery(row: DisclosureDeliveryRow): FranchiseLeadDisclosureDelivery {
    return {
        ...readDisclosureJsonRecord(row.data),
        id: row.id,
        companyId: row.company_id,
        leadId: row.lead_id,
        documentId: row.document_id,
        sentBy: row.sent_by,
        sentAt: row.sent_at,
        channel: normalizeDisclosureChannel(row.channel),
        recipientName: row.recipient_name || '',
        recipientContact: row.recipient_contact || '',
        documentTitle: row.document_title || '',
        documentVersion: row.document_version || 'v1',
        evidenceUrl: row.evidence_url || '',
        sendStatus: normalizeDisclosureSendStatus(row.send_status),
        gmailConnectionId: row.gmail_connection_id,
        gmailMessageId: row.gmail_message_id || '',
        gmailThreadId: row.gmail_thread_id || '',
        gmailSenderEmail: row.gmail_sender_email || '',
        recipientEmail: row.recipient_email || '',
        openedAt: row.opened_at,
        confirmedAt: row.confirmed_at,
        sendError: row.send_error || '',
        memo: row.memo || '',
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}
