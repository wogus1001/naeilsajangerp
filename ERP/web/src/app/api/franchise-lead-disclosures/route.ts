import { canAccessCompanyResource, canAccessCompanyScope, getRequesterProfile } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import {
    getDisclosureEligibility,
    normalizeDisclosureChannel,
    type FranchiseLeadDisclosureDelivery
} from '@/lib/franchise-disclosure-deliveries';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

type JsonRecord = Record<string, unknown>;

type LeadRow = {
    readonly id: string;
    readonly company_id: string;
    readonly manager_id: string | null;
    readonly name: string | null;
    readonly mobile: string | null;
};

type DisclosureDocumentRow = {
    readonly id: string;
    readonly company_id: string;
    readonly title: string | null;
    readonly version: string | null;
    readonly status: string | null;
};

type DisclosureDeliveryRow = {
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
    readonly memo: string | null;
    readonly created_at: string;
    readonly updated_at: string;
    readonly data: unknown;
};

function isRecord(value: unknown): value is JsonRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getFirst(body: JsonRecord, keys: readonly string[]) {
    for (const key of keys) {
        if (Object.prototype.hasOwnProperty.call(body, key)) return body[key];
    }
    return undefined;
}

function cleanString(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    const normalized = String(value).trim();
    return normalized.length > 0 ? normalized : null;
}

function readJsonRecord(value: unknown): JsonRecord {
    return isRecord(value) ? value : {};
}

async function readBody(request: Request): Promise<JsonRecord> {
    try {
        const parsed = await request.json();
        return isRecord(parsed) ? parsed : {};
    } catch {
        return {};
    }
}

function requesterFallback(body: JsonRecord) {
    return cleanString(getFirst(body, ['requesterId', 'userId', 'managerId', 'manager_id']));
}

function getErrorCode(error: unknown) {
    if (!isRecord(error)) return '';
    return typeof error.code === 'string' ? error.code : '';
}

function getErrorMessage(error: unknown) {
    if (error instanceof Error) return error.message;
    if (!isRecord(error)) return '';
    return typeof error.message === 'string' ? error.message : '';
}

function isMissingDisclosureSchemaError(error: unknown) {
    const code = getErrorCode(error);
    const message = getErrorMessage(error);
    return ['PGRST204', 'PGRST205', '42P01', '42703'].includes(code)
        && /franchise_(lead_)?disclosure/i.test(message);
}

function handleLeadDisclosureError(error: unknown, action: string) {
    console.error(`Franchise lead disclosures ${action} error:`, error);
    if (isMissingDisclosureSchemaError(error)) {
        return fail(
            424,
            'VALIDATION_ERROR',
            '정보공개서 발송 이력 테이블이 아직 적용되지 않았습니다. supabase_franchise_disclosures_migration.sql 적용 후 다시 확인해주세요.'
        );
    }
    return fail(500, 'INTERNAL_ERROR', `Failed to ${action.toLowerCase()} lead disclosure delivery${action === 'GET' ? 'ies' : ''}`);
}

function parseSentAt(value: unknown) {
    const raw = cleanString(value);
    if (!raw) return new Date().toISOString();
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString();
}

