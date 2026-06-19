import { getAuthenticatedRequesterProfile, isAdmin } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import {
    toElectronicContractView,
    type ElectronicContractRow
} from '@/lib/electronic-contracts/records';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

type RouteContext = {
    readonly params: Promise<{ readonly id: string }>;
};

function canViewContract(
    requester: { readonly id: string; readonly role: string | null; readonly company_id: string | null },
    row: ElectronicContractRow
): boolean {
    if (isAdmin(requester)) return true;
    if (row.sent_by_profile_id === requester.id) return true;
    return Boolean(requester.company_id && row.company_id === requester.company_id);
}

export async function GET(request: Request, context: RouteContext) {
    try {
        const { id } = await context.params;
        const supabaseAdmin = getSupabaseAdmin();
        const requester = await getAuthenticatedRequesterProfile(supabaseAdmin, request);
        if (!requester) return fail(401, 'AUTH_REQUIRED', 'authenticated session is required');

        const { data, error } = await supabaseAdmin
            .from('electronic_contracts')
            .select('*')
            .eq('id', id)
            .maybeSingle<ElectronicContractRow>();
        if (error) throw error;
        if (!data) return fail(404, 'NOT_FOUND', 'Electronic contract not found');
        if (!canViewContract(requester, data)) return fail(403, 'FORBIDDEN', 'Contract access denied');

        return ok({
            contract: toElectronicContractView(data),
            formSnapshot: data.form_snapshot || {}
        });
    } catch (error) {
        console.error('Electronic contract GET detail error:', error);
        return fail(500, 'INTERNAL_ERROR', 'Failed to fetch electronic contract');
    }
}
