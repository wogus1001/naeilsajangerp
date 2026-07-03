import type { SupabaseClient } from '@supabase/supabase-js';
import { notifyProfileRecipients } from '@/lib/alimtalk-event-notifications';
import { cleanString, getFirst, isRecord } from '@/lib/franchise-supervision-api';
import {
    buildCorrectiveActionSeeds,
    mergeInspectionItems,
    normalizeTemplateItems,
    type SupervisionPhotoAttachment,
    type SupervisionReportEventType,
    type SupervisionReportStatusEvent,
    type SupervisionReportTemplateItem
} from '@/lib/franchise-supervision';

export type VisitRow = {
    readonly id: string;
    readonly company_id: string;
    readonly location?: { readonly name: string | null } | null;
    readonly location_id: string;
    readonly supervisor_profile_id: string;
    readonly visit_date: string | null;
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
    readonly special_note?: string | null;
    readonly template_id?: string | null;
    readonly created_by: string | null;
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

function visitStatusForReportStatus(status: SupervisionReportEventType): string {
    if (status === '제출') return '승인대기';
    if (status === '승인') return '완료';
    if (status === '반려') return '보고서대기';
    return '';
}

export function hasField(body: Record<string, unknown>, keys: readonly string[]): boolean {
    return keys.some(key => Object.prototype.hasOwnProperty.call(body, key));
}

export function readPhotoAttachments(value: unknown): readonly SupervisionPhotoAttachment[] {
    if (!Array.isArray(value)) return [];
    return value.filter(isRecord).map(item => ({
        name: cleanString(item.name),
        path: cleanString(item.path),
        size: Number(item.size) || 0,
        contentType: cleanString(item.contentType)
    })).filter(item => item.name && item.path && item.path.startsWith('franchise-supervision/'));
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
        .select('id, company_id, location_id, supervisor_profile_id, visit_date, created_by, location:franchise_locations(name)')
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

export async function insertReportEvent(input: {
    readonly actorProfileId: string;
    readonly companyId: string;
    readonly eventType: SupervisionReportEventType;
    readonly memo: string;
    readonly reportId: string;
    readonly supabaseAdmin: SupabaseClient;
}) {
    const { error } = await input.supabaseAdmin
        .from('franchise_supervision_report_events')
        .insert({
            company_id: input.companyId,
            report_id: input.reportId,
            event_type: input.eventType,
            memo: input.memo || null,
            actor_profile_id: input.actorProfileId
        });
    if (error) throw error;
}

export async function syncVisitStatus(input: {
    readonly supabaseAdmin: SupabaseClient;
    readonly updatedBy: string;
    readonly visitId: string | null;
    readonly reportEventType: SupervisionReportEventType;
}) {
    if (!input.visitId) return;
    const status = visitStatusForReportStatus(input.reportEventType);
    if (!status) return;
    const { error } = await input.supabaseAdmin
        .from('franchise_store_visits')
        .update({
            status,
            updated_by: input.updatedBy,
            updated_at: new Date().toISOString()
        })
        .eq('id', input.visitId);
    if (error) throw error;
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
