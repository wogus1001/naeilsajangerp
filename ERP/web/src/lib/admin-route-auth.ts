import type { SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import {
    getAuthenticatedRequesterProfile,
    isAdmin,
    type RequesterProfile
} from '@/lib/api-auth';

export type AdminGuardResult = {
    readonly ok: true;
    readonly requester: RequesterProfile;
} | {
    readonly ok: false;
    readonly response: NextResponse;
};

export async function requireAdminRequester(
    supabaseAdmin: SupabaseClient,
    request: Request
): Promise<AdminGuardResult> {
    const requester = await getAuthenticatedRequesterProfile(supabaseAdmin, request);
    if (!requester) {
        return {
            ok: false,
            response: NextResponse.json({ error: '로그인이 필요합니다.', code: 'AUTH_REQUIRED' }, { status: 401 })
        };
    }
    if (!isAdmin(requester)) {
        return {
            ok: false,
            response: NextResponse.json({ error: '관리자 권한이 필요합니다.', code: 'FORBIDDEN' }, { status: 403 })
        };
    }
    return { ok: true, requester };
}

export async function requireCompanyOperatorRequester(
    supabaseAdmin: SupabaseClient,
    request: Request
): Promise<AdminGuardResult> {
    const requester = await getAuthenticatedRequesterProfile(supabaseAdmin, request);
    if (!requester) {
        return {
            ok: false,
            response: NextResponse.json({ error: '로그인이 필요합니다.', code: 'AUTH_REQUIRED' }, { status: 401 })
        };
    }
    if (isAdmin(requester) || requester.role === 'manager') return { ok: true, requester };
    return {
        ok: false,
        response: NextResponse.json({ error: '관리 권한이 필요합니다.', code: 'FORBIDDEN' }, { status: 403 })
    };
}
