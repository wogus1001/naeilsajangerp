import type { SupabaseClient } from '@supabase/supabase-js';
import {
    canAccessCompanyScope,
    getAuthenticatedRequesterProfile,
    isAdmin,
    resolveCompanyIdByName,
    resolveUserUuid,
    type RequesterProfile
} from '@/lib/api-auth';
import { fail } from '@/lib/api-response';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export type JsonRecord = Record<string, unknown>;

export type SupervisionAuth = {
    readonly supabaseAdmin: SupabaseClient;
    readonly requester: RequesterProfile;
};

export type SupervisionLocationRow = {
    readonly id: string;
    readonly company_id: string | null;
    readonly name: string | null;
    readonly brand: string | null;
    readonly region: string | null;
    readonly address: string | null;
};

export type SupervisionProfileRow = {
    readonly id: string;
    readonly name: string | null;
    readonly login_id: string | null;
    readonly email: string | null;
    readonly role: string | null;
    readonly company_id: string | null;
    readonly status: string | null;
};

const MUTATION_ROLES = new Set(['admin', 'manager']);

export function cleanString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

export function isRecord(value: unknown): value is JsonRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function readJsonBody(request: Request): Promise<JsonRecord> {
    const parsed: unknown = await request.json().catch(() => ({}));
    return isRecord(parsed) ? parsed : {};
}

export function getFirst(body: JsonRecord, keys: readonly string[]): unknown {
    for (const key of keys) {
        if (Object.prototype.hasOwnProperty.call(body, key)) return body[key];
    }
    return undefined;
}

export function isSupervisionManager(requester: RequesterProfile): boolean {
    return MUTATION_ROLES.has(requester.role || '');
}

export function isMissingSupervisionSchemaError(error: unknown): boolean {
    if (!isRecord(error)) return false;
    const code = cleanString(error.code);
    const message = cleanString(error.message);
    return ['PGRST204', 'PGRST205', '42P01', '42703'].includes(code)
        && /franchise_supervisor_assignments|franchise_store_visits|franchise_inspection_reports|franchise_corrective_actions|franchise_supervision_report_templates|franchise_supervision_report_events|franchise_corrective_action_events/i.test(message);
}

export async function resolveSupervisionAuth(request: Request): Promise<
    | { readonly ok: true; readonly auth: SupervisionAuth }
    | { readonly ok: false; readonly response: Response }
> {
    const supabaseAdmin = getSupabaseAdmin();
    const requester = await getAuthenticatedRequesterProfile(supabaseAdmin, request);
    if (!requester) return { ok: false, response: fail(401, 'AUTH_REQUIRED', '로그인이 필요합니다.') };
    return { ok: true, auth: { requester, supabaseAdmin } };
}

export async function resolveSupervisionCompanyId(
    auth: SupervisionAuth,
    companyIdInput: unknown,
    companyNameInput: unknown
): Promise<
    | { readonly ok: true; readonly companyId: string }
    | { readonly ok: false; readonly response: Response }
> {
    const requestedCompanyId = cleanString(companyIdInput);
    const companyName = cleanString(companyNameInput);
    const resolvedByName = companyName ? await resolveCompanyIdByName(auth.supabaseAdmin, companyName) : null;
    const companyId = isAdmin(auth.requester)
        ? requestedCompanyId || resolvedByName || auth.requester.company_id
        : auth.requester.company_id;

    if (!companyId) return { ok: false, response: fail(400, 'VALIDATION_ERROR', '회사 정보가 필요합니다.') };
    if (!canAccessCompanyScope(auth.requester, companyId)) {
        return { ok: false, response: fail(403, 'FORBIDDEN', '슈퍼바이징 접근 권한이 없습니다.') };
    }
    return { ok: true, companyId };
}

export type ResolveProfileInCompanyInput = {
    readonly supabaseAdmin: SupabaseClient;
    readonly rawProfileId: unknown;
    readonly companyId: string;
    readonly message: string;
};

export async function resolveProfileInCompany(input: ResolveProfileInCompanyInput): Promise<
    | { readonly ok: true; readonly profileId: string }
    | { readonly ok: false; readonly response: Response }
> {
    const profileId = await resolveUserUuid(input.supabaseAdmin, cleanString(input.rawProfileId));
    if (!profileId) return { ok: false, response: fail(400, 'VALIDATION_ERROR', input.message) };

    const { data, error } = await input.supabaseAdmin
        .from('profiles')
        .select('id, company_id, status')
        .eq('id', profileId)
        .maybeSingle<{ readonly id: string; readonly company_id: string | null; readonly status: string | null }>();
    if (error) throw error;
    if (!data || data.company_id !== input.companyId) return { ok: false, response: fail(403, 'FORBIDDEN', '담당자의 회사 범위가 일치하지 않습니다.') };
    if (data.status !== 'active') return { ok: false, response: fail(400, 'VALIDATION_ERROR', '활성 상태인 담당자만 지정할 수 있습니다.') };
    return { ok: true, profileId };
}

export async function fetchLocationInCompany(
    supabaseAdmin: SupabaseClient,
    locationId: string,
    companyId: string
): Promise<
    | { readonly ok: true; readonly location: SupervisionLocationRow }
    | { readonly ok: false; readonly response: Response }
> {
    const { data, error } = await supabaseAdmin
        .from('franchise_locations')
        .select('id, company_id, name, brand, region, address')
        .eq('id', locationId)
        .maybeSingle<SupervisionLocationRow>();
    if (error) throw error;
    if (!data) return { ok: false, response: fail(404, 'NOT_FOUND', '운영점을 찾을 수 없습니다.') };
    if (data.company_id !== companyId) return { ok: false, response: fail(403, 'FORBIDDEN', '운영점의 회사 범위가 일치하지 않습니다.') };
    return { ok: true, location: data };
}

export async function fetchCompanyProfiles(
    supabaseAdmin: SupabaseClient,
    companyId: string
): Promise<readonly SupervisionProfileRow[]> {
    const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('id, name, login_id, email, role, company_id, status')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('name', { ascending: true })
        .returns<SupervisionProfileRow[]>();
    if (error) throw error;
    return data || [];
}

export function ensureCanManageSupervision(requester: RequesterProfile): Response | null {
    if (isSupervisionManager(requester)) return null;
    return fail(403, 'FORBIDDEN', '슈퍼바이징을 수정할 권한이 없습니다.');
}

export function canAccessSupervisorResource(
    requester: RequesterProfile,
    resource: { readonly company_id: string | null; readonly supervisor_profile_id?: string | null; readonly created_by?: string | null; readonly assignee_profile_id?: string | null }
): boolean {
    if (isSupervisionManager(requester)) return canAccessCompanyScope(requester, resource.company_id);
    if (!canAccessCompanyScope(requester, resource.company_id)) return false;
    return resource.supervisor_profile_id === requester.id
        || resource.created_by === requester.id
        || resource.assignee_profile_id === requester.id;
}
