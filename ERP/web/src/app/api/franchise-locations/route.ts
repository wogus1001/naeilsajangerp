import { randomUUID } from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import {
    canAccessCompanyResource,
    canAccessCompanyScope,
    getRequesterProfile,
    isAdmin,
    resolveCompanyIdByName,
    resolveUserUuid
} from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

const LOCATION_TYPES = ['직영점', '가맹점', '예정점'];
const LOCATION_STATUSES = ['운영중', '오픈준비', '검토중', '휴점', '폐점'];
const CONTROL_FIELDS = new Set([
    'id',
    'requesterId',
    'userId',
    'companyName',
    'companyId',
    'managerId',
    'manager_id',
    'name',
    'locationType',
    'location_type',
    'brand',
    'status',
    'region',
    'address',
    'latitude',
    'lat',
    'longitude',
    'lng',
    'openedAt',
    'opened_at',
    'sourcePropertyId',
    'source_property_id',
    'memo'
]);

function getFirst(body: Record<string, any>, keys: string[]) {
    for (const key of keys) {
        if (Object.prototype.hasOwnProperty.call(body, key)) return body[key];
    }
    return undefined;
}

function hasAny(body: Record<string, any>, keys: string[]) {
    return keys.some(key => Object.prototype.hasOwnProperty.call(body, key));
}

function cleanString(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    const normalized = String(value).trim();
    return normalized.length > 0 ? normalized : null;
}

function parseNullableNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(String(value).trim().replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
}

function parseNullableDate(value: unknown): string | null {
    const raw = cleanString(value);
    if (!raw) return null;
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? raw : parsed.toISOString().slice(0, 10);
}

function normalizeLocationType(value: unknown) {
    const raw = cleanString(value) || '예정점';
    const matched = LOCATION_TYPES.find(type => type === raw || raw.includes(type.replace('점', '')));
    return matched || '예정점';
}

function normalizeLocationStatus(value: unknown) {
    const raw = cleanString(value) || '검토중';
    const matched = LOCATION_STATUSES.find(status => status === raw || raw.includes(status.replace('중', '')));
    return matched || '검토중';
}

function normalizeRegion(value: unknown) {
    const raw = cleanString(value);
    if (!raw) return '';
    return raw.replace(/\s+/g, ' ');
}

