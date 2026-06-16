import type { SupabaseClient } from '@supabase/supabase-js';
import {
    DISCLOSURE_CONTRACT_WAIT_DAYS,
    getDisclosureEligibility,
    normalizeDisclosureSendStatus,
    type DisclosureSendStatus
} from './franchise-disclosure-deliveries';

export type LeadDisclosureSummaryState =
    | 'none'
    | 'pending'
    | 'failed'
    | 'sent'
    | 'opened'
    | 'confirmed'
    | 'eligible';

export type LeadDisclosureSummary = {
    readonly state: LeadDisclosureSummaryState;
    readonly label: string;
    readonly latestDeliveryId: string | null;
    readonly latestSentAt: string | null;
    readonly latestDocumentTitle: string;
    readonly latestDocumentVersion: string;
    readonly latestSendStatus: DisclosureSendStatus | null;
    readonly recipientEmail: string;
    readonly openedAt: string | null;
    readonly confirmedAt: string | null;
    readonly contractEligibleAt: string | null;
    readonly remainingDays: number | null;
    readonly waitDays: number;
};

export type DisclosureSummaryDelivery = {
    readonly id?: string | null;
    readonly leadId?: string | null;
    readonly lead_id?: string | null;
    readonly sentAt?: string | null;
    readonly sent_at?: string | null;
    readonly createdAt?: string | null;
    readonly created_at?: string | null;
    readonly documentTitle?: string | null;
    readonly document_title?: string | null;
    readonly documentVersion?: string | null;
    readonly document_version?: string | null;
    readonly sendStatus?: string | null;
    readonly send_status?: string | null;
    readonly recipientEmail?: string | null;
    readonly recipient_email?: string | null;
    readonly openedAt?: string | null;
    readonly opened_at?: string | null;
    readonly confirmedAt?: string | null;
    readonly confirmed_at?: string | null;
};

type DisclosureSummaryRow = {
    readonly id: string;
    readonly lead_id: string;
    readonly sent_at: string | null;
    readonly created_at: string | null;
    readonly document_title: string | null;
    readonly document_version: string | null;
    readonly send_status: string | null;
    readonly recipient_email: string | null;
    readonly opened_at: string | null;
    readonly confirmed_at: string | null;
};

function cleanString(value: unknown): string {
    return String(value || '').trim();
}

function parseTime(value: unknown): number {
    const raw = cleanString(value);
    if (!raw) return 0;
    const time = new Date(raw).getTime();
    return Number.isNaN(time) ? 0 : time;
}

function readSentAt(delivery: DisclosureSummaryDelivery | null | undefined): string | null {
    if (!delivery) return null;
    const sentAt = cleanString(delivery.sentAt ?? delivery.sent_at);
    return sentAt || null;
}

function readCreatedAt(delivery: DisclosureSummaryDelivery | null | undefined): string | null {
    if (!delivery) return null;
    const createdAt = cleanString(delivery.createdAt ?? delivery.created_at);
    return createdAt || null;
}

function sortDeliveryDesc(
    left: DisclosureSummaryDelivery,
    right: DisclosureSummaryDelivery
): number {
    return parseTime(readSentAt(right) || readCreatedAt(right)) - parseTime(readSentAt(left) || readCreatedAt(left));
}

function getRunningLabel(remainingDays: number | null): string {
    if (remainingDays === null) return '발송됨';
    if (remainingDays === 0) return '계약 가능';
    return `D-${remainingDays}`;
}

function resolveState(
    latestDelivery: DisclosureSummaryDelivery | null,
    remainingDays: number | null,
    isEligible: boolean
): LeadDisclosureSummaryState {
    if (!latestDelivery) return 'none';

    const latestStatus = normalizeDisclosureSendStatus(latestDelivery.sendStatus ?? latestDelivery.send_status);
    if (latestStatus === 'pending') return 'pending';
    if (latestStatus === 'failed') return 'failed';
    if (isEligible || remainingDays === 0) return 'eligible';
    if (cleanString(latestDelivery.confirmedAt ?? latestDelivery.confirmed_at)) return 'confirmed';
    if (cleanString(latestDelivery.openedAt ?? latestDelivery.opened_at)) return 'opened';
    return 'sent';
}

function getStateLabel(state: LeadDisclosureSummaryState, remainingDays: number | null): string {
    switch (state) {
        case 'none':
            return '미발송';
        case 'pending':
            return '발송 대기';
        case 'failed':
            return '발송 실패';
        case 'eligible':
            return '계약 가능';
        case 'confirmed':
            return `수신 확인 · ${getRunningLabel(remainingDays)}`;
        case 'opened':
            return `열람 추정 · ${getRunningLabel(remainingDays)}`;
        case 'sent':
            return getRunningLabel(remainingDays);
    }
}

