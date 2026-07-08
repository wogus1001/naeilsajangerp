import { fail, ok } from '@/lib/api-response';
import { isMissingOwnerPortalSchemaError, resolveOwnerPortalCompanyScope, resolveOwnerPortalStaffAuth } from '@/lib/franchise-owner-portal-api';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const authResult = await resolveOwnerPortalStaffAuth(request);
        if (!authResult.ok) return authResult.response;
        const { searchParams } = new URL(request.url);
        const companyScope = await resolveOwnerPortalCompanyScope(authResult.auth, searchParams.get('companyId'), searchParams.get('company'));
        if (!companyScope.ok) return companyScope.response;
        const submissionId = searchParams.get('submissionId') || '';
        let query = authResult.auth.supabaseAdmin
            .from('franchise_owner_files')
            .select('id, submission_id, file_name, mime_type, file_size, storage_bucket, storage_path, public_url, created_at')
            .eq('company_id', companyScope.scope.companyId)
            .order('created_at', { ascending: false })
            .limit(80);
        if (submissionId) query = query.eq('submission_id', submissionId);
        const { data, error } = await query;
        if (error) throw error;
        return ok({ files: data || [] });
    } catch (error) {
        if (isMissingOwnerPortalSchemaError(error)) return ok({ files: [], schemaReady: false });
        console.error('Owner portal files GET error:', error);
        return fail(500, 'INTERNAL_ERROR', '점주 업로드 파일을 불러오지 못했습니다.');
    }
}
