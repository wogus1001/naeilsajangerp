import { getAuthenticatedRequesterProfile, isAdmin } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { platformTemplateSignProgressUrl } from '@/lib/ucansign/platform-client';
import {
    fetchTemplateForRequester,
    fetchVersionDetails,
    isRecord,
    textValue
} from '../../electronic-contract-templates/templateApi';

export const dynamic = 'force-dynamic';

type CompanyRow = {
    readonly name: string | null;
};

type DraftRow = {
    readonly id: string;
    readonly company_id: string | null;
    readonly sent_by_profile_id: string | null;
    readonly status: string | null;
    readonly template_source: string | null;
};

function originFromRequest(request: Request): string {
    const url = new URL(request.url);
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
    const protocol = request.headers.get('x-forwarded-proto') || url.protocol.replace(':', '');
    return host ? `${protocol}://${host}` : url.origin;
}

export async function POST(request: Request) {
    try {
        const body: unknown = await request.json();
        if (!isRecord(body)) return fail(400, 'VALIDATION_ERROR', 'Invalid company template embedding payload');

        const supabaseAdmin = getSupabaseAdmin();
        const requester = await getAuthenticatedRequesterProfile(supabaseAdmin, request);
        if (!requester) return fail(401, 'AUTH_REQUIRED', 'authenticated session is required');

        const templateId = textValue(body, 'templateId');
        const versionId = textValue(body, 'versionId');
        if (!templateId || !versionId) return fail(400, 'VALIDATION_ERROR', '템플릿 정보가 필요합니다.');

        const access = await fetchTemplateForRequester(supabaseAdmin, requester, templateId);
        if (!access.ok) return fail(access.status, access.status === 404 ? 'NOT_FOUND' : 'FORBIDDEN', access.message);
        if (access.template.status !== 'active') return fail(400, 'VALIDATION_ERROR', '사용중 템플릿만 작성할 수 있습니다.');
        if (!isAdmin(requester) && access.template.company_id !== requester.company_id) {
            return fail(403, 'FORBIDDEN', '회사 범위가 일치하지 않습니다.');
        }

        const details = await fetchVersionDetails(supabaseAdmin, versionId);
        if (!details.version || details.version.template_id !== templateId) return fail(404, 'NOT_FOUND', '템플릿 버전을 찾을 수 없습니다.');
        if (details.version.status !== 'active') return fail(400, 'VALIDATION_ERROR', '사용중 버전만 작성할 수 있습니다.');
        const ucansignTemplateId = details.version.ucansign_template_id;
        if (!ucansignTemplateId) return fail(400, 'VALIDATION_ERROR', 'UCanSign 템플릿 연결이 필요합니다.');

        const draftContractId = textValue(body, 'contractId') || textValue(body, 'draftContractId');
        if (draftContractId) {
            const { data: draft, error: draftError } = await supabaseAdmin
                .from('electronic_contracts')
                .select('id, company_id, sent_by_profile_id, status, template_source')
                .eq('id', draftContractId)
                .maybeSingle<DraftRow>();
            if (draftError) throw draftError;
            if (!draft) return fail(404, 'NOT_FOUND', 'Draft not found');
            if (draft.status !== 'draft' && draft.status !== 'send_failed') {
                return fail(400, 'VALIDATION_ERROR', 'Only draft or failed contracts can be embedded');
            }
            if (draft.template_source !== 'company_uploaded') return fail(400, 'VALIDATION_ERROR', '회사 템플릿 초안이 아닙니다.');
            if (!isAdmin(requester) && draft.sent_by_profile_id !== requester.id) return fail(403, 'FORBIDDEN', 'Draft owner required');
            if (draft.company_id !== access.template.company_id) return fail(403, 'FORBIDDEN', 'Company scope mismatch');
        }

        const { data: company } = await supabaseAdmin
            .from('companies')
            .select('name')
            .eq('id', access.template.company_id)
            .maybeSingle<CompanyRow>();

        const contractId = draftContractId || crypto.randomUUID();
        const now = new Date().toISOString();
        const documentName = `[${company?.name || '회사'}] ${access.template.name}`;
        const redirectUrl = `${originFromRequest(request)}/contracts/electronic?contractId=${encodeURIComponent(contractId)}`;
        const row = {
            id: contractId,
            company_id: access.template.company_id,
            sent_by_profile_id: requester.id,
            template_key: 'company_uploaded',
            template_version: String(details.version.version_number || 1),
            template_source: 'company_uploaded',
            company_template_id: templateId,
            company_template_version_id: versionId,
            name: documentName,
            status: 'draft',
            form_snapshot: {
                companyName: company?.name || '',
                templateName: access.template.name,
                inputMode: 'template',
                values: {},
                participants: []
            },
            payload_snapshot: {
                embedding: 'ucansign-template-progress',
                ucansignTemplateId,
                redirectUrl
            },
            updated_at: now
        };

        const { error: saveError } = draftContractId
            ? await supabaseAdmin.from('electronic_contracts').update(row).eq('id', contractId)
            : await supabaseAdmin.from('electronic_contracts').insert({ ...row, created_at: now });
        if (saveError) throw saveError;

        const url = platformTemplateSignProgressUrl(ucansignTemplateId);

        return ok({ contractId, url });
    } catch (error) {
        console.error('Company template sign embedding error:', error);
        return fail(500, 'INTERNAL_ERROR', '전자계약 임베딩 화면을 열지 못했습니다.');
    }
}
