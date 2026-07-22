import { fail, ok } from '@/lib/api-response';
import {
    isMissingOwnerContentSchemaError,
    OWNER_CONTENT_RECEIPT_SELECT,
    OWNER_CONTENT_SCHEMA_MESSAGE,
    parseOwnerContentAction,
    parseOwnerContentCreate,
    summarizeOwnerContentReceiptStats,
    targetOwnerAccountIdsForContent,
    type OwnerContentAttachmentRow,
    type OwnerContentItemRow,
    type OwnerContentReceiptRow,
    type OwnerContentReceiptStats,
    type OwnerContentReceiptTargetAccount
} from '@/lib/franchise-owner-content';
import {
    fetchOwnerPortalLocation,
    isOwnerPortalManager,
    resolveOwnerPortalCompanyScope,
    resolveOwnerPortalStaffAuth
} from '@/lib/franchise-owner-portal-api';

export const dynamic = 'force-dynamic';

const CONTENT_SELECT = 'id, company_id, location_id, source_type, source_id, content_type, category, title, summary, body, version, status, requires_acknowledgement, due_at, published_at, created_by, updated_by, created_at, updated_at';
const ATTACHMENT_SELECT = 'id, content_id, company_id, file_name, mime_type, file_size, storage_bucket, storage_path, created_by, created_at';

const EMPTY_RECEIPT_STATS: OwnerContentReceiptStats = {
    targetCount: 0,
    acknowledgedCount: 0,
    unacknowledgedCount: 0
};

function readBodyText(value: unknown, key: string): string {
    if (!value || typeof value !== 'object') return '';
    const field = Reflect.get(value, key);
    return typeof field === 'string' ? field.trim() : '';
}

export async function GET(request: Request) {
    try {
        const authResult = await resolveOwnerPortalStaffAuth(request);
        if (!authResult.ok) return authResult.response;
        if (!isOwnerPortalManager(authResult.auth.requester)) return fail(403, 'FORBIDDEN', '콘텐츠 관리 권한이 없습니다.');
        const { searchParams } = new URL(request.url);
        const companyScope = await resolveOwnerPortalCompanyScope(
            authResult.auth,
            searchParams.get('companyId'),
            searchParams.get('company')
        );
        if (!companyScope.ok) return companyScope.response;

        const contentId = searchParams.get('contentId')?.trim() || searchParams.get('id')?.trim() || '';
        const contentType = searchParams.get('contentType')?.trim() || '';
        const locationId = searchParams.get('locationId')?.trim() || '';
        const status = searchParams.get('status')?.trim() || '';
        let query = authResult.auth.supabaseAdmin
            .from('franchise_owner_content_items')
            .select(CONTENT_SELECT)
            .eq('company_id', companyScope.scope.companyId)
            .order('updated_at', { ascending: false })
            .limit(200);
        if (contentId) query = query.eq('id', contentId);
        if (contentType) query = query.eq('content_type', contentType);
        if (locationId === 'global') query = query.is('location_id', null);
        else if (locationId) query = query.eq('location_id', locationId);
        if (status) query = query.eq('status', status);
        const contentResult = await query.returns<OwnerContentItemRow[]>();
        if (contentResult.error) throw contentResult.error;
        const items = contentResult.data || [];

        const contentIds = items.map(item => item.id);
        let attachments: readonly OwnerContentAttachmentRow[] = [];
        let targetAccounts: readonly OwnerContentReceiptTargetAccount[] = [];
        let receipts: readonly OwnerContentReceiptRow[] = [];
        if (contentIds.length > 0) {
            const attachmentResult = await authResult.auth.supabaseAdmin
                .from('franchise_owner_content_attachments')
                .select(ATTACHMENT_SELECT)
                .eq('company_id', companyScope.scope.companyId)
                .in('content_id', contentIds)
                .order('created_at', { ascending: true })
                .returns<OwnerContentAttachmentRow[]>();
            if (attachmentResult.error) throw attachmentResult.error;
            attachments = attachmentResult.data || [];

            if (items.some(item => item.requires_acknowledgement)) {
                const accountResult = await authResult.auth.supabaseAdmin
                    .from('franchise_owner_accounts')
                    .select('id, company_id, location_id, status')
                    .eq('company_id', companyScope.scope.companyId)
                    .eq('status', 'active')
                    .returns<OwnerContentReceiptTargetAccount[]>();
                if (accountResult.error) throw accountResult.error;
                targetAccounts = accountResult.data || [];

                const targetAccountIds = targetAccounts.map(account => account.id);
                if (targetAccountIds.length > 0) {
                    const receiptResult = await authResult.auth.supabaseAdmin
                        .from('franchise_owner_content_receipts')
                        .select(OWNER_CONTENT_RECEIPT_SELECT)
                        .eq('company_id', companyScope.scope.companyId)
                        .in('content_id', contentIds)
                        .in('owner_account_id', targetAccountIds)
                        .returns<OwnerContentReceiptRow[]>();
                    if (receiptResult.error) throw receiptResult.error;
                    receipts = receiptResult.data || [];
                }
            }
        }
        const receiptStatsByContentId = new Map<string, OwnerContentReceiptStats>();
        for (const item of items) {
            if (!item.requires_acknowledgement) {
                receiptStatsByContentId.set(item.id, EMPTY_RECEIPT_STATS);
                continue;
            }
            const targetIds = targetOwnerAccountIdsForContent(item, companyScope.scope.companyId, targetAccounts);
            receiptStatsByContentId.set(item.id, summarizeOwnerContentReceiptStats(item.id, item.version, targetIds, receipts));
        }
        return ok({
            items: items.map(item => ({
                ...item,
                attachments: attachments.filter(attachment => attachment.content_id === item.id),
                receiptStats: receiptStatsByContentId.get(item.id) || EMPTY_RECEIPT_STATS
            }))
        });
    } catch (error) {
        if (isMissingOwnerContentSchemaError(error)) return fail(424, 'VALIDATION_ERROR', OWNER_CONTENT_SCHEMA_MESSAGE);
        if (error instanceof Error) console.error('Staff content GET failed', error);
        else console.error('Staff content GET failed with an unknown error');
        return fail(500, 'INTERNAL_ERROR', '콘텐츠 목록을 불러오지 못했습니다.');
    }
}

