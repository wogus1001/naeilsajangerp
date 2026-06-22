import { NextResponse } from 'next/server';
import { getAuthenticatedRequesterProfile, isAdmin } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { missingUcansignPlatformEnv } from '@/lib/ucansign/platform-config';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const supabaseAdmin = getSupabaseAdmin();
    const requester = await getAuthenticatedRequesterProfile(supabaseAdmin, request);
    if (!requester) return fail(401, 'AUTH_REQUIRED', 'authenticated session is required');
    if (!isAdmin(requester)) return fail(403, 'FORBIDDEN', 'Admin access required');

    const missingEnv = missingUcansignPlatformEnv();
    if (missingEnv.length > 0) {
        return fail(500, 'INTERNAL_ERROR', `Missing UCanSign env: ${missingEnv.join(', ')}`);
    }

    if (request.headers.get('accept')?.includes('application/json')) {
        return ok({
            authMode: 'api_key',
            connected: true,
            message: 'UCANSIGN_API_KEY 환경변수로 내일사장 공용 유캔싸인 발송을 관리합니다.'
        });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    return NextResponse.redirect(`${appUrl}/contracts/electronic?ucansign=api_key`);
}
