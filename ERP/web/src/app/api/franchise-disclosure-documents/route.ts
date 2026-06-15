import {
    canAccessCompanyResource,
    canAccessCompanyScope,
    getRequesterProfile,
    isAdmin,
    resolveCompanyIdByName,
    type RequesterProfile
} from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import {
    buildDisclosureDocumentPayload,
    buildDisclosureDocumentUpdates,
    cleanString,
    getFirst,
    isMissingDisclosureDocumentSchemaError,
    readDisclosureDocumentBody,
    readDisclosureDocumentRow,
    readDisclosureDocumentRows,
    requesterFallback,
    transformDisclosureDocument
} from '@/lib/franchise-disclosure-documents';

export const dynamic = 'force-dynamic';

function handleDisclosureDocumentError(error: unknown, action: string) {
    console.error(`Franchise disclosure documents ${action} error:`, error);
    if (isMissingDisclosureDocumentSchemaError(error)) {
        return fail(
            424,
            'VALIDATION_ERROR',
            '정보공개서 문서함 테이블이 아직 적용되지 않았습니다. supabase_franchise_disclosures_migration.sql 적용 후 다시 확인해주세요.'
        );
    }
    return fail(500, 'INTERNAL_ERROR', `Failed to ${action.toLowerCase()} disclosure document${action === 'GET' ? 's' : ''}`);
}

async function resolveCompanyScope(
    supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
    requester: RequesterProfile,
    companyName: string | null,
    explicitCompanyId?: string | null
) {
    const requestedCompanyId = explicitCompanyId || (companyName ? await resolveCompanyIdByName(supabaseAdmin, companyName) : null);
    if (companyName && !requestedCompanyId) return { empty: true };

    if (isAdmin(requester)) return { companyId: requestedCompanyId };
    if (requester.company_id) {
        if (requestedCompanyId && requestedCompanyId !== requester.company_id) {
            return { error: fail(403, 'FORBIDDEN', 'Forbidden: cross-company access denied') };
        }
        return { companyId: requester.company_id };
    }
    return { empty: true };
}

export async function GET(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const requester = await getRequesterProfile(supabaseAdmin, request);
        if (!requester) return fail(401, 'AUTH_REQUIRED', 'requesterId is required');

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (id) {
            const { data, error } = await supabaseAdmin
                .from('franchise_disclosure_documents')
                .select('*')
                .eq('id', id)
                .single();
            const document = readDisclosureDocumentRow(data);
            if (error || !document) return fail(404, 'NOT_FOUND', 'Disclosure document not found');
            if (!canAccessCompanyResource(requester, document)) return fail(403, 'FORBIDDEN', 'Forbidden: cross-company access denied');
            return ok({ document: transformDisclosureDocument(document) });
        }

        const scope = await resolveCompanyScope(supabaseAdmin, requester, searchParams.get('company'), searchParams.get('companyId'));
        if (scope.error) return scope.error;
        if (scope.empty) return ok({ documents: [] });

        let query = supabaseAdmin
            .from('franchise_disclosure_documents')
            .select('*')
            .order('updated_at', { ascending: false });
        if (scope.companyId) query = query.eq('company_id', scope.companyId);
        if (searchParams.get('includeArchived') !== 'true') query = query.eq('status', 'active');

        const { data, error } = await query;
        if (error) throw error;
        return ok({ documents: readDisclosureDocumentRows(data).map(transformDisclosureDocument) });
    } catch (error) {
        return handleDisclosureDocumentError(error, 'GET');
    }
}

export async function POST(request: Request) {
    try {
        const body = await readDisclosureDocumentBody(request);
        const supabaseAdmin = getSupabaseAdmin();
        const requester = await getRequesterProfile(supabaseAdmin, request, requesterFallback(body));
        if (!requester) return fail(401, 'AUTH_REQUIRED', 'requesterId is required');

        const companyName = cleanString(getFirst(body, ['companyName', 'company']));
        const explicitCompanyId = cleanString(getFirst(body, ['companyId', 'company_id']));
        const scope = await resolveCompanyScope(supabaseAdmin, requester, companyName, explicitCompanyId);
        if (scope.error) return scope.error;
        if (scope.empty || !scope.companyId) return fail(400, 'VALIDATION_ERROR', 'Company scope is required');
        if (!canAccessCompanyScope(requester, scope.companyId)) return fail(403, 'FORBIDDEN', 'Forbidden: cross-company write denied');

        const payload = buildDisclosureDocumentPayload(body, requester, scope.companyId);
        if (!payload.title) return fail(400, 'VALIDATION_ERROR', 'Disclosure document title is required');

        const { data, error } = await supabaseAdmin
            .from('franchise_disclosure_documents')
            .insert({ ...payload, created_at: payload.updated_at })
            .select()
            .single();
        if (error) throw error;
        const document = readDisclosureDocumentRow(data);
        if (!document) return fail(500, 'INTERNAL_ERROR', 'Failed to read saved disclosure document');
        return ok({ document: transformDisclosureDocument(document) }, 201);
    } catch (error) {
        return handleDisclosureDocumentError(error, 'SAVE');
    }
}

export async function PUT(request: Request) {
    try {
        const body = await readDisclosureDocumentBody(request);
        const supabaseAdmin = getSupabaseAdmin();
        const requester = await getRequesterProfile(supabaseAdmin, request, requesterFallback(body));
        if (!requester) return fail(401, 'AUTH_REQUIRED', 'requesterId is required');

        const id = cleanString(getFirst(body, ['id']));
        if (!id) return fail(400, 'VALIDATION_ERROR', 'ID required');

        const { data: existing, error: fetchError } = await supabaseAdmin
            .from('franchise_disclosure_documents')
            .select('*')
            .eq('id', id)
            .single();
        const document = readDisclosureDocumentRow(existing);
        if (fetchError || !document) return fail(404, 'NOT_FOUND', 'Disclosure document not found');
        if (!canAccessCompanyResource(requester, document)) return fail(403, 'FORBIDDEN', 'Forbidden: cross-company access denied');

        const { data, error } = await supabaseAdmin
            .from('franchise_disclosure_documents')
            .update(buildDisclosureDocumentUpdates(body, document))
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        const updatedDocument = readDisclosureDocumentRow(data);
        if (!updatedDocument) return fail(500, 'INTERNAL_ERROR', 'Failed to read updated disclosure document');
        return ok({ document: transformDisclosureDocument(updatedDocument) });
    } catch (error) {
        return handleDisclosureDocumentError(error, 'UPDATE');
    }
}

export async function DELETE(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const requester = await getRequesterProfile(supabaseAdmin, request);
        if (!requester) return fail(401, 'AUTH_REQUIRED', 'requesterId is required');

        const id = new URL(request.url).searchParams.get('id');
        if (!id) return fail(400, 'VALIDATION_ERROR', 'ID required');

        const { data: existing, error: fetchError } = await supabaseAdmin
            .from('franchise_disclosure_documents')
            .select('*')
                .eq('id', id)
                .single();
        const document = readDisclosureDocumentRow(existing);
        if (fetchError || !document) return fail(404, 'NOT_FOUND', 'Disclosure document not found');
        if (!canAccessCompanyResource(requester, document)) return fail(403, 'FORBIDDEN', 'Forbidden: cross-company delete denied');

        const { error } = await supabaseAdmin
            .from('franchise_disclosure_documents')
            .update({ status: 'archived', updated_at: new Date().toISOString() })
            .eq('id', id);
        if (error) throw error;
        return ok({ success: true });
    } catch (error) {
        return handleDisclosureDocumentError(error, 'DELETE');
    }
}
