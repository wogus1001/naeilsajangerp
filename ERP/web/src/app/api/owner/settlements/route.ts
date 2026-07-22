import { fail, ok } from '@/lib/api-response';
import { getOwnerSessionContext } from '@/lib/franchise-owner-auth';
import { canTransitionOwnerSettlementStatus, cleanOwnerPhase3Text } from '@/lib/franchise-owner-phase3';
import { isOwnerRecord } from '@/lib/franchise-owner-portal';
import {
    isMissingOwnerSettlementSchemaError,
    isOwnerSettlementMutableStatus,
    isOwnerSettlementRequestTarget,
    OWNER_SETTLEMENT_SCHEMA_MESSAGE,
    parseOwnerSettlementAmount,
    type OwnerSettlementFileRow,
    type OwnerSettlementRequestRow,
    type OwnerSettlementSubmissionRow
} from '@/lib/franchise-owner-settlements';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const REQUEST_SELECT = 'id, company_id, location_id, title, instructions, period_start, period_end, due_at, status, created_by, created_at, updated_at';
const SUBMISSION_SELECT = 'id, request_id, company_id, location_id, owner_account_id, status, total_amount, note, review_note, submitted_at, reviewed_by, reviewed_at, created_at, updated_at';
const FILE_SELECT = 'id, submission_id, company_id, location_id, owner_account_id, file_name, mime_type, file_size, storage_bucket, storage_path, created_at';

async function rollbackFailedEvent(input: {
    readonly existing: OwnerSettlementSubmissionRow | null;
    readonly submission: OwnerSettlementSubmissionRow;
}): Promise<void> {
    const supabaseAdmin = getSupabaseAdmin();
    const result = input.existing
        ? await supabaseAdmin
            .from('franchise_owner_settlement_submissions')
            .update({
                status: input.existing.status,
                total_amount: input.existing.total_amount,
                note: input.existing.note,
                review_note: input.existing.review_note,
                submitted_at: input.existing.submitted_at,
                reviewed_by: input.existing.reviewed_by,
                reviewed_at: input.existing.reviewed_at,
                updated_at: input.existing.updated_at
            })
            .eq('id', input.submission.id)
            .eq('owner_account_id', input.submission.owner_account_id)
        : await supabaseAdmin
            .from('franchise_owner_settlement_submissions')
            .delete()
            .eq('id', input.submission.id)
            .eq('owner_account_id', input.submission.owner_account_id);
    if (result.error) console.error('Owner settlement event rollback failed', result.error);
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
        const note = cleanOwnerPhase3Text(body.note);
        if (!requestId) return fail(400, 'VALIDATION_ERROR', '정산 요청을 선택해주세요.');
        if (action !== 'save' && action !== 'submit') return fail(400, 'VALIDATION_ERROR', '지원하지 않는 저장 방식입니다.');
        if (totalAmount === null) return fail(400, 'VALIDATION_ERROR', '정산 금액을 0원 이상, 소수점 둘째 자리까지 입력해주세요.');

        const { data: settlementRequest, error: requestError } = await supabaseAdmin
            .from('franchise_owner_settlement_requests')
            .select(REQUEST_SELECT)
            .eq('id', requestId)
            .eq('company_id', context.account.company_id)
            .maybeSingle<OwnerSettlementRequestRow>();
        if (requestError) throw requestError;
        if (!settlementRequest || !isOwnerSettlementRequestTarget(settlementRequest.location_id, context.location.id)) {
            return fail(404, 'NOT_FOUND', '정산 요청을 찾을 수 없습니다.');
        }
        if (settlementRequest.status !== 'open') return fail(409, 'CONFLICT', '마감된 정산 요청은 제출할 수 없습니다.');

        const { data: existing, error: existingError } = await supabaseAdmin
            .from('franchise_owner_settlement_submissions')
            .select(SUBMISSION_SELECT)
            .eq('request_id', settlementRequest.id)
            .eq('company_id', context.account.company_id)
            .eq('location_id', context.location.id)
            .eq('owner_account_id', context.account.id)
            .maybeSingle<OwnerSettlementSubmissionRow>();
        if (existingError) throw existingError;
        if (existing && !isOwnerSettlementMutableStatus(existing.status)) {
            return fail(409, 'CONFLICT', '제출 완료된 정산은 수정할 수 없습니다.');
        }

        const currentStatus = existing?.status || 'draft';
        const nextStatus = action === 'submit' ? 'submitted' : currentStatus;
        if (action === 'submit' && !canTransitionOwnerSettlementStatus(currentStatus, nextStatus)) {
            return fail(409, 'CONFLICT', '현재 상태에서는 정산을 제출할 수 없습니다.');
        }
        const now = new Date().toISOString();
        const mutation = action === 'submit'
            ? { status: nextStatus, total_amount: totalAmount, note, submitted_at: now, review_note: '', reviewed_by: null, reviewed_at: null, updated_at: now }
            : { status: nextStatus, total_amount: totalAmount, note, updated_at: now };
        const submissionResult = existing
            ? await supabaseAdmin
                .from('franchise_owner_settlement_submissions')
                .update(mutation)
                .eq('id', existing.id)
                .eq('status', existing.status)
                .eq('owner_account_id', context.account.id)
                .select(SUBMISSION_SELECT)
                .maybeSingle<OwnerSettlementSubmissionRow>()
            : await supabaseAdmin
                .from('franchise_owner_settlement_submissions')
                .insert({
                    request_id: settlementRequest.id,
                    company_id: context.account.company_id,
                    location_id: context.location.id,
                    owner_account_id: context.account.id,
                    ...mutation
                })
                .select(SUBMISSION_SELECT)
                .single<OwnerSettlementSubmissionRow>();
        if (submissionResult.error) throw submissionResult.error;
        if (!submissionResult.data) return fail(409, 'CONFLICT', '정산 상태가 변경되었습니다. 다시 확인해주세요.');

        if (action === 'submit') {
            const { error: eventError } = await supabaseAdmin.from('franchise_owner_portal_events').insert({
                company_id: context.account.company_id,
                location_id: context.location.id,
                owner_account_id: context.account.id,
                source_type: 'settlement_submission',
                source_id: submissionResult.data.id,
                event_type: existing?.status === 'rejected' ? 'resubmitted' : 'submitted',
                event_data: { requestId: settlementRequest.id, totalAmount }
            });
            if (eventError) {
                await rollbackFailedEvent({ existing, submission: submissionResult.data });
                throw eventError;
            }
        }
        return ok({ submission: submissionResult.data }, existing ? 200 : 201);
    } catch (error) {
        if (isMissingOwnerSettlementSchemaError(error)) {
            return fail(424, 'VALIDATION_ERROR', OWNER_SETTLEMENT_SCHEMA_MESSAGE);
        }
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
