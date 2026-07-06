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
    buildDefaultReportTemplate,
    mergeInspectionItems,
    normalizeCorrectiveActionStatus,
    normalizeReportStatus,
    normalizeTemplateItems,
    normalizeVisitPurpose,
    normalizeVisitStatus,
    summarizeSupervision,
    type SupervisionPhotoAttachment
} from '@/lib/franchise-supervision';
import { buildSupervisionOperationQueue } from '@/lib/franchise-supervision-operation-queue';

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
    readonly template_id: string | null;
    readonly reviewed_at: string | null;
    readonly created_by: string | null;
    readonly updated_at: string | null;
};

type ReportTemplateRow = {
    readonly id: string;
    readonly name: string | null;
    readonly description: string | null;
    readonly inspection_items: unknown;
    readonly active: boolean | null;
};

type ReportEventRow = {
    readonly id: string;
    readonly report_id: string;
    readonly event_type: string | null;
    readonly actor_profile_id: string | null;
    readonly memo: string | null;
    readonly created_at: string | null;
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

type ActionEventRow = {
    readonly id: string;
    readonly corrective_action_id: string;
    readonly event_type: string | null;
    readonly actor_profile_id: string | null;
    readonly from_status: string | null;
    readonly to_status: string | null;
    readonly memo: string | null;
    readonly created_at: string | null;
};

type NamedMaps = {
    readonly locations: ReadonlyMap<string, SupervisionLocationRow>;
    readonly profiles: ReadonlyMap<string, SupervisionProfileRow>;
};

function readAttachments(
    value: unknown,
    getPublicUrl: (path: string) => string
): readonly SupervisionPhotoAttachment[] {
    if (!Array.isArray(value)) return [];
    return value.filter(isRecord).map(item => {
        const path = cleanString(item.path);
        return {
            name: cleanString(item.name),
            path,
            publicUrl: path.startsWith('franchise-supervision/') ? getPublicUrl(path) : '',
            size: Number(item.size) || 0,
            contentType: cleanString(item.contentType)
        };
    }).filter(item => item.name && item.path);
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

function transformReport(
    row: ReportRow,
    maps: NamedMaps,
    templateItems: ReturnType<typeof normalizeTemplateItems>,
    getAttachmentPublicUrl: (path: string) => string
) {
    return {
        id: row.id,
        companyId: row.company_id,
        locationId: row.location_id,
        locationName: locationName(maps, row.location_id),
        supervisorProfileId: row.supervisor_profile_id,
        supervisorName: profileName(maps, row.supervisor_profile_id),
        visitId: row.visit_id,
        templateId: row.template_id,
        status: normalizeReportStatus(row.status),
        inspectionItems: mergeInspectionItems(row.inspection_items, templateItems),
        photoAttachments: readAttachments(row.photo_attachments, getAttachmentPublicUrl),
        specialNote: row.special_note || '',
        rejectReason: row.reject_reason || '',
        submittedAt: row.submitted_at,
        reviewedAt: row.reviewed_at,
        updatedAt: row.updated_at
    };
}

function transformTemplate(row: ReportTemplateRow) {
    return {
        id: row.id,
        name: row.name || '점검 템플릿',
        description: row.description || '',
        inspectionItems: normalizeTemplateItems(row.inspection_items),
        active: row.active !== false
    };
}

function transformReportEvent(row: ReportEventRow, maps: NamedMaps) {
    return {
        id: row.id,
        reportId: row.report_id,
        eventType: normalizeReportStatus(row.event_type),
        actorName: profileName(maps, row.actor_profile_id),
        memo: row.memo || '',
        createdAt: row.created_at
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

function transformActionEvent(row: ActionEventRow, maps: NamedMaps) {
    return {
        id: row.id,
        correctiveActionId: row.corrective_action_id,
        eventType: row.event_type || '상태변경',
        actorName: profileName(maps, row.actor_profile_id),
        fromStatus: row.from_status || '',
        toStatus: row.to_status || '',
        memo: row.memo || '',
        createdAt: row.created_at
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
            actionResult,
            templateResult,
            reportEventResult,
            actionEventResult
        ] = await Promise.all([
            supabaseAdmin.from('franchise_locations').select('id, company_id, name, brand, region, address').eq('company_id', companyId).returns<SupervisionLocationRow[]>(),
            fetchCompanyProfiles(supabaseAdmin, companyId),
            supabaseAdmin.from('franchise_supervisor_assignments').select('*').eq('company_id', companyId).order('active', { ascending: false }).order('assigned_at', { ascending: false }).limit(300).returns<AssignmentRow[]>(),
            supabaseAdmin.from('franchise_store_visits').select('*').eq('company_id', companyId).order('visit_date', { ascending: true, nullsFirst: false }).limit(500).returns<VisitRow[]>(),
            supabaseAdmin.from('franchise_inspection_reports').select('*').eq('company_id', companyId).order('updated_at', { ascending: false }).limit(500).returns<ReportRow[]>(),
            supabaseAdmin.from('franchise_corrective_actions').select('*').eq('company_id', companyId).order('due_date', { ascending: true, nullsFirst: false }).limit(500).returns<ActionRow[]>(),
            supabaseAdmin.from('franchise_supervision_report_templates').select('id, name, description, inspection_items, active').eq('company_id', companyId).order('active', { ascending: false }).order('created_at', { ascending: false }).limit(50).returns<ReportTemplateRow[]>(),
            supabaseAdmin.from('franchise_supervision_report_events').select('id, report_id, event_type, actor_profile_id, memo, created_at').eq('company_id', companyId).order('created_at', { ascending: false }).limit(300).returns<ReportEventRow[]>(),
            supabaseAdmin.from('franchise_corrective_action_events').select('id, corrective_action_id, event_type, actor_profile_id, from_status, to_status, memo, created_at').eq('company_id', companyId).order('created_at', { ascending: false }).limit(300).returns<ActionEventRow[]>()
        ]);

        if (locationResult.error) throw locationResult.error;
        if (assignmentResult.error) throw assignmentResult.error;
        if (visitResult.error) throw visitResult.error;
        if (reportResult.error) throw reportResult.error;
        if (actionResult.error) throw actionResult.error;
        if (templateResult.error) throw templateResult.error;
        if (reportEventResult.error) throw reportEventResult.error;
        if (actionEventResult.error) throw actionEventResult.error;

        const requester = authResult.auth.requester;
        const canSeeAll = isSupervisionManager(requester);
        const assignments = (assignmentResult.data || []).filter(row => canSeeAll || row.supervisor_profile_id === requester.id);
        const visits = (visitResult.data || []).filter(row => canSeeAll || canAccessSupervisorResource(requester, row));
        const reports = (reportResult.data || []).filter(row => canSeeAll || canAccessSupervisorResource(requester, row));
        const correctiveActions = (actionResult.data || []).filter(row => canSeeAll || canAccessSupervisorResource(requester, row));
        const visibleReportIds = new Set(reports.map(row => row.id));
        const visibleActionIds = new Set(correctiveActions.map(row => row.id));
        const maps: NamedMaps = {
            locations: new Map((locationResult.data || []).map(location => [location.id, location])),
            profiles: new Map(profileRows.map(profile => [profile.id, profile]))
        };
        const templates = (templateResult.data || []).map(transformTemplate);
        const activeTemplate = templates.find(template => template.active) || templates[0] || buildDefaultReportTemplate();
        const templateItemsById = new Map(templates.map(template => [template.id, template.inspectionItems]));
        const getAttachmentPublicUrl = (path: string) => supabaseAdmin.storage
            .from('property-documents')
            .getPublicUrl(path)
            .data.publicUrl;
        const transformedAssignments = assignments.map(row => transformAssignment(row, maps));
        const transformedVisits = visits.map(row => transformVisit(row, maps));
        const transformedReports = reports.map(row => transformReport(
            row,
            maps,
            row.template_id ? templateItemsById.get(row.template_id) || activeTemplate.inspectionItems : activeTemplate.inspectionItems,
            getAttachmentPublicUrl
        ));
        const transformedCorrectiveActions = correctiveActions.map(row => transformAction(row, maps));

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
                loginId: profile.login_id || '',
                email: profile.email || '',
                role: profile.role || ''
            })),
            assignments: transformedAssignments,
            visits: transformedVisits,
            reports: transformedReports,
            reportTemplates: templates.length > 0 ? templates : [buildDefaultReportTemplate()],
            reportEvents: (reportEventResult.data || []).filter(row => visibleReportIds.has(row.report_id)).map(row => transformReportEvent(row, maps)),
            correctiveActions: transformedCorrectiveActions,
            correctiveActionEvents: (actionEventResult.data || []).filter(row => visibleActionIds.has(row.corrective_action_id)).map(row => transformActionEvent(row, maps)),
            summary: summarizeSupervision({
                today: new Date(),
                visits: transformedVisits.map(visit => ({ visitDate: visit.visitDate, status: visit.status })),
                reports: transformedReports.map(report => ({ status: report.status })),
                correctiveActions: transformedCorrectiveActions.map(action => ({ status: action.status }))
            }),
            operationQueue: buildSupervisionOperationQueue({
                today: new Date(),
                visits: transformedVisits.map(visit => ({
                    id: visit.id,
                    locationId: visit.locationId,
                    locationName: visit.locationName,
                    supervisorName: visit.supervisorName,
                    visitDate: visit.visitDate,
                    status: visit.status
                })),
                reports: transformedReports.map(report => ({
                    id: report.id,
                    visitId: report.visitId,
                    locationId: report.locationId,
                    locationName: report.locationName,
                    supervisorName: report.supervisorName,
                    status: report.status
                })),
                correctiveActions: transformedCorrectiveActions.map(action => ({
                    id: action.id,
                    locationId: action.locationId,
                    locationName: action.locationName,
                    assigneeName: action.assigneeName,
                    status: action.status,
                    dueDate: action.dueDate
                }))
            })
        });
    } catch (error) {
        if (isMissingSupervisionSchemaError(error)) {
            return ok({ schemaReady: false, canManage: false, locations: [], supervisors: [], assignments: [], visits: [], reports: [], reportTemplates: [], reportEvents: [], correctiveActions: [], correctiveActionEvents: [], operationQueue: [] });
        }
        console.error('Franchise supervision GET error:', error);
        return fail(500, 'INTERNAL_ERROR', '슈퍼바이징 정보를 불러오지 못했습니다.');
    }
}
