import { fail, ok } from '@/lib/api-response';
import { getOwnerSessionContext } from '@/lib/franchise-owner-auth';
import { cleanOwnerText, isOwnerRecord } from '@/lib/franchise-owner-portal';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const context = await getOwnerSessionContext(supabaseAdmin);
        if (!context) return fail(401, 'AUTH_REQUIRED', '점주 로그인이 필요합니다.');
        const body: unknown = await request.json();
        if (!isOwnerRecord(body)) return fail(400, 'VALIDATION_ERROR', '공지 정보를 확인할 수 없습니다.');
        const noticeId = cleanOwnerText(body.noticeId);
        if (!noticeId) return fail(400, 'VALIDATION_ERROR', '공지 정보가 필요합니다.');

        const { data: notice, error: noticeError } = await supabaseAdmin
            .from('franchise_owner_notices')
            .select('id')
            .eq('id', noticeId)
            .eq('company_id', context.account.company_id)
            .or(`location_id.is.null,location_id.eq.${context.account.location_id}`)
            .maybeSingle<{ readonly id: string }>();
        if (noticeError) throw noticeError;
        if (!notice) return fail(404, 'NOT_FOUND', '공지 정보를 찾을 수 없습니다.');

        const { error } = await supabaseAdmin
            .from('franchise_owner_notice_reads')
            .upsert({
                notice_id: notice.id,
                owner_account_id: context.account.id,
                read_at: new Date().toISOString()
            }, { onConflict: 'notice_id,owner_account_id' });
        if (error) throw error;
        return ok({ success: true });
    } catch (error) {
        console.error('Owner notice read error:', error);
        return fail(500, 'INTERNAL_ERROR', '공지 읽음 처리를 하지 못했습니다.');
    }
}
