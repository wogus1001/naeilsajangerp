import { fail, ok } from '@/lib/api-response';
import {
    canAccessSupervisorResource,
    cleanString,
    fetchCompanyProfiles,
    isMissingSupervisionSchemaError,
    isRecord,
    isSupervisionManager,
    resolveSupervisionAuth,
    resolveSupervisionCompanyId,
    type SupervisionLocationRow,
    type SupervisionProfileRow
} from '@/lib/franchise-supervision-api';
import {
    mergeInspectionItems,
    normalizeCorrectiveActionStatus,
    normalizeReportStatus,
    normalizeVisitPurpose,
    normalizeVisitStatus,
    summarizeSupervision,
    type SupervisionPhotoAttachment
} from '@/lib/franchise-supervision';

export const dynamic = 'force-dynamic';

type AssignmentRow = {
    readonly id: string;
    readonly company_id: string;
    readonly location_id: string;
    readonly supervisor_profile_id: string;
    readonly region_scope: string | null;
    readonly memo: string | null;
    readonly active: boolean | null;
    readonly assigned_at: string | null;
    readonly ended_at: string | null;
};

type VisitRow = {
    readonly id: string;
    readonly company_id: string;
    readonly location_id: string;
    readonly supervisor_profile_id: string;
    readonly assignment_id: string | null;
    readonly schedule_id: string | null;
    readonly visit_date: string | null;
    readonly purpose: string | null;
    readonly status: string | null;
    readonly memo: string | null;
    readonly created_by: string | null;
};

type ReportRow = {
    readonly id: string;
    readonly company_id: string;
    readonly location_id: string;
    readonly supervisor_profile_id: string;
    readonly visit_id: string | null;
    readonly status: string | null;
    readonly inspection_items: unknown;
    readonly photo_attachments: unknown;
    readonly special_note: string | null;
    readonly reject_reason: string | null;
    readonly submitted_at: string | null;
    readonly reviewed_at: string | null;
    readonly created_by: string | null;
    readonly updated_at: string | null;
};

type ActionRow = {
    readonly id: string;
    readonly company_id: string;
    readonly report_id: string | null;
    readonly location_id: string;
    readonly assignee_profile_id: string | null;
    readonly status: string | null;
    readonly title: string | null;
    readonly memo: string | null;
    readonly due_date: string | null;
    readonly completed_at: string | null;
    readonly created_by: string | null;
};

type NamedMaps = {
    readonly locations: ReadonlyMap<string, SupervisionLocationRow>;
    readonly profiles: ReadonlyMap<string, SupervisionProfileRow>;
};

function readAttachments(value: unknown): readonly SupervisionPhotoAttachment[] {
    if (!Array.isArray(value)) return [];
    return value.filter(isRecord).map(item => ({
        name: cleanString(item.name),
        path: cleanString(item.path),
        size: Number(item.size) || 0,
        contentType: cleanString(item.contentType)
    })).filter(item => item.name && item.path);
}

function locationName(maps: NamedMaps, locationId: string): string {
    return maps.locations.get(locationId)?.name || '운영점 미지정';
}

function profileName(maps: NamedMaps, profileId: string | null): string {
    if (!profileId) return '담당자 미지정';
    return maps.profiles.get(profileId)?.name || '담당자 미지정';
}

function transformAssignment(row: AssignmentRow, maps: NamedMaps) {
    return {
        id: row.id,
        companyId: row.company_id,
        locationId: row.location_id,
        locationName: locationName(maps, row.location_id),
        supervisorProfileId: row.supervisor_profile_id,
        supervisorName: profileName(maps, row.supervisor_profile_id),
        regionScope: row.region_scope || '',
        memo: row.memo || '',
        active: row.active !== false,
        assignedAt: row.assigned_at,
        endedAt: row.ended_at
    };
}

function transformVisit(row: VisitRow, maps: NamedMaps) {
    return {
        id: row.id,
        companyId: row.company_id,
        locationId: row.location_id,
        locationName: locationName(maps, row.location_id),
        supervisorProfileId: row.supervisor_profile_id,
        supervisorName: profileName(maps, row.supervisor_profile_id),
        assignmentId: row.assignment_id,
        scheduleId: row.schedule_id,
        visitDate: row.visit_date,
        purpose: normalizeVisitPurpose(row.purpose),
        status: normalizeVisitStatus(row.status),
        memo: row.memo || ''
    };
}

function transformReport(row: ReportRow, maps: NamedMaps) {
    return {
        id: row.id,
        companyId: row.company_id,
        locationId: row.location_id,
        locationName: locationName(maps, row.location_id),
        supervisorProfileId: row.supervisor_profile_id,
        supervisorName: profileName(maps, row.supervisor_profile_id),
        visitId: row.visit_id,
        status: normalizeReportStatus(row.status),
        inspectionItems: mergeInspectionItems(row.inspection_items),
        photoAttachments: readAttachments(row.photo_attachments),
        specialNote: row.special_note || '',
        rejectReason: row.reject_reason || '',
        submittedAt: row.submitted_at,
        reviewedAt: row.reviewed_at,
        updatedAt: row.updated_at
    };
}

