import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import {
    canAccessCompanyScope,
    getAuthenticatedRequesterProfile,
    isAdmin,
    type RequesterProfile,
    resolveCompanyIdByName,
    resolveUserUuid
} from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import {
    canAccessFranchiseLocation,
    shouldRestrictFranchiseLocationListToCreator
} from '@/lib/franchise-location-access';
import {
    buildInsertPayload,
    buildUpdatePayload,
    cleanString,
    getFirst,
    hasAny,
    isRecord,
    type LocationRequestBody
} from '@/lib/franchise-location-api-payload';
import {
    fetchLocationManagerNameMap,
    transformLocation,
    type ManagerReferenceRow
} from '@/lib/franchise-location-api-response';

export const dynamic = 'force-dynamic';

function readErrorText(error: unknown, key: 'code' | 'message'): string {
    if (!error || typeof error !== 'object') return '';
    if (key === 'code' && 'code' in error) {
        return typeof error.code === 'string' ? error.code : '';
    }
    if (key === 'message' && 'message' in error) {
        return typeof error.message === 'string' ? error.message : '';
    }
    return '';
}

function isMissingContractLocationSchemaError(error: unknown): boolean {
    const code = readErrorText(error, 'code');
    const message = readErrorText(error, 'message');
    return ['PGRST204', '42703'].includes(code)
        && /contract_lead_id|source_location_id|source_external_listing_id|contracted_at/i.test(message);
}

async function readLocationRequestBody(request: Request) {
    const parsed: unknown = await request.json().catch(() => null);
    if (!isRecord(parsed)) return { body: null, error: fail(400, 'VALIDATION_ERROR', 'Invalid request body') };
    return { body: parsed, error: null };
}

async function resolveCompanyScope(
    supabaseAdmin: SupabaseClient,
    requesterProfile: RequesterProfile,
    companyName: string | null
) {
    const requestedCompanyId = companyName ? await resolveCompanyIdByName(supabaseAdmin, companyName) : null;
    if (companyName && !requestedCompanyId) return { companyId: '__none__' };
    if (isAdmin(requesterProfile)) return { companyId: requestedCompanyId };
    if (requesterProfile.company_id) {
        if (requestedCompanyId && requestedCompanyId !== requesterProfile.company_id) {
            return { error: fail(403, 'FORBIDDEN', 'Forbidden: cross-company access denied') };
        }
        return { companyId: requesterProfile.company_id };
    }
    return { companyId: null, managerId: requesterProfile.id };
}

async function resolveMutationScope(
    supabaseAdmin: SupabaseClient,
    requesterProfile: RequesterProfile,
    body: LocationRequestBody
) {
    const companyName = cleanString(body.companyName);
    const requestedCompanyId = cleanString(body.companyId);
    const resolvedCompanyId = requestedCompanyId || (companyName ? await resolveCompanyIdByName(supabaseAdmin, companyName) : null);
    const companyId = resolvedCompanyId || requesterProfile.company_id;

    if (!companyId) {
        return { error: fail(400, 'VALIDATION_ERROR', 'Company scope is required') };
    }
    if (!isAdmin(requesterProfile) && !canAccessCompanyScope(requesterProfile, companyId)) {
        return { error: fail(403, 'FORBIDDEN', 'Forbidden: cross-company write denied') };
    }

    const rawManager = cleanString(getFirst(body, ['managerId', 'manager_id']));
    const managerUuid = rawManager
        ? await resolveUserUuid(supabaseAdmin, rawManager)
        : isAdmin(requesterProfile)
            ? null
            : requesterProfile.id;
    if (managerUuid) {
        const { data: managerProfile } = await supabaseAdmin
            .from('profiles')
            .select('company_id')
            .eq('id', managerUuid)
            .maybeSingle();

        if (!managerProfile || managerProfile.company_id !== companyId) {
            return { error: fail(403, 'FORBIDDEN', 'Forbidden: manager/company mismatch') };
        }
    }

    return { companyId, managerUuid: managerUuid || null };
}

export async function GET(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const company = searchParams.get('company');
        const contractLeadId = cleanString(searchParams.get('contractLeadId') || searchParams.get('contract_lead_id'));

        const requesterProfile = await getAuthenticatedRequesterProfile(supabaseAdmin, request);
        if (!requesterProfile) {
            return fail(401, 'AUTH_REQUIRED', 'authenticated session is required');
        }

        if (id) {
            const { data: location, error } = await supabaseAdmin
                .from('franchise_locations')
                .select('*')
                .eq('id', id)
                .single();

            if (error || !location) return fail(404, 'NOT_FOUND', 'Franchise location not found');
            if (!canAccessFranchiseLocation(requesterProfile, location)) {
                return fail(403, 'FORBIDDEN', 'Forbidden: cross-company access denied');
            }

            const managerNames = await fetchLocationManagerNameMap(supabaseAdmin, [location]);
            return ok({ location: transformLocation(location, managerNames) });
        }

        const scope = await resolveCompanyScope(supabaseAdmin, requesterProfile, company);
        if (scope.error) return scope.error;
        if (scope.companyId === '__none__') return ok({ locations: [] });

        let query = supabaseAdmin
            .from('franchise_locations')
            .select('*')
            .order('updated_at', { ascending: false })
            .order('created_at', { ascending: false });

        if (scope.companyId) query = query.eq('company_id', scope.companyId);
        if (scope.managerId) query = query.eq('manager_id', scope.managerId);
        if (contractLeadId) query = query.eq('contract_lead_id', contractLeadId);
        if (shouldRestrictFranchiseLocationListToCreator(requesterProfile)) query = query.eq('created_by', requesterProfile.id);

        const { data, error } = await query;
        if (error) throw error;
        const managerNames = await fetchLocationManagerNameMap(supabaseAdmin, data || []);

        return ok({ locations: (data || []).map(row => transformLocation(row, managerNames)).filter(Boolean) });
    } catch (error) {
        console.error('Franchise locations GET error:', error);
        if (isMissingContractLocationSchemaError(error)) {
            return fail(
                424,
                'VALIDATION_ERROR',
                '계약 완료 점주 가맹점 연동 SQL이 아직 적용되지 않았습니다. supabase_franchise_contract_store_linkage_migration.sql 적용 후 다시 시도해주세요.'
            );
        }
        return fail(500, 'INTERNAL_ERROR', 'Failed to fetch franchise locations');
    }
}

