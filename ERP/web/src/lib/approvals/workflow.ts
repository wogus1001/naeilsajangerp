import type {
    ActionEligibility,
    DocumentAction,
    DocumentActionKind,
    DocumentStepState,
    DocumentStepStatus,
    DocumentWorkflowState,
    ProfileId,
    ResolvedStepTarget,
    ReviewActionKind,
    StepActionKind,
    WorkflowTransition
} from './types';

const allowed: ActionEligibility = { allowed: true, reason: '' };

function denied(reason: string): ActionEligibility {
    return { allowed: false, reason };
}

function sameProfile(left: ProfileId, right: ProfileId): boolean {
    return left.value === right.value;
}

function reviewStepAction(action: DocumentActionKind): StepActionKind | null {
    switch (action) {
        case 'approve':
        case 'reject': return 'approval';
        case 'agree':
        case 'disagree': return 'agreement';
        case 'acknowledge': return 'acknowledgement';
        case 'submit':
        case 'withdraw':
        case 'complete': return null;
        default: return assertNever(action);
    }
}

function assertNever(value: never): never {
    throw new TypeError(`지원하지 않는 문서 동작입니다: ${JSON.stringify(value)}`);
}

function activeStep(state: DocumentWorkflowState): DocumentStepState | null {
    if (state.currentStepOrder === null) return null;
    return state.steps.find(step => step.order === state.currentStepOrder && step.status === 'active') ?? null;
}

function actingTarget(step: DocumentStepState, actor: ProfileId): ResolvedStepTarget | null {
    return step.targets.find(target => sameProfile(target.profileId, actor)
        || target.delegateProfileIds.some(delegate => sameProfile(delegate, actor))) ?? null;
}

function reviewEligibility(
    state: DocumentWorkflowState,
    action: DocumentActionKind,
    actor: ProfileId
): ActionEligibility {
    if (state.status !== 'in_review') return denied('진행 중인 결재 문서가 아닙니다.');
    const step = activeStep(state);
    const expectedAction = reviewStepAction(action);
    if (step === null || expectedAction === null || step.action !== expectedAction) {
        return denied('현재 결재 단계에서 수행할 수 없는 동작입니다.');
    }
    if (step.action === 'approval' && sameProfile(state.authorProfileId, actor)) {
        return denied('작성자는 본인 문서를 결재할 수 없습니다.');
    }
    const target = actingTarget(step, actor);
    if (target === null) return denied('현재 결재 단계의 대상자가 아닙니다.');
    if (step.responses.some(response => sameProfile(response.targetProfileId, target.profileId))) {
        return denied('이미 이 결재 대상에 대한 처리가 완료되었습니다.');
    }
    return allowed;
}

export function getActionEligibility(
    state: DocumentWorkflowState,
    action: DocumentActionKind,
    actor: ProfileId
): ActionEligibility {
    switch (action) {
        case 'submit':
            if (!sameProfile(state.authorProfileId, actor)) return denied('작성자만 문서를 제출할 수 있습니다.');
            if (state.status !== 'draft' && state.status !== 'rejected') return denied('제출할 수 있는 문서 상태가 아닙니다.');
            if (state.steps.length === 0 || state.steps.some(step => step.targets.length === 0)) {
                return denied('결재 대상이 지정되지 않은 단계가 있습니다.');
            }
            return allowed;
        case 'withdraw':
            if (!sameProfile(state.authorProfileId, actor)) return denied('작성자만 문서를 회수할 수 있습니다.');
            if (state.status !== 'in_review') return denied('진행 중인 문서만 회수할 수 있습니다.');
            if (state.steps.some(step => step.responses.length > 0)) {
                return denied('결재 또는 합의가 시작된 문서는 회수할 수 없습니다.');
            }
            return allowed;
        case 'complete':
            if (!sameProfile(state.authorProfileId, actor)) return denied('작성자만 완료 처리할 수 있습니다.');
            return state.status === 'approved' ? allowed : denied('승인된 문서만 완료 처리할 수 있습니다.');
        case 'approve':
        case 'reject':
        case 'agree':
        case 'disagree':
        case 'acknowledge':
            return reviewEligibility(state, action, actor);
        default:
            return assertNever(action);
    }
}

