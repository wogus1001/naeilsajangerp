import { getAuthenticatedRequesterProfile, isAdmin } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import {
    toElectronicContractView,
    type ElectronicContractRow
} from '@/lib/electronic-contracts/records';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

type ContractScope = 'mine' | 'company' | 'all';

function normalizeScope(value: string | null): ContractScope {
    if (value === 'company' || value === 'all') return value;
    return 'mine';
}

export async function GET(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const requester = await getAuthenticatedRequesterProfile(supabaseAdmin, request);
        if (!requester) return fail(401, 'AUTH_REQUIRED', 'authenticated session is required');

        const { searchParams } = new URL(request.url);
        const scope = normalizeScope(searchParams.get('scope'));
        const leadId = searchParams.get('leadId') || searchParams.get('lead_id');
        const requestedCompanyId = searchParams.get('companyId');
        const targetCompanyId = isAdmin(requester) && requestedCompanyId
            ? requestedCompanyId
            : requester.company_id;

        let query = supabaseAdmin
            .from('electronic_contracts')
            .select('*');

        if (scope === 'all') {
            if (!isAdmin(requester)) return fail(403, 'FORBIDDEN', 'Admin access required');
        } else if (scope === 'company') {
            if (!targetCompanyId) return fail(403, 'FORBIDDEN', 'Company scope is required');
            query = query.eq('company_id', targetCompanyId);
        } else {
            query = query.eq('sent_by_profile_id', requester.id);
            if (targetCompanyId) query = query.eq('company_id', targetCompanyId);
        }
        if (leadId) query = query.eq('lead_id', leadId);

        const { data, error } = await query
            .order('created_at', { ascending: false })
            .limit(200)
            .returns<ElectronicContractRow[]>();
        if (error) throw error;

        return ok({
            contracts: (data || []).map(toElectronicContractView),
            scope
        });
    } catch (error) {
        console.error('Electronic contracts GET error:', error);
        return fail(500, 'INTERNAL_ERROR', 'Failed to fetch electronic contracts');
    }
}
