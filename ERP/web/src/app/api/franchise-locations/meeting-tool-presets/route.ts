import { canAccessCompanyScope, getAuthenticatedRequesterProfile } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import { isRecord } from '@/lib/franchise-location-api-payload';
import {
    normalizeMeetingToolPreset,
    toMeetingToolPresetData,
    type MeetingToolPreset
} from '@/lib/franchise-location-meeting-tool';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

type MeetingToolPresetRow = {
    readonly id: string;
    readonly company_id: string;
    readonly name: string;
    readonly data: unknown;
    readonly created_at: string | null;
    readonly updated_at: string | null;
};

function cleanString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function isMissingPresetTableError(value: unknown): boolean {
    if (!isRecord(value)) return false;
    const code = cleanString(value.code);
    return code === '42P01' || code === 'PGRST205';
}

function resolveCompanyId(request: Request, requesterCompanyId: string | null | undefined, parsed?: unknown): string {
    const { searchParams } = new URL(request.url);
    const bodyCompanyId = isRecord(parsed) ? cleanString(parsed.companyId) : '';
    return bodyCompanyId || cleanString(searchParams.get('companyId')) || cleanString(requesterCompanyId);
}

function toPreset(row: MeetingToolPresetRow): MeetingToolPreset | null {
    const data = isRecord(row.data) ? row.data : {};
    return normalizeMeetingToolPreset({
        ...data,
        id: row.id,
        name: row.name,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    });
}

function toPresetList(rows: readonly MeetingToolPresetRow[] | null): readonly MeetingToolPreset[] {
    return (rows || [])
        .map(toPreset)
        .filter((preset): preset is MeetingToolPreset => preset !== null);
}

export async function GET(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const requesterProfile = await getAuthenticatedRequesterProfile(supabaseAdmin, request);
        if (!requesterProfile) return fail(401, 'AUTH_REQUIRED', 'authenticated session is required');

        const companyId = resolveCompanyId(request, requesterProfile.company_id);
        if (!companyId) return fail(400, 'VALIDATION_ERROR', 'companyId is required');
        if (!canAccessCompanyScope(requesterProfile, companyId)) {
            return fail(403, 'FORBIDDEN', 'Forbidden: cross-company access denied');
        }

        const { data, error } = await supabaseAdmin
            .from('franchise_location_meeting_tool_presets')
            .select('id, company_id, name, data, created_at, updated_at')
            .eq('company_id', companyId)
            .order('updated_at', { ascending: false })
            .returns<MeetingToolPresetRow[]>();

        if (error) {
            if (isMissingPresetTableError(error)) return ok({ presets: [] });
            throw error;
        }

        return ok({ presets: toPresetList(data) });
    } catch (error) {
        console.error('Franchise location meeting tool presets GET error:', error);
        return fail(500, 'INTERNAL_ERROR', 'Failed to load meeting tool presets');
    }
}

export async function POST(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const requesterProfile = await getAuthenticatedRequesterProfile(supabaseAdmin, request);
        if (!requesterProfile) return fail(401, 'AUTH_REQUIRED', 'authenticated session is required');

        const parsed: unknown = await request.json().catch(() => null);
        if (!isRecord(parsed)) return fail(400, 'VALIDATION_ERROR', 'Invalid request body');

        const companyId = resolveCompanyId(request, requesterProfile.company_id, parsed);
        if (!companyId) return fail(400, 'VALIDATION_ERROR', 'companyId is required');
        if (!canAccessCompanyScope(requesterProfile, companyId)) {
            return fail(403, 'FORBIDDEN', 'Forbidden: cross-company access denied');
        }

        const name = cleanString(parsed.name);
        if (!name) return fail(400, 'VALIDATION_ERROR', 'preset name is required');

        const meetingTool = isRecord(parsed.meetingTool) ? parsed.meetingTool : {};
        const data = toMeetingToolPresetData(meetingTool);
        const now = new Date().toISOString();

        const { data: row, error } = await supabaseAdmin
            .from('franchise_location_meeting_tool_presets')
            .upsert({
                company_id: companyId,
                name,
                data,
                created_by: requesterProfile.id,
                updated_at: now
            }, { onConflict: 'company_id,name' })
            .select('id, company_id, name, data, created_at, updated_at')
            .returns<MeetingToolPresetRow[]>()
            .single();

        if (error) {
            if (isMissingPresetTableError(error)) {
                return fail(500, 'INTERNAL_ERROR', 'Meeting tool preset table is not ready');
            }
            throw error;
        }

        const preset = toPreset(row);
        if (!preset) return fail(500, 'INTERNAL_ERROR', 'Failed to normalize meeting tool preset');
        return ok({ preset });
    } catch (error) {
        console.error('Franchise location meeting tool presets POST error:', error);
        return fail(500, 'INTERNAL_ERROR', 'Failed to save meeting tool preset');
    }
}

export async function DELETE(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const requesterProfile = await getAuthenticatedRequesterProfile(supabaseAdmin, request);
        if (!requesterProfile) return fail(401, 'AUTH_REQUIRED', 'authenticated session is required');

        const { searchParams } = new URL(request.url);
        const presetId = cleanString(searchParams.get('presetId'));
        if (!presetId) return fail(400, 'VALIDATION_ERROR', 'presetId is required');

        const { data: row, error: fetchError } = await supabaseAdmin
            .from('franchise_location_meeting_tool_presets')
            .select('id, company_id')
            .eq('id', presetId)
            .maybeSingle<{ id: string; company_id: string }>();

        if (fetchError) {
            if (isMissingPresetTableError(fetchError)) return fail(404, 'NOT_FOUND', 'Meeting tool preset not found');
            throw fetchError;
        }
        if (!row) return fail(404, 'NOT_FOUND', 'Meeting tool preset not found');
        if (!canAccessCompanyScope(requesterProfile, row.company_id)) {
            return fail(403, 'FORBIDDEN', 'Forbidden: cross-company access denied');
        }

        const { error: deleteError } = await supabaseAdmin
            .from('franchise_location_meeting_tool_presets')
            .delete()
            .eq('id', presetId)
            .eq('company_id', row.company_id);

        if (deleteError) throw deleteError;
        return ok({ presetId });
    } catch (error) {
        console.error('Franchise location meeting tool presets DELETE error:', error);
        return fail(500, 'INTERNAL_ERROR', 'Failed to delete meeting tool preset');
    }
}
