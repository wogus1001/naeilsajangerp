import type { ApprovalContext } from './access';
import { approvalLineProfileIds, receiverIds, type parseDocumentDraft } from './documents';
import { ApprovalRouteError, throwDatabaseError } from './errors';

type DocumentDraft = ReturnType<typeof parseDocumentDraft>;

export async function validateDocumentReferences(context: ApprovalContext, draft: DocumentDraft): Promise<void> {
    if (draft.template_id) {
        const { data, error } = await context.supabase.from('approval_templates').select('id')
            .eq('id', draft.template_id).eq('company_id', context.companyId)
            .eq('active', true).is('deleted_at', null).maybeSingle<{ readonly id: string }>();
        throwDatabaseError(error);
        if (!data) throw new ApprovalRouteError(400, 'VALIDATION_ERROR', 'templateId is not an active company template');
    }
    const receivers = receiverIds(draft.data);
    const profileIds = [...new Set([
        ...(draft.approver_profile_id ? [draft.approver_profile_id] : []),
        ...approvalLineProfileIds(draft.data),
        ...draft.readerProfileIds,
        ...receivers.profileIds
    ])];
    if (profileIds.length > 0) {
        const { data, error } = await context.supabase.from('profiles').select('id')
            .eq('company_id', context.companyId).eq('status', 'active')
            .neq('role', 'partner_vendor').in('id', profileIds)
            .returns<Array<{ readonly id: string }>>();
        throwDatabaseError(error);
        if ((data || []).length !== profileIds.length) {
            throw new ApprovalRouteError(400, 'VALIDATION_ERROR', '선택한 결재자 또는 참조자가 회사의 사용 가능한 구성원이 아닙니다.');
        }
    }
    if (receivers.unitIds.length > 0) {
        const { data, error } = await context.supabase.from('organization_units').select('id')
            .eq('company_id', context.companyId).in('id', receivers.unitIds)
            .returns<Array<{ readonly id: string }>>();
        throwDatabaseError(error);
        if ((data || []).length !== receivers.unitIds.length) {
            throw new ApprovalRouteError(400, 'VALIDATION_ERROR', 'Receiver organization units must belong to the company');
        }
    }
}
