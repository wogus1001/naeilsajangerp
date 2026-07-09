import { fail, ok } from '@/lib/api-response';
import {
    cleanOwnerText,
    isAcceptedOwnerNoticeAttachmentFileName,
    OWNER_NOTICE_ATTACHMENT_POLICY,
    type OwnerNoticeAttachment
} from '@/lib/franchise-owner-portal';
import {
    isMissingOwnerPortalSchemaError,
    isMissingOwnerNoticeAttachmentsColumnError,
    isOwnerPortalManager,
    resolveOwnerPortalCompanyScope,
    resolveOwnerPortalStaffAuth
} from '@/lib/franchise-owner-portal-api';

export const dynamic = 'force-dynamic';

const NOTICE_ATTACHMENT_BUCKET = 'property-documents';
const NOTICE_ATTACHMENT_PREFIX = 'franchise-owner-notices';

function buildSafeFileName(name: string): string {
    const trimmed = name.trim();
    const dotIndex = trimmed.lastIndexOf('.');
    const rawBase = dotIndex > 0 ? trimmed.slice(0, dotIndex) : trimmed;
    const rawExtension = dotIndex > 0 ? trimmed.slice(dotIndex + 1) : '';
    const base = rawBase
        .normalize('NFKD')
        .replace(/[^0-9A-Za-z._-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^[-.]+|[-.]+$/g, '')
        .slice(0, 80) || 'notice-file';
    const extension = rawExtension
        .normalize('NFKD')
        .replace(/[^0-9A-Za-z]+/g, '')
        .slice(0, 12)
        .toLowerCase();
    return extension ? `${base}.${extension}` : base;
}

function getNoticeUploadContentType(file: File): string {
    return cleanOwnerText(file.type) || 'application/octet-stream';
}

export async function GET(request: Request) {
    try {
        const authResult = await resolveOwnerPortalStaffAuth(request);
        if (!authResult.ok) return authResult.response;
        const { searchParams } = new URL(request.url);
        const companyScope = await resolveOwnerPortalCompanyScope(authResult.auth, searchParams.get('companyId'), searchParams.get('company'));
        if (!companyScope.ok) return companyScope.response;
        const submissionId = searchParams.get('submissionId') || '';
        let query = authResult.auth.supabaseAdmin
            .from('franchise_owner_files')
            .select('id, submission_id, file_name, mime_type, file_size, storage_bucket, storage_path, public_url, created_at')
            .eq('company_id', companyScope.scope.companyId)
            .order('created_at', { ascending: false })
            .limit(80);
        if (submissionId) query = query.eq('submission_id', submissionId);
        const { data, error } = await query;
        if (error) throw error;
        return ok({ files: data || [] });
    } catch (error) {
        if (isMissingOwnerPortalSchemaError(error)) return ok({ files: [], schemaReady: false });
        console.error('Owner portal files GET error:', error);
        return fail(500, 'INTERNAL_ERROR', '점주 업로드 파일을 불러오지 못했습니다.');
    }
}

export async function POST(request: Request) {
    try {
        const authResult = await resolveOwnerPortalStaffAuth(request);
        if (!authResult.ok) return authResult.response;
        if (!isOwnerPortalManager(authResult.auth.requester)) return fail(403, 'FORBIDDEN', '공지 첨부 업로드 권한이 없습니다.');

        const form = await request.formData();
        const file = form.get('file');
        if (!(file instanceof File)) return fail(400, 'VALIDATION_ERROR', '업로드할 첨부 파일을 선택해주세요.');
        if (!isAcceptedOwnerNoticeAttachmentFileName(file.name)) {
            return fail(400, 'VALIDATION_ERROR', '이미지, PDF, 문서 파일만 첨부할 수 있습니다.');
        }
        if (file.size > OWNER_NOTICE_ATTACHMENT_POLICY.maxFileSizeBytes) {
            return fail(400, 'VALIDATION_ERROR', '첨부 파일은 10MB 이하로 업로드해주세요.');
        }

        const companyScope = await resolveOwnerPortalCompanyScope(
            authResult.auth,
            cleanOwnerText(form.get('companyId')),
            cleanOwnerText(form.get('companyName'))
        );
        if (!companyScope.ok) return companyScope.response;

        const { error: attachmentSchemaError } = await authResult.auth.supabaseAdmin
            .from('franchise_owner_notices')
            .select('attachments')
            .eq('company_id', companyScope.scope.companyId)
            .limit(1);
        if (attachmentSchemaError) {
            if (isMissingOwnerNoticeAttachmentsColumnError(attachmentSchemaError)) {
                return fail(424, 'VALIDATION_ERROR', '공지 첨부 SQL이 아직 적용되지 않았습니다. supabase_franchise_owner_notice_attachments_migration.sql을 등록해주세요.');
            }
            throw attachmentSchemaError;
        }

        const storagePath = [
            NOTICE_ATTACHMENT_PREFIX,
            companyScope.scope.companyId,
            `${Date.now()}-${crypto.randomUUID()}-${buildSafeFileName(file.name)}`
        ].join('/');
        const contentType = getNoticeUploadContentType(file);
        const { error: uploadError } = await authResult.auth.supabaseAdmin.storage
            .from(NOTICE_ATTACHMENT_BUCKET)
            .upload(storagePath, file, { contentType, upsert: false });
        if (uploadError) throw uploadError;

        const { data: publicData } = authResult.auth.supabaseAdmin.storage
            .from(NOTICE_ATTACHMENT_BUCKET)
            .getPublicUrl(storagePath);
        const attachment: OwnerNoticeAttachment = {
            name: file.name,
            mimeType: contentType,
            size: file.size,
            storageBucket: NOTICE_ATTACHMENT_BUCKET,
            storagePath,
            publicUrl: publicData.publicUrl
        };

        return ok({ attachment }, 201);
    } catch (error) {
        if (isMissingOwnerPortalSchemaError(error)) return fail(424, 'VALIDATION_ERROR', '점주 포털 SQL이 아직 적용되지 않았습니다.');
        console.error('Owner portal notice file POST error:', error);
        return fail(500, 'INTERNAL_ERROR', '공지 첨부 파일을 업로드하지 못했습니다.');
    }
}
