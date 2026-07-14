import { fail, ok } from '@/lib/api-response';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import {
    isAcceptedOwnerNoticeAttachmentBytes,
    isAcceptedOwnerNoticeAttachmentFileName,
    isAcceptedOwnerNoticeAttachmentMime,
    OWNER_NOTICE_ATTACHMENT_POLICY
} from '@/lib/franchise-owner-portal';
import { resolveApprovalContext } from '../../../_shared/access';
import { parseRequiredUuid } from '../../../_shared/boundary';
import {
    DOCUMENT_SELECT,
    isApprovalRetentionExpired,
    type ApprovalDocumentRow
} from '../../../_shared/documents';
import { canDownloadApprovalDocument } from '../../../_shared/download-access';
import { approvalErrorResponse, throwDatabaseError } from '../../../_shared/errors';
import { requireVisibleApprovalDocument } from '../../../_shared/visibility';

export const dynamic = 'force-dynamic';

const APPROVAL_ATTACHMENT_BUCKET = 'approval-documents';
const APPROVAL_ATTACHMENT_PREFIX = 'approval-documents';
const SIGNED_URL_TTL_SECONDS = 60 * 5;
type RouteContext = { readonly params: Promise<{ readonly id: string }> };

type ApprovalAttachmentRow = {
    readonly id: string;
    readonly company_id: string;
    readonly document_id: string;
    readonly file_name: string;
    readonly storage_bucket: string;
    readonly storage_path: string;
    readonly mime_type: string;
    readonly size_bytes: number;
};

function safeFileName(name: string): string {
    const dot = name.lastIndexOf('.');
    const base = (dot > 0 ? name.slice(0, dot) : name)
        .normalize('NFKD').replace(/[^0-9A-Za-z._-]+/g, '-').replace(/-+/g, '-')
        .replace(/^[-.]+|[-.]+$/g, '').slice(0, 80) || 'attachment';
    const extension = (dot > 0 ? name.slice(dot + 1) : '')
        .normalize('NFKD').replace(/[^0-9A-Za-z]+/g, '').slice(0, 12).toLowerCase();
    return extension ? `${base}.${extension}` : base;
}

async function documentRow(
    context: Awaited<ReturnType<typeof resolveApprovalContext>>,
    id: string
): Promise<ApprovalDocumentRow | null> {
    const { data, error } = await context.supabase.from('approval_documents').select(DOCUMENT_SELECT)
        .eq('id', id).eq('company_id', context.companyId).maybeSingle<ApprovalDocumentRow>();
    throwDatabaseError(error);
    return data;
}

