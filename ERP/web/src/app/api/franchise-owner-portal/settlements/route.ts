import { fail, ok } from '@/lib/api-response';
import { canTransitionOwnerSettlementStatus, cleanOwnerPhase3Text } from '@/lib/franchise-owner-phase3';
import { isOwnerRecord } from '@/lib/franchise-owner-portal';
import {
    fetchOwnerPortalLocation,
    isOwnerPortalManager,
    resolveOwnerPortalCompanyScope,
    resolveOwnerPortalStaffAuth
} from '@/lib/franchise-owner-portal-api';
import { isMissingOwnerSettlementSchemaError, OWNER_SETTLEMENT_SCHEMA_MESSAGE, parseOwnerSettlementReview, type OwnerSettlementFileRow, type OwnerSettlementRequestRow, type OwnerSettlementSubmissionRow } from '@/lib/franchise-owner-settlements';

export const dynamic = 'force-dynamic';

const REQUEST_SELECT = 'id, company_id, location_id, title, instructions, period_start, period_end, due_at, status, created_by, created_at, updated_at';
const SUBMISSION_SELECT = 'id, request_id, company_id, location_id, owner_account_id, status, total_amount, note, review_note, submitted_at, reviewed_by, reviewed_at, created_at, updated_at';
const FILE_SELECT = 'id, submission_id, company_id, location_id, owner_account_id, file_name, mime_type, file_size, storage_bucket, storage_path, created_at';

