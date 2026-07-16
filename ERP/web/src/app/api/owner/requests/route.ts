import { fail, ok } from '@/lib/api-response';
import { getOwnerSessionContext } from '@/lib/franchise-owner-auth';
import {
    buildOwnerSubmissionTitle,
    cleanOwnerText,
    isOwnerRecord,
    toOwnerSubmissionType
} from '@/lib/franchise-owner-portal';
import {
    notifyOwnerFacilityRequestCreated,
    safelyNotifyOwnerPortalAlimtalk
} from '@/lib/alimtalk-owner-portal-notifications';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { safelySyncOwnerSubmissionSchedule } from '@/lib/franchise-phase2-schedule-sync';

export const dynamic = 'force-dynamic';

type OwnerRequestInsertRow = {
    readonly id: string;
    readonly created_at: string | null;
};

export async function POST(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const context = await getOwnerSessionContext(supabaseAdmin);
        if (!context) return fail(401, 'AUTH_REQUIRED', '점주 로그인이 필요합니다.');
        const body: unknown = await request.json();
        if (!isOwnerRecord(body)) return fail(400, 'VALIDATION_ERROR', '문의 내용을 입력해주세요.');
        const type = toOwnerSubmissionType(cleanOwnerText(body.type) || 'general_request');
        const title = cleanOwnerText(body.title);
        const message = cleanOwnerText(body.message);
        if (!title && !message) return fail(400, 'VALIDATION_ERROR', '문의 제목 또는 내용을 입력해주세요.');
        const submissionTitle = buildOwnerSubmissionTitle(type, title);

        const { data, error } = await supabaseAdmin
            .from('franchise_owner_submissions')
            .insert({
                company_id: context.account.company_id,
                location_id: context.location.id,
                owner_account_id: context.account.id,
                submission_type: type,
                title: submissionTitle,
                body: message || null,
                payload: { title },
                status: 'submitted'
            })
            .select('id, created_at')
            .single<OwnerRequestInsertRow>();
        if (error) throw error;
        if (type === 'facility_request') {
            await safelyNotifyOwnerPortalAlimtalk(() => notifyOwnerFacilityRequestCreated({
                companyId: context.account.company_id,
                locationName: context.location.name || '운영점',
                ownerName: context.account.owner_name,
                requestTitle: title || submissionTitle,
                sourceId: data.id,
                submittedAt: data.created_at || new Date(),
                supabaseAdmin
            }), 'Owner facility request created');
        }
        await safelySyncOwnerSubmissionSchedule({
            companyId: context.account.company_id,
            locationName: context.location.name || '운영점',
            managerProfileId: context.location.manager_id,
            status: 'submitted',
            submissionId: data.id,
            submissionType: type,
            submittedAt: data.created_at || new Date(),
            supabaseAdmin,
            title: title || submissionTitle
        });
        return ok({ submissionId: data.id }, 201);
    } catch (error) {
        console.error('Owner request error:', error);
        return fail(500, 'INTERNAL_ERROR', '문의 등록에 실패했습니다.');
    }
}

export async function PATCH(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const context = await getOwnerSessionContext(supabaseAdmin);
        if (!context) return fail(401, 'AUTH_REQUIRED', '점주 로그인이 필요합니다.');
        const body: unknown = await request.json();
        if (!isOwnerRecord(body)) return fail(400, 'VALIDATION_ERROR', '수정할 문의 내용을 입력해주세요.');
        const submissionId = cleanOwnerText(body.id);
        const title = cleanOwnerText(body.title);
        const message = cleanOwnerText(body.message);
        if (!submissionId) return fail(400, 'VALIDATION_ERROR', '수정할 문의를 선택해주세요.');
        if (!title && !message) return fail(400, 'VALIDATION_ERROR', '문의 제목 또는 내용을 입력해주세요.');
        const submissionTitle = buildOwnerSubmissionTitle('facility_request', title);

        const { data: submission, error: readError } = await supabaseAdmin
            .from('franchise_owner_submissions')
            .select('id, status, submission_type')
            .eq('id', submissionId)
            .eq('owner_account_id', context.account.id)
            .eq('location_id', context.location.id)
            .maybeSingle<{ readonly id: string; readonly status: string; readonly submission_type: string }>();
        if (readError) throw readError;
        if (!submission) return fail(404, 'NOT_FOUND', '수정할 문의를 찾지 못했습니다.');
        if (submission.submission_type !== 'facility_request') {
            return fail(409, 'CONFLICT', '시설/고장 문의만 수정할 수 있습니다.');
        }
        if (submission.status !== 'rejected') {
            return fail(409, 'CONFLICT', '반려된 문의만 수정해 다시 제출할 수 있습니다.');
        }

        const { error } = await supabaseAdmin
            .from('franchise_owner_submissions')
            .update({
                title: submissionTitle,
                body: message || null,
                payload: { title },
                status: 'submitted',
                review_note: null,
                reviewed_by: null,
                reviewed_at: null,
                updated_at: new Date().toISOString()
            })
            .eq('id', submission.id);
        if (error) throw error;
        await safelyNotifyOwnerPortalAlimtalk(() => notifyOwnerFacilityRequestCreated({
            companyId: context.account.company_id,
            locationName: context.location.name || '운영점',
            ownerName: context.account.owner_name,
            requestTitle: title || submissionTitle,
            sourceId: submission.id,
            sourceType: 'owner-facility-request-resubmitted',
            submittedAt: new Date(),
            supabaseAdmin
        }), 'Owner facility request resubmitted');
        await safelySyncOwnerSubmissionSchedule({
            companyId: context.account.company_id,
            locationName: context.location.name || '운영점',
            managerProfileId: context.location.manager_id,
            status: 'submitted',
            submissionId: submission.id,
            submissionType: 'facility_request',
            submittedAt: new Date(),
            supabaseAdmin,
            title: title || submissionTitle
        });
        return ok({ submissionId: submission.id });
    } catch (error) {
        console.error('Owner request update error:', error);
        return fail(500, 'INTERNAL_ERROR', '문의 수정에 실패했습니다.');
    }
}
