import { fail, ok } from '@/lib/api-response';
import { OWNER_PHASE3_STORAGE } from '@/lib/franchise-owner-phase3';
import { isOwnerPortalManager, resolveOwnerPortalCompanyScope, resolveOwnerPortalStaffAuth } from '@/lib/franchise-owner-portal-api';
import {
    isMissingOwnerSettlementSchemaError,
    isOwnerSettlementFileStoragePath,
    OWNER_SETTLEMENT_SCHEMA_MESSAGE,
    type OwnerSettlementFileRow,
    type OwnerSettlementSubmissionRow
} from '@/lib/franchise-owner-settlements';

export const dynamic = 'force-dynamic';

const FILE_SELECT = 'id, submission_id, company_id, location_id, owner_account_id, client_file_id, file_name, mime_type, file_size, content_sha256, storage_bucket, storage_path, upload_state, deletion_state, deleted_at, created_at';
const SUBMISSION_SELECT = 'id, request_id, company_id, location_id, owner_account_id, status, total_amount, note, review_note, submitted_at, reviewed_by, reviewed_at, created_at, updated_at';

export async function GET(request: Request) {
    try {
        const authResult = await resolveOwnerPortalStaffAuth(request);
        if (!authResult.ok) return authResult.response;
        if (!isOwnerPortalManager(authResult.auth.requester)) {
            return fail(403, 'FORBIDDEN', '정산 파일을 열람할 권한이 없습니다.');
        }
        const { searchParams } = new URL(request.url);
        const companyScope = await resolveOwnerPortalCompanyScope(
            authResult.auth,
            searchParams.get('companyId'),
            searchParams.get('company')
        );
        if (!companyScope.ok) return companyScope.response;
        const fileId = searchParams.get('fileId')?.trim() || '';
        const storagePath = searchParams.get('storagePath')?.trim() || '';
        if (!fileId && !storagePath) return fail(400, 'VALIDATION_ERROR', '다운로드할 파일을 선택해주세요.');

        let query = authResult.auth.supabaseAdmin
            .from('franchise_owner_settlement_files')
            .select(FILE_SELECT)
            .eq('company_id', companyScope.scope.companyId)
            .eq('upload_state', 'active')
            .eq('deletion_state', 'active');
        query = fileId ? query.eq('id', fileId) : query.eq('storage_path', storagePath);
        const { data: file, error } = await query.maybeSingle<OwnerSettlementFileRow>();
        if (error) throw error;
        if (!file || !isOwnerSettlementFileStoragePath({
            companyId: file.company_id,
            locationId: file.location_id,
            storageBucket: file.storage_bucket,
            storagePath: file.storage_path,
            submissionId: file.submission_id
        })) return fail(404, 'NOT_FOUND', '정산 파일을 찾을 수 없습니다.');

        const { data: submission, error: submissionError } = await authResult.auth.supabaseAdmin
            .from('franchise_owner_settlement_submissions')
            .select(SUBMISSION_SELECT)
            .eq('id', file.submission_id)
            .eq('company_id', file.company_id)
            .eq('location_id', file.location_id)
            .eq('owner_account_id', file.owner_account_id)
            .maybeSingle<OwnerSettlementSubmissionRow>();
        if (submissionError) throw submissionError;
        if (!submission) return fail(404, 'NOT_FOUND', '정산 파일을 찾을 수 없습니다.');

        const { data: signed, error: signedError } = await authResult.auth.supabaseAdmin.storage
            .from(OWNER_PHASE3_STORAGE.bucket)
            .createSignedUrl(file.storage_path, OWNER_PHASE3_STORAGE.signedUrlTtlSeconds, { download: file.file_name });
        if (signedError) throw signedError;
        if (!signed?.signedUrl) return fail(500, 'INTERNAL_ERROR', '정산 파일 URL을 만들지 못했습니다.');
        return ok({ url: signed.signedUrl });
    } catch (error) {
        if (isMissingOwnerSettlementSchemaError(error)) {
            return fail(424, 'VALIDATION_ERROR', OWNER_SETTLEMENT_SCHEMA_MESSAGE);
        }
        if (error instanceof Error) console.error('Staff settlement file download failed', error);
        else console.error('Staff settlement file download failed with an unknown error');
        return fail(500, 'INTERNAL_ERROR', '정산 파일을 열지 못했습니다.');
    }
}
