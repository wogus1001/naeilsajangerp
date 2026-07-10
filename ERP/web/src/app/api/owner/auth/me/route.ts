import { fail, ok } from '@/lib/api-response';
import { getOwnerSessionContext } from '@/lib/franchise-owner-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
    const context = await getOwnerSessionContext(getSupabaseAdmin());
    if (!context) return fail(401, 'AUTH_REQUIRED', '점주 로그인이 필요합니다.');
    return ok({
        account: {
            id: context.account.id,
            loginId: context.account.login_id,
            ownerName: context.account.owner_name,
            temporaryPassword: context.account.temporary_password === true
        },
        location: {
            id: context.location.id,
            name: context.location.name,
            brand: context.location.brand,
            status: context.location.status
        }
    });
}
