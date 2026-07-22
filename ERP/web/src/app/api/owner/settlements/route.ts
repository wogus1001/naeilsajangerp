import { fail, ok } from '@/lib/api-response';
import { getOwnerSessionContext } from '@/lib/franchise-owner-auth';
import { safelySyncOwnerSettlementSchedule } from '@/lib/franchise-phase2-schedule-sync';
import { cleanOwnerPhase3Text } from '@/lib/franchise-owner-phase3';
import { isOwnerRecord } from '@/lib/franchise-owner-portal';
import {
    isMissingOwnerSettlementSchemaError,
    OWNER_SETTLEMENT_SCHEMA_MESSAGE,
    parseOwnerSettlementAmount,
    parseOwnerSettlementExpectedUpdatedAt,
    type OwnerSettlementFileRow,
    type OwnerSettlementRequestRow,
    type OwnerSettlementSubmissionRow
} from '@/lib/franchise-owner-settlements';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const REQUEST_SELECT = 'id, request_idempotency_key, company_id, location_id, title, instructions, period_start, period_end, due_at, status, created_by, created_at, updated_at';
const SUBMISSION_SELECT = 'id, request_id, company_id, location_id, owner_account_id, status, total_amount, note, review_note, submitted_at, reviewed_by, reviewed_at, created_at, updated_at';
const FILE_SELECT = 'id, submission_id, company_id, location_id, owner_account_id, client_file_id, file_name, mime_type, file_size, content_sha256, storage_bucket, storage_path, upload_state, deletion_state, deleted_at, created_at';

function readSettlementMutationError(error: unknown): string {
    if (!error || typeof error !== 'object') return '';
    const text = ['message', 'details', 'hint']
        .map(key => Reflect.get(error, key))
        .filter((value): value is string => typeof value === 'string')
        .join(' ');
    return text.match(/OWNER_SETTLEMENT_[A-Z_]+/)?.[0] || '';
}

export async function GET() {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const context = await getOwnerSessionContext(supabaseAdmin);
        if (!context) return fail(401, 'AUTH_REQUIRED', '점주 로그인이 필요합니다.');

        const { data: requests, error: requestError } = await supabaseAdmin
            .from('franchise_owner_settlement_requests')
            .select(REQUEST_SELECT)
            .eq('company_id', context.account.company_id)
            .or(`location_id.is.null,location_id.eq.${context.location.id}`)
            .order('due_at', { ascending: true })
            .order('created_at', { ascending: false })
            .overrideTypes<OwnerSettlementRequestRow[], { merge: false }>();
        if (requestError) throw requestError;

        const { data: submissions, error: submissionError } = await supabaseAdmin
            .from('franchise_owner_settlement_submissions')
            .select(SUBMISSION_SELECT)
            .eq('company_id', context.account.company_id)
            .eq('location_id', context.location.id)
            .eq('owner_account_id', context.account.id)
            .overrideTypes<OwnerSettlementSubmissionRow[], { merge: false }>();
        if (submissionError) throw submissionError;

        let files: readonly OwnerSettlementFileRow[] = [];
        const submissionIds = (submissions || []).map(submission => submission.id);
        if (submissionIds.length > 0) {
            const fileResult = await supabaseAdmin
                .from('franchise_owner_settlement_files')
                .select(FILE_SELECT)
                .eq('company_id', context.account.company_id)
                .eq('location_id', context.location.id)
                .eq('owner_account_id', context.account.id)
                .in('submission_id', submissionIds)
                .eq('upload_state', 'active')
                .eq('deletion_state', 'active')
                .order('created_at', { ascending: true })
                .overrideTypes<OwnerSettlementFileRow[], { merge: false }>();
            if (fileResult.error) throw fileResult.error;
            files = fileResult.data || [];
        }

        const submissionByRequest = new Map((submissions || []).map(submission => [submission.request_id, submission]));
        return ok({
            requests: (requests || []).map(settlementRequest => {
                const submission = submissionByRequest.get(settlementRequest.id);
                return {
                    ...settlementRequest,
                    submission: submission
                        ? { ...submission, files: files.filter(file => file.submission_id === submission.id) }
                        : null
                };
            })
        });
    } catch (error) {
        if (isMissingOwnerSettlementSchemaError(error)) {
            return fail(424, 'VALIDATION_ERROR', OWNER_SETTLEMENT_SCHEMA_MESSAGE);
        }
        if (error instanceof Error) console.error('Owner settlements GET failed', error);
        else console.error('Owner settlements GET failed with an unknown error');
        return fail(500, 'INTERNAL_ERROR', '정산 요청을 불러오지 못했습니다.');
    }
}

