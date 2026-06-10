import { randomUUID } from 'crypto';
import {
    canAccessCompanyResource,
    canAccessCompanyScope,
    getRequesterProfile,
    isAdmin,
    resolveCompanyIdByName,
    resolveUserUuid
} from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import {
    buildExternalPropertyPayload,
    fetchDaangnStoreListings,
    type RealtyListing,
    type RealtySource
} from '@/lib/realty-import';

export const dynamic = 'force-dynamic';

const VALID_SOURCES = new Set<RealtySource>(['daangn']);

function cleanString(value: unknown): string {
    return String(value ?? '').trim();
}

function asArray<T>(value: unknown): T[] {
    if (Array.isArray(value)) return value as T[];
    if (value === undefined || value === null || value === '') return [];
    return [value as T];
}

function requesterFallbackFromBody(body: unknown): string | null {
    if (!body || typeof body !== 'object') return null;
    const payload = body as Record<string, unknown>;
    return cleanString(payload.requesterId || payload.userId || payload.managerId) || null;
}

function deriveRegion(value: unknown) {
    const text = cleanString(value).replace(/[(),]/g, ' ');
    const tokens = text.split(/\s+/).filter(Boolean);
    const district = tokens.find(token => /[구군시]$/.test(token));
    const dong = tokens.find(token => /[동가읍면리]$/.test(token));
    if (district && dong) return `${district} ${dong}`;
    if (district) return district;
    if (dong) return dong;
    return tokens.slice(0, 2).join(' ') || text;
}

function normalizeSources(value: unknown): RealtySource[] {
    const sources = asArray<string>(value)
        .map(source => cleanString(source) as RealtySource)
        .filter(source => VALID_SOURCES.has(source));
    return sources.length > 0 ? Array.from(new Set(sources)) : ['daangn'];
}

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

function getErrorMessage(error: unknown, fallback = '') {
    if (error instanceof Error) return error.message;
    if (!error || typeof error !== 'object' || !('message' in error)) return fallback;
    return typeof error.message === 'string' && error.message ? error.message : fallback;
}

function isMissingRealtyTableError(error: unknown) {
    const code = getErrorCode(error);
    const message = getErrorMessage(error);
    return ['PGRST205', '42P01'].includes(code)
        && /realty_import_jobs|external_property_listings/i.test(message);
}

function isMissingRealtySchemaError(error: unknown) {
    const code = getErrorCode(error);
    const message = getErrorMessage(error);
    return ['PGRST204', '42703'].includes(code)
        && /requester_id|company_id|realty_import_jobs|external_property_listings/i.test(message);
}

function transformRuntimeListing(params: {
    listing: RealtyListing;
    companyId: string | null;
    importJobId: string;
    requesterId?: string | null;
    propertyId?: string | null;
    duplicateOfPropertyId?: string | null;
}) {
    const { listing, companyId, importJobId, requesterId, propertyId, duplicateOfPropertyId } = params;
    return {
        id: `${listing.source}:${listing.sourceListingId}`,
        companyId,
        requesterId,
        importJobId,
        propertyId,
        duplicateOfPropertyId: duplicateOfPropertyId || null,
        source: listing.source,
        sourceListingId: listing.sourceListingId,
        sourceUrl: listing.sourceUrl,
        title: listing.title,
        address: listing.address,
        region: listing.region,
        latitude: listing.latitude,
        longitude: listing.longitude,
        tradeType: listing.tradeType,
        propertyType: listing.propertyType,
        depositAmount: listing.depositAmount,
        monthlyRent: listing.monthlyRent,
        salePrice: listing.salePrice,
        maintenanceFee: listing.maintenanceFee,
        areaSqm: listing.areaSqm,
        areaPyeong: listing.areaPyeong,
        floorInfo: listing.floorInfo,
        imageUrls: listing.imageUrls,
        status: duplicateOfPropertyId ? 'duplicate_candidate' : 'imported',
        collectedAt: listing.collectedAt,
        raw: listing.raw,
        data: {
            trackingTableMissing: true
        }
    };
}

