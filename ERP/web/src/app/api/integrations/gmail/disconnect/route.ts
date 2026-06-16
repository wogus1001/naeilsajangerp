import {
    canAccessCompanyScope,
    getRequesterProfile,
    isAdmin,
    resolveCompanyIdByName
} from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cleanString(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    const normalized = String(value).trim();
    return normalized ? normalized : null;
}

async function readBody(request: Request): Promise<JsonRecord> {
    try {
        const parsed: unknown = await request.json();
        return isRecord(parsed) ? parsed : {};
    } catch {
        return {};
    }
}

export async function POST(request: Request) {
    try {
        const body = await readBody(request);
        const supabaseAdmin = getSupabaseAdmin();
        const requester = await getRequesterProfile(
            supabaseAdmin,
            request,
            cleanString(body.requesterId || body.userId)
        );
        if (!requester) return fail(401, 'AUTH_REQUIRED', 'requesterId is required');

        const companyName = cleanString(body.companyName || body.company);
        const requestedCompanyId = companyName ? await resolveCompanyIdByName(supabaseAdmin, companyName) : null;
        const companyId = cleanString(body.companyId) || requestedCompanyId || requester.company_id;
        if (!companyId) return fail(400, 'VALIDATION_ERROR', 'Company scope is required');
        if (!isAdmin(requester) && !canAccessCompanyScope(requester, companyId)) {
            return fail(403, 'FORBIDDEN', 'Forbidden: cross-company access denied');
        }

        const { error } = await supabaseAdmin
            .from('profile_gmail_connections')
            .update({
                status: 'disconnected',
                encrypted_access_token: 'disconnected',
                encrypted_refresh_token: null,
                updated_at: new Date().toISOString()
            })
            .eq('profile_id', requester.id)
            .eq('company_id', companyId)
            .eq('status', 'active');
        if (error) throw error;
        return ok({ success: true });
    } catch (error) {
        console.error('Gmail disconnect error:', error);
        return fail(500, 'INTERNAL_ERROR', 'Failed to disconnect Gmail account');
    }
}
