import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getRequesterProfile } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import {
    LOCATION_MESSAGE_SELECT,
    buildLocationMessageSummary,
    cleanMessageString,
    fetchAccessibleLocationRow,
    isLocationMessagesSchemaError,
    toLocationMessageKind,
    toLocationRequestStatus,
    transformLocationMessageRows,
    type LocationAccessRow,
    type LocationMessageRow
} from '@/lib/franchise-location-messages';

export const dynamic = 'force-dynamic';

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getStringField(source: JsonRecord, key: string): string {
    const value = source[key];
    return cleanMessageString(value);
}

async function readRequestBody(request: Request): Promise<JsonRecord> {
    const parsed: unknown = await request.json().catch(() => ({}));
    return isRecord(parsed) ? parsed : {};
}

function messageSchemaResponse() {
    return fail(500, 'INTERNAL_ERROR', '출점 후보지 기록 테이블 마이그레이션이 필요합니다.');
}

function locationAccessResponse(status: 403 | 404 | 500) {
    if (status === 403) return fail(403, 'FORBIDDEN', 'Forbidden: cross-company access denied');
    if (status === 404) return fail(404, 'NOT_FOUND', 'Franchise location not found');
    return fail(500, 'INTERNAL_ERROR', 'Failed to load franchise location');
}

async function fetchMessagesForLocation(supabaseAdmin: ReturnType<typeof getSupabaseAdmin>, locationId: string) {
    const { data, error } = await supabaseAdmin
        .from('franchise_location_messages')
        .select(LOCATION_MESSAGE_SELECT)
        .eq('location_id', locationId)
        .order('created_at', { ascending: true });

    if (error) return { rows: null, error };
    return { rows: data as unknown as readonly LocationMessageRow[], error: null };
}

async function buildMessagesPayload(supabaseAdmin: ReturnType<typeof getSupabaseAdmin>, locationId: string) {
    const { rows, error } = await fetchMessagesForLocation(supabaseAdmin, locationId);
    if (error) return { payload: null, error };
    const safeRows = rows || [];
    const messages = await transformLocationMessageRows(supabaseAdmin, safeRows);
    return {
        payload: {
            messages,
            summary: buildLocationMessageSummary(locationId, safeRows)
        },
        error: null
    };
}

async function handleSummary(request: Request) {
    const supabaseAdmin = getSupabaseAdmin();
    const requester = await getRequesterProfile(supabaseAdmin, request);
    if (!requester) return fail(401, 'AUTH_REQUIRED', 'Requester is required');

    const { searchParams } = new URL(request.url);
    const locationIds = Array.from(new Set(
        cleanMessageString(searchParams.get('locationIds'))
            .split(',')
            .map(value => value.trim())
            .filter(Boolean)
    ));
    if (locationIds.length === 0) return ok({ summaries: [] });

    const { data: locations, error: locationError } = await supabaseAdmin
        .from('franchise_locations')
        .select('id, company_id, manager_id')
        .in('id', locationIds);

    if (locationError) {
        console.error('Failed to load message summary locations:', locationError);
        return fail(500, 'INTERNAL_ERROR', 'Failed to load franchise locations');
    }

    const accessibleIds = ((locations as readonly LocationAccessRow[] | null) || [])
        .filter(location => canAccessLocation(requester, location))
        .map(location => location.id);
    if (accessibleIds.length === 0) return ok({ summaries: [] });

    const { data: messages, error: messageError } = await supabaseAdmin
        .from('franchise_location_messages')
        .select('location_id, kind, request_status, created_at')
        .in('location_id', accessibleIds);

    if (messageError) {
        if (isLocationMessagesSchemaError(messageError)) return messageSchemaResponse();
        console.error('Failed to load franchise location message summaries:', messageError);
        return fail(500, 'INTERNAL_ERROR', 'Failed to load franchise location message summaries');
    }

    const rows = (messages as readonly Pick<LocationMessageRow, 'location_id' | 'kind' | 'request_status' | 'created_at'>[] | null) || [];
    return ok({ summaries: accessibleIds.map(locationId => buildLocationMessageSummary(locationId, rows)) });
}

function canAccessLocation(requester: NonNullable<Awaited<ReturnType<typeof getRequesterProfile>>>, location: LocationAccessRow): boolean {
    return Boolean(location) && (
        requester.role === 'admin'
        || (requester.company_id !== null && requester.company_id === location.company_id)
        || requester.id === location.manager_id
    );
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    if (searchParams.get('summary') === 'true') return handleSummary(request);

    const supabaseAdmin = getSupabaseAdmin();
    const requester = await getRequesterProfile(supabaseAdmin, request);
    if (!requester) return fail(401, 'AUTH_REQUIRED', 'Requester is required');

    const locationId = cleanMessageString(searchParams.get('locationId'));
    if (!locationId) return fail(400, 'VALIDATION_ERROR', 'locationId is required');

    const locationResult = await fetchAccessibleLocationRow(supabaseAdmin, locationId, requester);
    if (!locationResult.row) return locationAccessResponse(locationResult.status);

    const { payload, error } = await buildMessagesPayload(supabaseAdmin, locationId);
    if (error) {
        if (isLocationMessagesSchemaError(error)) return messageSchemaResponse();
        console.error('Failed to load franchise location messages:', error);
        return fail(500, 'INTERNAL_ERROR', 'Failed to load franchise location messages');
    }
    return ok(payload);
}

