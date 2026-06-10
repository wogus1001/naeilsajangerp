import {
    canAccessCompanyResource,
    getRequesterProfile,
    isAdmin,
    resolveCompanyIdByName
} from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

function cleanString(value: unknown): string {
    return String(value ?? '').trim();
}

function transformListing(row: any) {
    if (!row) return null;
    return {
        id: row.id,
        companyId: row.company_id,
        requesterId: row.requester_id,
        importJobId: row.import_job_id,
        propertyId: row.property_id,
        duplicateOfPropertyId: row.duplicate_of_property_id,
        source: row.source,
        sourceListingId: row.source_listing_id,
        sourceUrl: row.source_url,
        title: row.title,
        address: row.address,
        region: row.region,
        latitude: row.latitude === null ? null : Number(row.latitude),
        longitude: row.longitude === null ? null : Number(row.longitude),
        tradeType: row.trade_type,
        propertyType: row.property_type,
        depositAmount: row.deposit_amount === null ? null : Number(row.deposit_amount),
        monthlyRent: row.monthly_rent === null ? null : Number(row.monthly_rent),
        salePrice: row.sale_price === null ? null : Number(row.sale_price),
        maintenanceFee: row.maintenance_fee === null ? null : Number(row.maintenance_fee),
        areaSqm: row.area_sqm === null ? null : Number(row.area_sqm),
        areaPyeong: row.area_pyeong,
        floorInfo: row.floor_info,
        imageUrls: row.image_urls || [],
        status: row.status,
        collectedAt: row.collected_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        raw: row.raw || {},
        data: row.data || {}
    };
}

function getErrorCode(error: unknown) {
    if (!error || typeof error !== 'object' || !('code' in error)) return '';
    return typeof error.code === 'string' ? error.code : '';
}

function getErrorMessage(error: unknown) {
    if (error instanceof Error) return error.message;
    if (!error || typeof error !== 'object' || !('message' in error)) return '';
    return typeof error.message === 'string' ? error.message : '';
}

function isMissingRealtySchemaError(error: unknown) {
    const code = getErrorCode(error);
    const message = getErrorMessage(error);
    return ['PGRST204', '42703'].includes(code)
        && /requester_id|company_id|external_property_listings/i.test(message);
}

export async function GET(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const { searchParams } = new URL(request.url);
        const requesterProfile = await getRequesterProfile(supabaseAdmin, request);
        if (!requesterProfile) return fail(401, 'AUTH_REQUIRED', 'requesterId is required');

        const propertyId = cleanString(searchParams.get('propertyId'));
        const importJobId = cleanString(searchParams.get('importJobId'));
        const companyName = cleanString(searchParams.get('company'));
        const source = cleanString(searchParams.get('source'));
        const region = cleanString(searchParams.get('region'));
        const limit = Math.max(1, Math.min(2000, Number(searchParams.get('limit') || 80)));
        let companyId = requesterProfile.company_id;

        if (propertyId) {
            const { data: property, error: propertyError } = await supabaseAdmin
                .from('properties')
                .select('id, company_id, manager_id')
                .eq('id', propertyId)
                .maybeSingle();
            if (propertyError) throw propertyError;
            if (!property) return fail(404, 'NOT_FOUND', 'Property not found');
            if (!canAccessCompanyResource(requesterProfile, property)) {
                return fail(403, 'FORBIDDEN', 'Forbidden: cross-company access denied');
            }
            companyId = property.company_id;
        } else if (companyName) {
            const resolvedCompanyId = await resolveCompanyIdByName(supabaseAdmin, companyName);
            if (!resolvedCompanyId) return ok({ listings: [] });
            if (!isAdmin(requesterProfile) && requesterProfile.company_id !== resolvedCompanyId) {
                return fail(403, 'FORBIDDEN', 'Forbidden: cross-company access denied');
            }
            companyId = resolvedCompanyId;
        }

        let query = supabaseAdmin
            .from('external_property_listings')
            .select('*')
            .order('collected_at', { ascending: false })
            .limit(limit);

        if (companyId) query = query.eq('company_id', companyId);
        else query = query.is('company_id', null).eq('requester_id', requesterProfile.id);
        if (propertyId) query = query.eq('property_id', propertyId);
        if (importJobId) query = query.eq('import_job_id', importJobId);
        if (source) query = query.eq('source', source);
        if (region) {
            const district = region.split(/\s+/).find(token => /[구군시]$/.test(token)) || region;
            const sanitized = district.replace(/[%,()]/g, '').trim();
            if (sanitized) query = query.or(`region.ilike.%${sanitized}%,address.ilike.%${sanitized}%`);
        }

        const { data, error } = await query;
        if (error) throw error;

        return ok({
            listings: (data || []).map(transformListing)
        });
    } catch (error) {
        console.error('Realty listings GET error:', error);
        if (isMissingRealtySchemaError(error)) {
            return fail(
                424,
                'VALIDATION_ERROR',
                '외부 상가 수집 테이블이 최신 스키마가 아닙니다. supabase_realty_import_migration.sql 최신 버전을 적용한 뒤 다시 조회해주세요.'
            );
        }
        return fail(500, 'INTERNAL_ERROR', 'Failed to fetch external realty listings');
    }
}

export async function PATCH(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const requesterProfile = await getRequesterProfile(supabaseAdmin, request);
        if (!requesterProfile) return fail(401, 'AUTH_REQUIRED', 'requesterId is required');

        const body = await request.json() as Record<string, unknown>;
        const listingId = cleanString(body.listingId || body.id);
        if (!listingId) return fail(400, 'VALIDATION_ERROR', 'listingId is required');

        const { data: listing, error } = await supabaseAdmin
            .from('external_property_listings')
            .select('*')
            .eq('id', listingId)
            .maybeSingle();
        if (error) throw error;
        if (!listing) return fail(404, 'NOT_FOUND', 'External realty listing not found');

        if (!canAccessCompanyResource(requesterProfile, listing) && listing.requester_id !== requesterProfile.id) {
            return fail(403, 'FORBIDDEN', 'Forbidden: cross-company access denied');
        }

        const currentData = listing.data && typeof listing.data === 'object' && !Array.isArray(listing.data)
            ? listing.data
            : {};
        const { data: updated, error: updateError } = await supabaseAdmin
            .from('external_property_listings')
            .update({
                data: {
                    ...currentData,
                    favorite: body.favorite === true
                },
                updated_at: new Date().toISOString()
            })
            .eq('id', listingId)
            .select()
            .single();
        if (updateError) throw updateError;

        return ok({
            listing: transformListing(updated)
        });
    } catch (error) {
        console.error('Realty listings PATCH error:', error);
        if (isMissingRealtySchemaError(error)) {
            return fail(
                424,
                'VALIDATION_ERROR',
                '외부 상가 수집 테이블이 최신 스키마가 아닙니다. supabase_realty_import_migration.sql 최신 버전을 적용한 뒤 다시 저장해주세요.'
            );
        }
        return fail(500, 'INTERNAL_ERROR', 'Failed to update external realty listing');
    }
}
