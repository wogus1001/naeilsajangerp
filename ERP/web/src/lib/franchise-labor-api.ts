import type { SupabaseClient } from '@supabase/supabase-js';
import {
    canAccessCompanyScope,
    getAuthenticatedRequesterProfile,
    isAdmin,
    resolveCompanyIdByName,
    type RequesterProfile
} from '@/lib/api-auth';
import { fail } from '@/lib/api-response';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { DEFAULT_LABOR_SETTINGS, type LaborSettings, type LaborWeekday } from '@/lib/franchise-labor-planning';

export type JsonRecord = Record<string, unknown>;

export type LaborAuth = {
    readonly supabaseAdmin: SupabaseClient;
    readonly requester: RequesterProfile;
};

export type LaborLocationRow = {
    readonly id: string;
    readonly company_id: string | null;
    readonly name: string | null;
};

export type LaborSettingsRow = {
    readonly effective_year: number | null;
    readonly minimum_hourly_wage: number | null;
    readonly employee_insurance_rate: number | null;
    readonly employer_insurance_rate: number | null;
    readonly withholding_rate: number | null;
    readonly overtime_multiplier: number | null;
    readonly night_multiplier: number | null;
    readonly holiday_multiplier: number | null;
};

const WRITE_ROLES = new Set(['admin', 'manager', 'sub_manager', 'staff']);

export function cleanLaborString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

export function isLaborRecord(value: unknown): value is JsonRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function readLaborJsonBody(request: Request): Promise<JsonRecord> {
    const parsed: unknown = await request.json().catch(() => ({}));
    return isLaborRecord(parsed) ? parsed : {};
}

export function getLaborBodyValue(body: JsonRecord, keys: readonly string[]): unknown {
    for (const key of keys) {
        if (Object.prototype.hasOwnProperty.call(body, key)) return body[key];
    }
    return undefined;
}

export function numberFromBody(value: unknown, fallback: number): number {
    const parsed = typeof value === 'number' ? value : Number(cleanLaborString(value));
    return Number.isFinite(parsed) ? parsed : fallback;
}

export function stringArrayFromBody(value: unknown): readonly string[] {
    if (!Array.isArray(value)) return [];
    return value.map(item => cleanLaborString(item)).filter(Boolean);
}

export function weekdaysFromBody(value: unknown): readonly LaborWeekday[] {
    const weekdays: LaborWeekday[] = [];
    for (const item of stringArrayFromBody(value)) {
        if (item === 'mon' || item === 'tue' || item === 'wed' || item === 'thu' || item === 'fri' || item === 'sat' || item === 'sun') {
            weekdays.push(item);
        }
    }
    return weekdays;
}

export function canUseLaborPlanning(requester: RequesterProfile): boolean {
    return requester.role !== 'partner_vendor';
}

export function canWriteLaborPlan(requester: RequesterProfile): boolean {
    return WRITE_ROLES.has(requester.role || '');
}

export function canManageLaborSettings(requester: RequesterProfile): boolean {
    return requester.role === 'admin' || requester.role === 'manager';
}

export function normalizeLaborSettings(row?: LaborSettingsRow | null): LaborSettings {
    return {
        effectiveYear: row?.effective_year || DEFAULT_LABOR_SETTINGS.effectiveYear,
        minimumHourlyWage: row?.minimum_hourly_wage || DEFAULT_LABOR_SETTINGS.minimumHourlyWage,
        employeeInsuranceRate: row?.employee_insurance_rate || DEFAULT_LABOR_SETTINGS.employeeInsuranceRate,
        employerInsuranceRate: row?.employer_insurance_rate || DEFAULT_LABOR_SETTINGS.employerInsuranceRate,
        withholdingRate: row?.withholding_rate || DEFAULT_LABOR_SETTINGS.withholdingRate,
        overtimeMultiplier: row?.overtime_multiplier || DEFAULT_LABOR_SETTINGS.overtimeMultiplier,
        nightMultiplier: row?.night_multiplier || DEFAULT_LABOR_SETTINGS.nightMultiplier,
        holidayMultiplier: row?.holiday_multiplier || DEFAULT_LABOR_SETTINGS.holidayMultiplier
    };
}