export async function POST(request: Request) {
    const body = await readRequestBody(request);
    const supabaseAdmin = getSupabaseAdmin();
    const requester = await getRequesterProfile(supabaseAdmin, request, getStringField(body, 'requesterId') || getStringField(body, 'userId'));
    if (!requester) return fail(401, 'AUTH_REQUIRED', 'Requester is required');

    const locationId = getStringField(body, 'locationId');
    const messageBody = getStringField(body, 'body');
    const kind = toLocationMessageKind(body.kind);
    if (!locationId) return fail(400, 'VALIDATION_ERROR', 'locationId is required');
    if (!messageBody) return fail(400, 'VALIDATION_ERROR', 'Message body is required');

    const locationResult = await fetchAccessibleLocationRow(supabaseAdmin, locationId, requester);
    if (!locationResult.row) return locationAccessResponse(locationResult.status);
    if (!locationResult.row.company_id) return fail(400, 'VALIDATION_ERROR', 'Company scope is required');

    const { data, error } = await supabaseAdmin
        .from('franchise_location_messages')
        .insert({
            company_id: locationResult.row.company_id,
            location_id: locationId,
            author_id: requester.id,
            body: messageBody,
            kind,
            request_status: kind === 'request' ? 'open' : null
        })
        .select(LOCATION_MESSAGE_SELECT)
        .single();

    if (error) {
        if (isLocationMessagesSchemaError(error)) return messageSchemaResponse();
        console.error('Failed to create franchise location message:', error);
        return fail(500, 'INTERNAL_ERROR', 'Failed to create franchise location message');
    }

    const messagesPayload = await buildMessagesPayload(supabaseAdmin, locationId);
    if (!messagesPayload.payload) {
        console.error('Failed to reload franchise location messages after create:', messagesPayload.error);
        return fail(500, 'INTERNAL_ERROR', 'Failed to reload franchise location messages');
    }
    const [message] = await transformLocationMessageRows(supabaseAdmin, [data as unknown as LocationMessageRow]);
    return ok({ ...messagesPayload.payload, message }, 201);
}

export async function PATCH(request: Request) {
    const body = await readRequestBody(request);
    const supabaseAdmin = getSupabaseAdmin();
    const requester = await getRequesterProfile(supabaseAdmin, request, getStringField(body, 'requesterId') || getStringField(body, 'userId'));
    if (!requester) return fail(401, 'AUTH_REQUIRED', 'Requester is required');

    const messageId = getStringField(body, 'messageId') || getStringField(body, 'id');
    const requestStatus = toLocationRequestStatus(body.requestStatus || body.status);
    if (!messageId) return fail(400, 'VALIDATION_ERROR', 'messageId is required');
    if (!requestStatus) return fail(400, 'VALIDATION_ERROR', 'requestStatus is required');

    const { data: existingMessage, error: existingError } = await supabaseAdmin
        .from('franchise_location_messages')
        .select('id, company_id, location_id, kind')
        .eq('id', messageId)
        .maybeSingle();

    if (existingError) {
        if (isLocationMessagesSchemaError(existingError)) return messageSchemaResponse();
        console.error('Failed to load franchise location message:', existingError);
        return fail(500, 'INTERNAL_ERROR', 'Failed to load franchise location message');
    }
    const messageRow = existingMessage as Pick<LocationMessageRow, 'id' | 'company_id' | 'location_id' | 'kind'> | null;
    if (!messageRow) return fail(404, 'NOT_FOUND', 'Franchise location message not found');
    if (toLocationMessageKind(messageRow.kind) !== 'request') {
        return fail(400, 'VALIDATION_ERROR', 'Only request messages can change status');
    }

    const locationResult = await fetchAccessibleLocationRow(supabaseAdmin, messageRow.location_id, requester);
    if (!locationResult.row) return locationAccessResponse(locationResult.status);

    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin
        .from('franchise_location_messages')
        .update({
            request_status: requestStatus,
            resolved_by: requestStatus === 'done' ? requester.id : null,
            resolved_at: requestStatus === 'done' ? now : null,
            updated_at: now
        })
        .eq('id', messageId)
        .select(LOCATION_MESSAGE_SELECT)
        .single();

    if (error) {
        console.error('Failed to update franchise location message:', error);
        return fail(500, 'INTERNAL_ERROR', 'Failed to update franchise location message');
    }

    const messagesPayload = await buildMessagesPayload(supabaseAdmin, messageRow.location_id);
    if (!messagesPayload.payload) {
        console.error('Failed to reload franchise location messages after update:', messagesPayload.error);
        return fail(500, 'INTERNAL_ERROR', 'Failed to reload franchise location messages');
    }
    const [message] = await transformLocationMessageRows(supabaseAdmin, [data as unknown as LocationMessageRow]);
    return ok({ ...messagesPayload.payload, message });
}
