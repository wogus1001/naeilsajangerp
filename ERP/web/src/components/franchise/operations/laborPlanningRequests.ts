import { DEFAULT_LABOR_SETTINGS, calculateLaborPlan, type LaborPlanInput, type LaborPlanResult, type LaborSettings } from '@/lib/franchise-labor-planning';
import { getApiAuthHeaders } from '@/utils/apiAuthHeaders';
import { readApiError, unwrapApiData } from '@/utils/apiResponse';
import type {
    LaborPlanForm,
    LaborPlansPayload,
    LaborScope,
    LaborSettingsPayload
} from './laborPlanningTypes';

async function readJsonSafely(response: Response): Promise<unknown> {
    try {
        return await response.json();
    } catch (error) {
        if (error instanceof SyntaxError) return {};
        throw error;
    }
}

async function readPayload(response: Response): Promise<unknown> {
    const payload = await readJsonSafely(response);
    if (!response.ok) throw new Error(readApiError(payload));
    return payload;
}

export function buildLaborPlanInput(form: LaborPlanForm, settings: LaborSettings = DEFAULT_LABOR_SETTINGS): LaborPlanInput {
    return {
        monthlySalesTarget: form.monthlySalesManwon * 10_000,
        targetLaborRatio: form.targetLaborRatio,
        operatingWeekdays: form.operatingWeekdays,
        openTime: form.openTime,
        closeTime: form.closeTime,
        ownerWorks: form.ownerWorks,
        useBreakTime: form.useBreakTime,
        breakStartTime: form.breakStartTime,
        breakEndTime: form.breakEndTime,
        managerMonthlySalary: form.managerMonthlySalaryManwon * 10_000,
        staffMonthlySalary: form.staffMonthlySalaryManwon * 10_000,
        partTimeHourlyWage: form.partTimeHourlyWage,
        settings
    };
}

export async function fetchLaborSettings(scope: LaborScope): Promise<LaborSettingsPayload> {
    const params = new URLSearchParams({ requesterId: scope.userId });
    if (scope.companyName) params.set('company', scope.companyName);
    const headers = await getApiAuthHeaders();
    const response = await fetch(`/api/franchise-labor/settings?${params.toString()}`, { cache: 'no-store', headers });
    const payload = await readPayload(response);
    return unwrapApiData<LaborSettingsPayload>(payload);
}

export async function fetchLaborPlans(scope: LaborScope): Promise<LaborPlansPayload> {
    const params = new URLSearchParams({ requesterId: scope.userId });
    if (scope.companyName) params.set('company', scope.companyName);
    const headers = await getApiAuthHeaders();
    const response = await fetch(`/api/franchise-labor/plans?${params.toString()}`, { cache: 'no-store', headers });
    const payload = await readPayload(response);
    return unwrapApiData<LaborPlansPayload>(payload);
}

export async function calculateLaborPlanRequest(form: LaborPlanForm, settings: LaborSettings = DEFAULT_LABOR_SETTINGS): Promise<LaborPlanResult> {
    const headers = await getApiAuthHeaders({ 'Content-Type': 'application/json' });
    const input = buildLaborPlanInput(form, settings);
    const response = await fetch('/api/franchise-labor/calculate', {
        method: 'POST',
        headers,
        body: JSON.stringify(input)
    });
    const payload = await readPayload(response);
    const data = unwrapApiData<{ readonly result?: LaborPlanResult }>(payload);
    return data.result || calculateLaborPlan(input);
}

function buildLaborPlanRequestBody(scope: LaborScope, companyId: string, form: LaborPlanForm, settings: LaborSettings) {
    const input = buildLaborPlanInput(form, settings);
    return {
        requesterId: scope.userId,
        companyName: scope.companyName,
        companyId,
        locationId: form.locationId,
        title: form.title,
        memo: form.memo,
        ...input
    };
}

export async function saveLaborPlan(scope: LaborScope, companyId: string, form: LaborPlanForm, settings: LaborSettings = DEFAULT_LABOR_SETTINGS): Promise<string> {
    const headers = await getApiAuthHeaders({ 'Content-Type': 'application/json' });
    const response = await fetch('/api/franchise-labor/plans', {
        method: 'POST',
        headers,
        body: JSON.stringify(buildLaborPlanRequestBody(scope, companyId, form, settings))
    });
    const payload = await readPayload(response);
    const data = unwrapApiData<{ readonly id?: string }>(payload);
    return data.id || '';
}

export async function updateLaborPlan(scope: LaborScope, companyId: string, planId: string, form: LaborPlanForm, settings: LaborSettings = DEFAULT_LABOR_SETTINGS): Promise<string> {
    const headers = await getApiAuthHeaders({ 'Content-Type': 'application/json' });
    const response = await fetch('/api/franchise-labor/plans', {
        method: 'PUT',
        headers,
        body: JSON.stringify({
            id: planId,
            ...buildLaborPlanRequestBody(scope, companyId, form, settings)
        })
    });
    const payload = await readPayload(response);
    const data = unwrapApiData<{ readonly id?: string }>(payload);
    return data.id || planId;
}

export async function deleteLaborPlan(scope: LaborScope, companyId: string, planId: string): Promise<void> {
    const params = new URLSearchParams({
        id: planId,
        requesterId: scope.userId,
        companyId
    });
    if (scope.companyName) params.set('company', scope.companyName);
    const headers = await getApiAuthHeaders();
    const response = await fetch(`/api/franchise-labor/plans?${params.toString()}`, {
        method: 'DELETE',
        headers
    });
    await readPayload(response);
}
