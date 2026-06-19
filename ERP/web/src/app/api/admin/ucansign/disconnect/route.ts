import { getAuthenticatedRequesterProfile, isAdmin } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const requester = await getAuthenticatedRequesterProfile(supabaseAdmin, request);
        if (!requester) return fail(401, 'AUTH_REQUIRED', 'authenticated session is required');
        if (!isAdmin(requester)) return fail(403, 'FORBIDDEN', 'Admin access required');

        const { error } = await supabaseAdmin
            .from('platform_ucansign_connection')
            .update({
                status: 'disconnected',
                access_token_encrypted: null,
                refresh_token_encrypted: null,
                expires_at: null,
                updated_at: new Date().toISOString()
            })
            .eq('id', 'naeilsajang-platform');

        if (error) throw error;
        return ok({ disconnected: true });
    } catch (error) {
        console.error('Admin UCANSIGN disconnect error:', error);
        return fail(500, 'INTERNAL_ERROR', 'Failed to disconnect UCanSign platform account');
    }
}
