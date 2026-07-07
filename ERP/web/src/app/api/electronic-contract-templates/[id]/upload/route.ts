import { getAuthenticatedRequesterProfile } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import {
    COMPANY_CONTRACT_TEMPLATE_MAX_BYTES,
    COMPANY_CONTRACT_TEMPLATE_MAX_PAGES
} from '@/lib/electronic-contracts/company-template';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import {
    canManageTemplate,
    fetchTemplateForRequester,
    fetchTemplateVersions,
    latestVersionForTemplate,
    signedTemplateSourceUrl
} from '../../templateApi';

export const dynamic = 'force-dynamic';

const TEMPLATE_BUCKET = 'property-documents';

type RouteContext = {
    readonly params: Promise<{ readonly id: string }>;
};

async function ensureBucket(supabaseAdmin: ReturnType<typeof getSupabaseAdmin>): Promise<void> {
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
    if (listError) throw listError;
    if (buckets.some(bucket => bucket.name === TEMPLATE_BUCKET)) return;
    const { error } = await supabaseAdmin.storage.createBucket(TEMPLATE_BUCKET, {
        public: false,
        fileSizeLimit: COMPANY_CONTRACT_TEMPLATE_MAX_BYTES,
        allowedMimeTypes: ['application/pdf']
    });
    if (error) throw error;
}

function normalizePageCount(value: FormDataEntryValue | null): number {
    if (typeof value !== 'string') return 1;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 1;
    return Math.max(1, Math.trunc(parsed));
}

function validatePdfFile(file: File): string {
    const lowerName = file.name.toLowerCase();
    if (file.type !== 'application/pdf' && !lowerName.endsWith('.pdf')) return 'PDF 파일만 업로드할 수 있습니다.';
    if (file.size > COMPANY_CONTRACT_TEMPLATE_MAX_BYTES) return 'PDF는 10MB 이하만 업로드할 수 있습니다.';
    return '';
}

export async function POST(request: Request, context: RouteContext) {
    try {
        const { id } = await context.params;
        const supabaseAdmin = getSupabaseAdmin();
        const requester = await getAuthenticatedRequesterProfile(supabaseAdmin, request);
        if (!requester) return fail(401, 'AUTH_REQUIRED', 'authenticated session is required');

        const access = await fetchTemplateForRequester(supabaseAdmin, requester, id);
        if (!access.ok) return fail(access.status, access.status === 404 ? 'NOT_FOUND' : 'FORBIDDEN', access.message);
        if (!canManageTemplate(requester, access.template.company_id)) {
            return fail(403, 'FORBIDDEN', '템플릿 파일을 업로드할 권한이 없습니다.');
        }

        const formData = await request.formData();
        const fileValue = formData.get('file');
        if (!(fileValue instanceof File)) return fail(400, 'VALIDATION_ERROR', 'PDF 파일이 필요합니다.');

        const pageCount = normalizePageCount(formData.get('pageCount'));
        if (pageCount > COMPANY_CONTRACT_TEMPLATE_MAX_PAGES) {
            return fail(400, 'VALIDATION_ERROR', 'PDF는 30페이지 이하만 사용할 수 있습니다.');
        }

        const validationMessage = validatePdfFile(fileValue);
        if (validationMessage) return fail(400, 'VALIDATION_ERROR', validationMessage);

        const versions = await fetchTemplateVersions(supabaseAdmin, [id]);
        const latestVersion = latestVersionForTemplate(versions, id);
        if (!latestVersion) return fail(404, 'NOT_FOUND', '템플릿 버전을 찾을 수 없습니다.');

        await ensureBucket(supabaseAdmin);
        const storagePath = `electronic-contract-templates/${access.template.company_id}/${id}/source.pdf`;
        const uploadBuffer = Buffer.from(await fileValue.arrayBuffer());
        const { error: uploadError } = await supabaseAdmin.storage
            .from(TEMPLATE_BUCKET)
            .upload(storagePath, uploadBuffer, {
                contentType: 'application/pdf',
                upsert: true
            });
        if (uploadError) throw uploadError;

        const { error: updateError } = await supabaseAdmin
            .from('company_contract_template_versions')
            .update({
                source_file_url: null,
                source_file_path: storagePath,
                source_file_name: fileValue.name,
                source_file_size: fileValue.size,
                page_count: pageCount,
                updated_at: new Date().toISOString()
            })
            .eq('id', latestVersion.id);
        if (updateError) throw updateError;

        return ok({
            versionId: latestVersion.id,
            sourceFileUrl: await signedTemplateSourceUrl(supabaseAdmin, { source_file_path: storagePath, source_file_url: null }),
            sourceFilePath: storagePath,
            sourceFileName: fileValue.name,
            sourceFileSize: fileValue.size,
            pageCount
        });
    } catch (error) {
        console.error('Electronic contract template PDF upload error:', error);
        return fail(500, 'INTERNAL_ERROR', '템플릿 PDF를 업로드하지 못했습니다.');
    }
}
