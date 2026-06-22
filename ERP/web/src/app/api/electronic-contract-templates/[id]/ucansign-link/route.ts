import { getAuthenticatedRequesterProfile } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import {
    createPlatformTemplateEmbedding,
    modifyPlatformTemplateEmbedding,
    UcansignPlatformError
} from '@/lib/ucansign/platform-client';
import { createUcansignTemplateLinkState } from '@/lib/ucansign/template-link-state';
import {
    canManageTemplate,
    fetchTemplateForRequester,
    fetchVersionDetails,
    isRecord,
    textValue
} from '../../templateApi';

export const dynamic = 'force-dynamic';

type RouteContext = {
    readonly params: Promise<{ readonly id: string }>;
};

function appBaseUrl(request: Request): string {
    return process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
}

function callbackUrl(request: Request, state: string): string {
    const url = new URL('/api/electronic-contract-templates/ucansign-callback', appBaseUrl(request));
    url.searchParams.set('state', state);
    return url.toString();
}

export async function POST(request: Request, context: RouteContext) {
    try {
        const { id } = await context.params;
        const body: unknown = await request.json();
        if (!isRecord(body)) return fail(400, 'VALIDATION_ERROR', 'Invalid UCanSign template link payload');

        const supabaseAdmin = getSupabaseAdmin();
        const requester = await getAuthenticatedRequesterProfile(supabaseAdmin, request);
        if (!requester) return fail(401, 'AUTH_REQUIRED', 'authenticated session is required');

        const access = await fetchTemplateForRequester(supabaseAdmin, requester, id);
        if (!access.ok) return fail(access.status, access.status === 404 ? 'NOT_FOUND' : 'FORBIDDEN', access.message);
        if (!canManageTemplate(requester, access.template.company_id)) {
            return fail(403, 'FORBIDDEN', '템플릿을 연결할 권한이 없습니다.');
        }

        const versionId = textValue(body, 'versionId') || access.template.active_version_id || '';
        if (!versionId) return fail(400, 'VALIDATION_ERROR', '연결할 템플릿 버전이 필요합니다.');

        const details = await fetchVersionDetails(supabaseAdmin, versionId);
        if (!details.version || details.version.template_id !== id) {
            return fail(404, 'NOT_FOUND', '템플릿 버전을 찾을 수 없습니다.');
        }

        const state = createUcansignTemplateLinkState({ templateId: id, versionId });
        const redirectUrl = callbackUrl(request, state);
        const ucansignTemplateId = details.version.ucansign_template_id || '';
        const url = ucansignTemplateId
            ? await modifyPlatformTemplateEmbedding(ucansignTemplateId, redirectUrl)
            : await createPlatformTemplateEmbedding(redirectUrl);

        return ok({
            url,
            mode: ucansignTemplateId ? 'modify' : 'create',
            versionId,
            ucansignTemplateId
        });
    } catch (error) {
        console.error('Electronic contract template UCanSign link POST error:', error);
        const message = error instanceof UcansignPlatformError
            ? '공용 유캔싸인 계정 확인이 필요합니다. 관리자에게 요청해주세요.'
            : '유캔싸인 템플릿 연결을 시작하지 못했습니다.';
        return fail(500, 'INTERNAL_ERROR', message);
    }
}