async function resolveCompanyContext(supabaseAdmin: any, request: Request, body: Record<string, unknown>) {
    const requesterProfile = await getRequesterProfile(supabaseAdmin, request, requesterFallbackFromBody(body));
    if (!requesterProfile) return { error: fail(401, 'AUTH_REQUIRED', 'requesterId is required') };

    const referencePropertyId = cleanString(body.referencePropertyId || body.propertyId);
    let referenceProperty: any = null;
    if (referencePropertyId) {
        const { data, error } = await supabaseAdmin
            .from('properties')
            .select('id, company_id, manager_id, name, address, data')
            .eq('id', referencePropertyId)
            .maybeSingle();
        if (error) throw error;
        if (!data) return { error: fail(404, 'NOT_FOUND', 'Reference property not found') };
        if (!canAccessCompanyResource(requesterProfile, data)) {
            return { error: fail(403, 'FORBIDDEN', 'Forbidden: cross-company access denied') };
        }
        referenceProperty = data;
    }

    const requestedCompanyName = cleanString(body.companyName);
    const requestedCompanyId = cleanString(body.companyId)
        || (requestedCompanyName ? await resolveCompanyIdByName(supabaseAdmin, requestedCompanyName) : null);
    const companyId = referenceProperty?.company_id || requestedCompanyId || requesterProfile.company_id || null;
    if (companyId && !isAdmin(requesterProfile) && !canAccessCompanyScope(requesterProfile, companyId)) {
        return { error: fail(403, 'FORBIDDEN', 'Forbidden: cross-company write denied') };
    }

    const requestedManagerId = cleanString(body.managerId);
    const resolvedManagerId = requestedManagerId
        ? await resolveUserUuid(supabaseAdmin, requestedManagerId)
        : null;

    return {
        requesterProfile,
        referenceProperty,
        companyId,
        managerId: resolvedManagerId || referenceProperty?.manager_id || requesterProfile.id,
        companyName: requestedCompanyName
    };
}

async function findExistingExternalListing(
    supabaseAdmin: any,
    companyId: string | null,
    requesterId: string,
    listing: RealtyListing
) {
    let query = supabaseAdmin
        .from('external_property_listings')
        .select('*')
        .eq('source', listing.source)
        .eq('source_listing_id', listing.sourceListingId);

    query = companyId
        ? query.eq('company_id', companyId)
        : query.is('company_id', null).eq('requester_id', requesterId);

    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return data;
}

async function findPotentialDuplicateProperty(supabaseAdmin: any, companyId: string | null, listing: RealtyListing) {
    if (!companyId || !listing.address) return null;
    const { data, error } = await supabaseAdmin
        .from('properties')
        .select('id, name, address')
        .eq('company_id', companyId)
        .eq('address', listing.address)
        .limit(1);
    if (error) throw error;
    return data?.[0] || null;
}

async function findExistingImportedPropertyBySource(supabaseAdmin: any, companyId: string | null, listing: RealtyListing) {
    if (!companyId) return null;
    const { data, error } = await supabaseAdmin
        .from('properties')
        .select('id, name, address, data')
        .eq('company_id', companyId)
        .contains('data', {
            externalSource: listing.source,
            externalListingId: listing.sourceListingId
        })
        .limit(1);
    if (error) throw error;
    return data?.[0] || null;
}

async function createExternalProperty(supabaseAdmin: any, params: {
    listing: RealtyListing;
    companyId: string;
    companyName?: string;
    managerId: string;
    importJobId: string;
    duplicateOfPropertyId?: string | null;
}) {
    const payload = buildExternalPropertyPayload({
        listing: params.listing,
        companyName: params.companyName,
        managerId: params.managerId,
        importJobId: params.importJobId
    });
    const { name, status, operationType, address, isFavorite, ...rest } = payload;
    const propertyId = randomUUID();
    const dataPayload = {
        ...rest,
        externalImportMode: 'auto-created',
        externalReviewStatus: 'pending',
        externalDuplicateOfPropertyId: params.duplicateOfPropertyId || null
    };

    const { data, error } = await supabaseAdmin
        .from('properties')
        .insert({
            id: propertyId,
            company_id: params.companyId,
            manager_id: params.managerId,
            name,
            status,
            operation_type: operationType,
            address,
            is_favorite: Boolean(isFavorite),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            data: dataPayload
        })
        .select()
        .single();
    if (error) throw error;
    return data;
}

