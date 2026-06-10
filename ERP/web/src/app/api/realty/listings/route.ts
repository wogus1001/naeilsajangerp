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
        const limit = Math.max(1, Math.min(200, Number(searchParams.get('limit') || 80)));
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

        if (!companyId && !isAdmin(requesterProfile)) {
            return fail(400, 'VALIDATION_ERROR', 'Company scope is required');
        }

        let query = supabaseAdmin
            .from('external_property_listings')
            .select('*')
            .order('collected_at', { ascending: false })
            .limit(limit);

        if (companyId) query = query.eq('company_id', companyId);
        if (propertyId) query = query.eq('property_id', propertyId);
        if (importJobId) query = query.eq('import_job_id', importJobId);
        if (source) query = query.eq('source', source);

        const { data, error } = await query;
        if (error) throw error;

        return ok({
            listings: (data || []).map(transformListing)
        });
    } catch (error) {
        console.error('Realty listings GET error:', error);
        return fail(500, 'INTERNAL_ERROR', 'Failed to fetch external realty listings');
    }
}
