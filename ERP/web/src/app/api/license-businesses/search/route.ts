import { getAuthenticatedRequesterProfile } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import {
    toLicenseBusinessView,
    type LicenseBusinessRecord
} from '@/lib/electronic-contracts/license-business';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

function normalizeTerm(value: string | null): string {
    return (value || '').replace(/\s+/g, ' ').trim();
}

function escapeLike(value: string): string {
    return value.replace(/[%_]/g, match => `\\${match}`);
}

export async function GET(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const requester = await getAuthenticatedRequesterProfile(supabaseAdmin, request);
        if (!requester) return fail(401, 'AUTH_REQUIRED', 'authenticated session is required');

        const { searchParams } = new URL(request.url);
        const q = normalizeTerm(searchParams.get('q'));
        const address = normalizeTerm(searchParams.get('address'));
        const businessName = normalizeTerm(searchParams.get('businessName'));
        const limitRaw = Number(searchParams.get('limit') || 20);
        const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 50) : 20;
        const terms = [q, businessName, address].filter(Boolean);
        if (terms.length === 0) {
            return ok({ records: [], count: 0 });
        }

        let query = supabaseAdmin
            .from('license_business_records')
            .select('id, license_number, business_type, business_name, permission_date, address')
            .eq('active', true);

        if (terms.length > 0) {
            const filters = terms.map(term => `normalized_search.ilike.%${escapeLike(term)}%`);
            query = query.or(filters.join(','));
        }

        const { data, error } = await query
            .order('business_name', { ascending: true })
            .limit(limit)
            .returns<LicenseBusinessRecord[]>();
        if (error) throw error;

        return ok({
            records: (data || []).map(row => toLicenseBusinessView(row, address)),
            count: data?.length || 0
        });
    } catch (error) {
        console.error('License business search error:', error);
        return fail(500, 'INTERNAL_ERROR', 'Failed to search license business records');
    }
}
