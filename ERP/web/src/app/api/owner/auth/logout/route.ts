import { cookies } from 'next/headers';
import { fail, ok } from '@/lib/api-response';
import { OWNER_SESSION_COOKIE, hashOwnerSessionToken, readOwnerSessionToken } from '@/lib/franchise-owner-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST() {
    try {
        const token = await readOwnerSessionToken();
        const supabaseAdmin = getSupabaseAdmin();
        if (token) {
            await supabaseAdmin
                .from('franchise_owner_sessions')
                .update({ revoked_at: new Date().toISOString() })
                .eq('session_token_hash', hashOwnerSessionToken(token));
        }
        const cookieStore = await cookies();
        cookieStore.set(OWNER_SESSION_COOKIE, '', { path: '/', expires: new Date(0) });
        return ok({ success: true });
    } catch (error) {
        console.error('Owner logout error:', error);
        return fail(500, 'INTERNAL_ERROR', '로그아웃에 실패했습니다.');
    }
}
