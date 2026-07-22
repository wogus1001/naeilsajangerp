import { fail, ok } from '@/lib/api-response';
import {
    canOwnerReadContent,
    isMissingOwnerContentSchemaError,
    mergeOwnerContentReceipt,
    OWNER_CONTENT_SCHEMA_MESSAGE,
    OWNER_CONTENT_RECEIPT_ON_CONFLICT,
    OWNER_CONTENT_RECEIPT_SELECT,
    parseOwnerContentReceiptAction,
    type OwnerContentAttachmentRow,
    type OwnerContentItemRow,
    type OwnerContentReceiptRow
} from '@/lib/franchise-owner-content';
import { getOwnerSessionContext } from '@/lib/franchise-owner-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const CONTENT_SELECT = 'id, company_id, location_id, source_type, source_id, content_type, category, title, summary, body, version, status, requires_acknowledgement, due_at, published_at, created_by, updated_by, created_at, updated_at';
const ATTACHMENT_SELECT = 'id, content_id, company_id, file_name, mime_type, file_size, storage_bucket, storage_path, created_by, created_at';

function readBodyText(value: unknown, key: string): string {
    if (!value || typeof value !== 'object') return '';
    const field = Reflect.get(value, key);
    return typeof field === 'string' ? field.trim() : '';
}

export async function GET(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const context = await getOwnerSessionContext(supabaseAdmin);
        if (!context) return fail(401, 'AUTH_REQUIRED', '점주 로그인이 필요합니다.');

        const { searchParams } = new URL(request.url);
        const contentId = searchParams.get('contentId')?.trim() || searchParams.get('id')?.trim() || '';
        const contentType = searchParams.get('contentType')?.trim() || '';
        let query = supabaseAdmin
            .from('franchise_owner_content_items')
            .select(CONTENT_SELECT)
            .eq('company_id', context.account.company_id)
            .eq('status', 'published')
            .or(`location_id.is.null,location_id.eq.${context.location.id}`)
            .order('published_at', { ascending: false, nullsFirst: false })
            .order('created_at', { ascending: false })
            .limit(100);
        if (contentId) query = query.eq('id', contentId);
        if (contentType) query = query.eq('content_type', contentType);
        const { data, error } = await query.returns<OwnerContentItemRow[]>();
        if (error) throw error;
        const items = (data || []).filter(item => canOwnerReadContent(
            item,
            context.account.company_id,
            context.location.id
        ));

        const contentIds = items.map(item => item.id);
        let attachments: readonly OwnerContentAttachmentRow[] = [];
        let receipts: readonly OwnerContentReceiptRow[] = [];
        if (contentIds.length > 0) {
            const attachmentResult = await supabaseAdmin
                .from('franchise_owner_content_attachments')
                .select(ATTACHMENT_SELECT)
                .eq('company_id', context.account.company_id)
                .in('content_id', contentIds)
                .order('created_at', { ascending: true })
                .returns<OwnerContentAttachmentRow[]>();
            if (attachmentResult.error) throw attachmentResult.error;
            attachments = attachmentResult.data || [];

            const receiptResult = await supabaseAdmin
                .from('franchise_owner_content_receipts')
                .select(OWNER_CONTENT_RECEIPT_SELECT)
                .eq('company_id', context.account.company_id)
                .eq('location_id', context.location.id)
                .eq('owner_account_id', context.account.id)
                .in('content_id', contentIds)
                .returns<OwnerContentReceiptRow[]>();
            if (receiptResult.error) throw receiptResult.error;
            receipts = receiptResult.data || [];
        }

        const itemsWithAcknowledgement = mergeOwnerContentReceipt(items, receipts, context.account.id);
        return ok({
            items: itemsWithAcknowledgement.map(item => ({
                ...item,
                attachments: attachments.filter(attachment => attachment.content_id === item.id)
            }))
        });
    } catch (error) {
        if (isMissingOwnerContentSchemaError(error)) {
            return fail(424, 'VALIDATION_ERROR', OWNER_CONTENT_SCHEMA_MESSAGE);
        }
        if (error instanceof Error) console.error('Owner content GET failed', error);
        else console.error('Owner content GET failed with an unknown error');
        return fail(500, 'INTERNAL_ERROR', '콘텐츠를 불러오지 못했습니다.');
    }
}

