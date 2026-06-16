import {
    canAccessCompanyResource,
    canAccessCompanyScope,
    getRequesterProfile
} from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import {
    fetchActiveGmailConnection,
    resolveUsableGmailConnection
} from '@/lib/gmail-connections';
import {
    buildDisclosureEmailContent,
    buildGmailMimeMessage,
    createDisclosureConfirmationToken,
    createDisclosureOpenToken,
    GmailIntegrationError,
    hashDisclosureConfirmationToken,
    hashDisclosureOpenToken,
    isGmailConfigured
} from '@/lib/gmail-integration';
import { sendGmailMessage } from '@/lib/gmail-provider';
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
    readonly file_url: string | null;
    readonly status: string | null;
};

function isRecord(value: unknown): value is JsonRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cleanString(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    const normalized = String(value).trim();
    return normalized.length > 0 ? normalized : null;
}

async function readBody(request: Request): Promise<JsonRecord> {
    try {
        const parsed: unknown = await request.json();
        return isRecord(parsed) ? parsed : {};
    } catch {
        return {};
    }
}

function getAppUrl(request: Request) {
    return process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
}

function isEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function markFailed(supabaseAdmin: ReturnType<typeof getSupabaseAdmin>, deliveryId: string, error: unknown) {
    const message = error instanceof Error ? error.message : 'Gmail 발송에 실패했습니다.';
    await supabaseAdmin
        .from('franchise_lead_disclosure_deliveries')
        .update({
            send_status: 'failed',
            send_error: message.slice(0, 1000),
            updated_at: new Date().toISOString()
        })
        .eq('id', deliveryId);
    return message;
}

