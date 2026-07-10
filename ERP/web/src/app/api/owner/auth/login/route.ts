import { cookies } from 'next/headers';
import { fail, ok } from '@/lib/api-response';
import {
    OWNER_SESSION_COOKIE,
    createOwnerSessionToken,
    getOwnerSessionExpiresAt,
    hashOwnerSessionToken,
    normalizeOwnerLoginId,
    verifyOwnerPassword,
    type OwnerAccountRow
} from '@/lib/franchise-owner-auth';
import { resolveCompanyIdByName } from '@/lib/api-auth';
import { cleanOwnerText, isOwnerRecord } from '@/lib/franchise-owner-portal';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const body: unknown = await request.json();
        if (!isOwnerRecord(body)) return fail(400, 'VALIDATION_ERROR', '로그인 정보를 입력해주세요.');
        const companyIdFromBody = cleanOwnerText(body.companyId);
        const companyName = cleanOwnerText(body.companyName);
        const loginId = normalizeOwnerLoginId(cleanOwnerText(body.loginId));
        const password = cleanOwnerText(body.password);
        if (!companyIdFromBody && !companyName) return fail(400, 'VALIDATION_ERROR', '회사명을 입력해주세요.');
        if (!loginId || !password) return fail(400, 'VALIDATION_ERROR', '아이디와 비밀번호를 입력해주세요.');

        const supabaseAdmin = getSupabaseAdmin();
        const companyId = companyIdFromBody || await resolveCompanyIdByName(supabaseAdmin, companyName);
        if (!companyId) return fail(401, 'AUTH_REQUIRED', '회사 또는 점주 계정을 확인할 수 없습니다.');

        const { data: account, error } = await supabaseAdmin
            .from('franchise_owner_accounts')
            .select('id, company_id, location_id, login_id, owner_name, owner_phone, password_hash, status, temporary_password')
            .eq('company_id', companyId)
            .eq('login_id_normalized', loginId)
            .maybeSingle<OwnerAccountRow>();
        if (error) throw error;
        if (!account || account.status !== 'active') return fail(401, 'AUTH_REQUIRED', '점주 계정을 확인할 수 없습니다.');
        if (!await verifyOwnerPassword(password, account.password_hash)) {
            return fail(401, 'AUTH_REQUIRED', '아이디 또는 비밀번호가 올바르지 않습니다.');
        }

        const sessionToken = createOwnerSessionToken();
        const expiresAt = getOwnerSessionExpiresAt();
        const { error: sessionError } = await supabaseAdmin
            .from('franchise_owner_sessions')
            .insert({
                owner_account_id: account.id,
                session_token_hash: hashOwnerSessionToken(sessionToken),
                expires_at: expiresAt.toISOString()
            });
        if (sessionError) throw sessionError;

        await supabaseAdmin
            .from('franchise_owner_accounts')
            .update({ last_login_at: new Date().toISOString() })
            .eq('id', account.id);

        const cookieStore = await cookies();
        cookieStore.set(OWNER_SESSION_COOKIE, sessionToken, {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            expires: expiresAt
        });

        return ok({
            account: {
                loginId: account.login_id,
                ownerName: account.owner_name,
                temporaryPassword: account.temporary_password === true
            }
        });
    } catch (error) {
        console.error('Owner login error:', error);
        return fail(500, 'INTERNAL_ERROR', '점주 로그인에 실패했습니다.');
    }
}