export async function POST(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const { body, error: bodyError } = await readLocationRequestBody(request);
        if (bodyError) return bodyError;
        if (!body) return fail(400, 'VALIDATION_ERROR', 'Invalid request body');

        const requesterProfile = await getAuthenticatedRequesterProfile(supabaseAdmin, request);
        if (!requesterProfile) {
            return fail(401, 'AUTH_REQUIRED', 'authenticated session is required');
        }

        const scope = await resolveMutationScope(supabaseAdmin, requesterProfile, body);
        if (scope.error) return scope.error;

        const insert = buildInsertPayload(body, scope.companyId, scope.managerUuid, requesterProfile.id);
        if (insert.error) return insert.error;

        const { data: inserted, error } = await supabaseAdmin
            .from('franchise_locations')
            .insert(insert.payload)
            .select()
            .single();

        if (error) throw error;
        const managerNames = await fetchLocationManagerNameMap(supabaseAdmin, [inserted]);
        return ok({ location: transformLocation(inserted, managerNames) }, 201);
    } catch (error) {
        console.error('Franchise locations POST error:', error);
        return fail(500, 'INTERNAL_ERROR', 'Failed to create franchise location');
    }
}

export async function PUT(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const { body, error: bodyError } = await readLocationRequestBody(request);
        if (bodyError) return bodyError;
        if (!body) return fail(400, 'VALIDATION_ERROR', 'Invalid request body');

        const requesterProfile = await getAuthenticatedRequesterProfile(supabaseAdmin, request);
        if (!requesterProfile) {
            return fail(401, 'AUTH_REQUIRED', 'authenticated session is required');
        }
        if (!body.id) {
            return fail(400, 'VALIDATION_ERROR', 'ID required');
        }

        const { data: existing, error: fetchError } = await supabaseAdmin
            .from('franchise_locations')
            .select('*')
            .eq('id', body.id)
            .single();

        if (fetchError || !existing) return fail(404, 'NOT_FOUND', 'Franchise location not found');
        if (!canAccessFranchiseLocation(requesterProfile, existing)) {
            return fail(403, 'FORBIDDEN', 'Forbidden: cross-company access denied');
        }

        const scope = await resolveMutationScope(supabaseAdmin, requesterProfile, {
            ...body,
            companyId: existing.company_id
        });
        if (scope.error) return scope.error;

        const updates = buildUpdatePayload(body, existing.data || {});
        updates.company_id = existing.company_id;
        if (hasAny(body, ['managerId', 'manager_id'])) updates.manager_id = scope.managerUuid;

        const { data: updated, error } = await supabaseAdmin
            .from('franchise_locations')
            .update(updates)
            .eq('id', body.id)
            .select()
            .single();

        if (error) throw error;
        const managerNames = await fetchLocationManagerNameMap(supabaseAdmin, [updated]);
        return ok({ location: transformLocation(updated, managerNames) });
    } catch (error) {
        console.error('Franchise locations PUT error:', error);
        return fail(500, 'INTERNAL_ERROR', 'Failed to update franchise location');
    }
}

export async function DELETE(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) return fail(400, 'VALIDATION_ERROR', 'ID required');

        const requesterProfile = await getAuthenticatedRequesterProfile(supabaseAdmin, request);
        if (!requesterProfile) {
            return fail(401, 'AUTH_REQUIRED', 'authenticated session is required');
        }

        const { data: target, error: targetError } = await supabaseAdmin
            .from('franchise_locations')
            .select('id, company_id, manager_id, created_by')
            .eq('id', id)
            .single();

        if (targetError || !target) return fail(404, 'NOT_FOUND', 'Franchise location not found');
        if (!canAccessFranchiseLocation(requesterProfile, target)) {
            return fail(403, 'FORBIDDEN', 'Forbidden: cross-company delete denied');
        }

        const { error } = await supabaseAdmin
            .from('franchise_locations')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return ok({ success: true });
    } catch (error) {
        console.error('Franchise locations DELETE error:', error);
        return fail(500, 'INTERNAL_ERROR', 'Failed to delete franchise location');
    }
}
