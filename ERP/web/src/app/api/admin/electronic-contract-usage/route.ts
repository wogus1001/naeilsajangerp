import { getAuthenticatedRequesterProfile, isAdmin } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import {
    summarizeElectronicContractUsage,
    type ElectronicContractUsageCompany,
    type ElectronicContractUsageRow
} from '@/lib/electronic-contracts/usage-summary';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const requester = await getAuthenticatedRequesterProfile(supabaseAdmin, request);
        if (!requester) return fail(401, 'AUTH_REQUIRED', 'authenticated session is required');
        if (!isAdmin(requester)) return fail(403, 'FORBIDDEN', 'Admin access required');

        const { data: companies, error: companiesError } = await supabaseAdmin
            .from('companies')
            .select('id, name')
            .order('name', { ascending: true })
            .returns<ElectronicContractUsageCompany[]>();
        if (companiesError) throw companiesError;

        const { data: contracts, error: contractsError } = await supabaseAdmin
            .from('electronic_contracts')
            .select('id, company_id, status, sent_at, completed_at, created_at')
            .order('created_at', { ascending: false })
            .limit(10000)
            .returns<ElectronicContractUsageRow[]>();
        if (contractsError) throw contractsError;

        return ok({
            usage: summarizeElectronicContractUsage(companies || [], contracts || [])
        });
    } catch (error) {
        console.error('Electronic contract usage GET error:', error);
        return fail(500, 'INTERNAL_ERROR', '전자계약 사용량을 불러오지 못했습니다.');
    }
}
