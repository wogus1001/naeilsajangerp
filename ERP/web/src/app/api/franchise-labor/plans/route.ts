import { fail, ok } from '@/lib/api-response';
import {
    canWriteLaborPlan,
    cleanLaborString,
    fetchLaborLocationInCompany,
    getLaborBodyValue,
    isLaborRecord,
    isMissingLaborSchemaError,
    numberFromBody,
    partTimeWeekdaysFromBody,
    readLaborJsonBody,
    resolveLaborAuth,
    resolveLaborCompanyId,
    settingsFromBody,
    weekdaysFromBody
} from '@/lib/franchise-labor-api';
import { calculateLaborPlan, type LaborPlanInput } from '@/lib/franchise-labor-planning';

export const dynamic = 'force-dynamic';

type PlanRow = {
    readonly id: string;
    readonly company_id: string;
    readonly location_id: string;
    readonly title: string | null;
    readonly monthly_sales_target: number | null;
    readonly target_labor_ratio: number | null;
    readonly operating_weekdays: unknown;
    readonly open_time: string | null;
    readonly close_time: string | null;
    readonly summary: unknown;
    readonly schedule: unknown;
    readonly memo: string | null;
    readonly status: string | null;
    readonly created_at: string | null;
};

type ExistingPlanRow = {
    readonly id: string;
    readonly company_id: string;
    readonly location_id: string;
};

type RoleRow = {
    readonly id: string;
    readonly plan_id: string;
    readonly role_key: string | null;
    readonly label: string | null;
    readonly employment_type: string | null;
    readonly headcount: number | null;
    readonly monthly_cost: number | null;
    readonly weekly_hours: number | null;
    readonly note: string | null;
    readonly sort_order: number | null;
};

function isVisibleLaborRole(role: unknown): boolean {
    if (!isLaborRecord(role)) return false;
    return cleanLaborString(role.roleType) !== 'freelancer'
        && cleanLaborString(role.role_key) !== 'freelancer'
        && cleanLaborString(role.label) !== '프리랜서';
}

function sanitizePlanSummary(summary: unknown): unknown {
    if (!isLaborRecord(summary)) return summary;
    if (!Array.isArray(summary.roles)) return summary;
    const roles = summary.roles.filter(isVisibleLaborRole);
    const monthlyLaborCost = roles.reduce((sum, role) => {
        if (!isLaborRecord(role)) return sum;
        return sum + numberFromBody(role.monthlyCost, 0);
    }, 0);
    const totalHeadcount = roles.reduce((sum, role) => {
        if (!isLaborRecord(role)) return sum;
        return sum + numberFromBody(role.headcount, 0);
    }, 0);
    const monthlySalesTarget = numberFromBody(summary.monthlySalesTarget, 0);
    const laborRatio = monthlySalesTarget > 0
        ? Number((monthlyLaborCost / monthlySalesTarget * 100).toFixed(1))
        : numberFromBody(summary.laborRatio, 0);
    return {
        ...summary,
        roles,
        monthlyLaborCost,
        totalHeadcount,
        laborRatio
    };
}

function buildPlanInput(body: Record<string, unknown>): LaborPlanInput {
    const settings = settingsFromBody(getLaborBodyValue(body, ['settings']));
    const operatingWeekdays = weekdaysFromBody(getLaborBodyValue(body, ['operatingWeekdays', 'operating_weekdays']));
    return {
        monthlySalesTarget: numberFromBody(getLaborBodyValue(body, ['monthlySalesTarget', 'monthly_sales_target']), 30_000_000),
        targetLaborRatio: numberFromBody(getLaborBodyValue(body, ['targetLaborRatio', 'target_labor_ratio']), 20),
        operatingWeekdays,
        partTimeWeekdays: partTimeWeekdaysFromBody(getLaborBodyValue(body, ['partTimeWeekdays', 'part_time_weekdays']), operatingWeekdays),
        openTime: cleanLaborString(getLaborBodyValue(body, ['openTime', 'open_time'])) || '10:00',
        closeTime: cleanLaborString(getLaborBodyValue(body, ['closeTime', 'close_time'])) || '22:00',
        ownerWorks: getLaborBodyValue(body, ['ownerWorks', 'owner_works']) === true,
        useBreakTime: getLaborBodyValue(body, ['useBreakTime', 'use_break_time']) !== false,
        breakStartTime: cleanLaborString(getLaborBodyValue(body, ['breakStartTime', 'break_start_time'])) || '15:00',
        breakEndTime: cleanLaborString(getLaborBodyValue(body, ['breakEndTime', 'break_end_time'])) || '17:00',
        managerMonthlySalary: numberFromBody(getLaborBodyValue(body, ['managerMonthlySalary', 'manager_monthly_salary']), 3_000_000),
        staffMonthlySalary: numberFromBody(getLaborBodyValue(body, ['staffMonthlySalary', 'staff_monthly_salary']), 2_600_000),
        partTimeHourlyWage: numberFromBody(getLaborBodyValue(body, ['partTimeHourlyWage', 'part_time_hourly_wage']), settings.minimumHourlyWage),
        settings
    };
}

