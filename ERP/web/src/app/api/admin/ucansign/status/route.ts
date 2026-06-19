import { getAuthenticatedRequesterProfile, isAdmin } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { missingUcansignSendEnv, missingUcansignWebhookEnv } from '@/lib/ucansign/platform-config';

export const dynamic = 'force-dynamic';

type PlatformConnectionRow = {
    readonly status: string | null;
    readonly expires_at: number | null;
    readonly updated_at: string | null;
    readonly connected_by: string | null;
};

export async function GET(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const requester = await getAuthenticatedRequesterProfile(supabaseAdmin, request);
        if (!requester) return fail(401, 'AUTH_REQUIRED', 'authenticated session is required');
        if (!isAdmin(requester)) return fail(403, 'FORBIDDEN', 'Admin access required');

        const missingEnv = missingUcansignSendEnv();
        const webhookMissingEnv = missingUcansignWebhookEnv();
        const { data, error } = await supabaseAdmin
            .from('platform_ucansign_connection')
            .select('status, expires_at, updated_at, connected_by')
            .eq('id', 'naeilsajang-platform')
            .maybeSingle<PlatformConnectionRow>();

        if (error) throw error;

        return ok({
            configured: missingEnv.length === 0,
            missingEnv,
            webhookConfigured: webhookMissingEnv.length === 0,
            webhookMissingEnv,
            connected: data?.status === 'active',
            status: data?.status || 'disconnected',
            expiresAt: data?.expires_at || null,
            updatedAt: data?.updated_at || null,
            connectedBy: data?.connected_by || null
        });
    } catch (error) {
        console.error('Admin UCANSIGN status error:', error);
        return fail(500, 'INTERNAL_ERROR', 'Failed to fetch UCanSign platform status');
    }
}
