import {
    canAccessCompanyScope,
    getRequesterProfile,
    isAdmin,
    resolveCompanyIdByName
} from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import {
    fetchActiveGmailConnection,
    sanitizeGmailConnection
} from '@/lib/gmail-connections';
import { isGmailConfigured } from '@/lib/gmail-integration';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const { searchParams } = new URL(request.url);
        const requester = await getRequesterProfile(supabaseAdmin, request);
        if (!requester) return fail(401, 'AUTH_REQUIRED', 'requesterId is required');

        const companyName = searchParams.get('company');
        const requestedCompanyId = companyName ? await resolveCompanyIdByName(supabaseAdmin, companyName) : null;
        const companyId = requestedCompanyId || requester.company_id;
        if (!companyId) return fail(400, 'VALIDATION_ERROR', 'Company scope is required');
        if (!isAdmin(requester) && !canAccessCompanyScope(requester, companyId)) {
            return fail(403, 'FORBIDDEN', 'Forbidden: cross-company access denied');
        }

        const connection = await fetchActiveGmailConnection(supabaseAdmin, requester.id, companyId);
        return ok({
            configReady: isGmailConfigured(),
            connected: Boolean(connection),
            connection: connection ? sanitizeGmailConnection(connection) : null
        });
    } catch (error) {
        console.error('Gmail status error:', error);
        return fail(500, 'INTERNAL_ERROR', 'Failed to fetch Gmail connection status');
    }
}