function parseIsoDate(value: unknown): string | null {
    const date = cleanOwnerPhase3Text(value);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
    const parsed = new Date(`${date}T00:00:00.000Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date ? date : null;
}

export async function GET(request: Request) {
    try {
        const authResult = await resolveOwnerPortalStaffAuth(request);
        if (!authResult.ok) return authResult.response;
        if (!isOwnerPortalManager(authResult.auth.requester)) {
            return fail(403, 'FORBIDDEN', '정산 요청을 조회할 권한이 없습니다.');
        }
        const { searchParams } = new URL(request.url);
        const companyScope = await resolveOwnerPortalCompanyScope(authResult.auth, searchParams.get('companyId'), searchParams.get('company'));
        if (!companyScope.ok) return companyScope.response;

        let requestQuery = authResult.auth.supabaseAdmin
            .from('franchise_owner_settlement_requests')
            .select(REQUEST_SELECT)
            .eq('company_id', companyScope.scope.companyId)
            .order('due_at', { ascending: true })
            .order('created_at', { ascending: false });
        const requestStatus = cleanOwnerPhase3Text(searchParams.get('requestStatus'));
        const locationId = cleanOwnerPhase3Text(searchParams.get('locationId'));
        if (requestStatus === 'open' || requestStatus === 'closed') requestQuery = requestQuery.eq('status', requestStatus);
        if (locationId) requestQuery = requestQuery.eq('location_id', locationId);
        const { data: requests, error: requestError } = await requestQuery.overrideTypes<OwnerSettlementRequestRow[], { merge: false }>();
        if (requestError) throw requestError;

        let submissionQuery = authResult.auth.supabaseAdmin
            .from('franchise_owner_settlement_submissions')
            .select(SUBMISSION_SELECT)
            .eq('company_id', companyScope.scope.companyId)
            .order('submitted_at', { ascending: false })
            .order('created_at', { ascending: false });
        const requestId = cleanOwnerPhase3Text(searchParams.get('requestId'));
        const submissionStatus = cleanOwnerPhase3Text(searchParams.get('submissionStatus'));
        if (requestId) submissionQuery = submissionQuery.eq('request_id', requestId);
        if (['draft', 'submitted', 'rejected', 'confirmed'].includes(submissionStatus)) {
            submissionQuery = submissionQuery.eq('status', submissionStatus);
        }
        const { data: submissions, error: submissionError } = await submissionQuery.overrideTypes<OwnerSettlementSubmissionRow[], { merge: false }>();
        if (submissionError) throw submissionError;

        let files: readonly OwnerSettlementFileRow[] = [];
        const submissionIds = (submissions || []).map(submission => submission.id);
        if (submissionIds.length > 0) {
            const fileResult = await authResult.auth.supabaseAdmin
                .from('franchise_owner_settlement_files')
                .select(FILE_SELECT)
                .eq('company_id', companyScope.scope.companyId)
                .in('submission_id', submissionIds)
                .order('created_at', { ascending: true })
                .overrideTypes<OwnerSettlementFileRow[], { merge: false }>();
            if (fileResult.error) throw fileResult.error;
            files = fileResult.data || [];
        }
        return ok({
            requests: requests || [],
            submissions: (submissions || []).map(submission => ({
                ...submission,
                files: files.filter(file => file.submission_id === submission.id)
            }))
        });
    } catch (error) {
        if (isMissingOwnerSettlementSchemaError(error)) {
            return fail(424, 'VALIDATION_ERROR', OWNER_SETTLEMENT_SCHEMA_MESSAGE);
        }
        if (error instanceof Error) console.error('Staff settlements GET failed', error);
        else console.error('Staff settlements GET failed with an unknown error');
        return fail(500, 'INTERNAL_ERROR', '정산 요청 목록을 불러오지 못했습니다.');
    }
}

export async function POST(request: Request) {
    try {
        const authResult = await resolveOwnerPortalStaffAuth(request);
        if (!authResult.ok) return authResult.response;
        if (!isOwnerPortalManager(authResult.auth.requester)) {
            return fail(403, 'FORBIDDEN', '정산 요청을 등록할 권한이 없습니다.');
        }
        const body: unknown = await request.json();
        if (!isOwnerRecord(body)) return fail(400, 'VALIDATION_ERROR', '정산 요청 정보를 입력해주세요.');
        const companyScope = await resolveOwnerPortalCompanyScope(authResult.auth, cleanOwnerPhase3Text(body.companyId), cleanOwnerPhase3Text(body.companyName));
        if (!companyScope.ok) return companyScope.response;
        const title = cleanOwnerPhase3Text(body.title);
        const instructions = cleanOwnerPhase3Text(body.instructions);
        const locationId = cleanOwnerPhase3Text(body.locationId);
        const periodStart = parseIsoDate(body.periodStart);
        const periodEnd = parseIsoDate(body.periodEnd);
        const dueDate = new Date(cleanOwnerPhase3Text(body.dueAt));
        if (!title || !periodStart || !periodEnd || !Number.isFinite(dueDate.getTime())) {
            return fail(400, 'VALIDATION_ERROR', '제목, 정산 기간, 제출 기한을 정확히 입력해주세요.');
        }
        if (periodEnd < periodStart) return fail(400, 'VALIDATION_ERROR', '정산 종료일은 시작일보다 빠를 수 없습니다.');
        if (locationId) {
            const location = await fetchOwnerPortalLocation(
                authResult.auth.supabaseAdmin,
                companyScope.scope.companyId,
                locationId
            );
            if (!location.ok) return location.response;
        }

        const { data, error } = await authResult.auth.supabaseAdmin
            .from('franchise_owner_settlement_requests')
            .insert({
                company_id: companyScope.scope.companyId,
                location_id: locationId || null,
                title,
                instructions,
                period_start: periodStart,
                period_end: periodEnd,
                due_at: dueDate.toISOString(),
                status: 'open',
                created_by: authResult.auth.requester.id
            })
            .select(REQUEST_SELECT)
            .single<OwnerSettlementRequestRow>();
        if (error) throw error;
        return ok({ request: data }, 201);
    } catch (error) {
        if (isMissingOwnerSettlementSchemaError(error)) {
            return fail(424, 'VALIDATION_ERROR', OWNER_SETTLEMENT_SCHEMA_MESSAGE);
        }
        if (error instanceof Error) console.error('Staff settlement request creation failed', error);
        else console.error('Staff settlement request creation failed with an unknown error');
        return fail(500, 'INTERNAL_ERROR', '정산 요청을 등록하지 못했습니다.');
    }
}

export async function PATCH(request: Request) {
    try {
        const authResult = await resolveOwnerPortalStaffAuth(request);
        if (!authResult.ok) return authResult.response;
        if (!isOwnerPortalManager(authResult.auth.requester)) {
            return fail(403, 'FORBIDDEN', '정산을 처리할 권한이 없습니다.');
        }
        const body: unknown = await request.json();
        if (!isOwnerRecord(body)) return fail(400, 'VALIDATION_ERROR', '처리할 정산 정보를 입력해주세요.');
        const companyScope = await resolveOwnerPortalCompanyScope(authResult.auth, cleanOwnerPhase3Text(body.companyId), cleanOwnerPhase3Text(body.companyName));
        if (!companyScope.ok) return companyScope.response;
        const action = cleanOwnerPhase3Text(body.action);
        const now = new Date().toISOString();

        if (action === 'close') {
            const requestId = cleanOwnerPhase3Text(body.requestId);
            if (!requestId) return fail(400, 'VALIDATION_ERROR', '마감할 정산 요청을 선택해주세요.');
            const { data: settlementRequest, error: readError } = await authResult.auth.supabaseAdmin
                .from('franchise_owner_settlement_requests')
                .select(REQUEST_SELECT)
                .eq('id', requestId)
                .eq('company_id', companyScope.scope.companyId)
                .maybeSingle<OwnerSettlementRequestRow>();
            if (readError) throw readError;
            if (!settlementRequest) return fail(404, 'NOT_FOUND', '정산 요청을 찾을 수 없습니다.');
            if (settlementRequest.status !== 'open') return fail(409, 'CONFLICT', '이미 마감된 정산 요청입니다.');
            const { data, error } = await authResult.auth.supabaseAdmin
                .from('franchise_owner_settlement_requests')
                .update({ status: 'closed', updated_at: now })
                .eq('id', settlementRequest.id)
                .eq('company_id', companyScope.scope.companyId)
                .eq('status', 'open')
                .select(REQUEST_SELECT)
                .maybeSingle<OwnerSettlementRequestRow>();
            if (error) throw error;
            if (!data) return fail(409, 'CONFLICT', '정산 요청 상태가 변경되었습니다.');
            return ok({ request: data });
        }

        const review = parseOwnerSettlementReview(action, body.reviewNote);
        if (action === 'reject' && !review) return fail(400, 'VALIDATION_ERROR', '반려 사유를 입력해주세요.');
        if (!review) return fail(400, 'VALIDATION_ERROR', '지원하지 않는 처리 방식입니다.');
        const submissionId = cleanOwnerPhase3Text(body.submissionId);
        if (!submissionId) return fail(400, 'VALIDATION_ERROR', '검토할 정산 제출 건을 선택해주세요.');
        const { data: submission, error: readError } = await authResult.auth.supabaseAdmin
            .from('franchise_owner_settlement_submissions')
            .select(SUBMISSION_SELECT)
            .eq('id', submissionId)
            .eq('company_id', companyScope.scope.companyId)
            .maybeSingle<OwnerSettlementSubmissionRow>();
        if (readError) throw readError;
        if (!submission) return fail(404, 'NOT_FOUND', '정산 제출 건을 찾을 수 없습니다.');
        if (submission.status === review.status || !canTransitionOwnerSettlementStatus(submission.status, review.status)) {
            return fail(409, 'CONFLICT', '현재 상태에서는 정산 제출 건을 처리할 수 없습니다.');
        }

        const { data: reviewed, error } = await authResult.auth.supabaseAdmin
            .from('franchise_owner_settlement_submissions')
            .update({
                status: review.status,
                review_note: review.reviewNote,
                reviewed_by: authResult.auth.requester.id,
                reviewed_at: now,
                updated_at: now
            })
            .eq('id', submission.id)
            .eq('company_id', companyScope.scope.companyId)
            .eq('status', submission.status)
            .select(SUBMISSION_SELECT)
            .maybeSingle<OwnerSettlementSubmissionRow>();
        if (error) throw error;
        if (!reviewed) return fail(409, 'CONFLICT', '정산 제출 상태가 변경되었습니다.');
        const { error: eventError } = await authResult.auth.supabaseAdmin.from('franchise_owner_portal_events').insert({
            company_id: reviewed.company_id,
            location_id: reviewed.location_id,
            owner_account_id: reviewed.owner_account_id,
            source_type: 'settlement_submission',
            source_id: reviewed.id,
            event_type: review.status,
            event_data: { requestId: reviewed.request_id, reviewerId: authResult.auth.requester.id, reviewNote: review.reviewNote }
        });
        if (eventError) {
            const { error: rollbackError } = await authResult.auth.supabaseAdmin
                .from('franchise_owner_settlement_submissions')
                .update({
                    status: submission.status,
                    review_note: submission.review_note,
                    reviewed_by: submission.reviewed_by,
                    reviewed_at: submission.reviewed_at,
                    updated_at: submission.updated_at
                })
                .eq('id', submission.id)
                .eq('status', review.status);
            if (rollbackError) console.error('Staff settlement event rollback failed', rollbackError);
            throw eventError;
        }
        return ok({ submission: reviewed });
    } catch (error) {
        if (isMissingOwnerSettlementSchemaError(error)) {
            return fail(424, 'VALIDATION_ERROR', OWNER_SETTLEMENT_SCHEMA_MESSAGE);
        }
        if (error instanceof Error) console.error('Staff settlement mutation failed', error);
        else console.error('Staff settlement mutation failed with an unknown error');
        return fail(500, 'INTERNAL_ERROR', '정산을 처리하지 못했습니다.');
    }
}