async function updateExternalProperty(supabaseAdmin: any, propertyId: string, params: {
    listing: RealtyListing;
    companyName?: string;
    managerId: string;
    importJobId: string;
}) {
    const { data: existing, error: existingError } = await supabaseAdmin
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .maybeSingle();
    if (existingError) throw existingError;
    if (!existing) return null;

    const payload = buildExternalPropertyPayload({
        listing: params.listing,
        companyName: params.companyName,
        managerId: params.managerId,
        importJobId: params.importJobId
    });
    const { name, status, operationType, address, isFavorite, ...rest } = payload;

    const { data, error } = await supabaseAdmin
        .from('properties')
        .update({
            name,
            status,
            operation_type: operationType,
            address,
            is_favorite: Boolean(isFavorite),
            updated_at: new Date().toISOString(),
            data: {
                ...(existing.data || {}),
                ...rest,
                externalImportMode: 'auto-updated',
                externalReviewStatus: existing.data?.externalReviewStatus || 'pending'
            }
        })
        .eq('id', propertyId)
        .select()
        .single();
    if (error) throw error;
    return data;
}

async function upsertExternalListing(supabaseAdmin: any, params: {
    listing: RealtyListing;
    companyId: string | null;
    requesterId: string;
    importJobId: string;
    propertyId?: string | null;
    duplicateOfPropertyId?: string | null;
    existingListingId?: string | null;
}) {
    const payload = {
        company_id: params.companyId,
        requester_id: params.requesterId,
        import_job_id: params.importJobId,
        property_id: params.propertyId,
        duplicate_of_property_id: params.duplicateOfPropertyId || null,
        source: params.listing.source,
        source_listing_id: params.listing.sourceListingId,
        source_url: params.listing.sourceUrl,
        title: params.listing.title,
        address: params.listing.address,
        region: params.listing.region,
        latitude: params.listing.latitude,
        longitude: params.listing.longitude,
        trade_type: params.listing.tradeType,
        property_type: params.listing.propertyType,
        deposit_amount: params.listing.depositAmount,
        monthly_rent: params.listing.monthlyRent,
        sale_price: params.listing.salePrice,
        maintenance_fee: params.listing.maintenanceFee,
        area_sqm: params.listing.areaSqm,
        area_pyeong: params.listing.areaPyeong,
        floor_info: params.listing.floorInfo,
        image_urls: params.listing.imageUrls,
        status: params.duplicateOfPropertyId ? 'duplicate_candidate' : 'imported',
        collected_at: params.listing.collectedAt,
        updated_at: new Date().toISOString(),
        raw: params.listing.raw,
        data: {
            autoCreatedProperty: Boolean(params.propertyId)
        }
    };

    if (params.existingListingId) {
        const { data, error } = await supabaseAdmin
            .from('external_property_listings')
            .update(payload)
            .eq('id', params.existingListingId)
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    const { data, error } = await supabaseAdmin
        .from('external_property_listings')
        .insert({
            id: randomUUID(),
            ...payload,
            created_at: new Date().toISOString()
        })
        .select()
        .single();
    if (error) throw error;
    return data;
}

async function collectListings(region: string, sources: RealtySource[], limit: unknown) {
    const results = await Promise.allSettled(sources.map(source => {
        return fetchDaangnStoreListings(region, limit);
    }));

    const listings: RealtyListing[] = [];
    const warnings: string[] = [];
    const errors: Array<{ source: RealtySource; message: string }> = [];
    const sourceUrls: Record<string, string> = {};

    results.forEach((result, index) => {
        const source = sources[index];
        if (result.status === 'fulfilled') {
            listings.push(...result.value.listings);
            warnings.push(...result.value.warnings);
            if (result.value.sourceUrl) sourceUrls[source] = result.value.sourceUrl;
        } else {
            errors.push({
                source,
                message: result.reason instanceof Error ? result.reason.message : '수집 실패'
            });
        }
    });

    return { listings, warnings, errors, sourceUrls };
}

async function assertRealtyTrackingSchema(supabaseAdmin: any) {
    const { error } = await supabaseAdmin
        .from('external_property_listings')
        .select('id, company_id, requester_id')
        .limit(1);
    if (error) throw error;
}

export async function POST(request: Request) {
    const supabaseAdmin = getSupabaseAdmin();
    let jobId: string | null = null;

    try {
        const body = await request.json() as Record<string, unknown>;
        const context = await resolveCompanyContext(supabaseAdmin, request, body);
        if ('error' in context) return context.error;

        const sources = normalizeSources(body.sources || body.source);
        const registerToProperties = body.registerToProperties === true;
        const region = deriveRegion(body.region || body.query || context.referenceProperty?.address || context.referenceProperty?.name);
        if (!region || region.length < 2) {
            return fail(400, 'VALIDATION_ERROR', '수집할 지역을 확인할 수 없습니다.');
        }
        if (registerToProperties) {
            return fail(400, 'VALIDATION_ERROR', '외부 상가 수집은 원본 목록에만 저장합니다. ERP 물건지 등록은 별도 선택 승격 플로우에서 진행해주세요.');
        }

        let trackingTablesAvailable = true;
        let job: any = null;

        const { data: insertedJob, error: jobError } = await supabaseAdmin
            .from('realty_import_jobs')
            .insert({
                id: randomUUID(),
                company_id: context.companyId,
                requester_id: context.requesterProfile.id,
                reference_property_id: context.referenceProperty?.id || null,
                source: sources.length === 1 ? sources[0] : 'all',
                region,
                query: cleanString(body.query || context.referenceProperty?.address || region),
                listing_types: ['store'],
                status: 'running',
                data: {
                    requestedSources: sources,
                    requesterOnlyScope: !context.companyId,
                    referencePropertyName: context.referenceProperty?.name || '',
                    requestedAt: new Date().toISOString()
                }
            })
            .select()
            .single();

        if (jobError) {
            if (!isMissingRealtyTableError(jobError)) throw jobError;
            trackingTablesAvailable = false;
            job = {
                id: randomUUID(),
                data: {
                    requestedSources: sources,
                    requesterOnlyScope: !context.companyId,
                    referencePropertyName: context.referenceProperty?.name || '',
                    requestedAt: new Date().toISOString()
                }
            };
        } else {
            job = insertedJob;
        }
        jobId = job.id;

        if (!trackingTablesAvailable) {
            return fail(
                424,
                'VALIDATION_ERROR',
                '외부 매물 원본 테이블이 아직 적용되지 않았습니다. supabase_realty_import_migration.sql 적용 후 다시 수집해주세요.'
            );
        }
        await assertRealtyTrackingSchema(supabaseAdmin);

        const collection = await collectListings(region, sources, body.limit);

        const importedListings: any[] = [];
        let createdCount = 0;
        let updatedCount = 0;
        let duplicateCount = 0;
        let failedCount = collection.errors.length;
        const rowErrors: Array<{ source: string; listingId?: string; message: string }> = [...collection.errors];

        for (const listing of collection.listings) {
            try {
                const existingExternal = trackingTablesAvailable
                    ? await findExistingExternalListing(supabaseAdmin, context.companyId, context.requesterProfile.id, listing)
                    : null;
                const duplicateProperty = existingExternal?.property_id
                    ? null
                    : await findPotentialDuplicateProperty(supabaseAdmin, context.companyId, listing);

                if (duplicateProperty) duplicateCount++;

                if (!registerToProperties) {
                    if (!trackingTablesAvailable) throw new Error('외부 매물 원본 테이블이 없어 저장할 수 없습니다.');

                    const externalListing = await upsertExternalListing(supabaseAdmin, {
                        listing,
                        companyId: context.companyId,
                        requesterId: context.requesterProfile.id,
                        importJobId: job.id,
                        propertyId: existingExternal?.property_id || null,
                        duplicateOfPropertyId: duplicateProperty?.id || null,
                        existingListingId: existingExternal?.id || null
                    });

                    if (existingExternal) updatedCount++;
                    else createdCount++;

                    importedListings.push({
                        listing: transformListing(externalListing),
                        propertyId: existingExternal?.property_id || null,
                        action: existingExternal ? 'updated' : 'collected',
                        duplicateOfPropertyId: duplicateProperty?.id || null
                    });
                    continue;
                }

                const existingImportedProperty = existingExternal?.property_id
                    ? null
                    : await findExistingImportedPropertyBySource(supabaseAdmin, context.companyId, listing);
                const existingPropertyId = existingExternal?.property_id || existingImportedProperty?.id || null;
                const property = existingPropertyId
                    ? await updateExternalProperty(supabaseAdmin, existingPropertyId, {
                        listing,
                        companyName: context.companyName,
                        managerId: context.managerId,
                        importJobId: job.id
                    })
                    : await createExternalProperty(supabaseAdmin, {
                        listing,
                        companyId: context.companyId,
                        companyName: context.companyName,
                        managerId: context.managerId,
                        importJobId: job.id,
                        duplicateOfPropertyId: duplicateProperty?.id || null
                    });

                if (!property?.id) throw new Error('ERP 물건지 저장 실패');

                const externalListing = trackingTablesAvailable
                    ? await upsertExternalListing(supabaseAdmin, {
                        listing,
                        companyId: context.companyId,
                        requesterId: context.requesterProfile.id,
                        importJobId: job.id,
                        propertyId: property.id,
                        duplicateOfPropertyId: duplicateProperty?.id || null,
                        existingListingId: existingExternal?.id || null
                    })
                    : transformRuntimeListing({
                        listing,
                        companyId: context.companyId,
                        importJobId: job.id,
                        requesterId: context.requesterProfile.id,
                        propertyId: property.id,
                        duplicateOfPropertyId: duplicateProperty?.id || null
                    });

                if (existingPropertyId) updatedCount++;
                else createdCount++;

                importedListings.push({
                    listing: trackingTablesAvailable ? transformListing(externalListing) : externalListing,
                    propertyId: property.id,
                    action: existingPropertyId ? 'updated' : 'created',
                    duplicateOfPropertyId: duplicateProperty?.id || null
                });
            } catch (error) {
                if (isMissingRealtyTableError(error) || isMissingRealtySchemaError(error)) throw error;
                failedCount++;
                rowErrors.push({
                    source: listing.source,
                    listingId: listing.sourceListingId,
                    message: getErrorMessage(error, '매물 저장 실패')
                });
            }
        }

        const finalStatus = failedCount > 0 && importedListings.length === 0 ? 'failed' : 'completed';
        if (!trackingTablesAvailable) {
            return ok({
                job: {
                    id: job.id,
                    companyId: context.companyId,
                    requesterId: context.requesterProfile.id,
                    referencePropertyId: context.referenceProperty?.id || null,
                    source: sources.length === 1 ? sources[0] : 'all',
                    region,
                    query: cleanString(body.query || context.referenceProperty?.address || region),
                    listingTypes: ['store'],
                    status: finalStatus,
                    totalCount: collection.listings.length,
                    createdCount,
                    updatedCount,
                    duplicateCount,
                    failedCount,
                    warnings: collection.warnings,
                    errors: rowErrors,
                    startedAt: job.data?.requestedAt || new Date().toISOString(),
                    completedAt: new Date().toISOString(),
                    createdAt: job.data?.requestedAt || new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    data: {
                        ...(job.data || {}),
                        sourceUrls: collection.sourceUrls,
                        trackingTablesAvailable: false
                    }
                },
                listings: importedListings
            }, 201);
        }

        const { data: updatedJob, error: updateError } = await supabaseAdmin
            .from('realty_import_jobs')
            .update({
                status: finalStatus,
                total_count: collection.listings.length,
                created_count: createdCount,
                updated_count: updatedCount,
                duplicate_count: duplicateCount,
                failed_count: failedCount,
                warnings: collection.warnings,
                errors: rowErrors,
                completed_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                data: {
                    ...(job.data || {}),
                    sourceUrls: collection.sourceUrls
                }
            })
            .eq('id', job.id)
            .select()
            .single();
        if (updateError) throw updateError;

        return ok({
            job: transformJob(updatedJob),
            listings: importedListings
        }, 201);
    } catch (error) {
        console.error('Realty import job error:', error);
        const message = getErrorMessage(error, 'Realty import failed');
        if (jobId) {
            const { error: failJobError } = await supabaseAdmin
                .from('realty_import_jobs')
                .update({
                    status: 'failed',
                    failed_count: 1,
                    errors: [{ message }],
                    completed_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', jobId);
            if (failJobError) console.error('Failed to mark realty import job as failed:', failJobError);
        }
        if (isMissingRealtyTableError(error) || isMissingRealtySchemaError(error)) {
            return fail(
                424,
                'VALIDATION_ERROR',
                '외부 상가 수집 테이블이 최신 스키마가 아닙니다. supabase_realty_import_migration.sql 최신 버전을 적용한 뒤 다시 수집해주세요.'
            );
        }
        return fail(500, 'INTERNAL_ERROR', message);
    }
}