export async function POST(request: Request, routeContext: RouteContext) {
    let uploadedPath = '';
    try {
        const context = await resolveApprovalContext(request);
        const documentId = parseRequiredUuid((await routeContext.params).id, 'id');
        const document = await documentRow(context, documentId);
        if (!document || document.author_profile_id !== context.requester.id) {
            return fail(404, 'NOT_FOUND', 'Approval document not found');
        }
        if (!['임시저장', '반려', '회수'].includes(document.status)) {
            return fail(409, 'CONFLICT', 'Submitted approval documents cannot receive attachments');
        }
        const { count, error: countError } = await context.supabase.from('approval_attachments')
            .select('id', { count: 'exact', head: true }).eq('document_id', documentId).eq('company_id', context.companyId);
        throwDatabaseError(countError);
        if ((count || 0) >= OWNER_NOTICE_ATTACHMENT_POLICY.maxFiles) {
            return fail(400, 'VALIDATION_ERROR', `첨부 파일은 최대 ${OWNER_NOTICE_ATTACHMENT_POLICY.maxFiles}개까지 등록할 수 있습니다.`);
        }
        const form = await request.formData();
        const file = form.get('file');
        if (!(file instanceof File)) return fail(400, 'VALIDATION_ERROR', '업로드할 파일을 선택해 주세요.');
        if (!isAcceptedOwnerNoticeAttachmentFileName(file.name) || file.size <= 0 || file.size > OWNER_NOTICE_ATTACHMENT_POLICY.maxFileSizeBytes) {
            return fail(400, 'VALIDATION_ERROR', '이미지, PDF, 문서 파일을 10MB 이하로 첨부해 주세요.');
        }
        const contentType = file.type.trim() || 'application/octet-stream';
        if (!isAcceptedOwnerNoticeAttachmentMime(file.name, contentType)
            || !isAcceptedOwnerNoticeAttachmentBytes(file.name, new Uint8Array(await file.slice(0, 16).arrayBuffer()))) {
            return fail(400, 'VALIDATION_ERROR', '파일 형식과 내용을 확인할 수 없습니다.');
        }
        uploadedPath = `${APPROVAL_ATTACHMENT_PREFIX}/${context.companyId}/${documentId}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
        const storage = getSupabaseAdmin().storage.from(APPROVAL_ATTACHMENT_BUCKET);
        const { error: uploadError } = await storage
            .upload(uploadedPath, file, { contentType, upsert: false });
        throwDatabaseError(uploadError);
        const { data: attachmentId, error } = await context.supabase.rpc('create_approval_attachment', {
            p_actor_profile_id: context.requester.id,
            p_company_id: context.companyId,
            p_document_id: documentId,
            p_file_name: file.name,
            p_mime_type: contentType,
            p_size_bytes: file.size,
            p_storage_bucket: APPROVAL_ATTACHMENT_BUCKET,
            p_storage_path: uploadedPath
        });
        if (error) {
            await storage.remove([uploadedPath]);
            throwDatabaseError(error);
        }
        return ok({ attachment: { id: attachmentId, file_name: file.name, mime_type: contentType, size_bytes: file.size } }, 201);
    } catch (error) {
        return approvalErrorResponse(error, 'Failed to upload approval attachment');
    }
}

export async function GET(request: Request, routeContext: RouteContext) {
    try {
        const context = await resolveApprovalContext(request);
        const documentId = parseRequiredUuid((await routeContext.params).id, 'id');
        const attachmentId = parseRequiredUuid(new URL(request.url).searchParams.get('attachmentId'), 'attachmentId');
        const document = await requireVisibleApprovalDocument(context, await documentRow(context, documentId));
        if (!document) return fail(404, 'NOT_FOUND', 'Approval document not found');
        if (isApprovalRetentionExpired(document.retention_until)) {
            return fail(403, 'FORBIDDEN', '보존 기간이 만료된 문서는 다운로드할 수 없습니다.');
        }
        if (!await canDownloadApprovalDocument(context, document)) return fail(403, 'FORBIDDEN', '첨부 파일 다운로드 권한이 없습니다.');
        const { data, error } = await context.supabase.from('approval_attachments')
            .select('id, company_id, document_id, file_name, storage_bucket, storage_path, mime_type, size_bytes')
            .eq('id', attachmentId).eq('document_id', documentId).eq('company_id', context.companyId)
            .maybeSingle<ApprovalAttachmentRow>();
        throwDatabaseError(error);
        if (!data) return fail(404, 'NOT_FOUND', '첨부 파일을 찾을 수 없습니다.');
        const { data: signed, error: signedError } = await getSupabaseAdmin().storage.from(data.storage_bucket)
            .createSignedUrl(data.storage_path, SIGNED_URL_TTL_SECONDS, { download: data.file_name });
        throwDatabaseError(signedError);
        if (!signed?.signedUrl) return fail(500, 'INTERNAL_ERROR', '첨부 파일 URL을 만들지 못했습니다.');
        return Response.redirect(signed.signedUrl, 302);
    } catch (error) {
        return approvalErrorResponse(error, 'Failed to download approval attachment');
    }
}

export async function DELETE(request: Request, routeContext: RouteContext) {
    try {
        const context = await resolveApprovalContext(request);
        const documentId = parseRequiredUuid((await routeContext.params).id, 'id');
        const attachmentId = parseRequiredUuid(new URL(request.url).searchParams.get('attachmentId'), 'attachmentId');
        const document = await documentRow(context, documentId);
        if (!document || document.author_profile_id !== context.requester.id) {
            return fail(404, 'NOT_FOUND', 'Approval document not found');
        }
        if (!['임시저장', '반려', '회수'].includes(document.status)) {
            return fail(409, 'CONFLICT', 'Submitted approval document attachments cannot be deleted');
        }
        const { data, error } = await context.supabase.from('approval_attachments')
            .select('id, company_id, document_id, file_name, storage_bucket, storage_path, mime_type, size_bytes')
            .eq('id', attachmentId).eq('document_id', documentId).eq('company_id', context.companyId)
            .maybeSingle<ApprovalAttachmentRow>();
        throwDatabaseError(error);
        if (!data) return fail(404, 'NOT_FOUND', '첨부 파일을 찾을 수 없습니다.');
        const { error: deleteError } = await context.supabase.from('approval_attachments').delete()
            .eq('id', attachmentId).eq('document_id', documentId).eq('company_id', context.companyId);
        throwDatabaseError(deleteError);
        const { error: storageError } = await getSupabaseAdmin().storage.from(data.storage_bucket).remove([data.storage_path]);
        if (storageError) console.error('Approval attachment orphan cleanup failed:', storageError);
        return ok({ success: true });
    } catch (error) {
        return approvalErrorResponse(error, 'Failed to delete approval attachment');
    }
}
