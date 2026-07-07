import {
    getAuthenticatedRequesterProfile,
    type RequesterProfile
} from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import { canAccessFranchiseLocation } from '@/lib/franchise-location-access';
import { isRecord } from '@/lib/franchise-location-api-payload';
import { normalizeMeetingToolDraft } from '@/lib/franchise-location-meeting-tool';
import {
    makeMeetingToolVersionTitle,
    normalizeMeetingToolVersion,
    type MeetingToolVersion
} from '@/lib/franchise-location-meeting-tool-versions';
import { getSupabaseAdmin as createSupabaseAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VERSION_SELECT = 'id, company_id, location_id, version_number, title, meeting_tool, created_by, created_at';

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;
type MeetingToolVersionsRouteDependencies = {
    readonly getSupabaseAdmin: () => SupabaseAdminClient;
    readonly resolveRequester: (
        supabaseAdmin: SupabaseAdminClient,
        request: Request
    ) => Promise<RequesterProfile | null>;
};

type LocationAccessRow = {
    readonly id: string;
    readonly company_id: string | null;
    readonly manager_id: string | null;
    readonly created_by: string | null;
};
type AccessibleLocationRow = LocationAccessRow & {
    readonly company_id: string;
};

type MeetingToolVersionRow = {
    readonly id: string;
    readonly company_id: string;
    readonly location_id: string;
    readonly version_number: number;
    readonly title: string;
    readonly meeting_tool: unknown;
    readonly created_by: string | null;
    readonly created_at: string | null;
};

type VersionNumberRow = {
    readonly version_number: number;
};

type LocationResult =
    | { readonly row: AccessibleLocationRow; readonly response: null }
    | { readonly row: null; readonly response: Response };

function cleanString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function createDefaultRouteDependencies(): MeetingToolVersionsRouteDependencies {
    return {
        getSupabaseAdmin: createSupabaseAdminClient,
        resolveRequester: getAuthenticatedRequesterProfile
    };
}

function isUuid(value: string): boolean {
    return UUID_REGEX.test(value);
}

function isMissingVersionsTableError(value: unknown): boolean {
    if (!isRecord(value)) return false;
    const code = cleanString(value.code);
    return code === '42P01'
        || code === 'PGRST205';
}

function isVersionNumberConflictError(value: unknown): boolean {
    if (!isRecord(value)) return false;
    return cleanString(value.code) === '23505';
}

function missingVersionsTableResponse() {
    return fail(
        424,
        'VALIDATION_ERROR',
        '출점 검토 리포트 버전 이력 테이블이 아직 적용되지 않았습니다. supabase_franchise_location_meeting_tool_versions_migration.sql 적용 후 다시 확인해주세요.'
    );
}

function toVersion(row: MeetingToolVersionRow): MeetingToolVersion | null {
    return normalizeMeetingToolVersion({
        companyId: row.company_id,
        createdAt: row.created_at,
        createdBy: row.created_by,
        id: row.id,
        locationId: row.location_id,
        meetingTool: row.meeting_tool,
        title: row.title,
        versionNumber: row.version_number
    });
}

function toVersionList(rows: readonly MeetingToolVersionRow[] | null): readonly MeetingToolVersion[] {
    return (rows || [])
        .map(toVersion)
        .filter((version): version is MeetingToolVersion => version !== null);
}

async function fetchAccessibleLocation(
    supabaseAdmin: SupabaseAdminClient,
    locationId: string,
    requester: RequesterProfile
): Promise<LocationResult> {
    const { data, error } = await supabaseAdmin
        .from('franchise_locations')
        .select('id, company_id, manager_id, created_by')
        .eq('id', locationId)
        .maybeSingle<LocationAccessRow>();

    if (error) {
        console.error('Failed to load franchise location for meeting tool versions:', error);
        return { row: null, response: fail(500, 'INTERNAL_ERROR', 'Failed to load franchise location') };
    }
    if (!data) return { row: null, response: fail(404, 'NOT_FOUND', 'Franchise location not found') };
    if (!canAccessFranchiseLocation(requester, data)) {
        return { row: null, response: fail(403, 'FORBIDDEN', 'Forbidden: cross-company access denied') };
    }
    const companyId = data.company_id;
    if (!companyId) {
        return { row: null, response: fail(400, 'VALIDATION_ERROR', 'Company scope is required') };
    }
    return { row: { ...data, company_id: companyId }, response: null };
}

async function loadNextVersionNumber(
    supabaseAdmin: SupabaseAdminClient,
    locationId: string,
    companyId: string
): Promise<{ readonly value: number | null; readonly response: Response | null }> {
    const { data, error } = await supabaseAdmin
        .from('franchise_location_meeting_tool_versions')
        .select('version_number')
        .eq('location_id', locationId)
        .eq('company_id', companyId)
        .order('version_number', { ascending: false })
        .limit(1)
        .returns<VersionNumberRow[]>();

    if (error) {
        if (isMissingVersionsTableError(error)) return { value: null, response: missingVersionsTableResponse() };
        throw error;
    }

    const latest = data?.[0]?.version_number;
    return { value: Number.isInteger(latest) && latest > 0 ? latest + 1 : 1, response: null };
}

export async function handleMeetingToolVersionsGET(
    request: Request,
    dependencies: MeetingToolVersionsRouteDependencies = createDefaultRouteDependencies()
) {
    try {
        const supabaseAdmin = dependencies.getSupabaseAdmin();
        const requesterProfile = await dependencies.resolveRequester(supabaseAdmin, request);
        if (!requesterProfile) return fail(401, 'AUTH_REQUIRED', 'authenticated session is required');

        const { searchParams } = new URL(request.url);
        const locationId = cleanString(searchParams.get('locationId'));
        if (!locationId) return fail(400, 'VALIDATION_ERROR', 'locationId is required');
        if (!isUuid(locationId)) return fail(400, 'VALIDATION_ERROR', 'locationId must be a valid UUID');

        const locationResult = await fetchAccessibleLocation(supabaseAdmin, locationId, requesterProfile);
        if (locationResult.response) return locationResult.response;

        const { data, error } = await supabaseAdmin
            .from('franchise_location_meeting_tool_versions')
            .select(VERSION_SELECT)
            .eq('location_id', locationId)
            .eq('company_id', locationResult.row.company_id)
            .order('version_number', { ascending: false })
            .limit(20)
            .returns<MeetingToolVersionRow[]>();

        if (error) {
            if (isMissingVersionsTableError(error)) return missingVersionsTableResponse();
            throw error;
        }

        return ok({ versions: toVersionList(data) });
    } catch (error) {
        console.error('Franchise location meeting tool versions GET error:', error);
        return fail(500, 'INTERNAL_ERROR', 'Failed to load meeting tool versions');
    }
}

export async function handleMeetingToolVersionsPOST(
    request: Request,
    dependencies: MeetingToolVersionsRouteDependencies = createDefaultRouteDependencies()
) {
    try {
        const supabaseAdmin = dependencies.getSupabaseAdmin();
        const requesterProfile = await dependencies.resolveRequester(supabaseAdmin, request);
        if (!requesterProfile) return fail(401, 'AUTH_REQUIRED', 'authenticated session is required');

        const parsed: unknown = await request.json().catch(() => null);
        if (!isRecord(parsed)) return fail(400, 'VALIDATION_ERROR', 'Invalid request body');

        const locationId = cleanString(parsed.locationId);
        if (!locationId) return fail(400, 'VALIDATION_ERROR', 'locationId is required');
        if (!isUuid(locationId)) return fail(400, 'VALIDATION_ERROR', 'locationId must be a valid UUID');
        if (!isRecord(parsed.meetingTool)) return fail(400, 'VALIDATION_ERROR', 'meetingTool is required');

        const locationResult = await fetchAccessibleLocation(supabaseAdmin, locationId, requesterProfile);
        if (locationResult.response) return locationResult.response;

        const companyId = locationResult.row.company_id;
        const nextVersion = await loadNextVersionNumber(supabaseAdmin, locationId, companyId);
        if (nextVersion.response) return nextVersion.response;
        const versionNumber = nextVersion.value || 1;
        const now = new Date().toISOString();
        const meetingTool = normalizeMeetingToolDraft({
            ...parsed.meetingTool,
            updatedAt: now
        });

        const { data: row, error } = await supabaseAdmin
            .from('franchise_location_meeting_tool_versions')
            .insert({
                company_id: companyId,
                created_by: requesterProfile.id,
                location_id: locationId,
                meeting_tool: meetingTool,
                title: makeMeetingToolVersionTitle(versionNumber, cleanString(parsed.title)),
                version_number: versionNumber
            })
            .select(VERSION_SELECT)
            .returns<MeetingToolVersionRow[]>()
            .single();

        if (error) {
            if (isMissingVersionsTableError(error)) return missingVersionsTableResponse();
            if (isVersionNumberConflictError(error)) {
                return fail(409, 'CONFLICT', '리포트 버전 저장이 겹쳤습니다. 다시 저장해주세요.');
            }
            throw error;
        }

        const version = row ? toVersion(row) : null;
        if (!version) return fail(500, 'INTERNAL_ERROR', 'Failed to normalize meeting tool version');
        return ok({ version });
    } catch (error) {
        console.error('Franchise location meeting tool versions POST error:', error);
        return fail(500, 'INTERNAL_ERROR', 'Failed to save meeting tool version');
    }
}

export async function GET(request: Request) {
    return handleMeetingToolVersionsGET(request);
}

export async function POST(request: Request) {
    return handleMeetingToolVersionsPOST(request);
}
