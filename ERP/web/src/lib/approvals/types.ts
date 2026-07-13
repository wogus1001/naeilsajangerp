type DomainId<Kind extends string> = {
    readonly kind: Kind;
    readonly value: string;
};

export type ProfileId = DomainId<'profile'>;
export type OrganizationUnitId = DomainId<'organization_unit'>;

export function profileId(value: string): ProfileId {
    return { kind: 'profile', value: value.trim() };
}

export function organizationUnitId(value: string): OrganizationUnitId {
    return { kind: 'organization_unit', value: value.trim() };
}

export const TEMPLATE_FIELD_TYPES = [
    'text', 'textarea', 'shortText', 'longText', 'number', 'money', 'date', 'period',
    'select', 'checkbox', 'checklist', 'table', 'score', 'attachment', 'description', 'person'
] as const;
export type TemplateFieldType = (typeof TEMPLATE_FIELD_TYPES)[number];

export type TemplateField = {
    readonly key: string;
    readonly label: string;
    readonly type: TemplateFieldType;
    readonly required: boolean;
    readonly placeholder: string;
    readonly options: readonly string[];
    readonly columns?: 1 | 2;
    readonly description?: string;
    readonly editableBy?: 'author' | 'approver' | 'agreement' | 'all';
};

export const STEP_ACTION_KINDS = ['approval', 'agreement', 'acknowledgement'] as const;
export type StepActionKind = (typeof STEP_ACTION_KINDS)[number];
export const STEP_COMPLETION_MODES = ['sequential', 'parallel_all', 'parallel_any'] as const;
export type StepCompletionMode = (typeof STEP_COMPLETION_MODES)[number];

export type StepTargetSelector =
    | { readonly kind: 'profiles'; readonly profileIds: readonly ProfileId[] }
    | { readonly kind: 'role'; readonly roleKey: string; readonly unitId: OrganizationUnitId | null }
    | { readonly kind: 'unit_manager'; readonly unitId: OrganizationUnitId }
    | { readonly kind: 'unit_members'; readonly unitId: OrganizationUnitId }
    | { readonly kind: 'author_manager' };

export type TemplateStep = {
    readonly key: string;
    readonly order: number;
    readonly label: string;
    readonly action: StepActionKind;
    readonly mode: StepCompletionMode;
    readonly target: StepTargetSelector;
};

export type OrganizationUnitSnapshot = {
    readonly id: OrganizationUnitId;
    readonly parentId: OrganizationUnitId | null;
    readonly name: string;
    readonly managerProfileId: ProfileId | null;
    readonly active: boolean;
};

export type OrganizationMembershipSnapshot = {
    readonly profileId: ProfileId;
    readonly profileName: string;
    readonly unitId: OrganizationUnitId;
    readonly jobTitle: string;
    readonly primary: boolean;
    readonly active: boolean;
};

export type ApprovalRoleAssignmentSnapshot = {
    readonly roleKey: string;
    readonly profileId: ProfileId;
    readonly unitId: OrganizationUnitId | null;
    readonly activeFrom: string | null;
    readonly activeUntil: string | null;
};

export type ApprovalDelegationSnapshot = {
    readonly delegatorProfileId: ProfileId;
    readonly delegateProfileId: ProfileId;
    readonly actions: readonly StepActionKind[];
    readonly activeFrom: string;
    readonly activeUntil: string;
};

export type OrganizationSnapshot = {
    readonly capturedAt: string;
    readonly units: readonly OrganizationUnitSnapshot[];
    readonly memberships: readonly OrganizationMembershipSnapshot[];
    readonly roleAssignments: readonly ApprovalRoleAssignmentSnapshot[];
    readonly delegations: readonly ApprovalDelegationSnapshot[];
};

export type ResolvedStepTarget = {
    readonly profileId: ProfileId;
    readonly profileName: string;
    readonly unitId: OrganizationUnitId | null;
    readonly unitName: string;
    readonly roleKey: string;
    readonly delegateProfileIds: readonly ProfileId[];
};

export type ResolvedStep = Omit<TemplateStep, 'target'> & {
    readonly targets: readonly ResolvedStepTarget[];
};

export const DOCUMENT_STATUSES = [
    'draft', 'in_review', 'approved', 'rejected', 'withdrawn', 'canceled', 'completed'
] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];
export const DOCUMENT_ACTIONS = [
    'submit', 'approve', 'reject', 'agree', 'disagree', 'withdraw', 'acknowledge', 'complete'
] as const;
export type DocumentActionKind = (typeof DOCUMENT_ACTIONS)[number];
export type ReviewActionKind = Exclude<DocumentActionKind, 'submit' | 'withdraw' | 'complete'>;

export type StepResponse = {
    readonly actorProfileId: ProfileId;
    readonly targetProfileId: ProfileId;
    readonly action: ReviewActionKind;
    readonly occurredAt: string;
};

export type DocumentStepStatus =
    'pending' | 'active' | 'approved' | 'rejected' | 'agreed' | 'disagreed' | 'acknowledged' | 'skipped';

export type DocumentStepState = ResolvedStep & {
    readonly status: DocumentStepStatus;
    readonly responses: readonly StepResponse[];
};

export type DocumentWorkflowState = {
    readonly status: DocumentStatus;
    readonly authorProfileId: ProfileId;
    readonly currentStepOrder: number | null;
    readonly submittedAt: string | null;
    readonly completedAt: string | null;
    readonly steps: readonly DocumentStepState[];
};

export type DocumentAction = {
    readonly kind: DocumentActionKind;
    readonly actorProfileId: ProfileId;
    readonly occurredAt: string;
};

export type ActionEligibility =
    | { readonly allowed: true; readonly reason: '' }
    | { readonly allowed: false; readonly reason: string };

export type WorkflowTransition =
    | { readonly ok: true; readonly state: DocumentWorkflowState }
    | { readonly ok: false; readonly reason: string };
