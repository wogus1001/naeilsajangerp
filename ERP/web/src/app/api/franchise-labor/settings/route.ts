import { fail, ok } from '@/lib/api-response';
import {
    canManageLaborSettings,
    getLaborBodyValue,
    isMissingLaborSchemaError,
    normalizeLaborSettings,
    numberFromBody,
    readLaborJsonBody,
    resolveLaborAuth,
    resolveLaborCompanyId,
    type LaborSettingsRow
} from '@/lib/franchise-labor-api';
import { DEFAULT_LABOR_SETTINGS } from '@/lib/franchise-labor-planning';

export const dynamic = 'force-dynamic';

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

        const year = Number(searchParams.get('year')) || DEFAULT_LABOR_SETTINGS.effectiveYear;
        const { data, error } = await authResult.auth.supabaseAdmin
            .from('franchise_labor_settings')
            .select('effective_year, minimum_hourly_wage, employee_insurance_rate, employer_insurance_rate, withholding_rate, overtime_multiplier, night_multiplier, holiday_multiplier')
            .eq('company_id', companyScope.companyId)
            .eq('effective_year', year)
            .maybeSingle<LaborSettingsRow>();
        if (error) throw error;

        return ok({
            schemaReady: true,
            canManage: canManageLaborSettings(authResult.auth.requester),
            companyId: companyScope.companyId,
            settings: normalizeLaborSettings(data)
        });
    } catch (error) {
        if (isMissingLaborSchemaError(error)) {
            return ok({ schemaReady: false, canManage: false, companyId: '', settings: DEFAULT_LABOR_SETTINGS });
        }
        console.error('Franchise labor settings GET error:', error);
        return fail(500, 'INTERNAL_ERROR', '인력 세팅 기준값을 불러오지 못했습니다.');
    }
}

export async function POST(request: Request) {
    try {
        const authResult = await resolveLaborAuth(request);
        if (!authResult.ok) return authResult.response;
        if (!canManageLaborSettings(authResult.auth.requester)) {
            return fail(403, 'FORBIDDEN', '인력 세팅 기준값을 수정할 권한이 없습니다.');
        }

        const body = await readLaborJsonBody(request);
        const companyScope = await resolveLaborCompanyId(
            authResult.auth,
            getLaborBodyValue(body, ['companyId', 'company_id']),
            getLaborBodyValue(body, ['companyName', 'company'])
        );
        if (!companyScope.ok) return companyScope.response;

        const settings = normalizeLaborSettings({
            effective_year: numberFromBody(getLaborBodyValue(body, ['effectiveYear', 'effective_year']), DEFAULT_LABOR_SETTINGS.effectiveYear),
            minimum_hourly_wage: numberFromBody(getLaborBodyValue(body, ['minimumHourlyWage', 'minimum_hourly_wage']), DEFAULT_LABOR_SETTINGS.minimumHourlyWage),
            employee_insurance_rate: numberFromBody(getLaborBodyValue(body, ['employeeInsuranceRate', 'employee_insurance_rate']), DEFAULT_LABOR_SETTINGS.employeeInsuranceRate),
            employer_insurance_rate: numberFromBody(getLaborBodyValue(body, ['employerInsuranceRate', 'employer_insurance_rate']), DEFAULT_LABOR_SETTINGS.employerInsuranceRate),
            withholding_rate: numberFromBody(getLaborBodyValue(body, ['withholdingRate', 'withholding_rate']), DEFAULT_LABOR_SETTINGS.withholdingRate),
            overtime_multiplier: numberFromBody(getLaborBodyValue(body, ['overtimeMultiplier', 'overtime_multiplier']), DEFAULT_LABOR_SETTINGS.overtimeMultiplier),
            night_multiplier: numberFromBody(getLaborBodyValue(body, ['nightMultiplier', 'night_multiplier']), DEFAULT_LABOR_SETTINGS.nightMultiplier),
            holiday_multiplier: numberFromBody(getLaborBodyValue(body, ['holidayMultiplier', 'holiday_multiplier']), DEFAULT_LABOR_SETTINGS.holidayMultiplier)
        });

        const { error } = await authResult.auth.supabaseAdmin
            .from('franchise_labor_settings')
            .upsert({
                company_id: companyScope.companyId,
                effective_year: settings.effectiveYear,
                minimum_hourly_wage: settings.minimumHourlyWage,
                employee_insurance_rate: settings.employeeInsuranceRate,
                employer_insurance_rate: settings.employerInsuranceRate,
                withholding_rate: settings.withholdingRate,
                overtime_multiplier: settings.overtimeMultiplier,
                night_multiplier: settings.nightMultiplier,
                holiday_multiplier: settings.holidayMultiplier,
                updated_by: authResult.auth.requester.id,
                updated_at: new Date().toISOString()
            }, { onConflict: 'company_id,effective_year' });
        if (error) throw error;

        return ok({ settings });
    } catch (error) {
        if (isMissingLaborSchemaError(error)) {
            return fail(424, 'VALIDATION_ERROR', '인력 세팅 SQL이 아직 적용되지 않았습니다. supabase_franchise_labor_planning_migration.sql 적용 후 다시 확인해주세요.');
        }
        console.error('Franchise labor settings POST error:', error);
        return fail(500, 'INTERNAL_ERROR', '인력 세팅 기준값을 저장하지 못했습니다.');
    }
}
