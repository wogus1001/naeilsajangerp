import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface RequesterProfile {
    id: string;
    role: string | null;
    company_id: string | null;
    status?: string | null;
}

export function isActiveRequester(requester: RequesterProfile | null): requester is RequesterProfile {
    return requester?.status === 'active';
}

type RequesterProfileRow = {
    readonly id: string;
    readonly role: string | null;
    readonly company_id: string | null;
    readonly status: string | null;
};

function normalizeRawUser(rawUser: string | null | undefined): string | null {
    if (!rawUser) return null;
    const normalized = String(rawUser).trim();
    return normalized.length > 0 ? normalized : null;
}

export function extractRequesterRaw(request: Request, fallbackRaw?: string | null): string | null {
    const { searchParams } = new URL(request.url);

    return normalizeRawUser(
        searchParams.get('requesterId') ||
        searchParams.get('userId') ||
        request.headers.get('x-user-id') ||
        fallbackRaw ||
        null
    );
}

export function extractBearerToken(request: Request): string | null {
    const authorization = request.headers.get('authorization') || request.headers.get('Authorization') || '';
    const bearerToken = authorization.toLowerCase().startsWith('bearer ')
        ? authorization.slice(7).trim()
        : '';
    return bearerToken || request.headers.get('x-access-token')?.trim() || null;
}

async function resolveAuthenticatedUserId(request: Request): Promise<string | null> {
    const token = extractBearerToken(request);
    if (!token) return null;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) return null;

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user?.id) return null;
    return data.user.id;
}

export async function resolveUserUuid(
    supabaseAdmin: SupabaseClient,
    rawUser: string | null | undefined
): Promise<string | null> {
    const normalized = normalizeRawUser(rawUser);
    if (!normalized) return null;
    if (UUID_REGEX.test(normalized)) return normalized;

    const emailCandidate = normalized.includes('@') ? normalized : `${normalized}@example.com`;

    const { data: userByEmail } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', emailCandidate)
        .maybeSingle();

    if (userByEmail?.id) return userByEmail.id;

    return null;
}

async function fetchRequesterProfileById(
    supabaseAdmin: SupabaseClient,
    requesterId: string
): Promise<RequesterProfile | null> {
    const { data: requester } = await supabaseAdmin
        .from('profiles')
        .select('id, role, company_id, status')
        .eq('id', requesterId)
        .maybeSingle<RequesterProfileRow>();

    if (!requester) return null;

    return {
        id: requester.id,
        role: requester.role,
        company_id: requester.company_id,
        status: requester.status
    };
}

export async function getActiveRequesterProfileById(
    supabaseAdmin: SupabaseClient,
    requesterId: string
): Promise<RequesterProfile | null> {
    const requester = await fetchRequesterProfileById(supabaseAdmin, requesterId);
    return isActiveRequester(requester) ? requester : null;
}

export async function resolveCompanyIdByName(
    supabaseAdmin: SupabaseClient,
    companyName: string | null | undefined
): Promise<string | null> {
    const normalized = normalizeRawUser(companyName);
    if (!normalized) return null;

    const { data: company } = await supabaseAdmin
        .from('companies')
        .select('id')
        .eq('name', normalized)
        .maybeSingle();

    return company?.id || null;
}

export async function getRequesterProfile(
    supabaseAdmin: SupabaseClient,
    request: Request,
    fallbackRaw?: string | null
): Promise<RequesterProfile | null> {
    const authenticatedUserId = await resolveAuthenticatedUserId(request);
    if (!authenticatedUserId) return null;

    const requesterRaw = extractRequesterRaw(request, fallbackRaw);

    if (requesterRaw) {
        const requesterId = await resolveUserUuid(supabaseAdmin, requesterRaw);
        if (!requesterId || requesterId !== authenticatedUserId) return null;
    }

    return getActiveRequesterProfileById(supabaseAdmin, authenticatedUserId);
}

export async function getAuthenticatedRequesterProfile(
    supabaseAdmin: SupabaseClient,
    request: Request
): Promise<RequesterProfile | null> {
    const authenticatedUserId = await resolveAuthenticatedUserId(request);
    if (!authenticatedUserId) return null;
    return getActiveRequesterProfileById(supabaseAdmin, authenticatedUserId);
}

export function isAdmin(requester: RequesterProfile | null): boolean {
    return requester?.role === 'admin';
}

export function canAccessCompanyScope(
    requester: RequesterProfile | null,
    targetCompanyId: string | null | undefined
): boolean {
    if (!requester) return false;
    if (isAdmin(requester)) return true;
    if (!requester.company_id || !targetCompanyId) return false;
    return requester.company_id === targetCompanyId;
}

export function canAccessCompanyResource(
    requester: RequesterProfile | null,
    resource: { company_id: string | null; manager_id?: string | null; user_id?: string | null }
): boolean {
    if (!requester) return false;
    if (isAdmin(requester)) return true;

    if (requester.company_id && resource.company_id && requester.company_id === resource.company_id) {
        return true;
    }

    const ownerId = resource.manager_id || resource.user_id || null;
    if (ownerId && ownerId === requester.id) {
        return true;
    }

    return false;
}
