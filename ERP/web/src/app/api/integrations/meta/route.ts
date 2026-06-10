import { getSupabaseAdmin } from '@/lib/supabase-admin';
import {
    canAccessCompanyResource,
    canAccessCompanyScope,
    getRequesterProfile,
    isAdmin,
    resolveCompanyIdByName
} from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import {
    canManageMetaIntegration,
    sanitizeMetaConnection,
    sanitizeMetaForm,
    sanitizeMetaImport
} from '@/lib/meta-leads';

export const dynamic = 'force-dynamic';

async function resolveCompanyScope(supabaseAdmin: any, requesterProfile: any, companyName: string | null) {
    const requestedCompanyId = companyName ? await resolveCompanyIdByName(supabaseAdmin, companyName) : null;
    if (companyName && !requestedCompanyId) {
        return { error: ok({ connections: [], forms: [], imports: [], configReady: false }) };
    }

    if (isAdmin(requesterProfile)) {
        return { companyId: requestedCompanyId || null, scopeMode: 'admin' as const };
    }

    if (!requesterProfile.company_id) {
        return { error: fail(403, 'FORBIDDEN', 'Company scope is required') };
    }

    if (requestedCompanyId && requestedCompanyId !== requesterProfile.company_id) {
        return { error: fail(403, 'FORBIDDEN', 'Forbidden: cross-company access denied') };
    }

    return { companyId: requesterProfile.company_id, scopeMode: 'company' as const };
}

export async function GET(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const { searchParams } = new URL(request.url);
        const requesterProfile = await getRequesterProfile(supabaseAdmin, request);
        if (!requesterProfile) {
            return fail(401, 'AUTH_REQUIRED', 'requesterId is required');
        }

        const scope = await resolveCompanyScope(supabaseAdmin, requesterProfile, searchParams.get('company'));
        if (scope.error) return scope.error;

        let connectionQuery = supabaseAdmin
            .from('meta_lead_connections')
            .select('*')
            .order('updated_at', { ascending: false });

        let formQuery = supabaseAdmin
            .from('meta_lead_forms')
            .select('*')
            .order('updated_at', { ascending: false });

        let importQuery = supabaseAdmin
            .from('meta_lead_imports')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);

        if (scope.companyId) {
            connectionQuery = connectionQuery.eq('company_id', scope.companyId);
            formQuery = formQuery.eq('company_id', scope.companyId);
            importQuery = importQuery.eq('company_id', scope.companyId);
        } else if (scope.scopeMode !== 'admin') {
            return fail(403, 'FORBIDDEN', 'Company scope is required');
        }

        const [
            { data: connections, error: connectionError },
            { data: forms, error: formError },
            { data: imports, error: importError }
        ] = await Promise.all([connectionQuery, formQuery, importQuery]);

        if (connectionError) throw connectionError;
        if (formError) throw formError;
        if (importError) throw importError;

        return ok({
            connections: (connections || []).map(sanitizeMetaConnection).filter(Boolean),
            forms: (forms || []).map(sanitizeMetaForm).filter(Boolean),
            imports: (imports || []).map(sanitizeMetaImport).filter(Boolean),
            configReady: Boolean(
                process.env.META_APP_ID &&
                process.env.META_APP_SECRET &&
                process.env.META_VERIFY_TOKEN &&
                (process.env.META_TOKEN_ENCRYPTION_KEY || process.env.META_APP_SECRET)
            )
        });
    } catch (error) {
        console.error('Meta integration GET error:', error);
        return fail(500, 'INTERNAL_ERROR', 'Failed to fetch Meta integration');
    }
}

export async function DELETE(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const { searchParams } = new URL(request.url);
        const connectionId = searchParams.get('id');

        let body: any = null;
        try {
            body = await request.json();
        } catch {
            body = null;
        }

        const requesterProfile = await getRequesterProfile(
            supabaseAdmin,
            request,
            body?.requesterId || body?.userId || null
        );
        if (!requesterProfile) {
            return fail(401, 'AUTH_REQUIRED', 'requesterId is required');
        }
        if (!canManageMetaIntegration(requesterProfile)) {
            return fail(403, 'FORBIDDEN', 'Only managers can manage Meta integration');
        }
        if (!connectionId) {
            return fail(400, 'VALIDATION_ERROR', 'Connection ID is required');
        }

        const { data: connection, error: fetchError } = await supabaseAdmin
            .from('meta_lead_connections')
            .select('id, company_id, connected_by')
            .eq('id', connectionId)
            .single();

        if (fetchError || !connection) {
            return fail(404, 'NOT_FOUND', 'Meta connection not found');
        }
        if (
            !canAccessCompanyResource(requesterProfile, { company_id: connection.company_id, manager_id: connection.connected_by }) &&
            !canAccessCompanyScope(requesterProfile, connection.company_id)
        ) {
            return fail(403, 'FORBIDDEN', 'Forbidden: cross-company delete denied');
        }

        const { error } = await supabaseAdmin
            .from('meta_lead_connections')
            .update({
                access_token_encrypted: 'disconnected',
                status: 'disconnected',
                last_error: null,
                updated_at: new Date().toISOString()
            })
            .eq('id', connectionId);

        if (error) throw error;
        return ok({ success: true });
    } catch (error) {
        console.error('Meta integration DELETE error:', error);
        return fail(500, 'INTERNAL_ERROR', 'Failed to disconnect Meta integration');
    }
}