async function mutateOwnerSettlement(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const context = await getOwnerSessionContext(supabaseAdmin);
        if (!context) return fail(401, 'AUTH_REQUIRED', '점주 로그인이 필요합니다.');
        const body: unknown = await request.json();
        if (!isOwnerRecord(body)) return fail(400, 'VALIDATION_ERROR', '정산 제출 정보를 입력해주세요.');

        const requestId = cleanOwnerPhase3Text(body.requestId);
        const action = cleanOwnerPhase3Text(body.action);
        const totalAmount = parseOwnerSettlementAmount(body.totalAmount ?? body.amount);
        const expectedUpdatedAt = parseOwnerSettlementExpectedUpdatedAt(body.expectedUpdatedAt ?? body.expected_updated_at);
        const note = cleanOwnerPhase3Text(body.note);
        if (!requestId) return fail(400, 'VALIDATION_ERROR', '정산 요청을 선택해주세요.');
        if (action !== 'save' && action !== 'submit') return fail(400, 'VALIDATION_ERROR', '지원하지 않는 저장 방식입니다.');
        if (totalAmount === null) return fail(400, 'VALIDATION_ERROR', '정산 금액을 0원 이상, 소수점 둘째 자리까지 입력해주세요.');
        if ((body.expectedUpdatedAt ?? body.expected_updated_at) && !expectedUpdatedAt) {
            return fail(400, 'VALIDATION_ERROR', '정산 수정 기준 시각을 확인해주세요.');
        }

        const { data, error } = await supabaseAdmin.rpc('mutate_franchise_owner_settlement_submission', {
            p_action: action,
            p_company_id: context.account.company_id,
            p_expected_updated_at: expectedUpdatedAt,
            p_location_id: context.location.id,
            p_note: note,
            p_owner_account_id: context.account.id,
            p_request_id: requestId,
            p_total_amount: totalAmount
        });
        if (error) throw error;
        if (!data) return fail(409, 'CONFLICT', '정산 상태가 변경되었습니다. 다시 확인해주세요.');
        const submission = data as OwnerSettlementSubmissionRow;
        let scheduleSyncRequired = false;
        if (action === 'submit') {
            const { data: settlementRequest } = await supabaseAdmin.from('franchise_owner_settlement_requests')
                .select('title, due_at').eq('id', requestId).eq('company_id', context.account.company_id)
                .maybeSingle<{ readonly title: string; readonly due_at: string }>();
            if (settlementRequest) {
                const scheduleSync = await safelySyncOwnerSettlementSchedule({
                    companyId: context.account.company_id,
                    dueAt: settlementRequest.due_at,
                    locationName: context.location.name || '운영점',
                    managerProfileId: context.location.manager_id,
                    requestTitle: settlementRequest.title,
                    status: submission.status,
                    submissionId: submission.id,
                    supabaseAdmin
                });
                scheduleSyncRequired = scheduleSync.status === 'failed';
            }
        }
        return ok({ scheduleSyncRequired, submission });
    } catch (error) {
        if (isMissingOwnerSettlementSchemaError(error)) {
            return fail(424, 'VALIDATION_ERROR', OWNER_SETTLEMENT_SCHEMA_MESSAGE);
        }
        const mutationError = readSettlementMutationError(error);
        if (mutationError === 'OWNER_SETTLEMENT_REQUEST_NOT_FOUND') return fail(404, 'NOT_FOUND', '정산 요청을 찾을 수 없습니다.');
        if (mutationError === 'OWNER_SETTLEMENT_STALE_VERSION') return fail(409, 'CONFLICT', '다른 화면에서 정산 내용이 변경되었습니다. 새로고침 후 다시 작성해주세요.');
        if (mutationError) return fail(409, 'CONFLICT', '현재 상태에서는 정산을 저장하거나 제출할 수 없습니다. 새로고침 후 다시 시도해주세요.');
        if (error instanceof Error) console.error('Owner settlement mutation failed', error);
        else console.error('Owner settlement mutation failed with an unknown error');
        return fail(500, 'INTERNAL_ERROR', '정산을 저장하지 못했습니다.');
    }
}

export async function POST(request: Request) {
    return mutateOwnerSettlement(request);
}

export async function PATCH(request: Request) {
    return mutateOwnerSettlement(request);
}
