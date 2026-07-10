import { fail, ok } from '@/lib/api-response';
import { getOwnerSessionContext } from '@/lib/franchise-owner-auth';
import {
    buildOwnerSubmissionTitle,
    mergeOwnerProvidedBasicsIntoLocationData,
    normalizeOwnerProvidedBasics
} from '@/lib/franchise-owner-portal';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const context = await getOwnerSessionContext(supabaseAdmin);
        if (!context) return fail(401, 'AUTH_REQUIRED', '점주 로그인이 필요합니다.');
        const body: unknown = await request.json();
        const basics = normalizeOwnerProvidedBasics(body);
        const nextData = mergeOwnerProvidedBasicsIntoLocationData(context.location.data, basics);

        const { error: locationError } = await supabaseAdmin
            .from('franchise_locations')
            .update({ data: nextData, updated_at: new Date().toISOString() })
            .eq('id', context.location.id)
            .eq('company_id', context.account.company_id);
        if (locationError) throw locationError;

        const { error: submissionError } = await supabaseAdmin
            .from('franchise_owner_submissions')
            .insert({
                company_id: context.account.company_id,
                location_id: context.location.id,
                owner_account_id: context.account.id,
                submission_type: 'store_info',
                title: buildOwnerSubmissionTitle('store_info', ''),
                payload: basics,
                status: 'resolved',
                review_note: '점주가 입력한 매장 정보가 운영점 정보에 반영되었습니다.',
                reviewed_at: new Date().toISOString()
            });
        if (submissionError) throw submissionError;

        return ok({ basics });
    } catch (error) {
        console.error('Owner store info error:', error);
        return fail(500, 'INTERNAL_ERROR', '매장 정보를 저장하지 못했습니다.');
    }
}
