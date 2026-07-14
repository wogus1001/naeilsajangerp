import type { SupabaseClient } from '@supabase/supabase-js';
import { notifyProfileRecipients } from '@/lib/alimtalk-event-notifications';
import { cleanString, getFirst, isRecord } from '@/lib/franchise-supervision-api';
import { isSupervisionReportStoragePath, SUPERVISION_REPORT_BUCKET } from '@/lib/upload-storage-policy';
import {
    fetchWorkflowManagerProfileIds
} from '@/lib/franchise-workflow-store';
import {
    buildCorrectiveActionSeeds,
    mergeInspectionItems,
    normalizeTemplateItems,
    type SupervisionReportEventType,
    type SupervisionReportStatusEvent,
    type SupervisionPhotoAttachment,
    type SupervisionReportTemplateItem
} from '@/lib/franchise-supervision';

export type VisitRow = {
    readonly id: string;
    readonly company_id: string;
    readonly location?: { readonly name: string | null } | null;
    readonly location_id: string;
    readonly supervisor_profile_id: string;
    readonly visit_date: string | null;
    readonly purpose?: string | null;
    readonly created_by: string | null;
};

export type ReportRow = {
    readonly id: string;
    readonly company_id: string;
    readonly location_id: string;
    readonly supervisor_profile_id: string;
    readonly visit_id: string | null;
    readonly status: string | null;
    readonly inspection_items?: unknown;
    readonly photo_attachments?: unknown;
    readonly reject_reason?: string | null;
    readonly reviewed_at?: string | null;
    readonly reviewed_by?: string | null;
    readonly special_note?: string | null;
    readonly submitted_at?: string | null;
    readonly template_id?: string | null;
    readonly created_by: string | null;
    readonly updated_at?: string | null;
    readonly updated_by?: string | null;
};

type CorrectiveActionRow = {
    readonly id: string;
    readonly inspection_item_id: string | null;
    readonly title?: string | null;
};

type ReportTemplateRow = {
    readonly id: string;
    readonly inspection_items: unknown;
};

export function reportEventTypeFor(event: SupervisionReportStatusEvent): SupervisionReportEventType {
    switch (event.kind) {
        case 'submit':
            return '제출';
        case 'approve':
            return '승인';
        case 'reject':
            return '반려';
        case 'saveDraft':
            return '임시저장';
    }
}

export function hasField(body: Record<string, unknown>, keys: readonly string[]): boolean {
    return keys.some(key => Object.prototype.hasOwnProperty.call(body, key));
}

export function readPhotoAttachments(
    value: unknown,
    input: { readonly companyId: string; readonly reportId: string }
): readonly SupervisionPhotoAttachment[] {
    if (!Array.isArray(value)) return [];
    return value.filter(isRecord).map(item => ({
        name: cleanString(item.name),
        path: cleanString(item.path),
        storageBucket: cleanString(item.storageBucket),
        size: Number(item.size) || 0,
        contentType: cleanString(item.contentType)
    })).filter(item => item.name && item.path && item.storageBucket === SUPERVISION_REPORT_BUCKET && isSupervisionReportStoragePath({
        companyId: input.companyId,
        path: item.path,
        reportId: input.reportId
    }));
}

export function readStatusEvent(value: unknown): SupervisionReportStatusEvent {
    const event = cleanString(value);
    switch (event) {
        case 'submit':
            return { kind: 'submit' };
        case 'approve':
            return { kind: 'approve' };
        case 'reject':
            return { kind: 'reject' };
        default:
            return { kind: 'saveDraft' };
    }
}

export async function fetchVisit(input: {
    readonly id: string;
    readonly supabaseAdmin: SupabaseClient;
}) {
    const { data, error } = await input.supabaseAdmin
        .from('franchise_store_visits')
        .select('id, company_id, location_id, supervisor_profile_id, visit_date, purpose, created_by, location:franchise_locations(name)')
        .eq('id', input.id)
        .maybeSingle<VisitRow>();
    if (error) throw error;
    return data;
}

export function readVisitLocationName(visit: VisitRow | null): string {
    return visit?.location?.name || '운영점';
}

