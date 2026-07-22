import { fail } from '@/lib/api-response';
import {
    canOwnerReadContent,
    isMissingOwnerContentSchemaError,
    isOwnerContentStoragePath,
    OWNER_CONTENT_SCHEMA_MESSAGE,
    OWNER_CONTENT_STORAGE,
    type OwnerContentAttachmentRow,
    type OwnerContentItemRow
} from '@/lib/franchise-owner-content';
import { getOwnerSessionContext } from '@/lib/franchise-owner-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const ATTACHMENT_SELECT = 'id, content_id, company_id, file_name, mime_type, file_size, storage_bucket, storage_path, created_by, created_at';

export async function GET(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const context = await getOwnerSessionContext(supabaseAdmin);
        if (!context) return fail(401, 'AUTH_REQUIRED', '점주 로그인이 필요합니다.');
        const { searchParams } = new URL(request.url);
        const attachmentId = searchParams.get('attachmentId')?.trim() || searchParams.get('fileId')?.trim() || '';
        const storagePath = searchParams.get('storagePath')?.trim() || '';
        if (!attachmentId && !storagePath) return fail(400, 'VALIDATION_ERROR', '다운로드할 파일을 선택해주세요.');

        let attachmentQuery = supabaseAdmin
            .from('franchise_owner_content_attachments')
            .select(ATTACHMENT_SELECT)
            .eq('company_id', context.account.company_id);
        attachmentQuery = attachmentId
            ? attachmentQuery.eq('id', attachmentId)
            : attachmentQuery.eq('storage_path', storagePath);
        const attachmentResult = await attachmentQuery.maybeSingle<OwnerContentAttachmentRow>();
        if (attachmentResult.error) throw attachmentResult.error;
        if (!attachmentResult.data) return fail(404, 'NOT_FOUND', '첨부 파일을 찾을 수 없습니다.');

        const contentResult = await supabaseAdmin
            .from('franchise_owner_content_items')
            .select('id, company_id, location_id, status')
            .eq('id', attachmentResult.data.content_id)
            .eq('company_id', context.account.company_id)
            .eq('status', 'published')
            .maybeSingle<Pick<OwnerContentItemRow, 'id' | 'company_id' | 'location_id' | 'status'>>();
        if (contentResult.error) throw contentResult.error;
        const content = contentResult.data;
        if (!content || !canOwnerReadContent(content, context.account.company_id, context.location.id)) {
            return fail(404, 'NOT_FOUND', '첨부 파일을 찾을 수 없습니다.');
        }
        if (!isOwnerContentStoragePath({
            companyId: content.company_id,
            contentId: content.id,
            locationId: content.location_id,
            storageBucket: attachmentResult.data.storage_bucket,
            storagePath: attachmentResult.data.storage_path
        })) {
            return fail(404, 'NOT_FOUND', '첨부 파일을 찾을 수 없습니다.');
        }

        const signedResult = await supabaseAdmin.storage
            .from(OWNER_CONTENT_STORAGE.bucket)
            .createSignedUrl(attachmentResult.data.storage_path, OWNER_CONTENT_STORAGE.signedUrlTtlSeconds);
        if (signedResult.error || !signedResult.data?.signedUrl) {
            throw signedResult.error || new Error('Owner content attachment signed URL was not returned');
        }
        return Response.redirect(signedResult.data.signedUrl, 302);
    } catch (error) {
        if (isMissingOwnerContentSchemaError(error)) {
            return fail(424, 'VALIDATION_ERROR', OWNER_CONTENT_SCHEMA_MESSAGE);
        }
        if (error instanceof Error) console.error('Owner content attachment GET failed', error);
        else console.error('Owner content attachment GET failed with an unknown error');
        return fail(500, 'INTERNAL_ERROR', '첨부 파일을 열지 못했습니다.');
    }
}
