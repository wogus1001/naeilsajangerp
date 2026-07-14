import type { getSupabaseAdmin } from './supabase-admin';
import {
    actorAlreadyResponded,
    actorAppearsInTargets,
    type ActiveApprovalDelegationGrant
} from './approval-target-access';

type SupabaseAdminClient = ReturnType<typeof getSupabaseAdmin>;

type ApprovalDelegationRow = {
    readonly delegator_profile_id: string;
    readonly action_scope: readonly string[];
};

type ActiveApprovalStepRow = {
    readonly document_id: string;
    readonly step_order: number;
    readonly action_kind: string;
    readonly targets: unknown;
    readonly responses: unknown;
};

export type ActionableApprovalStep = {
    readonly documentId: string;
    readonly stepOrder: number;
};

export async function loadCurrentApprovalDelegations(
    supabase: SupabaseAdminClient,
    companyId: string,
    delegateProfileId: string,
    now = new Date().toISOString()
): Promise<readonly ActiveApprovalDelegationGrant[]> {
    const { data, error } = await supabase
        .from('approval_delegations')
        .select('delegator_profile_id, action_scope')
        .eq('company_id', companyId)
        .eq('delegate_profile_id', delegateProfileId)
        .eq('active', true)
        .lte('starts_at', now)
        .gte('ends_at', now)
        .returns<ApprovalDelegationRow[]>();
    if (error) throw error;
    return (data || []).map(row => ({
        delegatorProfileId: row.delegator_profile_id,
        actionScope: row.action_scope
    }));
}

export async function loadActionableApprovalSteps(
    supabase: SupabaseAdminClient,
    companyId: string,
    actorProfileId: string,
    documentIds: readonly string[]
): Promise<readonly ActionableApprovalStep[]> {
    const uniqueDocumentIds = [...new Set(documentIds.filter(Boolean))];
    if (uniqueDocumentIds.length === 0) return [];
    const [delegations, stepsResult] = await Promise.all([
        loadCurrentApprovalDelegations(supabase, companyId, actorProfileId),
        supabase.from('approval_document_steps')
            .select('document_id, step_order, action_kind, targets, responses')
            .eq('company_id', companyId)
            .eq('status', 'active')
            .in('document_id', uniqueDocumentIds)
            .returns<ActiveApprovalStepRow[]>()
    ]);
    if (stepsResult.error) throw stepsResult.error;
    return (stepsResult.data || [])
        .filter(step => actorAppearsInTargets(
            step.targets,
            actorProfileId,
            step.action_kind,
            delegations
        ) && !actorAlreadyResponded(
            step.targets,
            step.responses,
            actorProfileId,
            step.action_kind,
            delegations
        ))
        .map(step => ({ documentId: step.document_id, stepOrder: step.step_order }));
}

export async function loadActionableApprovalDocumentIds(
    supabase: SupabaseAdminClient,
    companyId: string,
    actorProfileId: string,
    documentIds: readonly string[]
): Promise<ReadonlySet<string>> {
    const steps = await loadActionableApprovalSteps(supabase, companyId, actorProfileId, documentIds);
    return new Set(steps.map(step => step.documentId));
}