export function buildLeadDisclosureSummary(
    deliveries: readonly DisclosureSummaryDelivery[],
    now: Date = new Date()
): LeadDisclosureSummary {
    const sortedDeliveries = [...deliveries].sort(sortDeliveryDesc);
    const latestDelivery = sortedDeliveries[0] ?? null;
    const eligibility = getDisclosureEligibility(sortedDeliveries, now);
    const state = resolveState(latestDelivery, eligibility.remainingDays, eligibility.isEligible);

    return {
        state,
        label: getStateLabel(state, eligibility.remainingDays),
        latestDeliveryId: cleanString(latestDelivery?.id) || eligibility.latestDeliveryId,
        latestSentAt: eligibility.latestSentAt || readSentAt(latestDelivery),
        latestDocumentTitle: eligibility.latestDocumentTitle || cleanString(latestDelivery?.documentTitle ?? latestDelivery?.document_title),
        latestDocumentVersion: eligibility.latestDocumentVersion || cleanString(latestDelivery?.documentVersion ?? latestDelivery?.document_version),
        latestSendStatus: latestDelivery ? normalizeDisclosureSendStatus(latestDelivery.sendStatus ?? latestDelivery.send_status) : null,
        recipientEmail: cleanString(latestDelivery?.recipientEmail ?? latestDelivery?.recipient_email),
        openedAt: cleanString(latestDelivery?.openedAt ?? latestDelivery?.opened_at) || null,
        confirmedAt: cleanString(latestDelivery?.confirmedAt ?? latestDelivery?.confirmed_at) || null,
        contractEligibleAt: eligibility.contractEligibleAt,
        remainingDays: eligibility.remainingDays,
        waitDays: DISCLOSURE_CONTRACT_WAIT_DAYS
    };
}

export function emptyLeadDisclosureSummary(): LeadDisclosureSummary {
    return buildLeadDisclosureSummary([]);
}

function normalizeSummaryRow(row: DisclosureSummaryRow): DisclosureSummaryDelivery {
    return {
        id: row.id,
        lead_id: row.lead_id,
        sent_at: row.sent_at,
        created_at: row.created_at,
        document_title: row.document_title,
        document_version: row.document_version,
        send_status: row.send_status,
        recipient_email: row.recipient_email,
        opened_at: row.opened_at,
        confirmed_at: row.confirmed_at
    };
}

function uniqueLeadIds(leadIds: readonly string[]): readonly string[] {
    return [...new Set(leadIds.map(id => id.trim()).filter(Boolean))];
}

function isMissingDeliverySchemaError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    const code = 'code' in error && typeof error.code === 'string' ? error.code : '';
    const message = 'message' in error && typeof error.message === 'string' ? error.message : '';
    return ['PGRST204', 'PGRST205', '42P01', '42703'].includes(code)
        && /franchise_lead_disclosure_deliveries|opened_at|send_status/i.test(message);
}

export async function fetchLeadDisclosureSummaryMap(
    supabaseAdmin: SupabaseClient,
    leadIds: readonly string[]
): Promise<Record<string, LeadDisclosureSummary>> {
    const ids = uniqueLeadIds(leadIds);
    const summaries = ids.reduce<Record<string, LeadDisclosureSummary>>((acc, id) => {
        acc[id] = emptyLeadDisclosureSummary();
        return acc;
    }, {});

    if (ids.length === 0) return summaries;

    const { data, error } = await supabaseAdmin
        .from('franchise_lead_disclosure_deliveries')
        .select('id, lead_id, sent_at, created_at, document_title, document_version, send_status, recipient_email, opened_at, confirmed_at')
        .in('lead_id', ids);

    if (error) {
        if (isMissingDeliverySchemaError(error)) return summaries;
        throw error;
    }

    const grouped = ((data || []) as DisclosureSummaryRow[]).reduce<Record<string, DisclosureSummaryDelivery[]>>((acc, row) => {
        if (!acc[row.lead_id]) acc[row.lead_id] = [];
        acc[row.lead_id]?.push(normalizeSummaryRow(row));
        return acc;
    }, {});

    Object.entries(grouped).forEach(([leadId, deliveries]) => {
        summaries[leadId] = buildLeadDisclosureSummary(deliveries);
    });

    return summaries;
}

export async function attachDisclosureSummariesToLeads<T extends { readonly id: string }>(
    supabaseAdmin: SupabaseClient,
    leads: readonly T[]
): Promise<readonly (T & { readonly disclosureSummary: LeadDisclosureSummary })[]> {
    const summaryMap = await fetchLeadDisclosureSummaryMap(supabaseAdmin, leads.map(lead => lead.id));
    return leads.map(lead => ({
        ...lead,
        disclosureSummary: summaryMap[lead.id] ?? emptyLeadDisclosureSummary()
    }));
}
