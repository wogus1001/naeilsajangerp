import { getAuthenticatedRequesterProfile } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import { canAccessFranchiseLocation } from '@/lib/franchise-location-access';
import { isRecord } from '@/lib/franchise-location-api-payload';
import {
    normalizeMeetingToolDraft,
    type MeetingToolDraft
} from '@/lib/franchise-location-meeting-tool';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

type LocationMeetingToolRow = {
    readonly id: string;
    readonly company_id: string | null;
    readonly manager_id: string | null;
    readonly created_by: string | null;
    readonly data: unknown;
};

function cleanString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function readMeetingTool(value: unknown): MeetingToolDraft {
    return normalizeMeetingToolDraft(value);
}

export async function PATCH(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const requesterProfile = await getAuthenticatedRequesterProfile(supabaseAdmin, request);
        if (!requesterProfile) return fail(401, 'AUTH_REQUIRED', 'authenticated session is required');

        const parsed: unknown = await request.json().catch(() => null);
        if (!isRecord(parsed)) return fail(400, 'VALIDATION_ERROR', 'Invalid request body');

        const locationId = cleanString(parsed.locationId);
        if (!locationId) return fail(400, 'VALIDATION_ERROR', 'locationId is required');

        const { data: location, error: fetchError } = await supabaseAdmin
            .from('franchise_locations')
            .select('id, company_id, manager_id, created_by, data')
            .eq('id', locationId)
            .returns<LocationMeetingToolRow[]>()
            .single();

        if (fetchError || !location) return fail(404, 'NOT_FOUND', 'Franchise location not found');
        if (!canAccessFranchiseLocation(requesterProfile, location)) {
            return fail(403, 'FORBIDDEN', 'Forbidden: cross-company access denied');
        }

        const existingData = isRecord(location.data) ? location.data : {};
        const meetingTool = readMeetingTool({
            ...(isRecord(parsed.meetingTool) ? parsed.meetingTool : {}),
            updatedAt: new Date().toISOString()
        });
        const nextData = {
            ...existingData,
            meetingTool
        };

        const { error: updateError } = await supabaseAdmin
            .from('franchise_locations')
            .update({
                data: nextData,
                updated_at: new Date().toISOString()
            })
            .eq('id', locationId);

        if (updateError) throw updateError;
        return ok({ locationId, meetingTool });
    } catch (error) {
        console.error('Franchise location meeting tool PATCH error:', error);
        return fail(500, 'INTERNAL_ERROR', 'Failed to save meeting report');
    }
}
