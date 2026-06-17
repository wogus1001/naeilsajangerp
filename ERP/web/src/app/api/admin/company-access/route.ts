import { getAuthenticatedRequesterProfile, isAdmin } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import {
    DEFAULT_COMPANY_DASHBOARD_MODE,
    getDefaultCompanyMenuFlags,
    isCompanyDashboardMode,
    isCompanyMenuFeatureKey,
    type CompanyDashboardMode,
    type CompanyMenuFeatureKey
} from '@/lib/company-menu-features';
import {
    fetchCompanyDashboardMode,
    fetchCompanyMenuFlags,
    saveCompanyDashboardMode,
    saveCompanyMenuFlags,
    toCompanyMenuFeatureViews,
    CompanyMenuFeatureStoreError,
    type CompanyMenuFeatureUpdate,
    type CompanyMenuFeatureView
} from '@/lib/company-menu-feature-store';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

type CompanyRow = {
    readonly id: string;
    readonly name: string | null;
    readonly business_number: string | null;
    readonly status: string | null;
    readonly owner_id: string | null;
    readonly created_at: string | null;
};

type ProfileRow = {
    readonly id: string;
    readonly company_id: string | null;
    readonly name: string | null;
    readonly email: string | null;
    readonly role: string | null;
    readonly status: string | null;
    readonly created_at: string | null;
};

type AdminCompanySummary = {
    readonly id: string;
    readonly name: string;
    readonly businessNumber: string;
    readonly status: string;
    readonly createdAt: string;
    readonly userCount: number;
    readonly activeUserCount: number;
    readonly pendingUserCount: number;
    readonly managerNames: readonly string[];
};

type AdminCompanyAccessResponse = {
    readonly companies: readonly AdminCompanySummary[];
    readonly selectedCompany: AdminCompanySummary | null;
    readonly dashboardMode: CompanyDashboardMode;
    readonly features: readonly CompanyMenuFeatureView[];
};

type SavePayload = {
    readonly companyId: string;
    readonly dashboardMode: CompanyDashboardMode;
    readonly features: readonly CompanyMenuFeatureUpdate[];
};

function isPlainRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseSavePayload(value: unknown): SavePayload | null {
    if (!isPlainRecord(value)) return null;
    if (typeof value.companyId !== 'string' || !Array.isArray(value.features)) return null;
    if (value.dashboardMode !== undefined && !isCompanyDashboardMode(value.dashboardMode)) return null;

    const features: CompanyMenuFeatureUpdate[] = [];
    for (const item of value.features) {
        if (!isPlainRecord(item)) return null;
        if (typeof item.key !== 'string' || typeof item.enabled !== 'boolean') return null;
        if (!isCompanyMenuFeatureKey(item.key)) return null;
        features.push({ key: item.key, enabled: item.enabled });
    }

    return {
        companyId: value.companyId,
        dashboardMode: isCompanyDashboardMode(value.dashboardMode) ? value.dashboardMode : DEFAULT_COMPANY_DASHBOARD_MODE,
        features
    };
}

function summarizeCompanies(
    companies: readonly CompanyRow[],
    profiles: readonly ProfileRow[]
): readonly AdminCompanySummary[] {
    return companies.map(company => {
        const companyProfiles = profiles.filter(profile => profile.company_id === company.id);
        const activeProfiles = companyProfiles.filter(profile => profile.status === 'active');
        const pendingProfiles = companyProfiles.filter(profile => profile.status === 'pending_approval' || profile.status === 'pending');
        const managerNames = companyProfiles
            .filter(profile => profile.role === 'manager')
            .map(profile => profile.name || profile.email || '이름 없음');

        return {
            id: company.id,
            name: company.name || '회사명 없음',
            businessNumber: company.business_number || '-',
            status: company.status || 'active',
            createdAt: company.created_at || '',
            userCount: companyProfiles.length,
            activeUserCount: activeProfiles.length,
            pendingUserCount: pendingProfiles.length,
            managerNames
        };
    });
}

async function buildAccessResponse(request: Request, selectedCompanyId: string | null): Promise<Response> {
    const supabaseAdmin = getSupabaseAdmin();
    const requester = await getAuthenticatedRequesterProfile(supabaseAdmin, request);
    if (!requester) return fail(401, 'AUTH_REQUIRED', '로그인이 필요합니다.');
    if (!isAdmin(requester)) return fail(403, 'FORBIDDEN', 'Admin access required');

    const { data: companies, error: companyError } = await supabaseAdmin
        .from('companies')
        .select('id, name, business_number, status, owner_id, created_at')
        .order('created_at', { ascending: false })
        .returns<CompanyRow[]>();

    if (companyError) {
        console.error('Admin company list error:', companyError);
        return fail(500, 'INTERNAL_ERROR', 'Failed to fetch companies');
    }

    const companyRows = companies || [];
    const companyIds = companyRows.map(company => company.id);
    const { data: profiles, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('id, company_id, name, email, role, status, created_at')
        .in('company_id', companyIds.length > 0 ? companyIds : ['00000000-0000-0000-0000-000000000000'])
        .returns<ProfileRow[]>();

    if (profileError) {
        console.error('Admin company profile summary error:', profileError);
        return fail(500, 'INTERNAL_ERROR', 'Failed to fetch company users');
    }

    const summaries = summarizeCompanies(companyRows, profiles || []);
    const fallbackCompanyId = summaries[0]?.id || null;
    const targetCompanyId = selectedCompanyId || fallbackCompanyId;
    const selectedCompany = summaries.find(company => company.id === targetCompanyId) || null;

    if (!targetCompanyId || !selectedCompany) {
        const flags = toCompanyMenuFeatureViews(getDefaultCompanyMenuFlags());
        return ok<AdminCompanyAccessResponse>({
            companies: summaries,
            selectedCompany: null,
            dashboardMode: DEFAULT_COMPANY_DASHBOARD_MODE,
            features: flags
        });
    }

    const [flags, dashboardMode] = await Promise.all([
        fetchCompanyMenuFlags(supabaseAdmin, targetCompanyId),
        fetchCompanyDashboardMode(supabaseAdmin, targetCompanyId)
    ]);
    return ok<AdminCompanyAccessResponse>({
        companies: summaries,
        selectedCompany,
        dashboardMode,
        features: toCompanyMenuFeatureViews(flags)
    });
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    return buildAccessResponse(request, searchParams.get('companyId'));
}

export async function PUT(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const requester = await getAuthenticatedRequesterProfile(supabaseAdmin, request);
        if (!requester) return fail(401, 'AUTH_REQUIRED', '로그인이 필요합니다.');
        if (!isAdmin(requester)) return fail(403, 'FORBIDDEN', 'Admin access required');

        const payload = parseSavePayload(await request.json());
        if (!payload) return fail(400, 'VALIDATION_ERROR', 'Invalid company menu feature payload');

        const [savedFlags, savedDashboardMode] = await Promise.all([
            saveCompanyMenuFlags(
                supabaseAdmin,
                payload.companyId,
                payload.features,
                requester.id
            ),
            saveCompanyDashboardMode(
                supabaseAdmin,
                payload.companyId,
                payload.dashboardMode,
                requester.id
            )
        ]);

        return ok({
            companyId: payload.companyId,
            dashboardMode: savedDashboardMode,
            features: toCompanyMenuFeatureViews(savedFlags)
        });
    } catch (error) {
        if (error instanceof CompanyMenuFeatureStoreError) {
            return fail(500, 'INTERNAL_ERROR', error.message);
        }
        console.error('Admin company access PUT error:', error);
        return fail(500, 'INTERNAL_ERROR', 'Internal server error');
    }
}
