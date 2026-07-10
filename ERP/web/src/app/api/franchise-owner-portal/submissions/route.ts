import { fail, ok } from '@/lib/api-response';
import {
    canReviewOwnerSubmission,
    cleanOwnerText,
    getOwnerSubmissionReviewMode,
    isOwnerRecord,
    toOwnerSubmissionStatus,
    type OwnerFileRow,
    type OwnerSubmissionRow
} from '@/lib/franchise-owner-portal';
import {
    fetchOwnerPortalLocation,
    isMissingOwnerPortalSchemaError,
    isOwnerPortalManager,
    resolveOwnerPortalCompanyScope,
    resolveOwnerPortalStaffAuth
} from '@/lib/franchise-owner-portal-api';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const authResult = await resolveOwnerPortalStaffAuth(request);
        if (!authResult.ok) return authResult.response;
        const { searchParams } = new URL(request.url);
        const companyScope = await resolveOwnerPortalCompanyScope(authResult.auth, searchParams.get('companyId'), searchParams.get('company'));
        if (!companyScope.ok) return companyScope.response;
        const status = searchParams.get('status');
        let query = authResult.auth.supabaseAdmin
            .from('franchise_owner_submissions')
            .select('id, company_id, location_id, owner_account_id, submission_type, title, body, payload, status, review_note, reviewed_at, created_at')
            .eq('company_id', companyScope.scope.companyId)
            .order('created_at', { ascending: false })
            .limit(80);
        if (status && status !== 'all') query = query.eq('status', toOwnerSubmissionStatus(status));
        const { data, error } = await query.returns<OwnerSubmissionRow[]>();
        if (error) throw error;
        const submissionIds = (data || []).map(submission => submission.id);
        const fileResult = submissionIds.length > 0
            ? await authResult.auth.supabaseAdmin
                .from('franchise_owner_files')
                .select('id, submission_id, file_name, mime_type, file_size, storage_bucket, storage_path, public_url, created_at')
                .eq('company_id', companyScope.scope.companyId)
                .in('submission_id', submissionIds)
                .order('created_at', { ascending: true })
                .returns<OwnerFileRow[]>()
            : { data: [], error: null };
        if (fileResult.error) throw fileResult.error;
        const filesBySubmission = new Map<string, OwnerFileRow[]>();
        for (const file of fileResult.data || []) {
            if (!file.submission_id) continue;
            const current = filesBySubmission.get(file.submission_id) || [];
            current.push(file);
            filesBySubmission.set(file.submission_id, current);
        }
        return ok({
            submissions: (data || []).map(submission => ({
                ...submission,
                files: filesBySubmission.get(submission.id) || []
            }))
        });
    } catch (error) {
        if (isMissingOwnerPortalSchemaError(error)) return ok({ submissions: [], schemaReady: false });
        console.error('Owner portal submissions GET error:', error);
        return fail(500, 'INTERNAL_ERROR', '점주 제출 목록을 불러오지 못했습니다.');
    }
}

export async function PATCH(request: Request) {
    try {
        const authResult = await resolveOwnerPortalStaffAuth(request);
        if (!authResult.ok) return authResult.response;
        if (!isOwnerPortalManager(authResult.auth.requester)) return fail(403, 'FORBIDDEN', '점주 제출 건을 처리할 권한이 없습니다.');
        const body: unknown = await request.json();
        if (!isOwnerRecord(body)) return fail(400, 'VALIDATION_ERROR', '처리할 제출 건 정보가 필요합니다.');
        const submissionId = cleanOwnerText(body.id);
        const action = cleanOwnerText(body.action);
        if (!submissionId) return fail(400, 'VALIDATION_ERROR', '제출 건을 선택해주세요.');
        if (action !== 'approve' && action !== 'reject' && action !== 'resolve') {
            return fail(400, 'VALIDATION_ERROR', '지원하지 않는 처리 방식입니다.');
        }
        const { data: submission, error: submissionError } = await authResult.auth.supabaseAdmin
            .from('franchise_owner_submissions')
            .select('id, company_id, location_id, owner_account_id, submission_type, title, body, payload, status, review_note, reviewed_at, created_at')
            .eq('id', submissionId)
            .maybeSingle<OwnerSubmissionRow>();
        if (submissionError) throw submissionError;
        if (!submission) return fail(404, 'NOT_FOUND', '제출 건을 찾을 수 없습니다.');
        const location = await fetchOwnerPortalLocation(authResult.auth.supabaseAdmin, submission.company_id, submission.location_id);
        if (!location.ok) return location.response;
        if (authResult.auth.requester.role !== 'admin' && authResult.auth.requester.company_id !== submission.company_id) {
            return fail(403, 'FORBIDDEN', '회사 범위가 일치하지 않습니다.');
        }
        if (!canReviewOwnerSubmission(submission.status) && action !== 'resolve') {
            return fail(409, 'CONFLICT', '이미 처리된 제출 건입니다.');
        }
        const reviewMode = getOwnerSubmissionReviewMode(submission.submission_type, submission.status);
        const isApprovalAction = action === 'approve' || action === 'reject';
        if (reviewMode === 'approval' && !isApprovalAction) {
            return fail(409, 'CONFLICT', '승인 또는 반려가 필요한 제출 건입니다.');
        }
        if ((reviewMode === 'resolution' || reviewMode === 'acknowledge') && action !== 'resolve') {
            return fail(409, 'CONFLICT', '확인 또는 처리 완료로 마감할 제출 건입니다.');
        }
        if (reviewMode === 'none') {
            return fail(409, 'CONFLICT', '이미 처리된 제출 건입니다.');
        }
        const nextStatus = action === 'reject' ? 'rejected' : action === 'resolve' ? 'resolved' : 'approved';
        const { error } = await authResult.auth.supabaseAdmin
            .from('franchise_owner_submissions')
            .update({
                status: nextStatus,
                review_note: cleanOwnerText(body.reviewNote) || null,
                reviewed_by: authResult.auth.requester.id,
                reviewed_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', submission.id);
        if (error) throw error;
        return ok({ success: true });
    } catch (error) {
        console.error('Owner portal submissions PATCH error:', error);
        return fail(500, 'INTERNAL_ERROR', '점주 제출 건을 처리하지 못했습니다.');
    }
}
