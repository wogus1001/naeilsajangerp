import { getAuthenticatedRequesterProfile, isAdmin } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import {
    createPremiumRightsDraftName,
    createPremiumRightsFormSnapshot,
    getString,
    isRecord,
    parsePremiumRightsDraftForm,
    PREMIUM_RIGHTS_TEMPLATE_KEY,
    PREMIUM_RIGHTS_TEMPLATE_VERSION
} from '@/lib/electronic-contracts/premium-rights-draft';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

type CompanyRow = {
    readonly id: string;
    readonly name: string | null;
};

type DraftRow = {
    readonly id: string;
    readonly company_id: string | null;
    readonly sent_by_profile_id: string | null;
    readonly status: string | null;
};

export async function POST(request: Request) {
    try {
        const body: unknown = await request.json();
        if (!isRecord(body)) return fail(400, 'VALIDATION_ERROR', 'Invalid draft payload');

        const supabaseAdmin = getSupabaseAdmin();
        const requester = await getAuthenticatedRequesterProfile(supabaseAdmin, request);
        if (!requester) return fail(401, 'AUTH_REQUIRED', 'authenticated session is required');

        const requestedCompanyId = getString(body, 'companyId');
        const companyId = isAdmin(requester) && requestedCompanyId ? requestedCompanyId : requester.company_id;
        if (!companyId) return fail(403, 'FORBIDDEN', 'Company scope is required');

        const draftId = getString(body, 'contractId') || getString(body, 'draftContractId');
        if (draftId) {
            const { data: draft, error } = await supabaseAdmin
                .from('electronic_contracts')
                .select('id, company_id, sent_by_profile_id, status')
                .eq('id', draftId)
                .maybeSingle<DraftRow>();
            if (error) throw error;
            if (!draft) return fail(404, 'NOT_FOUND', 'Draft not found');
            if (draft.status !== 'draft' && draft.status !== 'send_failed') {
                return fail(400, 'VALIDATION_ERROR', 'Only draft or failed contracts can be saved');
            }
            if (!isAdmin(requester) && draft.sent_by_profile_id !== requester.id) return fail(403, 'FORBIDDEN', 'Draft owner required');
            if (draft.company_id !== companyId) return fail(403, 'FORBIDDEN', 'Company scope mismatch');
        }

        const { data: company } = await supabaseAdmin
            .from('companies')
            .select('id, name')
            .eq('id', companyId)
            .maybeSingle<CompanyRow>();
        const form = parsePremiumRightsDraftForm(body, company?.name || getString(body, 'companyName') || '내일사장');
        const now = new Date().toISOString();
        const contractId = draftId || crypto.randomUUID();
        const row = {
            id: contractId,
            company_id: companyId,
            sent_by_profile_id: requester.id,
            template_key: PREMIUM_RIGHTS_TEMPLATE_KEY,
            template_version: PREMIUM_RIGHTS_TEMPLATE_VERSION,
            name: createPremiumRightsDraftName(form),
            status: 'draft',
            license_number: form.licenseNumber,
            form_snapshot: createPremiumRightsFormSnapshot(form),
            payload_snapshot: {},
            updated_at: now
        };

        const { error } = draftId
            ? await supabaseAdmin.from('electronic_contracts').update(row).eq('id', contractId)
            : await supabaseAdmin.from('electronic_contracts').insert({ ...row, created_at: now });
        if (error) throw error;

        return ok({ contractId, status: 'draft', updatedAt: now });
    } catch (error) {
        console.error('Electronic contract draft save error:', error);
        return fail(500, 'INTERNAL_ERROR', 'Failed to save electronic contract draft');
    }
}
