import { fail, ok } from '@/lib/api-response';
import { getOwnerSessionContext } from '@/lib/franchise-owner-auth';
import { buildOwnerSubmissionTitle, cleanOwnerText, isOwnerRecord } from '@/lib/franchise-owner-portal';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { safelySyncOwnerSubmissionSchedule } from '@/lib/franchise-phase2-schedule-sync';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const context = await getOwnerSessionContext(supabaseAdmin);
        if (!context) return fail(401, 'AUTH_REQUIRED', '점주 로그인이 필요합니다.');
        const body: unknown = await request.json();
        if (!isOwnerRecord(body)) return fail(400, 'VALIDATION_ERROR', '체크리스트 정보를 입력해주세요.');
        const taskId = cleanOwnerText(body.taskId);
        const taskTitle = cleanOwnerText(body.taskTitle);
        const memo = cleanOwnerText(body.memo);
        if (!taskId) return fail(400, 'VALIDATION_ERROR', '체크리스트 항목을 선택해주세요.');

        const { data, error } = await supabaseAdmin
            .from('franchise_owner_submissions')
            .insert({
                company_id: context.account.company_id,
                location_id: context.location.id,
                owner_account_id: context.account.id,
                submission_type: 'opening_task_completion',
                title: `${buildOwnerSubmissionTitle('opening_task_completion', '')}: ${taskTitle || taskId}`,
                body: memo || null,
                payload: { taskId, taskTitle },
                status: 'submitted'
            })
            .select('id, created_at')
            .single<{ readonly id: string; readonly created_at: string | null }>();
        if (error) throw error;
        await safelySyncOwnerSubmissionSchedule({
            companyId: context.account.company_id,
            locationName: context.location.name || '운영점',
            managerProfileId: context.location.manager_id,
            status: 'submitted',
            submissionId: data.id,
            submissionType: 'opening_task_completion',
            submittedAt: data.created_at || new Date(),
            supabaseAdmin,
            title: taskTitle || taskId
        });
        return ok({ submissionId: data.id }, 201);
    } catch (error) {
        console.error('Owner opening task error:', error);
        return fail(500, 'INTERNAL_ERROR', '완료 요청을 등록하지 못했습니다.');
    }
}
