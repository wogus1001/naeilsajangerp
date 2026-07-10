import { fail, ok } from '@/lib/api-response';
import {
    cleanOwnerText,
    isOwnerNoticeAttachmentStoragePath,
    normalizeOwnerNoticeAttachments,
    OWNER_NOTICE_ATTACHMENT_STORAGE,
    type OwnerNoticeRow
} from '@/lib/franchise-owner-portal';
import {
    isMissingOwnerPortalSchemaError,
    isOwnerPortalManager,
    resolveOwnerPortalCompanyScope,
    resolveOwnerPortalStaffAuth
} from '@/lib/franchise-owner-portal-api';

export const dynamic = 'force-dynamic';

const OWNER_PORTAL_NOTICE_ATTACHMENT_SIGNED_URL_TTL_SECONDS = 60 * 5;

function noticeIncludesAttachment(notice: OwnerNoticeRow, storagePath: string): boolean {
    return normalizeOwnerNoticeAttachments(notice.attachments)
        .some(attachment => attachment.storagePath === storagePath);
}

export async function GET(request: Request) {
    try {
        const authResult = await resolveOwnerPortalStaffAuth(request);
        if (!authResult.ok) return authResult.response;
        if (!isOwnerPortalManager(authResult.auth.requester)) return fail(403, 'FORBIDDEN', '공지 첨부 열람 권한이 없습니다.');

        const { searchParams } = new URL(request.url);
        const companyScope = await resolveOwnerPortalCompanyScope(authResult.auth, searchParams.get('companyId'), searchParams.get('company'));
        if (!companyScope.ok) return companyScope.response;

        const storagePath = cleanOwnerText(searchParams.get('storagePath'));
        if (!isOwnerNoticeAttachmentStoragePath(companyScope.scope.companyId, OWNER_NOTICE_ATTACHMENT_STORAGE.bucket, storagePath)) {
            return fail(404, 'NOT_FOUND', '첨부 파일을 찾을 수 없습니다.');
        }

        const { data: notices, error } = await authResult.auth.supabaseAdmin
            .from('franchise_owner_notices')
            .select('id, company_id, location_id, title, body, status, created_at, attachments')
            .eq('company_id', companyScope.scope.companyId)
            .contains('attachments', [{ storagePath }])
            .limit(1)
            .returns<OwnerNoticeRow[]>();
        if (error) throw error;
        const notice = (notices || []).find(row => noticeIncludesAttachment(row, storagePath));
        if (!notice) return fail(404, 'NOT_FOUND', '첨부 파일을 찾을 수 없습니다.');

        const { data: signed, error: signedError } = await authResult.auth.supabaseAdmin.storage
            .from(OWNER_NOTICE_ATTACHMENT_STORAGE.bucket)
            .createSignedUrl(storagePath, OWNER_PORTAL_NOTICE_ATTACHMENT_SIGNED_URL_TTL_SECONDS);
        if (signedError || !signed?.signedUrl) throw signedError || new Error('Failed to sign owner portal notice attachment URL');

        return ok({ url: signed.signedUrl });
    } catch (error) {
        if (isMissingOwnerPortalSchemaError(error)) return fail(424, 'VALIDATION_ERROR', '점주 포털 SQL이 아직 적용되지 않았습니다.');
        console.error('Owner portal notice attachment GET error:', error);
        return fail(500, 'INTERNAL_ERROR', '공지 첨부 파일을 열지 못했습니다.');
    }
}