export async function POST(request: Request) {
    try {
        const authResult = await resolveOwnerPortalStaffAuth(request);
        if (!authResult.ok) return authResult.response;
        if (!isOwnerPortalManager(authResult.auth.requester)) return fail(403, 'FORBIDDEN', '콘텐츠 등록 권한이 없습니다.');
        const body: unknown = await request.json();
        const parsed = parseOwnerContentCreate(body);
        if (!parsed.ok) return fail(400, 'VALIDATION_ERROR', parsed.message);
        const companyScope = await resolveOwnerPortalCompanyScope(
            authResult.auth,
            readBodyText(body, 'companyId'),
            readBodyText(body, 'companyName')
        );
        if (!companyScope.ok) return companyScope.response;
        if (parsed.input.locationId) {
            const locationResult = await fetchOwnerPortalLocation(
                authResult.auth.supabaseAdmin,
                companyScope.scope.companyId,
                parsed.input.locationId
            );
            if (!locationResult.ok) return locationResult.response;
        }

        const { data, error } = await authResult.auth.supabaseAdmin
            .from('franchise_owner_content_items')
            .insert({
                body: parsed.input.body,
                category: parsed.input.category,
                company_id: companyScope.scope.companyId,
                content_type: parsed.input.contentType,
                created_by: authResult.auth.requester.id,
                due_at: parsed.input.dueAt,
                location_id: parsed.input.locationId,
                requires_acknowledgement: parsed.input.requiresAcknowledgement,
                status: 'draft',
                summary: parsed.input.summary,
                title: parsed.input.title,
                updated_by: authResult.auth.requester.id
            })
            .select(CONTENT_SELECT)
            .single<OwnerContentItemRow>();
        if (error) throw error;
        return ok({ item: data }, 201);
    } catch (error) {
        if (isMissingOwnerContentSchemaError(error)) return fail(424, 'VALIDATION_ERROR', OWNER_CONTENT_SCHEMA_MESSAGE);
        if (error instanceof SyntaxError) return fail(400, 'VALIDATION_ERROR', '콘텐츠 내용을 확인해주세요.');
        if (error instanceof Error) console.error('Staff content POST failed', error);
        else console.error('Staff content POST failed with an unknown error');
        return fail(500, 'INTERNAL_ERROR', '콘텐츠를 등록하지 못했습니다.');
    }
}

