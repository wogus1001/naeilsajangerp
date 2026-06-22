import { getAuthenticatedRequesterProfile } from '@/lib/api-auth';
import { fail } from '@/lib/api-response';
import { canViewElectronicContract } from '@/lib/electronic-contracts/document-permissions';
import type { ElectronicContractRow } from '@/lib/electronic-contracts/records';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import {
    downloadPlatformDocumentFullFile,
    UcansignPlatformError
} from '@/lib/ucansign/platform-client';

export const dynamic = 'force-dynamic';

type RouteContext = {
    readonly params: Promise<{ readonly id: string }>;
};

function safeFileName(value: string): string {
    const normalized = value
        .replace(/[\\/:*?"<>|\r\n\t]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return normalized || '전자계약';
}

function extensionFromContentType(contentType: string): string {
    return contentType.includes('zip') ? '.zip' : '.pdf';
}

function attachmentDisposition(fileName: string, contentType: string): string {
    const safeName = safeFileName(fileName);
    const lowerName = safeName.toLowerCase();
    const normalized = lowerName.endsWith('.pdf') || lowerName.endsWith('.zip')
        ? safeName
        : `${safeName}${extensionFromContentType(contentType)}`;
    return `attachment; filename*=UTF-8''${encodeURIComponent(normalized)}`;
}

export async function GET(request: Request, context: RouteContext) {
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
        if (!data.ucansign_document_id) {
            return fail(400, 'VALIDATION_ERROR', '다운로드할 수 있는 전자계약 문서가 없습니다.');
        }

        const file = await downloadPlatformDocumentFullFile(data.ucansign_document_id, data.name || '전자계약');
        return new Response(file.content, {
            headers: {
                'Cache-Control': 'no-store',
                'Content-Disposition': attachmentDisposition(file.fileName || data.name || '전자계약', file.contentType),
                'Content-Type': file.contentType
            }
        });
    } catch (error) {
        console.error('Electronic contract download error:', error);
        const message = error instanceof UcansignPlatformError
            ? error.message
            : '전자계약 문서를 다운로드하지 못했습니다.';
        return fail(500, 'INTERNAL_ERROR', message);
    }
}
