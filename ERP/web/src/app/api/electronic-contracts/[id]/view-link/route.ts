import { getAuthenticatedRequesterProfile } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import { canViewElectronicContract } from '@/lib/electronic-contracts/document-permissions';
import type { ElectronicContractRow } from '@/lib/electronic-contracts/records';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import {
    createPlatformDocumentViewEmbedding
} from '@/lib/ucansign/platform-document-actions';
import { UcansignPlatformError } from '@/lib/ucansign/platform-client';

export const dynamic = 'force-dynamic';

type RouteContext = {
    readonly params: Promise<{ readonly id: string }>;
};

function appBaseUrl(request: Request): string {
    const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
    if (configuredUrl) return configuredUrl.replace(/\/$/, '');
    return new URL(request.url).origin;
}

function documentRedirectUrl(request: Request, contractId: string): string {
    const url = new URL('/contracts/electronic', appBaseUrl(request));
    url.searchParams.set('ucansignAction', 'document_view');
    url.searchParams.set('contractId', contractId);
    return url.toString();
}

export async function POST(request: Request, context: RouteContext) {
    try {
        const { id } = await context.params;
        const supabaseAdmin = getSupabaseAdmin();
        const requester = await getAuthenticatedRequesterProfile(supabaseAdmin, request);
        if (!requester) return fail(401, 'AUTH_REQUIRED', 'authenticated session is required');

        const { data, error } = await supabaseAdmin
            .from('electronic_contracts')
            .select('*')
            .eq('id', id)
            .maybeSingle<ElectronicContractRow>();
        if (error) throw error;
        if (!data) return fail(404, 'NOT_FOUND', 'Electronic contract not found');
        if (!canViewElectronicContract(
            { id: requester.id, role: requester.role, companyId: requester.company_id },
            { sentByProfileId: data.sent_by_profile_id, companyId: data.company_id }
        )) return fail(403, 'FORBIDDEN', 'Contract access denied');
        if (!data.ucansign_document_id || data.status === 'draft') {
            return fail(400, 'VALIDATION_ERROR', '확인할 수 있는 UCanSign 문서가 없습니다.');
        }

        const url = await createPlatformDocumentViewEmbedding({
            documentId: data.ucansign_document_id,
            redirectUrl: documentRedirectUrl(request, id)
        });

        return ok({ url });
    } catch (error) {
        console.error('Electronic contract view-link error:', error);
        const message = error instanceof UcansignPlatformError
            ? error.message
            : '전자계약 문서 접근 링크를 만들지 못했습니다.';
        return fail(500, 'INTERNAL_ERROR', message);
    }
}
