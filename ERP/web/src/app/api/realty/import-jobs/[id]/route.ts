import { canAccessCompanyResource, getRequesterProfile } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

function transformJob(row: any) {
    if (!row) return null;
    return {
        id: row.id,
        companyId: row.company_id,
        requesterId: row.requester_id,
        referencePropertyId: row.reference_property_id,
        source: row.source,
        region: row.region,
        query: row.query,
        listingTypes: row.listing_types || [],
        status: row.status,
        totalCount: row.total_count || 0,
        createdCount: row.created_count || 0,
        updatedCount: row.updated_count || 0,
        duplicateCount: row.duplicate_count || 0,
        failedCount: row.failed_count || 0,
        warnings: row.warnings || [],
        errors: row.errors || [],
        startedAt: row.started_at,
        completedAt: row.completed_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        data: row.data || {}
    };
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
        collectedAt: row.collected_at
    };
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await context.params;
        const supabaseAdmin = getSupabaseAdmin();
        const requesterProfile = await getRequesterProfile(supabaseAdmin, request);
        if (!requesterProfile) return fail(401, 'AUTH_REQUIRED', 'requesterId is required');

        const { data: job, error } = await supabaseAdmin
            .from('realty_import_jobs')
            .select('*')
            .eq('id', id)
            .maybeSingle();
        if (error) throw error;
        if (!job) return fail(404, 'NOT_FOUND', 'Import job not found');
        if (!canAccessCompanyResource(requesterProfile, job) && job.requester_id !== requesterProfile.id) {
            return fail(403, 'FORBIDDEN', 'Forbidden: cross-company access denied');
        }

        const { data: listings, error: listingsError } = await supabaseAdmin
            .from('external_property_listings')
            .select('*')
            .eq('import_job_id', id)
            .order('created_at', { ascending: false });
        if (listingsError) throw listingsError;

        return ok({
            job: transformJob(job),
            listings: (listings || []).map(transformListing)
        });
    } catch (error) {
        console.error('Realty import job GET error:', error);
        return fail(500, 'INTERNAL_ERROR', 'Failed to fetch import job');
    }
}