function transformPlan(row: PlanRow, roles: readonly RoleRow[]) {
    return {
        id: row.id,
        companyId: row.company_id,
        locationId: row.location_id,
        title: row.title || '인력 세팅안',
        monthlySalesTarget: row.monthly_sales_target || 0,
        targetLaborRatio: row.target_labor_ratio || 0,
        operatingWeekdays: Array.isArray(row.operating_weekdays) ? row.operating_weekdays : [],
        openTime: row.open_time || '',
        closeTime: row.close_time || '',
        summary: sanitizePlanSummary(row.summary),
        schedule: row.schedule,
        memo: row.memo || '',
        status: row.status || 'active',
        createdAt: row.created_at,
        roles: roles
            .filter(role => role.plan_id === row.id && role.role_key !== 'freelancer' && role.label !== '프리랜서')
            .sort((left, right) => (left.sort_order || 0) - (right.sort_order || 0))
            .map(role => ({
                id: role.id,
                roleKey: role.role_key || '',
                label: role.label || '',
                employmentType: role.employment_type || '',
                headcount: role.headcount || 0,
                monthlyCost: role.monthly_cost || 0,
                weeklyHours: role.weekly_hours || 0,
                note: role.note || ''
            }))
    };
}

async function fetchExistingPlan(
    authResult: { readonly auth: import('@/lib/franchise-labor-api').LaborAuth },
    planId: string,
    companyId: string
): Promise<
    | { readonly ok: true; readonly plan: ExistingPlanRow }
    | { readonly ok: false; readonly response: Response }
> {
    const { data, error } = await authResult.auth.supabaseAdmin
        .from('franchise_labor_staffing_plans')
        .select('id, company_id, location_id')
        .eq('id', planId)
        .maybeSingle<ExistingPlanRow>();
    if (error) throw error;
    if (!data) return { ok: false, response: fail(404, 'NOT_FOUND', '인력 세팅안을 찾을 수 없습니다.') };
    if (data.company_id !== companyId) return { ok: false, response: fail(403, 'FORBIDDEN', '회사 범위가 일치하지 않습니다.') };
    return { ok: true, plan: data };
}

async function replacePlanRoles(
    authResult: { readonly auth: import('@/lib/franchise-labor-api').LaborAuth },
    planId: string,
    roles: ReturnType<typeof calculateLaborPlan>['roles']
): Promise<void> {
    const { error: deleteRoleError } = await authResult.auth.supabaseAdmin
        .from('franchise_labor_staffing_roles')
        .delete()
        .eq('plan_id', planId);
    if (deleteRoleError) throw deleteRoleError;

    const { error: roleError } = await authResult.auth.supabaseAdmin
        .from('franchise_labor_staffing_roles')
        .insert(roles.map((role, index) => ({
            plan_id: planId,
            role_key: role.roleType,
            label: role.label,
            employment_type: role.roleType,
            headcount: role.headcount,
            monthly_cost: role.monthlyCost,
            weekly_hours: role.weeklyHours,
            note: role.note,
            sort_order: index + 1
        })));
    if (roleError) throw roleError;
}

