import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
    getAuthenticatedRequesterProfile,
    resolveUserUuid as resolveApiUserUuid,
    type RequesterProfile
} from '@/lib/api-auth';

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type RequesterProfileRow = RequesterProfile;

export type ProfileIdRow = {
    readonly id: string;
};

export type UserListProfileRow = {
    readonly id: string;
    readonly email: string | null;
    readonly name: string | null;
    readonly company_id: string | null;
    readonly role: string | null;
    readonly status: string | null;
    readonly created_at: string | null;
    readonly company: { readonly name: string | null } | null;
};

type RequesterLookupResult = { readonly profile: RequesterProfileRow } | { readonly error: NextResponse };

type UserDeleteGuardContext = {
    readonly requesterProfile: Pick<RequesterProfileRow, 'id' | 'role'>;
    readonly targetProfile: Pick<RequesterProfileRow, 'id' | 'role' | 'company_id'>;
    readonly otherManagersCount: number;
    readonly otherMembersCount: number;
};

export type UserDeleteGuardResult =
    | { readonly allowed: true }
    | { readonly allowed: false; readonly status: 400 | 403; readonly error: string };

export async function resolveUserUuid(supabaseAdmin: SupabaseClient, rawId: string | null) {
    return resolveApiUserUuid(supabaseAdmin, rawId);
}

export async function getRequesterProfile(
    supabaseAdmin: SupabaseClient,
    request: Request,
    searchParams: URLSearchParams
): Promise<RequesterLookupResult> {
    const authenticatedProfile = await getAuthenticatedRequesterProfile(supabaseAdmin, request);
    if (authenticatedProfile) return { profile: authenticatedProfile };

    const requesterRaw = searchParams.get('requesterId') || request.headers.get('x-user-id');
    const requesterUuid = await resolveUserUuid(supabaseAdmin, requesterRaw);
    if (!requesterUuid) return { error: NextResponse.json({ error: 'requesterId is required' }, { status: 401 }) };

    const { data: requesterProfile, error: requesterError } = await supabaseAdmin
        .from('profiles')
        .select('id, role, company_id')
        .eq('id', requesterUuid)
        .single<RequesterProfileRow>();
    if (requesterError || !requesterProfile) return { error: NextResponse.json({ error: 'Requester profile not found' }, { status: 401 }) };

    return { profile: requesterProfile };
}

export async function requireAdminRequester(
    supabaseAdmin: SupabaseClient,
    request: Request
): Promise<RequesterLookupResult> {
    const requesterProfile = await getAuthenticatedRequesterProfile(supabaseAdmin, request);
    if (!requesterProfile) return { error: NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 }) };

    if (requesterProfile.role !== 'admin') {
        return { error: NextResponse.json({ error: 'Forbidden: Admins only' }, { status: 403 }) };
    }

    return { profile: requesterProfile };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function getStringField(value: unknown, key: string): string | null {
    if (!isRecord(value)) return null;
    const rawValue = value[key];
    if (typeof rawValue !== 'string') return null;
    const trimmed = rawValue.trim();
    return trimmed.length > 0 ? trimmed : null;
}

export function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (isRecord(error) && typeof error.message === 'string') return error.message;
    return String(error);
}

export function evaluateUserDeleteGuard(context: UserDeleteGuardContext): UserDeleteGuardResult {
    const { requesterProfile, targetProfile, otherManagersCount, otherMembersCount } = context;

    if (requesterProfile.role !== 'admin' && requesterProfile.id !== targetProfile.id) {
        return { allowed: false, status: 403, error: 'Forbidden: You can only delete your own account' };
    }

    if (targetProfile.role === 'admin') {
        return { allowed: false, status: 403, error: '관리자 계정은 사용자 관리에서 삭제할 수 없습니다.' };
    }

    if (targetProfile.role === 'manager' && otherManagersCount === 0 && otherMembersCount > 0) {
        return {
            allowed: false,
            status: 400,
            error: '남은 직원이 있는 경우, 팀장은 최소 1명 이상 유지되어야 합니다. 다른 직원에게 팀장 권한을 위임하거나, 모든 직원을 정리한 후 다시 시도해주세요.'
        };
    }

    return { allowed: true };
}