export async function fetchReportTemplateItems(input: {
    readonly companyId: string;
    readonly supabaseAdmin: SupabaseClient;
    readonly templateId: string;
}): Promise<readonly SupervisionReportTemplateItem[]> {
    if (!input.templateId) return normalizeTemplateItems(null);
    const { data, error } = await input.supabaseAdmin
        .from('franchise_supervision_report_templates')
        .select('id, inspection_items')
        .eq('id', input.templateId)
        .eq('company_id', input.companyId)
        .maybeSingle<ReportTemplateRow>();
    if (error) throw error;
    if (!data) throw new Error('SUPERVISION_TEMPLATE_NOT_FOUND');
    return normalizeTemplateItems(data.inspection_items);
}

export async function insertCorrectiveActions(input: {
    readonly assigneeProfileId: string;
    readonly companyId: string;
    readonly createdBy: string;
    readonly items: ReturnType<typeof mergeInspectionItems>;
    readonly locationId: string;
    readonly locationName: string;
    readonly reportId: string;
    readonly supabaseAdmin: SupabaseClient;
}) {
    const seeds = buildCorrectiveActionSeeds(input.reportId, input.items);
    if (seeds.length === 0) return;
    const now = new Date().toISOString();
    const seedItemIds = seeds.map(seed => seed.itemId);
    const { data: existingRows, error: existingError } = await input.supabaseAdmin
        .from('franchise_corrective_actions')
        .select('id, inspection_item_id')
        .eq('report_id', input.reportId)
        .in('inspection_item_id', seedItemIds)
        .returns<CorrectiveActionRow[]>();
    if (existingError) throw existingError;
    const existingItemIds = new Set((existingRows || []).map(row => row.inspection_item_id).filter(Boolean));
    const { data, error } = await input.supabaseAdmin
        .from('franchise_corrective_actions')
        .upsert(seeds.map(seed => ({
            company_id: input.companyId,
            report_id: input.reportId,
            inspection_item_id: seed.itemId,
            location_id: input.locationId,
            assignee_profile_id: input.assigneeProfileId,
            title: seed.title,
            memo: seed.memo || null,
            status: '요청',
            created_by: input.createdBy,
            updated_by: input.createdBy,
            created_at: now,
            updated_at: now
        })), { onConflict: 'report_id,inspection_item_id' })
        .select('id, inspection_item_id, title')
        .returns<CorrectiveActionRow[]>();
    if (error) throw error;
    const newRows = (data || []).filter(row => row.inspection_item_id && !existingItemIds.has(row.inspection_item_id));
    if (newRows.length === 0) return;
    const { error: eventError } = await input.supabaseAdmin
        .from('franchise_corrective_action_events')
        .insert(newRows.map(row => ({
            company_id: input.companyId,
            corrective_action_id: row.id,
            event_type: '생성',
            actor_profile_id: input.createdBy,
            from_status: null,
            to_status: '요청',
            memo: '점검 보고서 개선필요 항목에서 자동 생성'
        })));
    if (eventError) throw eventError;
    await Promise.all(newRows.map(async row => {
        try {
            await notifyProfileRecipients({
                companyId: input.companyId,
                profileIds: [input.assigneeProfileId],
                scenarioKey: 'supervision_corrective_action_due',
                sourceId: row.id,
                sourceType: 'supervision-corrective-action-due',
                supabaseAdmin: input.supabaseAdmin,
                variables: {
                    운영점명: input.locationName,
                    시정항목: row.title || '시정요청',
                    기한: '-'
                }
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'unknown error';
            console.warn('Supervision corrective action AlimTalk notification skipped:', message);
        }
    }));
}

export async function notifyReportReviewed(input: {
    readonly companyId: string;
    readonly eventType: SupervisionReportEventType;
    readonly locationName: string;
    readonly reportId: string;
    readonly supabaseAdmin: SupabaseClient;
    readonly supervisorProfileId: string;
}) {
    if (input.eventType !== '승인' && input.eventType !== '반려') return;
    try {
        await notifyProfileRecipients({
            companyId: input.companyId,
            profileIds: [input.supervisorProfileId],
            scenarioKey: 'supervision_report_reviewed',
            sourceId: `${input.reportId}-${input.eventType}`,
            sourceType: 'supervision-report-reviewed',
            supabaseAdmin: input.supabaseAdmin,
            variables: {
                운영점명: input.locationName,
                처리상태: input.eventType,
                처리일: new Date().toLocaleDateString('ko-KR')
            }
        });
    } catch (error) {
        console.warn('Supervision report AlimTalk notification skipped:', error);
    }
}

export async function syncSupervisionReportWorkflow(input: {
    readonly actorProfileId: string;
    readonly companyId: string;
    readonly eventType: SupervisionReportEventType;
    readonly locationName: string;
    readonly reportId: string;
    readonly rejectReason?: string | null;
    readonly specialNote?: string | null;
    readonly supabaseAdmin: SupabaseClient;
    readonly supervisorProfileId: string;
    readonly templateId?: string | null;
    readonly visitId?: string | null;
    readonly reportWrite: {
        readonly create: boolean;
        readonly expectedUpdatedAt?: string | null;
        readonly inspectionItems: unknown;
        readonly locationId: string;
        readonly photoAttachments: unknown;
        readonly status: string;
        readonly submittedAt: string | null;
        readonly reviewedAt: string | null;
        readonly reviewedBy: string | null;
    };
}) {
    const needsApprover = input.eventType === '제출' || input.eventType === '임시저장';
    const managerIds = needsApprover
        ? (await fetchWorkflowManagerProfileIds(input.supabaseAdmin, input.companyId))
            .filter(profileId => profileId !== input.actorProfileId)
        : [];
    const approverProfileId = managerIds[0] || null;
    if (input.eventType === '제출' && !approverProfileId) {
        throw new TypeError('점검 보고서를 결재할 회사 팀장을 먼저 등록해 주세요.');
    }
    const { error } = await input.supabaseAdmin.rpc('save_supervision_report_with_approval', {
        p_approval_data: {
            reportId: input.reportId,
            visitId: input.visitId || '',
            locationName: input.locationName,
            specialNote: input.specialNote || '',
            supervisorProfileId: input.supervisorProfileId,
            supervisionTemplateId: input.templateId || ''
        },
        p_approver_profile_id: approverProfileId,
        p_actor_profile_id: input.actorProfileId,
        p_company_id: input.companyId,
        p_create: input.reportWrite.create,
        p_event_type: input.eventType,
        p_expected_updated_at: input.reportWrite.expectedUpdatedAt || null,
        p_inspection_items: input.reportWrite.inspectionItems,
        p_location_id: input.reportWrite.locationId,
        p_memo: input.rejectReason || input.specialNote || '',
        p_photo_attachments: input.reportWrite.photoAttachments,
        p_reject_reason: input.rejectReason || null,
        p_report_id: input.reportId,
        p_report_status: input.reportWrite.status,
        p_reviewed_at: input.reportWrite.reviewedAt,
        p_reviewed_by: input.reportWrite.reviewedBy,
        p_special_note: input.specialNote || null,
        p_submitted_at: input.reportWrite.submittedAt,
        p_supervisor_profile_id: input.supervisorProfileId,
        p_template_id: input.templateId || null,
        p_title: `${input.locationName} 점검 보고서`,
        p_visit_id: input.visitId || null
    });
    if (error) throw error;
}

export async function reconcileSubmittedSupervisionReport(input: {
    readonly actorProfileId: string;
    readonly report: ReportRow;
    readonly supabaseAdmin: SupabaseClient;
    readonly visit: VisitRow | null;
}) {
    await syncSupervisionReportWorkflow({
        actorProfileId: input.actorProfileId,
        companyId: input.report.company_id,
        eventType: '제출',
        locationName: readVisitLocationName(input.visit),
        reportId: input.report.id,
        rejectReason: input.report.reject_reason || null,
        specialNote: input.report.special_note || null,
        supervisorProfileId: input.report.supervisor_profile_id,
        supabaseAdmin: input.supabaseAdmin,
        templateId: input.report.template_id || null,
        visitId: input.report.visit_id,
        reportWrite: {
            create: false,
            expectedUpdatedAt: input.report.updated_at || null,
            inspectionItems: input.report.inspection_items,
            locationId: input.report.location_id,
            photoAttachments: input.report.photo_attachments,
            reviewedAt: input.report.reviewed_at || null,
            reviewedBy: input.report.reviewed_by || null,
            status: '제출',
            submittedAt: input.report.submitted_at || null
        }
    });
}