function transformLocation(row: any) {
    if (!row) return null;
    const data = row.data || {};
    return {
        ...data,
        id: row.id,
        companyId: row.company_id,
        managerId: row.manager_id,
        name: row.name || '',
        locationType: row.location_type || '예정점',
        brand: row.brand || '',
        status: row.status || '검토중',
        region: row.region || '',
        address: row.address || '',
        latitude: row.latitude,
        longitude: row.longitude,
        openedAt: row.opened_at,
        sourcePropertyId: row.source_property_id,
        memo: row.memo || '',
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

async function resolveCompanyScope(supabaseAdmin: any, requesterProfile: any, companyName: string | null) {
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

async function resolveMutationScope(supabaseAdmin: any, requesterProfile: any, body: Record<string, any>) {
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

    const rawManager = getFirst(body, ['managerId', 'manager_id']);
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

function buildDataPayload(body: Record<string, any>, existingData: Record<string, any> = {}) {
    const extras: Record<string, any> = {};
    Object.entries(body).forEach(([key, value]) => {
        if (!CONTROL_FIELDS.has(key)) extras[key] = value;
    });

    return {
        ...existingData,
        ...extras,
        ...(body.companyName !== undefined ? { companyName: body.companyName } : {}),
        ...(body.managerId !== undefined ? { managerId: body.managerId } : {})
    };
}

function buildInsertPayload(body: Record<string, any>, companyId: string, managerUuid: string | null) {
    const name = cleanString(getFirst(body, ['name', '위치명', '매장명']));
    if (!name) {
        return { error: fail(400, 'VALIDATION_ERROR', 'Location name is required') };
    }

    return {
        payload: {
            id: randomUUID(),
            company_id: companyId,
            manager_id: managerUuid,
            name,
            location_type: normalizeLocationType(getFirst(body, ['locationType', 'location_type', '구분'])),
            brand: cleanString(getFirst(body, ['brand', '브랜드'])) || '',
            status: normalizeLocationStatus(getFirst(body, ['status', '상태'])),
            region: normalizeRegion(getFirst(body, ['region', '지역'])),
            address: cleanString(getFirst(body, ['address', '주소'])) || '',
            latitude: parseNullableNumber(getFirst(body, ['latitude', 'lat', '위도'])),
            longitude: parseNullableNumber(getFirst(body, ['longitude', 'lng', '경도'])),
            opened_at: parseNullableDate(getFirst(body, ['openedAt', 'opened_at', '오픈일'])),
            source_property_id: cleanString(getFirst(body, ['sourcePropertyId', 'source_property_id'])),
            memo: cleanString(getFirst(body, ['memo', '메모'])) || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            data: buildDataPayload(body)
        }
    };
}

function buildUpdatePayload(body: Record<string, any>, existingData: Record<string, any> = {}) {
    const updates: Record<string, any> = {
        updated_at: new Date().toISOString(),
        data: buildDataPayload(body, existingData)
    };

    if (hasAny(body, ['name', '위치명', '매장명'])) updates.name = cleanString(getFirst(body, ['name', '위치명', '매장명'])) || '';
    if (hasAny(body, ['locationType', 'location_type', '구분'])) updates.location_type = normalizeLocationType(getFirst(body, ['locationType', 'location_type', '구분']));
    if (hasAny(body, ['brand', '브랜드'])) updates.brand = cleanString(getFirst(body, ['brand', '브랜드'])) || '';
    if (hasAny(body, ['status', '상태'])) updates.status = normalizeLocationStatus(getFirst(body, ['status', '상태']));
    if (hasAny(body, ['region', '지역'])) updates.region = normalizeRegion(getFirst(body, ['region', '지역']));
    if (hasAny(body, ['address', '주소'])) updates.address = cleanString(getFirst(body, ['address', '주소'])) || '';
    if (hasAny(body, ['latitude', 'lat', '위도'])) updates.latitude = parseNullableNumber(getFirst(body, ['latitude', 'lat', '위도']));
    if (hasAny(body, ['longitude', 'lng', '경도'])) updates.longitude = parseNullableNumber(getFirst(body, ['longitude', 'lng', '경도']));
    if (hasAny(body, ['openedAt', 'opened_at', '오픈일'])) updates.opened_at = parseNullableDate(getFirst(body, ['openedAt', 'opened_at', '오픈일']));
    if (hasAny(body, ['sourcePropertyId', 'source_property_id'])) updates.source_property_id = cleanString(getFirst(body, ['sourcePropertyId', 'source_property_id']));
    if (hasAny(body, ['memo', '메모'])) updates.memo = cleanString(getFirst(body, ['memo', '메모'])) || '';

    return updates;
}

export async function GET(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const company = searchParams.get('company');

        const requesterProfile = await getRequesterProfile(supabaseAdmin, request);
        if (!requesterProfile) {
            return fail(401, 'AUTH_REQUIRED', 'requesterId is required');
        }

        if (id) {
            const { data: location, error } = await supabaseAdmin
                .from('franchise_locations')
                .select('*')
                .eq('id', id)
                .single();

            if (error || !location) return fail(404, 'NOT_FOUND', 'Franchise location not found');
            if (!canAccessCompanyResource(requesterProfile, location)) {
                return fail(403, 'FORBIDDEN', 'Forbidden: cross-company access denied');
            }

            return ok({ location: transformLocation(location) });
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

        const { data, error } = await query;
        if (error) throw error;

        return ok({ locations: (data || []).map(transformLocation).filter(Boolean) });
    } catch (error) {
        console.error('Franchise locations GET error:', error);
        return fail(500, 'INTERNAL_ERROR', 'Failed to fetch franchise locations');
    }
}

export async function POST(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const body = await request.json();

        const requesterProfile = await getRequesterProfile(
            supabaseAdmin,
            request,
            body.requesterId || body.userId || body.managerId || null
        );
        if (!requesterProfile) {
            return fail(401, 'AUTH_REQUIRED', 'requesterId is required');
        }

        const scope = await resolveMutationScope(supabaseAdmin, requesterProfile, body);
        if (scope.error) return scope.error;

        const insert = buildInsertPayload(body, scope.companyId, scope.managerUuid);
        if (insert.error) return insert.error;

        const { data: inserted, error } = await supabaseAdmin
            .from('franchise_locations')
            .insert(insert.payload)
            .select()
            .single();

        if (error) throw error;
        return ok({ location: transformLocation(inserted) }, 201);
    } catch (error) {
        console.error('Franchise locations POST error:', error);
        return fail(500, 'INTERNAL_ERROR', 'Failed to create franchise location');
    }
}

export async function PUT(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const body = await request.json();

        const requesterProfile = await getRequesterProfile(
            supabaseAdmin,
            request,
            body.requesterId || body.userId || body.managerId || null
        );
        if (!requesterProfile) {
            return fail(401, 'AUTH_REQUIRED', 'requesterId is required');
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
        if (!canAccessCompanyResource(requesterProfile, existing)) {
            return fail(403, 'FORBIDDEN', 'Forbidden: cross-company access denied');
        }

        const scope = await resolveMutationScope(supabaseAdmin, requesterProfile, {
            ...body,
            companyId: existing.company_id
        });
        if (scope.error) return scope.error;

        const updates = buildUpdatePayload(body, existing.data || {});
        updates.company_id = existing.company_id;
        if (body.managerId || body.manager_id) updates.manager_id = scope.managerUuid;

        const { data: updated, error } = await supabaseAdmin
            .from('franchise_locations')
            .update(updates)
            .eq('id', body.id)
            .select()
            .single();

        if (error) throw error;
        return ok({ location: transformLocation(updated) });
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

        const requesterProfile = await getRequesterProfile(supabaseAdmin, request);
        if (!requesterProfile) {
            return fail(401, 'AUTH_REQUIRED', 'requesterId is required');
        }

        const { data: target, error: targetError } = await supabaseAdmin
            .from('franchise_locations')
            .select('id, company_id, manager_id')
            .eq('id', id)
            .single();

        if (targetError || !target) return fail(404, 'NOT_FOUND', 'Franchise location not found');
        if (!canAccessCompanyResource(requesterProfile, target)) {
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
