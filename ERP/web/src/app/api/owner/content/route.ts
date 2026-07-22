import { fail, ok } from '@/lib/api-response';
import {
    canOwnerReadContent,
    isMissingOwnerContentSchemaError,
    mergeOwnerContentReceipt,
    OWNER_CONTENT_SCHEMA_MESSAGE,
    OWNER_CONTENT_RECEIPT_SELECT,
    parseOwnerContentExpectedVersion,
    parseOwnerContentReceiptAction,
    type OwnerContentItemRow,
    type OwnerContentReceiptRow,
    type OwnerContentVersionAttachmentRow
} from '@/lib/franchise-owner-content';
import { getOwnerSessionContext } from '@/lib/franchise-owner-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const CONTENT_SELECT = 'id, company_id, location_id, source_type, source_id, content_type, category, title, summary, body, version, status, requires_acknowledgement, due_at, published_at, created_by, updated_by, created_at, updated_at';
const VERSION_ATTACHMENT_SELECT = 'content_id, content_version, attachment_id, company_id, location_id, file_name, mime_type, file_size, storage_bucket, storage_path, attachment_created_at, captured_at';

function readBodyText(value: unknown, key: string): string {
    if (!value || typeof value !== 'object') return '';
    const field = Reflect.get(value, key);
    return typeof field === 'string' ? field.trim() : '';
}

function readContentReceiptError(error: unknown): string {
    if (!error || typeof error !== 'object') return '';
    const text = ['message', 'details', 'hint']
        .map(key => Reflect.get(error, key))
        .filter((value): value is string => typeof value === 'string')
        .join(' ');
    return text.match(/OWNER_CONTENT_[A-Z_]+/)?.[0] || '';
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
        let attachments: readonly OwnerContentVersionAttachmentRow[] = [];
        let receipts: readonly OwnerContentReceiptRow[] = [];
        if (contentIds.length > 0) {
            const attachmentResult = await supabaseAdmin
                .from('franchise_owner_content_version_attachments')
                .select(VERSION_ATTACHMENT_SELECT)
                .eq('company_id', context.account.company_id)
                .in('content_id', contentIds)
                .order('attachment_created_at', { ascending: true })
                .returns<OwnerContentVersionAttachmentRow[]>();
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
                attachments: attachments
                    .filter(attachment => attachment.content_id === item.id && attachment.content_version === item.version)
                    .map(attachment => ({
                        content_id: attachment.content_id,
                        content_version: attachment.content_version,
                        created_at: attachment.attachment_created_at,
                        file_name: attachment.file_name,
                        file_size: attachment.file_size,
                        id: attachment.attachment_id,
                        mime_type: attachment.mime_type,
                        storage_bucket: attachment.storage_bucket,
                        storage_path: attachment.storage_path
                    }))
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
        const contentVersion = parseOwnerContentExpectedVersion(body);
        if (!contentId || !action || !contentVersion) {
            return fail(400, 'VALIDATION_ERROR', '확인할 자료, 버전, 확인 동작을 다시 확인해주세요.');
        }
        const receiptResult = await supabaseAdmin.rpc('record_franchise_owner_content_receipt', {
            p_action: action,
            p_company_id: context.account.company_id,
            p_content_id: contentId,
            p_content_version: contentVersion,
            p_location_id: context.location.id,
            p_owner_account_id: context.account.id
        });
        if (receiptResult.error) throw receiptResult.error;
        const receipt = receiptResult.data as OwnerContentReceiptRow | null;
        if (!receipt) return fail(409, 'CONFLICT', '콘텐츠 확인 상태를 확인하지 못했습니다.');

        return ok({ receipt, acknowledged: Boolean(receipt.acknowledged_at), viewed: Boolean(receipt.viewed_at) });
    } catch (error) {
        if (isMissingOwnerContentSchemaError(error)) {
            return fail(424, 'VALIDATION_ERROR', OWNER_CONTENT_SCHEMA_MESSAGE);
        }
        if (error instanceof SyntaxError) return fail(400, 'VALIDATION_ERROR', '콘텐츠 확인 내용을 확인해주세요.');
        const receiptError = readContentReceiptError(error);
        if (receiptError === 'OWNER_CONTENT_NOT_FOUND') return fail(404, 'NOT_FOUND', '확인할 자료를 찾을 수 없습니다.');
        if (receiptError === 'OWNER_CONTENT_ACK_NOT_REQUIRED') return fail(400, 'VALIDATION_ERROR', '이 자료는 수신 확인 대상이 아닙니다.');
        if (receiptError === 'OWNER_CONTENT_STALE') {
            return fail(409, 'CONFLICT', '자료가 새 버전으로 변경되었습니다. 새로고침 후 다시 확인해주세요.');
        }
        if (error instanceof Error) console.error('Owner content PATCH failed', error);
        else console.error('Owner content PATCH failed with an unknown error');
        return fail(500, 'INTERNAL_ERROR', '콘텐츠를 확인 처리하지 못했습니다.');
    }
}