function submitted(state: DocumentWorkflowState, occurredAt: string): DocumentWorkflowState {
    const firstOrder = Math.min(...state.steps.map(step => step.order));
    return {
        ...state,
        status: 'in_review',
        currentStepOrder: firstOrder,
        submittedAt: occurredAt,
        completedAt: null,
        steps: state.steps.map(step => ({
            ...step,
            status: step.order === firstOrder ? 'active' : 'pending',
            responses: []
        }))
    };
}

function positiveAction(action: ReviewActionKind): boolean {
    return action === 'approve' || action === 'agree' || action === 'acknowledge';
}

function completedStatus(action: ReviewActionKind): DocumentStepStatus {
    switch (action) {
        case 'approve': return 'approved';
        case 'agree': return 'agreed';
        case 'acknowledge': return 'acknowledged';
        case 'reject': return 'rejected';
        case 'disagree': return 'disagreed';
        default: return assertNever(action);
    }
}

function applyReview(state: DocumentWorkflowState, action: DocumentAction): DocumentWorkflowState {
    const step = activeStep(state);
    if (step === null || action.kind === 'submit' || action.kind === 'withdraw' || action.kind === 'complete') return state;
    const target = actingTarget(step, action.actorProfileId);
    if (target === null) return state;
    const responses = [...step.responses, {
        actorProfileId: { ...action.actorProfileId },
        targetProfileId: { ...target.profileId },
        action: action.kind,
        occurredAt: action.occurredAt
    }];
    const positiveCount = responses.filter(response => positiveAction(response.action)).length;
    const negativeCount = responses.length - positiveCount;
    const requiredCount = step.mode === 'parallel_any' ? 1 : step.targets.length;
    const isPositiveComplete = positiveCount >= requiredCount;
    const isNegativeComplete = negativeCount > 0;
    const updatedStep = { ...step, responses };
    if (!isPositiveComplete && !isNegativeComplete) {
        return { ...state, steps: state.steps.map(item => item.order === step.order ? updatedStep : item) };
    }
    const terminalStep = { ...updatedStep, status: completedStatus(action.kind) };
    const withTerminal = state.steps.map(item => item.order === step.order ? terminalStep : item);
    if (isNegativeComplete) {
        return { ...state, status: 'rejected', currentStepOrder: null, steps: withTerminal };
    }
    const nextOrder = Math.min(...withTerminal.filter(item => item.status === 'pending').map(item => item.order));
    if (!Number.isFinite(nextOrder)) {
        return { ...state, status: 'approved', currentStepOrder: null, steps: withTerminal };
    }
    return {
        ...state,
        currentStepOrder: nextOrder,
        steps: withTerminal.map(item => item.order === nextOrder ? { ...item, status: 'active' } : item)
    };
}

export function applyDocumentAction(state: DocumentWorkflowState, action: DocumentAction): WorkflowTransition {
    const eligibility = getActionEligibility(state, action.kind, action.actorProfileId);
    if (!eligibility.allowed) return { ok: false, reason: eligibility.reason };
    switch (action.kind) {
        case 'submit': return { ok: true, state: submitted(state, action.occurredAt) };
        case 'withdraw':
            return {
                ok: true,
                state: {
                    ...state,
                    status: 'withdrawn',
                    currentStepOrder: null,
                    steps: state.steps.map(step => step.status === 'active' || step.status === 'pending'
                        ? { ...step, status: 'skipped' }
                        : step)
                }
            };
        case 'complete':
            return { ok: true, state: { ...state, status: 'completed', completedAt: action.occurredAt } };
        case 'approve':
        case 'reject':
        case 'agree':
        case 'disagree':
        case 'acknowledge':
            return { ok: true, state: applyReview(state, action) };
        default: return assertNever(action.kind);
    }
}

export function summarizeDocumentState(state: DocumentWorkflowState): {
    readonly status: DocumentWorkflowState['status'];
    readonly currentStepOrder: number | null;
    readonly completedStepCount: number;
    readonly totalStepCount: number;
    readonly respondedTargetCount: number;
    readonly totalTargetCount: number;
} {
    const completed = new Set<DocumentStepStatus>(['approved', 'agreed', 'acknowledged']);
    return {
        status: state.status,
        currentStepOrder: state.currentStepOrder,
        completedStepCount: state.steps.filter(step => completed.has(step.status)).length,
        totalStepCount: state.steps.length,
        respondedTargetCount: state.steps.reduce((count, step) => count + step.responses.length, 0),
        totalTargetCount: state.steps.reduce((count, step) => count + step.targets.length, 0)
    };
}
