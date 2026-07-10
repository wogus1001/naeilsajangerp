import { fail, ok } from '@/lib/api-response';
import { getOwnerSessionContext, hashOwnerPassword, verifyOwnerPassword } from '@/lib/franchise-owner-auth';
import { cleanOwnerText, isOwnerRecord } from '@/lib/franchise-owner-portal';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const context = await getOwnerSessionContext(supabaseAdmin);
        if (!context) return fail(401, 'AUTH_REQUIRED', '점주 로그인이 필요합니다.');
        const body: unknown = await request.json();
        if (!isOwnerRecord(body)) return fail(400, 'VALIDATION_ERROR', '새 비밀번호를 입력해주세요.');
        const currentPassword = cleanOwnerText(body.currentPassword);
        const password = cleanOwnerText(body.password);
        if (!currentPassword) return fail(400, 'VALIDATION_ERROR', '현재 비밀번호를 입력해주세요.');
        if (password.length < 8) return fail(400, 'VALIDATION_ERROR', '비밀번호는 8자 이상으로 입력해주세요.');
        const isCurrentPasswordValid = await verifyOwnerPassword(currentPassword, context.account.password_hash);
        if (!isCurrentPasswordValid) return fail(400, 'VALIDATION_ERROR', '현재 비밀번호가 일치하지 않습니다.');
        const { error } = await supabaseAdmin
            .from('franchise_owner_accounts')
            .update({
                password_hash: await hashOwnerPassword(password),
                temporary_password: false,
                updated_at: new Date().toISOString()
            })
            .eq('id', context.account.id);
        if (error) throw error;
        return ok({ success: true });
    } catch (error) {
        console.error('Owner change password error:', error);
        return fail(500, 'INTERNAL_ERROR', '비밀번호 변경에 실패했습니다.');
    }
}
