import { fail } from '@/lib/api-response';
import { getOwnerSessionContext } from '@/lib/franchise-owner-auth';
import {
    cleanOwnerText,
    isOwnerNoticeAttachmentStoragePath,
    normalizeOwnerNoticeAttachments,
    OWNER_NOTICE_ATTACHMENT_STORAGE,
    type OwnerNoticeRow
} from '@/lib/franchise-owner-portal';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const OWNER_NOTICE_ATTACHMENT_SIGNED_URL_TTL_SECONDS = 60 * 5;

function noticeIncludesAttachment(notice: OwnerNoticeRow, storagePath: string): boolean {
    return normalizeOwnerNoticeAttachments(notice.attachments)
        .some(attachment => attachment.storagePath === storagePath);
}

export async function GET(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const context = await getOwnerSessionContext(supabaseAdmin);
        if (!context) return fail(401, 'AUTH_REQUIRED', '점주 로그인이 필요합니다.');

        const storagePath = cleanOwnerText(new URL(request.url).searchParams.get('storagePath'));
        if (!isOwnerNoticeAttachmentStoragePath(context.account.company_id, OWNER_NOTICE_ATTACHMENT_STORAGE.bucket, storagePath)) {
            return fail(404, 'NOT_FOUND', '첨부 파일을 찾을 수 없습니다.');
        }

        const { data: notices, error } = await supabaseAdmin
            .from('franchise_owner_notices')
            .select('id, company_id, location_id, title, body, status, created_at, attachments')
            .eq('company_id', context.account.company_id)
            .eq('status', 'published')
            .or(`location_id.is.null,location_id.eq.${context.account.location_id}`)
            .contains('attachments', [{ storagePath }])
            .limit(1)
            .returns<OwnerNoticeRow[]>();
        if (error) throw error;
        const notice = (notices || []).find(row => noticeIncludesAttachment(row, storagePath));
        if (!notice) return fail(404, 'NOT_FOUND', '첨부 파일을 찾을 수 없습니다.');

        const { data: signed, error: signedError } = await supabaseAdmin.storage
            .from(OWNER_NOTICE_ATTACHMENT_STORAGE.bucket)
            .createSignedUrl(storagePath, OWNER_NOTICE_ATTACHMENT_SIGNED_URL_TTL_SECONDS);
        if (signedError || !signed?.signedUrl) throw signedError || new Error('Failed to sign owner notice attachment URL');

        return Response.redirect(signed.signedUrl, 302);
    } catch (error) {
        console.error('Owner notice attachment download error:', error);
        return fail(500, 'INTERNAL_ERROR', '공지 첨부 파일을 열지 못했습니다.');
    }
}
