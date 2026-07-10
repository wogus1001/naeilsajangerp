import type { SupabaseClient } from '@supabase/supabase-js';
import { fail } from '@/lib/api-response';
import {
    canAccessCompanyScope,
    getAuthenticatedRequesterProfile,
    isAdmin,
    resolveCompanyIdByName,
    type RequesterProfile
} from '@/lib/api-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export type OwnerPortalStaffAuth = {
    readonly supabaseAdmin: SupabaseClient;
    readonly requester: RequesterProfile;
};

export type OwnerPortalCompanyScope = {
    readonly companyId: string;
};

export function isOwnerPortalManager(requester: RequesterProfile): boolean {
    return isAdmin(requester) || requester.role === 'manager' || requester.role === 'sub_manager';
}

function readOwnerPortalErrorText(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    if (error && typeof error === 'object') {
        return ['message', 'details', 'hint', 'code']
            .map(key => {
                const value = (error as Record<string, unknown>)[key];
                return typeof value === 'string' ? value : '';
            })
            .filter(Boolean)
            .join(' ');
    }
    return '';
}

export function isMissingOwnerPortalSchemaError(error: unknown): boolean {
    const message = readOwnerPortalErrorText(error).toLowerCase();
    return message.includes('franchise_owner_') || message.includes('does not exist') || message.includes('schema cache');
}

export function isMissingOwnerNoticeAttachmentsColumnError(error: unknown): boolean {
    const message = readOwnerPortalErrorText(error).toLowerCase();
    return message.includes('attachments') && (
        message.includes('franchise_owner_notices')
        || message.includes('schema cache')
        || message.includes('does not exist')
        || message.includes('column')
    );
}

export async function resolveOwnerPortalStaffAuth(request: Request): Promise<
    | { readonly ok: true; readonly auth: OwnerPortalStaffAuth }
    | { readonly ok: false; readonly response: Response }
> {
    const supabaseAdmin = getSupabaseAdmin();
    const requester = await getAuthenticatedRequesterProfile(supabaseAdmin, request);
    if (!requester) return { ok: false, response: fail(401, 'AUTH_REQUIRED', '로그인이 필요합니다.') };
    return { ok: true, auth: { supabaseAdmin, requester } };
}

export async function resolveOwnerPortalCompanyScope(
    auth: OwnerPortalStaffAuth,
    companyIdRaw: string | null | undefined,
    companyNameRaw: string | null | undefined
): Promise<
    | { readonly ok: true; readonly scope: OwnerPortalCompanyScope }
    | { readonly ok: false; readonly response: Response }
> {
    const companyId = companyIdRaw || await resolveCompanyIdByName(auth.supabaseAdmin, companyNameRaw || null) || auth.requester.company_id;
    if (!companyId) return { ok: false, response: fail(400, 'VALIDATION_ERROR', '회사 정보를 확인할 수 없습니다.') };
    if (!canAccessCompanyScope(auth.requester, companyId)) {
        return { ok: false, response: fail(403, 'FORBIDDEN', '회사 범위가 일치하지 않습니다.') };
    }
    return { ok: true, scope: { companyId } };
}

export async function fetchOwnerPortalLocation(
    supabaseAdmin: SupabaseClient,
    companyId: string,
    locationId: string
): Promise<
    | { readonly ok: true; readonly location: { readonly id: string; readonly data: unknown; readonly name: string | null } }
    | { readonly ok: false; readonly response: Response }
> {
    const { data, error } = await supabaseAdmin
        .from('franchise_locations')
        .select('id, data, name')
        .eq('id', locationId)
        .eq('company_id', companyId)
        .maybeSingle<{ readonly id: string; readonly data: unknown; readonly name: string | null }>();
    if (error) throw error;
    if (!data) return { ok: false, response: fail(404, 'NOT_FOUND', '운영점을 찾을 수 없습니다.') };
    return { ok: true, location: data };
}