export async function GET(request: Request) {
    try {
        const authResult = await resolveLaborAuth(request);
        if (!authResult.ok) return authResult.response;
        const { searchParams } = new URL(request.url);
        const companyScope = await resolveLaborCompanyId(
            authResult.auth,
            searchParams.get('companyId'),
            searchParams.get('company')
        );
        if (!companyScope.ok) return companyScope.response;

        const locationId = cleanLaborString(searchParams.get('locationId'));
        const planResult = locationId
            ? await authResult.auth.supabaseAdmin
                .from('franchise_labor_staffing_plans')
                .select('id, company_id, location_id, title, monthly_sales_target, target_labor_ratio, operating_weekdays, open_time, close_time, summary, schedule, memo, status, created_at')
                .eq('company_id', companyScope.companyId)
                .eq('location_id', locationId)
                .order('created_at', { ascending: false })
                .limit(80)
                .returns<PlanRow[]>()
            : await authResult.auth.supabaseAdmin
                .from('franchise_labor_staffing_plans')
                .select('id, company_id, location_id, title, monthly_sales_target, target_labor_ratio, operating_weekdays, open_time, close_time, summary, schedule, memo, status, created_at')
                .eq('company_id', companyScope.companyId)
                .order('created_at', { ascending: false })
                .limit(80)
                .returns<PlanRow[]>();
        const { data: plans, error } = planResult;
        if (error) throw error;

        const planIds = (plans || []).map(plan => plan.id);
        const rolesResult = planIds.length > 0
            ? await authResult.auth.supabaseAdmin
                .from('franchise_labor_staffing_roles')
                .select('id, plan_id, role_key, label, employment_type, headcount, monthly_cost, weekly_hours, note, sort_order')
                .in('plan_id', planIds)
                .returns<RoleRow[]>()
            : { data: [], error: null };
        if (rolesResult.error) throw rolesResult.error;

        return ok({
            schemaReady: true,
            companyId: companyScope.companyId,
            plans: (plans || []).map(plan => transformPlan(plan, rolesResult.data || []))
        });
    } catch (error) {
        if (isMissingLaborSchemaError(error)) {
            return ok({ schemaReady: false, companyId: '', plans: [] });
        }
        console.error('Franchise labor plans GET error:', error);
        return fail(500, 'INTERNAL_ERROR', '인력 세팅안을 불러오지 못했습니다.');
    }
}

export async function POST(request: Request) {
    try {
        const authResult = await resolveLaborAuth(request);
        if (!authResult.ok) return authResult.response;
        if (!canWriteLaborPlan(authResult.auth.requester)) {
            return fail(403, 'FORBIDDEN', '인력 세팅안을 저장할 권한이 없습니다.');
        }

        const body = await readLaborJsonBody(request);
        const companyScope = await resolveLaborCompanyId(
            authResult.auth,
            getLaborBodyValue(body, ['companyId', 'company_id']),
            getLaborBodyValue(body, ['companyName', 'company'])
        );
        if (!companyScope.ok) return companyScope.response;

        const locationId = cleanLaborString(getLaborBodyValue(body, ['locationId', 'location_id']));
        if (!locationId) return fail(400, 'VALIDATION_ERROR', '운영점을 선택해주세요.');
        const location = await fetchLaborLocationInCompany(authResult.auth.supabaseAdmin, locationId, companyScope.companyId);
        if (!location.ok) return location.response;

        const input = buildPlanInput(body);
        const result = calculateLaborPlan(input);
        const title = cleanLaborString(getLaborBodyValue(body, ['title'])) || `${location.location.name || '운영점'} 인력 세팅안`;
        const { data: savedPlan, error: planError } = await authResult.auth.supabaseAdmin
            .from('franchise_labor_staffing_plans')
            .insert({
                company_id: companyScope.companyId,
                location_id: location.location.id,
                title,
                monthly_sales_target: input.monthlySalesTarget,
                target_labor_ratio: input.targetLaborRatio,
                operating_weekdays: input.operatingWeekdays,
                open_time: input.openTime,
                close_time: input.closeTime,
                settings_snapshot: input.settings,
                summary: result,
                schedule: result.weeklySchedule,
                memo: cleanLaborString(getLaborBodyValue(body, ['memo'])) || null,
                status: 'active',
                created_by: authResult.auth.requester.id,
                updated_by: authResult.auth.requester.id
            })
            .select('id')
            .single<{ readonly id: string }>();
        if (planError) throw planError;

        await replacePlanRoles(authResult, savedPlan.id, result.roles);

        return ok({ id: savedPlan.id, result }, 201);
    } catch (error) {
        if (isMissingLaborSchemaError(error)) {
            return fail(424, 'VALIDATION_ERROR', '인력 세팅 SQL이 아직 적용되지 않았습니다. supabase_franchise_labor_planning_migration.sql 적용 후 다시 확인해주세요.');
        }
        console.error('Franchise labor plans POST error:', error);
        return fail(500, 'INTERNAL_ERROR', '인력 세팅안을 저장하지 못했습니다.');
    }
}

