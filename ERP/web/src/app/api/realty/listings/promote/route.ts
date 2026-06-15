import { randomUUID } from 'crypto';
import {
    canAccessCompanyResource,
    canAccessCompanyScope,
    getRequesterProfile,
    resolveUserUuid
} from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import {
    buildManualPromotedPropertyPayload,
    buildPromotedListingData,
    parseExternalListingPromotionRow,
    type ExternalListingPromotionRow
} from '@/lib/realty-listing-promotion';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cleanString(value: unknown): string {
    return String(value ?? '').trim();
}

function requesterFallbackFromBody(body: unknown): string | null {
    if (!isRecord(body)) return null;
    const rawRequester = body.requesterId || body.userId || body.managerId || null;
    const requesterId = cleanString(rawRequester);
    return requesterId || null;
}

function readBodyString(body: unknown, key: string): string {
    if (!isRecord(body)) return '';
    return cleanString(body[key]);
}

function propertySummary(row: unknown) {
    if (!isRecord(row)) return null;
    return {
        id: cleanString(row.id),
        name: cleanString(row.name),
        address: cleanString(row.address),
        status: cleanString(row.status),
        operationType: cleanString(row.operation_type)
    };
}

async function fetchExistingPromotedPropertyId(
    supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
    companyId: string,
    row: ExternalListingPromotionRow
): Promise<string | null> {
    const { data, error } = await supabaseAdmin
        .from('properties')
        .select('id')
        .eq('company_id', companyId)
        .contains('data', {
            externalSource: row.source,
            externalListingId: row.source_listing_id
        })
        .limit(1);
    if (error) throw error;
    return cleanString(data?.[0]?.id) || null;
}

async function markListingPromoted(
    supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
    row: ExternalListingPromotionRow,
    propertyId: string,
    promotedAt: string
) {
    const { data, error } = await supabaseAdmin
        .from('external_property_listings')
        .update({
            property_id: propertyId,
            status: 'promoted',
            updated_at: promotedAt,
            data: buildPromotedListingData({
                currentData: row.data,
                propertyId,
                promotedAt
            })
        })
        .eq('id', row.id)
        .select()
        .single();
    if (error) throw error;
    return parseExternalListingPromotionRow(data);
}

export async function POST(request: Request) {
    const supabaseAdmin = getSupabaseAdmin();
    let createdPropertyId = '';

    try {
        const body: unknown = await request.json();
        const requesterProfile = await getRequesterProfile(supabaseAdmin, request, requesterFallbackFromBody(body));
        if (!requesterProfile) return fail(401, 'AUTH_REQUIRED', 'requesterId is required');

        const listingId = readBodyString(body, 'listingId') || readBodyString(body, 'id');
        if (!listingId) return fail(400, 'VALIDATION_ERROR', 'listingId is required');

        const { data: listingData, error: listingError } = await supabaseAdmin
            .from('external_property_listings')
            .select('*')
            .eq('id', listingId)
            .maybeSingle();
        if (listingError) throw listingError;

        const listingRow = parseExternalListingPromotionRow(listingData);
        if (!listingRow) return fail(404, 'NOT_FOUND', 'External realty listing not found');

        const canAccessListing = canAccessCompanyResource(requesterProfile, {
            company_id: listingRow.company_id,
            user_id: listingRow.requester_id
        });
        if (!canAccessListing) return fail(403, 'FORBIDDEN', 'Forbidden: cross-company access denied');

        const companyId = listingRow.company_id || requesterProfile.company_id;
        if (!companyId) {
            return fail(400, 'VALIDATION_ERROR', 'ERP 물건지 승격에는 회사 범위가 필요합니다.');
        }
        if (!canAccessCompanyScope(requesterProfile, companyId)) {
            return fail(403, 'FORBIDDEN', 'Forbidden: cross-company create denied');
        }

        const requestedManagerId = readBodyString(body, 'managerId') || requesterProfile.id;
        const managerId = await resolveUserUuid(supabaseAdmin, requestedManagerId);
        if (!managerId) return fail(400, 'VALIDATION_ERROR', 'Valid managerId is required');

        const { data: managerProfile, error: managerError } = await supabaseAdmin
            .from('profiles')
            .select('company_id')
            .eq('id', managerId)
            .maybeSingle();
        if (managerError) throw managerError;
        if (!managerProfile || managerProfile.company_id !== companyId) {
            return fail(403, 'FORBIDDEN', 'Forbidden: manager/company mismatch');
        }

        const promotedAt = new Date().toISOString();
        const existingPropertyId = listingRow.property_id
            || await fetchExistingPromotedPropertyId(supabaseAdmin, companyId, listingRow);
        if (existingPropertyId) {
            const promotedListing = await markListingPromoted(supabaseAdmin, listingRow, existingPropertyId, promotedAt);
            const { data: existingProperty, error: existingPropertyError } = await supabaseAdmin
                .from('properties')
                .select('id, name, address, status, operation_type')
                .eq('id', existingPropertyId)
                .maybeSingle();
            if (existingPropertyError) throw existingPropertyError;

            return ok({
                action: 'existing',
                propertyId: existingPropertyId,
                property: propertySummary(existingProperty),
                listing: promotedListing
            });
        }

        const propertyId = randomUUID();
        createdPropertyId = propertyId;
        const payload = buildManualPromotedPropertyPayload({
            row: listingRow,
            propertyId,
            companyId,
            managerId,
            companyName: readBodyString(body, 'companyName') || undefined,
            promotedAt
        });

        const { data: insertedProperty, error: insertError } = await supabaseAdmin
            .from('properties')
            .insert(payload)
            .select('id, name, address, status, operation_type')
            .single();
        if (insertError) throw insertError;

        const promotedListing = await markListingPromoted(supabaseAdmin, listingRow, propertyId, promotedAt);

        return ok({
            action: 'created',
            propertyId,
            property: propertySummary(insertedProperty),
            listing: promotedListing
        }, 201);
    } catch (error) {
        if (createdPropertyId) {
            const { error: cleanupError } = await supabaseAdmin
                .from('properties')
                .delete()
                .eq('id', createdPropertyId);
            if (cleanupError) console.error('Failed to rollback promoted property:', cleanupError);
        }
        console.error('Realty listing promote error:', error);
        return fail(500, 'INTERNAL_ERROR', 'Failed to promote external realty listing');
    }
}
