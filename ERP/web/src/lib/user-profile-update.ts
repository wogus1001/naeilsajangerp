import type { SupabaseClient } from '@supabase/supabase-js';
import { isLoginIdSchemaMissing } from '@/lib/login-id';

export const PROFILE_UPDATE_SELECTS = {
    withLogo: '*, company:companies!company_id(name, logo_url)',
    fallback: '*, company:companies!company_id(name)'
} as const;

export type ResolvedProfile = {
    readonly id: string;
    readonly email: string | null;
    readonly company_id: string | null;
    readonly login_id?: string | null;
};

export type ProfileUpdates = {
    name?: string;
    email?: string;
    phone?: string;
    phone_normalized?: string;
};

export async function selectProfileById(
    supabaseAdmin: SupabaseClient,
    id: string
): Promise<ResolvedProfile | null> {
    const result = await supabaseAdmin
        .from('profiles')
        .select('id, email, company_id, login_id')
        .eq('id', id)
        .single<ResolvedProfile>();

    if (!isLoginIdSchemaMissing(result.error)) {
        return result.data;
    }

    const fallbackResult = await supabaseAdmin
        .from('profiles')
        .select('id, email, company_id')
        .eq('id', id)
        .single<Omit<ResolvedProfile, 'login_id'>>();

    return fallbackResult.data ? { ...fallbackResult.data, login_id: null } : null;
}

export async function selectProfileByEmail(
    supabaseAdmin: SupabaseClient,
    email: string
): Promise<ResolvedProfile | null> {
    const result = await supabaseAdmin
        .from('profiles')
        .select('id, email, company_id, login_id')
        .eq('email', email)
        .single<ResolvedProfile>();

    if (!isLoginIdSchemaMissing(result.error)) {
        return result.data;
    }

    const fallbackResult = await supabaseAdmin
        .from('profiles')
        .select('id, email, company_id')
        .eq('email', email)
        .single<Omit<ResolvedProfile, 'login_id'>>();

    return fallbackResult.data ? { ...fallbackResult.data, login_id: null } : null;
}
