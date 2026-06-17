import {
    DEFAULT_COMPANY_DASHBOARD_MODE,
    normalizeCompanyDashboardMode,
    type CompanyDashboardMode
} from '@/lib/company-menu-features';
import { getApiAuthHeaders } from '@/utils/apiAuthHeaders';

type DashboardModePreferenceParams = {
    readonly requesterId: string;
    readonly companyId: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readDashboardMode(value: unknown): CompanyDashboardMode {
    if (!isRecord(value) || !isRecord(value.data)) return DEFAULT_COMPANY_DASHBOARD_MODE;
    return normalizeCompanyDashboardMode(value.data.dashboardMode);
}

export async function fetchDashboardModePreference({
    requesterId,
    companyId
}: DashboardModePreferenceParams): Promise<CompanyDashboardMode> {
    if (!requesterId) return DEFAULT_COMPANY_DASHBOARD_MODE;

    const params = new URLSearchParams();
    params.set('requesterId', requesterId);
    if (companyId) params.set('companyId', companyId);

    const response = await fetch(`/api/company-menu-features?${params.toString()}`, {
        cache: 'no-store',
        headers: await getApiAuthHeaders()
    });
    const payload: unknown = await response.json();
    if (!response.ok) return DEFAULT_COMPANY_DASHBOARD_MODE;

    return readDashboardMode(payload);
}
