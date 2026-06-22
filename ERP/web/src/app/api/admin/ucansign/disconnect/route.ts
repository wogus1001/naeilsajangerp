import { getAuthenticatedRequesterProfile, isAdmin } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { missingUcansignPlatformEnv } from '@/lib/ucansign/platform-config';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const requester = await getAuthenticatedRequesterProfile(supabaseAdmin, request);
        if (!requester) return fail(401, 'AUTH_REQUIRED', 'authenticated session is required');
        if (!isAdmin(requester)) return fail(403, 'FORBIDDEN', 'Admin access required');

        return ok({
            authMode: 'api_key',
            disconnected: missingUcansignPlatformEnv().length > 0,
            message: 'API KEY 방식은 DB 연결을 해제하지 않습니다. 해제가 필요하면 서버 환경변수 UCANSIGN_API_KEY를 제거하세요.'
        });
    } catch (error) {
        console.error('Admin UCANSIGN disconnect error:', error);
        return fail(500, 'INTERNAL_ERROR', 'Failed to disconnect UCanSign platform account');
    }
}