export function settingsFromBody(value: unknown): LaborSettings {
    if (!isLaborRecord(value)) return DEFAULT_LABOR_SETTINGS;
    return {
        effectiveYear: numberFromBody(value.effectiveYear ?? value.effective_year, DEFAULT_LABOR_SETTINGS.effectiveYear),
        minimumHourlyWage: numberFromBody(value.minimumHourlyWage ?? value.minimum_hourly_wage, DEFAULT_LABOR_SETTINGS.minimumHourlyWage),
        employeeInsuranceRate: numberFromBody(value.employeeInsuranceRate ?? value.employee_insurance_rate, DEFAULT_LABOR_SETTINGS.employeeInsuranceRate),
        employerInsuranceRate: numberFromBody(value.employerInsuranceRate ?? value.employer_insurance_rate, DEFAULT_LABOR_SETTINGS.employerInsuranceRate),
        withholdingRate: numberFromBody(value.withholdingRate ?? value.withholding_rate, DEFAULT_LABOR_SETTINGS.withholdingRate),
        overtimeMultiplier: numberFromBody(value.overtimeMultiplier ?? value.overtime_multiplier, DEFAULT_LABOR_SETTINGS.overtimeMultiplier),
        nightMultiplier: numberFromBody(value.nightMultiplier ?? value.night_multiplier, DEFAULT_LABOR_SETTINGS.nightMultiplier),
        holidayMultiplier: numberFromBody(value.holidayMultiplier ?? value.holiday_multiplier, DEFAULT_LABOR_SETTINGS.holidayMultiplier)
    };
}

export function isMissingLaborSchemaError(error: unknown): boolean {
    if (!isLaborRecord(error)) return false;
    const code = cleanLaborString(error.code);
    const message = cleanLaborString(error.message);
    return ['PGRST204', 'PGRST205', '42P01', '42703'].includes(code)
        && /franchise_labor_settings|franchise_labor_staffing_plans|franchise_labor_staffing_roles/i.test(message);
}

export async function resolveLaborAuth(request: Request): Promise<
    | { readonly ok: true; readonly auth: LaborAuth }
    | { readonly ok: false; readonly response: Response }
> {
    const supabaseAdmin = getSupabaseAdmin();
    const requester = await getAuthenticatedRequesterProfile(supabaseAdmin, request);
    if (!requester) return { ok: false, response: fail(401, 'AUTH_REQUIRED', '로그인이 필요합니다.') };
    if (!canUseLaborPlanning(requester)) return { ok: false, response: fail(403, 'FORBIDDEN', '인력 세팅 접근 권한이 없습니다.') };
    return { ok: true, auth: { supabaseAdmin, requester } };
}

export async function resolveLaborCompanyId(
    auth: LaborAuth,
    companyIdInput: unknown,
    companyNameInput: unknown
): Promise<
    | { readonly ok: true; readonly companyId: string }
    | { readonly ok: false; readonly response: Response }
> {
    const requestedCompanyId = cleanLaborString(companyIdInput);
    const companyName = cleanLaborString(companyNameInput);
    const resolvedByName = companyName ? await resolveCompanyIdByName(auth.supabaseAdmin, companyName) : null;
    const companyId = isAdmin(auth.requester)
        ? requestedCompanyId || resolvedByName || auth.requester.company_id
        : auth.requester.company_id;
    if (!companyId) return { ok: false, response: fail(400, 'VALIDATION_ERROR', '회사 정보가 필요합니다.') };
    if (!canAccessCompanyScope(auth.requester, companyId)) {
        return { ok: false, response: fail(403, 'FORBIDDEN', '회사 범위가 일치하지 않습니다.') };
    }
    return { ok: true, companyId };
}

export async function fetchLaborLocationInCompany(
    supabaseAdmin: SupabaseClient,
    locationId: string,
    companyId: string
): Promise<
    | { readonly ok: true; readonly location: LaborLocationRow }
    | { readonly ok: false; readonly response: Response }
> {
    const { data, error } = await supabaseAdmin
        .from('franchise_locations')
        .select('id, company_id, name')
        .eq('id', locationId)
        .maybeSingle<LaborLocationRow>();
    if (error) throw error;
    if (!data) return { ok: false, response: fail(404, 'NOT_FOUND', '운영점을 찾을 수 없습니다.') };
    if (data.company_id !== companyId) return { ok: false, response: fail(403, 'FORBIDDEN', '운영점의 회사 범위가 일치하지 않습니다.') };
    return { ok: true, location: data };
}