function transformAction(row: ActionRow, maps: NamedMaps) {
    return {
        id: row.id,
        companyId: row.company_id,
        reportId: row.report_id,
        locationId: row.location_id,
        locationName: locationName(maps, row.location_id),
        assigneeProfileId: row.assignee_profile_id,
        assigneeName: profileName(maps, row.assignee_profile_id),
        status: normalizeCorrectiveActionStatus(row.status),
        title: row.title || '시정요청',
        memo: row.memo || '',
        dueDate: row.due_date,
        completedAt: row.completed_at
    };
}

export async function GET(request: Request) {
    try {
        const authResult = await resolveSupervisionAuth(request);
        if (!authResult.ok) return authResult.response;

        const { searchParams } = new URL(request.url);
        const companyScope = await resolveSupervisionCompanyId(
            authResult.auth,
            searchParams.get('companyId'),
            searchParams.get('company')
        );
        if (!companyScope.ok) return companyScope.response;

        const companyId = companyScope.companyId;
        const supabaseAdmin = authResult.auth.supabaseAdmin;
        const [
            locationResult,
            profileRows,
            assignmentResult,
            visitResult,
            reportResult,
            actionResult
        ] = await Promise.all([
            supabaseAdmin.from('franchise_locations').select('id, company_id, name, brand, region, address').eq('company_id', companyId).returns<SupervisionLocationRow[]>(),
            fetchCompanyProfiles(supabaseAdmin, companyId),
            supabaseAdmin.from('franchise_supervisor_assignments').select('*').eq('company_id', companyId).order('active', { ascending: false }).order('assigned_at', { ascending: false }).limit(300).returns<AssignmentRow[]>(),
            supabaseAdmin.from('franchise_store_visits').select('*').eq('company_id', companyId).order('visit_date', { ascending: true, nullsFirst: false }).limit(500).returns<VisitRow[]>(),
            supabaseAdmin.from('franchise_inspection_reports').select('*').eq('company_id', companyId).order('updated_at', { ascending: false }).limit(500).returns<ReportRow[]>(),
            supabaseAdmin.from('franchise_corrective_actions').select('*').eq('company_id', companyId).order('due_date', { ascending: true, nullsFirst: false }).limit(500).returns<ActionRow[]>()
        ]);

        if (locationResult.error) throw locationResult.error;
        if (assignmentResult.error) throw assignmentResult.error;
        if (visitResult.error) throw visitResult.error;
        if (reportResult.error) throw reportResult.error;
        if (actionResult.error) throw actionResult.error;

        const requester = authResult.auth.requester;
        const canSeeAll = isSupervisionManager(requester);
        const assignments = (assignmentResult.data || []).filter(row => canSeeAll || row.supervisor_profile_id === requester.id);
        const visits = (visitResult.data || []).filter(row => canSeeAll || canAccessSupervisorResource(requester, row));
        const reports = (reportResult.data || []).filter(row => canSeeAll || canAccessSupervisorResource(requester, row));
        const correctiveActions = (actionResult.data || []).filter(row => canSeeAll || canAccessSupervisorResource(requester, row));
        const maps: NamedMaps = {
            locations: new Map((locationResult.data || []).map(location => [location.id, location])),
            profiles: new Map(profileRows.map(profile => [profile.id, profile]))
        };

        return ok({
            schemaReady: true,
            canManage: isSupervisionManager(requester),
            companyId,
            locations: (locationResult.data || []).map(location => ({
                id: location.id,
                name: location.name || '운영점 미지정',
                brand: location.brand || '',
                region: location.region || '',
                address: location.address || ''
            })),
            supervisors: profileRows.map(profile => ({
                id: profile.id,
                name: profile.name || '이름 미등록',
                role: profile.role || ''
            })),
            assignments: assignments.map(row => transformAssignment(row, maps)),
            visits: visits.map(row => transformVisit(row, maps)),
            reports: reports.map(row => transformReport(row, maps)),
            correctiveActions: correctiveActions.map(row => transformAction(row, maps)),
            summary: summarizeSupervision({
                today: new Date(),
                visits: visits.map(row => ({ visitDate: row.visit_date, status: normalizeVisitStatus(row.status) })),
                reports: reports.map(row => ({ status: normalizeReportStatus(row.status) })),
                correctiveActions: correctiveActions.map(row => ({ status: normalizeCorrectiveActionStatus(row.status) }))
            })
        });
    } catch (error) {
        if (isMissingSupervisionSchemaError(error)) {
            return ok({ schemaReady: false, canManage: false, locations: [], supervisors: [], assignments: [], visits: [], reports: [], correctiveActions: [] });
        }
        console.error('Franchise supervision GET error:', error);
        return fail(500, 'INTERNAL_ERROR', '슈퍼바이징 정보를 불러오지 못했습니다.');
    }
}