export async function POST(request: Request) {
    const body = await readBody(request);
    const supabaseAdmin = getSupabaseAdmin();
    try {
        const requester = await getRequesterProfile(
            supabaseAdmin,
            request,
            cleanString(body.requesterId || body.userId)
        );
        if (!requester) return fail(401, 'AUTH_REQUIRED', 'requesterId is required');
        if (!isGmailConfigured()) return fail(424, 'VALIDATION_ERROR', 'Gmail OAuth environment is not configured');

        const leadId = cleanString(body.leadId || body.lead_id);
        const documentId = cleanString(body.documentId || body.document_id);
        const recipientEmail = cleanString(body.recipientEmail || body.recipient_email);
        if (!leadId) return fail(400, 'VALIDATION_ERROR', 'leadId is required');
        if (!documentId) return fail(400, 'VALIDATION_ERROR', 'documentId is required');
        if (!recipientEmail || !isEmail(recipientEmail)) return fail(400, 'VALIDATION_ERROR', 'Valid recipientEmail is required');

        const { data: lead, error: leadError } = await supabaseAdmin
            .from('franchise_leads')
            .select('id, company_id, manager_id, name, mobile')
            .eq('id', leadId)
            .single();
        if (leadError || !lead) return fail(404, 'NOT_FOUND', 'Franchise lead not found');
        const leadRow = lead as LeadRow;
        if (!canAccessCompanyResource(requester, leadRow)) return fail(403, 'FORBIDDEN', 'Forbidden: cross-company access denied');
        if (!canAccessCompanyScope(requester, leadRow.company_id)) return fail(403, 'FORBIDDEN', 'Forbidden: cross-company write denied');

        const { data: document, error: documentError } = await supabaseAdmin
            .from('franchise_disclosure_documents')
            .select('id, company_id, title, version, file_url, status')
            .eq('id', documentId)
            .single();
        if (documentError || !document) return fail(404, 'NOT_FOUND', 'Disclosure document not found');
        const documentRow = document as DisclosureDocumentRow;
        if (documentRow.company_id !== leadRow.company_id) return fail(403, 'FORBIDDEN', 'Forbidden: disclosure document company mismatch');
        if (documentRow.status === 'archived') return fail(400, 'VALIDATION_ERROR', 'Archived disclosure document cannot be sent');
        if (!documentRow.file_url) return fail(400, 'VALIDATION_ERROR', 'Disclosure document file URL is required');

        const connection = await fetchActiveGmailConnection(supabaseAdmin, requester.id, leadRow.company_id);
        if (!connection) return fail(400, 'VALIDATION_ERROR', 'Gmail account is not connected');
        const usableConnection = await resolveUsableGmailConnection(supabaseAdmin, connection);

        const confirmationToken = createDisclosureConfirmationToken();
        const openToken = createDisclosureOpenToken();
        const confirmationUrl = new URL('/api/franchise-lead-disclosures/confirm', getAppUrl(request));
        confirmationUrl.searchParams.set('token', confirmationToken);
        const openTrackingUrl = new URL('/api/franchise-lead-disclosures/open', getAppUrl(request));
        openTrackingUrl.searchParams.set('token', openToken);
        const content = buildDisclosureEmailContent({
            leadName: leadRow.name || '',
            documentTitle: documentRow.title || '정보공개서',
            documentVersion: documentRow.version || 'v1',
            documentUrl: documentRow.file_url,
            confirmationUrl: confirmationUrl.toString(),
            openTrackingUrl: openTrackingUrl.toString(),
            memo: cleanString(body.memo) || undefined
        });
        const rawMessage = buildGmailMimeMessage({
            fromEmail: usableConnection.connection.gmail_email,
            toEmail: recipientEmail,
            subject: content.subject,
            textBody: content.textBody,
            htmlBody: content.htmlBody
        });
        const now = new Date().toISOString();
        const { data: inserted, error: insertError } = await supabaseAdmin
            .from('franchise_lead_disclosure_deliveries')
            .insert({
                company_id: leadRow.company_id,
                lead_id: leadRow.id,
                document_id: documentRow.id,
                sent_by: requester.id,
                sent_at: now,
                channel: 'email',
                recipient_name: leadRow.name || '',
                recipient_contact: recipientEmail,
                recipient_email: recipientEmail,
                document_title: documentRow.title || '정보공개서',
                document_version: documentRow.version || 'v1',
                evidence_url: documentRow.file_url,
                send_status: 'pending',
                gmail_connection_id: usableConnection.connection.id,
                gmail_sender_email: usableConnection.connection.gmail_email,
                confirmation_token_hash: hashDisclosureConfirmationToken(confirmationToken),
                open_token_hash: hashDisclosureOpenToken(openToken),
                memo: cleanString(body.memo) || '',
                created_at: now,
                updated_at: now,
                data: {}
            })
            .select('id')
            .single();
        if (insertError || !inserted) throw insertError || new Error('Disclosure delivery insert failed');
        const deliveryId = String((inserted as { readonly id: string }).id);

        try {
            const gmailResult = await sendGmailMessage(usableConnection.accessToken, rawMessage);
            const sentAt = new Date().toISOString();
            const { error: updateError } = await supabaseAdmin
                .from('franchise_lead_disclosure_deliveries')
                .update({
                    send_status: 'sent',
                    sent_at: sentAt,
                    gmail_message_id: gmailResult.messageId,
                    gmail_thread_id: gmailResult.threadId,
                    send_error: null,
                    updated_at: sentAt
                })
                .eq('id', deliveryId);
            if (updateError) throw updateError;
            return ok({
                deliveryId,
                sendStatus: 'sent',
                sentAt,
                gmailMessageId: gmailResult.messageId,
                gmailThreadId: gmailResult.threadId
            }, 201);
        } catch (error) {
            const message = await markFailed(supabaseAdmin, deliveryId, error);
            return fail(error instanceof GmailIntegrationError ? error.statusCode : 502, 'INTERNAL_ERROR', message);
        }
    } catch (error) {
        console.error('Franchise disclosure Gmail send error:', error);
        if (error instanceof GmailIntegrationError) {
            return fail(error.statusCode, 'INTERNAL_ERROR', error.message);
        }
        return fail(500, 'INTERNAL_ERROR', 'Failed to send disclosure email');
    }
}