function transformDelivery(row: DisclosureDeliveryRow): FranchiseLeadDisclosureDelivery {
    return {
        ...readJsonRecord(row.data),
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
        memo: row.memo || '',
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

async function fetchLead(
    supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
    leadId: string
) {
    const { data, error } = await supabaseAdmin
        .from('franchise_leads')
        .select('id, company_id, manager_id, name, mobile')
        .eq('id', leadId)
        .single();
    return { lead: data as LeadRow | null, error };
}

async function fetchDocument(
    supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
    documentId: string
) {
    const { data, error } = await supabaseAdmin
        .from('franchise_disclosure_documents')
        .select('id, company_id, title, version, status')
        .eq('id', documentId)
        .single();
    return { document: data as DisclosureDocumentRow | null, error };
}

async function fetchDeliveries(
    supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
    leadId: string
) {
    const { data, error } = await supabaseAdmin
        .from('franchise_lead_disclosure_deliveries')
        .select('*')
        .eq('lead_id', leadId)
        .order('sent_at', { ascending: false });
    if (error) throw error;
    return ((data || []) as DisclosureDeliveryRow[]).map(transformDelivery);
}

export async function GET(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const requester = await getRequesterProfile(supabaseAdmin, request);
        if (!requester) return fail(401, 'AUTH_REQUIRED', 'requesterId is required');

        const { searchParams } = new URL(request.url);
        const leadId = searchParams.get('leadId') || searchParams.get('lead_id');
        if (!leadId) return fail(400, 'VALIDATION_ERROR', 'leadId is required');

        const { lead, error: leadError } = await fetchLead(supabaseAdmin, leadId);
        if (leadError || !lead) return fail(404, 'NOT_FOUND', 'Franchise lead not found');
        if (!canAccessCompanyResource(requester, lead)) return fail(403, 'FORBIDDEN', 'Forbidden: cross-company access denied');

        const deliveries = await fetchDeliveries(supabaseAdmin, leadId);
        return ok({
            deliveries,
            eligibility: getDisclosureEligibility(deliveries)
        });
    } catch (error) {
        return handleLeadDisclosureError(error, 'GET');
    }
}

export async function POST(request: Request) {
    try {
        const body = await readBody(request);
        const supabaseAdmin = getSupabaseAdmin();
        const requester = await getRequesterProfile(supabaseAdmin, request, requesterFallback(body));
        if (!requester) return fail(401, 'AUTH_REQUIRED', 'requesterId is required');

        const leadId = cleanString(getFirst(body, ['leadId', 'lead_id']));
        if (!leadId) return fail(400, 'VALIDATION_ERROR', 'leadId is required');

        const { lead, error: leadError } = await fetchLead(supabaseAdmin, leadId);
        if (leadError || !lead) return fail(404, 'NOT_FOUND', 'Franchise lead not found');
        if (!canAccessCompanyResource(requester, lead)) return fail(403, 'FORBIDDEN', 'Forbidden: cross-company access denied');
        if (!canAccessCompanyScope(requester, lead.company_id)) return fail(403, 'FORBIDDEN', 'Forbidden: cross-company write denied');

        const documentId = cleanString(getFirst(body, ['documentId', 'document_id']));
        let documentTitle = cleanString(getFirst(body, ['documentTitle', 'document_title', 'title']));
        let documentVersion = cleanString(getFirst(body, ['documentVersion', 'document_version', 'version'])) || 'v1';
        if (documentId) {
            const { document, error: documentError } = await fetchDocument(supabaseAdmin, documentId);
            if (documentError || !document) return fail(404, 'NOT_FOUND', 'Disclosure document not found');
            if (document.company_id !== lead.company_id) return fail(403, 'FORBIDDEN', 'Forbidden: disclosure document company mismatch');
            if (document.status === 'archived') return fail(400, 'VALIDATION_ERROR', 'Archived disclosure document cannot be sent');
            documentTitle = document.title || documentTitle;
            documentVersion = document.version || documentVersion;
        }

        if (!documentTitle) return fail(400, 'VALIDATION_ERROR', 'Disclosure document title is required');
        const sentAt = parseSentAt(getFirst(body, ['sentAt', 'sent_at']));
        if (!sentAt) return fail(400, 'VALIDATION_ERROR', 'sentAt is invalid');

        const now = new Date().toISOString();
        const payload = {
            company_id: lead.company_id,
            lead_id: lead.id,
            document_id: documentId,
            sent_by: requester.id,
            sent_at: sentAt,
            channel: normalizeDisclosureChannel(getFirst(body, ['channel'])),
            recipient_name: cleanString(getFirst(body, ['recipientName', 'recipient_name'])) || lead.name || '',
            recipient_contact: cleanString(getFirst(body, ['recipientContact', 'recipient_contact'])) || lead.mobile || '',
            document_title: documentTitle,
            document_version: documentVersion,
            evidence_url: cleanString(getFirst(body, ['evidenceUrl', 'evidence_url'])) || '',
            memo: cleanString(getFirst(body, ['memo'])) || '',
            created_at: now,
            updated_at: now,
            data: readJsonRecord(getFirst(body, ['data']))
        };

        const { data, error } = await supabaseAdmin
            .from('franchise_lead_disclosure_deliveries')
            .insert(payload)
            .select()
            .single();
        if (error) throw error;

        const delivery = transformDelivery(data as DisclosureDeliveryRow);
        const deliveries = await fetchDeliveries(supabaseAdmin, lead.id);
        return ok({
            delivery,
            deliveries,
            eligibility: getDisclosureEligibility(deliveries)
        }, 201);
    } catch (error) {
        return handleLeadDisclosureError(error, 'SAVE');
    }
}