export async function PATCH(request: Request) {
    try {
        const authResult = await resolveOwnerPortalStaffAuth(request);
        if (!authResult.ok) return authResult.response;
        if (!isOwnerPortalManager(authResult.auth.requester)) return fail(403, 'FORBIDDEN', '콘텐츠 상태 변경 권한이 없습니다.');
        const body: unknown = await request.json();
        const contentId = readBodyText(body, 'contentId') || readBodyText(body, 'id');
        const action = parseOwnerContentAction(body);
        if (!contentId || !action) return fail(400, 'VALIDATION_ERROR', '자료와 처리 동작을 다시 확인해주세요.');
        const companyScope = await resolveOwnerPortalCompanyScope(
            authResult.auth,
            readBodyText(body, 'companyId'),
            readBodyText(body, 'companyName')
        );
        if (!companyScope.ok) return companyScope.response;

        const existingResult = await authResult.auth.supabaseAdmin
            .from('franchise_owner_content_items')
            .select(CONTENT_SELECT)
            .eq('id', contentId)
            .eq('company_id', companyScope.scope.companyId)
            .maybeSingle<OwnerContentItemRow>();
        if (existingResult.error) throw existingResult.error;
        if (!existingResult.data) return fail(404, 'NOT_FOUND', '콘텐츠를 찾을 수 없습니다.');
        if (action === 'update') {
            if (existingResult.data.status === 'archived') return fail(409, 'CONFLICT', '보관한 자료는 수정할 수 없습니다.');
            const parsed = parseOwnerContentCreate(body);
            if (!parsed.ok) return fail(400, 'VALIDATION_ERROR', parsed.message);
            if (parsed.input.locationId) {
                const locationResult = await fetchOwnerPortalLocation(
                    authResult.auth.supabaseAdmin,
                    companyScope.scope.companyId,
                    parsed.input.locationId
                );
                if (!locationResult.ok) return locationResult.response;
            }
            const now = new Date().toISOString();
            const nextVersion = existingResult.data.status === 'published'
                ? existingResult.data.version + 1
                : existingResult.data.version;
            const updateResult = await authResult.auth.supabaseAdmin
                .from('franchise_owner_content_items')
                .update({
                    body: parsed.input.body,
                    category: parsed.input.category,
                    content_type: parsed.input.contentType,
                    due_at: parsed.input.dueAt,
                    location_id: parsed.input.locationId,
                    published_at: existingResult.data.status === 'published' ? now : existingResult.data.published_at,
                    requires_acknowledgement: parsed.input.requiresAcknowledgement,
                    summary: parsed.input.summary,
                    title: parsed.input.title,
                    updated_at: now,
                    updated_by: authResult.auth.requester.id,
                    version: nextVersion
                })
                .eq('id', existingResult.data.id)
                .eq('company_id', companyScope.scope.companyId)
                .eq('status', existingResult.data.status)
                .eq('version', existingResult.data.version)
                .select(CONTENT_SELECT)
                .maybeSingle<OwnerContentItemRow>();
            if (updateResult.error) throw updateResult.error;
            if (!updateResult.data) return fail(409, 'CONFLICT', '다른 사용자가 자료를 수정했습니다. 새로고침 후 다시 시도해주세요.');
            return ok({ item: updateResult.data });
        }
        const nextStatus = action === 'publish' ? 'published' : 'archived';
        if (existingResult.data.status === nextStatus) return fail(409, 'CONFLICT', '콘텐츠가 이미 해당 상태입니다.');
        const now = new Date().toISOString();
        const { data, error } = await authResult.auth.supabaseAdmin
            .from('franchise_owner_content_items')
            .update({
                published_at: action === 'publish' ? now : existingResult.data.published_at,
                status: nextStatus,
                updated_at: now,
                updated_by: authResult.auth.requester.id
            })
            .eq('id', existingResult.data.id)
            .eq('company_id', companyScope.scope.companyId)
            .eq('status', existingResult.data.status)
            .select(CONTENT_SELECT)
            .maybeSingle<OwnerContentItemRow>();
        if (error) throw error;
        if (!data) return fail(409, 'CONFLICT', '콘텐츠 상태가 변경되었습니다.');
        return ok({ item: data });
    } catch (error) {
        if (isMissingOwnerContentSchemaError(error)) return fail(424, 'VALIDATION_ERROR', OWNER_CONTENT_SCHEMA_MESSAGE);
        if (error instanceof SyntaxError) return fail(400, 'VALIDATION_ERROR', '콘텐츠 상태 변경 내용을 확인해주세요.');
        if (error instanceof Error) console.error('Staff content PATCH failed', error);
        else console.error('Staff content PATCH failed with an unknown error');
        return fail(500, 'INTERNAL_ERROR', '콘텐츠 상태를 변경하지 못했습니다.');
    }
}
