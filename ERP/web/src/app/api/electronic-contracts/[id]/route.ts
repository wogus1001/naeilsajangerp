import { getAuthenticatedRequesterProfile } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import {
    canDeleteElectronicContract,
    canViewElectronicContract
} from '@/lib/electronic-contracts/document-permissions';
import {
    toElectronicContractView,
    type ElectronicContractRow
} from '@/lib/electronic-contracts/records';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

type RouteContext = {
    readonly params: Promise<{ readonly id: string }>;
};

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
        if (!canViewElectronicContract(
            { id: requester.id, role: requester.role, companyId: requester.company_id },
            { sentByProfileId: data.sent_by_profile_id, companyId: data.company_id }
        )) return fail(403, 'FORBIDDEN', 'Contract access denied');

        return ok({
            contract: toElectronicContractView(data),
            formSnapshot: data.form_snapshot || {}
        });
    } catch (error) {
        console.error('Electronic contract GET detail error:', error);
        return fail(500, 'INTERNAL_ERROR', 'Failed to fetch electronic contract');
    }
}

export async function DELETE(request: Request, context: RouteContext) {
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
        if (!canViewElectronicContract(
            { id: requester.id, role: requester.role, companyId: requester.company_id },
            { sentByProfileId: data.sent_by_profile_id, companyId: data.company_id }
        )) return fail(403, 'FORBIDDEN', 'Contract access denied');
        if (!canDeleteElectronicContract(requester, { sentByProfileId: data.sent_by_profile_id })) {
            return fail(403, 'FORBIDDEN', 'Only the sender or admin can delete this contract');
        }

        const { error: deleteError } = await supabaseAdmin
            .from('electronic_contracts')
            .delete()
            .eq('id', id);
        if (deleteError) throw deleteError;

        return ok({ contractId: id, deleted: true });
    } catch (error) {
        console.error('Electronic contract DELETE error:', error);
        return fail(500, 'INTERNAL_ERROR', 'Failed to delete electronic contract');
    }
}