export async function PUT(request: Request) {
    try {
        const authResult = await resolveLaborAuth(request);
        if (!authResult.ok) return authResult.response;
        if (!canWriteLaborPlan(authResult.auth.requester)) {
            return fail(403, 'FORBIDDEN', '인력 세팅안을 수정할 권한이 없습니다.');
        }

        const body = await readLaborJsonBody(request);
        const planId = cleanLaborString(getLaborBodyValue(body, ['id', 'planId', 'plan_id']));
        if (!planId) return fail(400, 'VALIDATION_ERROR', '수정할 인력 세팅안이 필요합니다.');

        const companyScope = await resolveLaborCompanyId(
            authResult.auth,
            getLaborBodyValue(body, ['companyId', 'company_id']),
            getLaborBodyValue(body, ['companyName', 'company'])
        );
        if (!companyScope.ok) return companyScope.response;

        const existingPlan = await fetchExistingPlan(authResult, planId, companyScope.companyId);
        if (!existingPlan.ok) return existingPlan.response;

        const locationId = cleanLaborString(getLaborBodyValue(body, ['locationId', 'location_id']));
        if (!locationId) return fail(400, 'VALIDATION_ERROR', '운영점을 선택해주세요.');
        const location = await fetchLaborLocationInCompany(authResult.auth.supabaseAdmin, locationId, companyScope.companyId);
        if (!location.ok) return location.response;

        const input = buildPlanInput(body);
        const result = calculateLaborPlan(input);
        const title = cleanLaborString(getLaborBodyValue(body, ['title'])) || `${location.location.name || '운영점'} 인력 세팅안`;
        const { error: updateError } = await authResult.auth.supabaseAdmin
            .from('franchise_labor_staffing_plans')
            .update({
                location_id: location.location.id,
                title,
                monthly_sales_target: input.monthlySalesTarget,
                target_labor_ratio: input.targetLaborRatio,
                operating_weekdays: input.operatingWeekdays,
                open_time: input.openTime,
                close_time: input.closeTime,
                settings_snapshot: input.settings,
                summary: result,
                schedule: result.weeklySchedule,
                memo: cleanLaborString(getLaborBodyValue(body, ['memo'])) || null,
                status: 'active',
                updated_by: authResult.auth.requester.id
            })
            .eq('id', existingPlan.plan.id)
            .eq('company_id', companyScope.companyId);
        if (updateError) throw updateError;

        await replacePlanRoles(authResult, existingPlan.plan.id, result.roles);

        return ok({ id: existingPlan.plan.id, result });
    } catch (error) {
        if (isMissingLaborSchemaError(error)) {
            return fail(424, 'VALIDATION_ERROR', '인력 세팅 SQL이 아직 적용되지 않았습니다. supabase_franchise_labor_planning_migration.sql 적용 후 다시 확인해주세요.');
        }
        console.error('Franchise labor plans PUT error:', error);
        return fail(500, 'INTERNAL_ERROR', '인력 세팅안을 수정하지 못했습니다.');
    }
}

export async function DELETE(request: Request) {
    try {
        const authResult = await resolveLaborAuth(request);
        if (!authResult.ok) return authResult.response;
        if (!canWriteLaborPlan(authResult.auth.requester)) {
            return fail(403, 'FORBIDDEN', '인력 세팅안을 삭제할 권한이 없습니다.');
        }

        const { searchParams } = new URL(request.url);
        const planId = cleanLaborString(searchParams.get('id'));
        if (!planId) return fail(400, 'VALIDATION_ERROR', '삭제할 인력 세팅안이 필요합니다.');

        const companyScope = await resolveLaborCompanyId(
            authResult.auth,
            searchParams.get('companyId'),
            searchParams.get('company')
        );
        if (!companyScope.ok) return companyScope.response;

        const existingPlan = await fetchExistingPlan(authResult, planId, companyScope.companyId);
        if (!existingPlan.ok) return existingPlan.response;

        const { error: roleError } = await authResult.auth.supabaseAdmin
            .from('franchise_labor_staffing_roles')
            .delete()
            .eq('plan_id', existingPlan.plan.id);
        if (roleError) throw roleError;

        const { error: planError } = await authResult.auth.supabaseAdmin
            .from('franchise_labor_staffing_plans')
            .delete()
            .eq('id', existingPlan.plan.id)
            .eq('company_id', companyScope.companyId);
        if (planError) throw planError;

        return ok({ success: true });
    } catch (error) {
        if (isMissingLaborSchemaError(error)) {
            return fail(424, 'VALIDATION_ERROR', '인력 세팅 SQL이 아직 적용되지 않았습니다. supabase_franchise_labor_planning_migration.sql 적용 후 다시 확인해주세요.');
        }
        console.error('Franchise labor plans DELETE error:', error);
        return fail(500, 'INTERNAL_ERROR', '인력 세팅안을 삭제하지 못했습니다.');
    }
}
