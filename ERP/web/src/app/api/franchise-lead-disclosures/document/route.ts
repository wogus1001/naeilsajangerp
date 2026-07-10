import { fail } from '@/lib/api-response';
import { hashDisclosureConfirmationToken } from '@/lib/gmail-integration';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const DISCLOSURE_DOCUMENT_BUCKET = 'property-documents';
const DISCLOSURE_DOCUMENT_PREFIX = 'franchise-disclosures/';
const DISCLOSURE_DOCUMENT_SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 30;

type DeliveryDocumentRow = {
    readonly evidence_url: string | null;
};

function cleanString(value: unknown): string {
    if (value === null || value === undefined) return '';
    return String(value).trim();
}

function extractDisclosureDocumentPath(value: string): string {
    if (!value) return '';
    if (value.startsWith(DISCLOSURE_DOCUMENT_PREFIX)) return value;

    try {
        const parsed = new URL(value);
        const marker = `/storage/v1/object/public/${DISCLOSURE_DOCUMENT_BUCKET}/`;
        const markerIndex = parsed.pathname.indexOf(marker);
        if (markerIndex === -1) return '';
        return decodeURIComponent(parsed.pathname.slice(markerIndex + marker.length));
    } catch {
        return '';
    }
}

export async function GET(request: Request) {
    try {
        const token = cleanString(new URL(request.url).searchParams.get('token'));
        if (!token) return fail(400, 'VALIDATION_ERROR', 'token is required');

        const supabaseAdmin = getSupabaseAdmin();
        const { data, error } = await supabaseAdmin
            .from('franchise_lead_disclosure_deliveries')
            .select('evidence_url')
            .eq('confirmation_token_hash', hashDisclosureConfirmationToken(token))
            .maybeSingle<DeliveryDocumentRow>();
        if (error) throw error;
        if (!data?.evidence_url) return fail(404, 'NOT_FOUND', 'Disclosure document not found');

        const storagePath = extractDisclosureDocumentPath(data.evidence_url);
        if (!storagePath || !storagePath.startsWith(DISCLOSURE_DOCUMENT_PREFIX)) {
            return fail(404, 'NOT_FOUND', 'Disclosure document not found');
        }

        const { data: signed, error: signedError } = await supabaseAdmin.storage
            .from(DISCLOSURE_DOCUMENT_BUCKET)
            .createSignedUrl(storagePath, DISCLOSURE_DOCUMENT_SIGNED_URL_TTL_SECONDS);
        if (signedError || !signed?.signedUrl) throw signedError || new Error('Failed to sign disclosure document URL');

        return Response.redirect(signed.signedUrl, 302);
    } catch (error) {
        console.error('Franchise disclosure document redirect error:', error);
        return fail(500, 'INTERNAL_ERROR', '정보공개서 문서를 열지 못했습니다.');
    }
}
