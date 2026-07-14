import { loadActionableApprovalSteps } from './approval-delegation-access';
import type { getSupabaseAdmin } from './supabase-admin';

type SupabaseAdminClient = ReturnType<typeof getSupabaseAdmin>;

type WorkflowNotificationRow = {
    readonly id: string;
    readonly data: unknown;
};

type ScopedWorkflowNotificationRow = WorkflowNotificationRow & {
    readonly company_id: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function staleApprovalNotificationIds(
    notifications: readonly WorkflowNotificationRow[],
    actionableStepKeys: ReadonlySet<string>
): readonly string[] {
    return notifications.flatMap(notification => {
        if (!isRecord(notification.data) || typeof notification.data.stepOrder !== 'number') return [];
        const documentId = typeof notification.data.documentId === 'string'
            ? notification.data.documentId
            : '';
        const stepKey = `${documentId}:${notification.data.stepOrder}`;
        return documentId && !actionableStepKeys.has(stepKey) ? [notification.id] : [];
    });
}

export async function dismissStaleApprovalNotifications(
    supabase: SupabaseAdminClient,
    companyId: string | null,
    recipientProfileId: string
): Promise<void> {
    let query = supabase
        .from('franchise_notifications')
        .select('id, company_id, data')
        .eq('recipient_profile_id', recipientProfileId)
        .eq('source_type', 'workflow-approval')
        .is('dismissed_at', null);
    if (companyId) query = query.eq('company_id', companyId);
    const { data, error } = await query.returns<ScopedWorkflowNotificationRow[]>();
    if (error) throw error;
    const notifications = data || [];
    const staleIdsWithoutCompany = staleApprovalNotificationIds(
        notifications.filter(notification => !notification.company_id),
        new Set()
    );
    const notificationsByCompany = new Map<string, ScopedWorkflowNotificationRow[]>();
    for (const notification of notifications) {
        if (!notification.company_id) continue;
        const companyNotifications = notificationsByCompany.get(notification.company_id) || [];
        companyNotifications.push(notification);
        notificationsByCompany.set(notification.company_id, companyNotifications);
    }
    const staleIdsByCompany = await Promise.all([...notificationsByCompany.entries()].map(async ([notificationCompanyId, companyNotifications]) => {
        const documentIds = companyNotifications.flatMap(notification => (
            isRecord(notification.data) && typeof notification.data.documentId === 'string'
                ? [notification.data.documentId]
                : []
        ));
        const actionableSteps = await loadActionableApprovalSteps(
            supabase,
            notificationCompanyId,
            recipientProfileId,
            documentIds
        );
        const actionableStepKeys = new Set(actionableSteps.map(step => `${step.documentId}:${step.stepOrder}`));
        return staleApprovalNotificationIds(companyNotifications, actionableStepKeys);
    }));
    const staleIds = [...staleIdsWithoutCompany, ...staleIdsByCompany.flat()];
    if (staleIds.length === 0) return;
    const now = new Date().toISOString();
    const { error: updateError } = await supabase
        .from('franchise_notifications')
        .update({ dismissed_at: now, updated_at: now })
        .in('id', staleIds);
    if (updateError) throw updateError;
}