export async function PATCH(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const context = await getOwnerSessionContext(supabaseAdmin);
        if (!context) return fail(401, 'AUTH_REQUIRED', '점주 로그인이 필요합니다.');

        const body: unknown = await request.json();
        const searchParams = new URL(request.url).searchParams;
        const contentId = readBodyText(body, 'contentId')
            || readBodyText(body, 'id')
            || searchParams.get('contentId')?.trim()
            || searchParams.get('id')?.trim()
            || '';
        const action = parseOwnerContentReceiptAction(body);
        if (!contentId || !action) {
            return fail(400, 'VALIDATION_ERROR', '확인할 자료와 확인 동작을 다시 확인해주세요.');
        }

        const contentResult = await supabaseAdmin
            .from('franchise_owner_content_items')
            .select(CONTENT_SELECT)
            .eq('id', contentId)
            .eq('company_id', context.account.company_id)
            .eq('status', 'published')
            .or(`location_id.is.null,location_id.eq.${context.location.id}`)
            .maybeSingle<OwnerContentItemRow>();
        if (contentResult.error) throw contentResult.error;
        if (!contentResult.data) return fail(404, 'NOT_FOUND', '확인할 자료를 찾을 수 없습니다.');
        if (action === 'acknowledge' && !contentResult.data.requires_acknowledgement) {
            return fail(400, 'VALIDATION_ERROR', '이 자료는 수신 확인 대상이 아닙니다.');
        }

        const now = new Date().toISOString();
        const receiptResult = await supabaseAdmin
            .from('franchise_owner_content_receipts')
            .upsert({
                acknowledged_at: action === 'acknowledge' ? now : undefined,
                company_id: context.account.company_id,
                content_id: contentResult.data.id,
                content_version: contentResult.data.version,
                location_id: context.location.id,
                owner_account_id: context.account.id,
                viewed_at: now
            }, { onConflict: OWNER_CONTENT_RECEIPT_ON_CONFLICT })
            .select(OWNER_CONTENT_RECEIPT_SELECT)
            .maybeSingle<OwnerContentReceiptRow>();
        if (receiptResult.error) throw receiptResult.error;

        let receipt = receiptResult.data;
        if (!receipt) {
            const existingResult = await supabaseAdmin
                .from('franchise_owner_content_receipts')
                .select(OWNER_CONTENT_RECEIPT_SELECT)
                .eq('content_id', contentResult.data.id)
                .eq('content_version', contentResult.data.version)
                .eq('company_id', context.account.company_id)
                .eq('location_id', context.location.id)
                .eq('owner_account_id', context.account.id)
                .maybeSingle<OwnerContentReceiptRow>();
            if (existingResult.error) throw existingResult.error;
            receipt = existingResult.data;
        }
        if (!receipt) return fail(409, 'CONFLICT', '콘텐츠 확인 상태를 확인하지 못했습니다.');

        if (action === 'acknowledge') {
            const reminderResult = await supabaseAdmin
                .from('franchise_owner_reminders')
                .update({ acknowledged_at: receipt.acknowledged_at || now })
                .eq('company_id', context.account.company_id)
                .eq('location_id', context.location.id)
                .eq('owner_account_id', context.account.id)
                .eq('source_type', 'content_item')
                .eq('source_id', contentResult.data.id)
                .is('acknowledged_at', null);
            if (reminderResult.error) throw reminderResult.error;
        }

        return ok({ receipt, acknowledged: Boolean(receipt.acknowledged_at), viewed: Boolean(receipt.viewed_at) });
    } catch (error) {
        if (isMissingOwnerContentSchemaError(error)) {
            return fail(424, 'VALIDATION_ERROR', OWNER_CONTENT_SCHEMA_MESSAGE);
        }
        if (error instanceof SyntaxError) return fail(400, 'VALIDATION_ERROR', '콘텐츠 확인 내용을 확인해주세요.');
        if (error instanceof Error) console.error('Owner content PATCH failed', error);
        else console.error('Owner content PATCH failed with an unknown error');
        return fail(500, 'INTERNAL_ERROR', '콘텐츠를 확인 처리하지 못했습니다.');
    }
}
