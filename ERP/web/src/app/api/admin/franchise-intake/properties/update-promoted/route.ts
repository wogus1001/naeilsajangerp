import { getRequesterProfile, isAdmin } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import {
    buildFranchisePropertyPromotionDraft,
    type FranchisePropertyPromotionRow
} from '@/lib/franchise-property-promotion';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

type Payload = {
    readonly propertyId: string;
    readonly requesterId: string | null;
};

type LocationRow = {
    readonly id: string;
    readonly company_id: string;
    readonly manager_id: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, key: string): string | null {
    const value = record[key];
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed || null;
}

function parsePayload(value: unknown): Payload | null {
    if (!isRecord(value)) return null;
    const propertyId = readString(value, 'propertyId');
    if (!propertyId) return null;
    return { propertyId, requesterId: readString(value, 'requesterId') };
}

export async function POST(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const payload = parsePayload(await request.json());
        if (!payload) return fail(400, 'VALIDATION_ERROR', 'Invalid property update payload');

        const requester = await getRequesterProfile(supabaseAdmin, request, payload.requesterId);
        if (!requester) return fail(401, 'AUTH_REQUIRED', 'requesterId is required');
        if (!isAdmin(requester)) return fail(403, 'FORBIDDEN', 'Admin access required');

        const { data: property, error: propertyError } = await supabaseAdmin
            .from('properties')
            .select('id, company_id, manager_id, name, status, operation_type, address, created_at, updated_at, data')
            .eq('id', payload.propertyId)
            .maybeSingle<FranchisePropertyPromotionRow>();
        if (propertyError) throw propertyError;
        if (!property) return fail(404, 'NOT_FOUND', 'Property not found');

        const { data: location, error: locationError } = await supabaseAdmin
            .from('franchise_locations')
            .select('id, company_id, manager_id')
            .eq('source_property_id', property.id)
            .maybeSingle<LocationRow>();
        if (locationError) throw locationError;
        if (!location) return fail(404, 'NOT_FOUND', 'Promoted location not found');

        const draft = buildFranchisePropertyPromotionDraft(
            { ...property, manager_id: location.manager_id || property.manager_id },
            location.company_id,
            location.manager_id || property.manager_id
        );
        const { data: updated, error: updateError } = await supabaseAdmin
            .from('franchise_locations')
            .update({ ...draft, updated_at: new Date().toISOString() })
            .eq('id', location.id)
            .select()
            .single();
        if (updateError) throw updateError;
        return ok({ location: updated });
    } catch (error) {
        console.error('Admin promoted property update POST error:', error);
        return fail(500, 'INTERNAL_ERROR', 'Failed to update promoted property');
    }
}
