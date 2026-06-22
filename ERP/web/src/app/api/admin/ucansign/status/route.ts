import { getAuthenticatedRequesterProfile, isAdmin } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import {
    missingUcansignPlatformEnv,
    missingUcansignPremiumRightsEnv,
    missingUcansignWebhookEnv
} from '@/lib/ucansign/platform-config';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const requester = await getAuthenticatedRequesterProfile(supabaseAdmin, request);
        if (!requester) return fail(401, 'AUTH_REQUIRED', 'authenticated session is required');
        if (!isAdmin(requester)) return fail(403, 'FORBIDDEN', 'Admin access required');

        const missingEnv = missingUcansignPlatformEnv();
        const premiumRightsMissingEnv = missingUcansignPremiumRightsEnv();
        const webhookMissingEnv = missingUcansignWebhookEnv();
        const configured = missingEnv.length === 0;

        return ok({
            authMode: 'api_key',
            configured,
            missingEnv,
            premiumRightsConfigured: premiumRightsMissingEnv.length === 0,
            premiumRightsMissingEnv,
            webhookConfigured: webhookMissingEnv.length === 0,
            webhookMissingEnv,
            connected: configured,
            status: configured ? 'api_key' : 'not_configured',
            expiresAt: null,
            updatedAt: null,
            connectedBy: null
        });
    } catch (error) {
        console.error('Admin UCANSIGN status error:', error);
        return fail(500, 'INTERNAL_ERROR', 'Failed to fetch UCanSign platform status');
    }
}
