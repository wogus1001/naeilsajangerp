import { canAccessCompanyScope, getRequesterProfile, isAdmin } from '@/lib/api-auth';
import { ok, fail } from '@/lib/api-response';
import { DEFAULT_COMPANY_DASHBOARD_MODE, getDefaultCompanyMenuFlags } from '@/lib/company-menu-features';
import { fetchCompanyDashboardMode, fetchCompanyMenuFlags, toCompanyMenuFeatureViews } from '@/lib/company-menu-feature-store';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const requester = await getRequesterProfile(supabaseAdmin, request);

        if (!requester) {
            return fail(401, 'AUTH_REQUIRED', 'requesterId is required');
        }

        const { searchParams } = new URL(request.url);
        const requestedCompanyId = searchParams.get('companyId');
        const targetCompanyId = requestedCompanyId || requester.company_id;

        if (!targetCompanyId) {
            if (isAdmin(requester)) {
                const flags = getDefaultCompanyMenuFlags();
                return ok({
                    companyId: null,
                    dashboardMode: DEFAULT_COMPANY_DASHBOARD_MODE,
                    flags,
                    features: toCompanyMenuFeatureViews(flags)
                });
            }
            return fail(400, 'VALIDATION_ERROR', 'companyId is required');
        }

        if (!canAccessCompanyScope(requester, targetCompanyId)) {
            return fail(403, 'FORBIDDEN', 'Forbidden: cross-company access denied');
        }

        const [flags, dashboardMode] = await Promise.all([
            fetchCompanyMenuFlags(supabaseAdmin, targetCompanyId),
            fetchCompanyDashboardMode(supabaseAdmin, targetCompanyId)
        ]);
        return ok({ companyId: targetCompanyId, dashboardMode, flags, features: toCompanyMenuFeatureViews(flags) });
    } catch (error) {
        console.error('Company menu features GET error:', error);
        return fail(500, 'INTERNAL_ERROR', 'Internal server error');
    }
}
