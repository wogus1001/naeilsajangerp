export const APPROVAL_ACTIONS = [
    'approve',
    'reject',
    'agree',
    'disagree',
    'withdraw',
    'acknowledge',
    'complete'
] as const;

export type ApprovalAction = (typeof APPROVAL_ACTIONS)[number];
export type ApprovalDocumentStatus = 'draft' | 'in_review' | 'approved' | 'rejected' | 'withdrawn' | 'canceled' | 'completed';
export type ApprovalFieldType =
    | 'shortText'
    | 'longText'
    | 'number'
    | 'money'
    | 'date'
    | 'period'
    | 'select'
    | 'checklist'
    | 'table'
    | 'score'
    | 'attachment'
    | 'description'
    | 'checkbox'
    | 'person';
export type ApprovalEditableRole = 'author' | 'approver' | 'agreement' | 'all';

export type ApprovalField = {
    readonly id: string;
    readonly type: ApprovalFieldType;
    readonly label: string;
    readonly description?: string;
    readonly required: boolean;
    readonly columns: 1 | 2;
    readonly editableBy: ApprovalEditableRole;
    readonly options?: readonly string[];
};

export type ApprovalFieldValue =
    | string
    | number
    | boolean
    | readonly string[]
    | Readonly<Record<string, string>>
    | readonly Readonly<Record<string, string>>[]
    | null;
export type ApprovalFieldValues = Readonly<Record<string, ApprovalFieldValue>>;
export type ApprovalLineSelections = Readonly<Record<string, readonly string[]>>;

export type ApprovalLineStep = {
    readonly id: string;
    readonly kind: 'approval' | 'agreement' | 'reference' | 'recipient';
    readonly order: number;
    readonly assigneeName: string;
    readonly assigneeDepartment: string;
    readonly status: 'waiting' | 'approved' | 'rejected' | 'agreed' | 'disagreed' | 'acknowledged' | 'completed';
    readonly actedAt?: string | null;
};

export type ApprovalEvent = {
    readonly id: string;
    readonly type: string;
    readonly actorName: string;
    readonly message: string;
    readonly createdAt: string;
};

export type ApprovalDocumentSummary = {
    readonly id: string;
    readonly documentNumber: string;
    readonly title: string;
    readonly templateName: string;
    readonly authorName: string;
    readonly departmentName: string;
    readonly status: ApprovalDocumentStatus;
    readonly submittedAt?: string | null;
    readonly dueAt?: string | null;
    readonly updatedAt: string;
};

export type ApprovalDocumentDetail = ApprovalDocumentSummary & {
    readonly editable: boolean;
    readonly templateId: string;
    readonly securityLevel: string;
    readonly retentionPeriod: string;
    readonly documentBox: string;
    readonly fields: readonly ApprovalField[];
    readonly values: ApprovalFieldValues;
    readonly approvalLine: readonly ApprovalLineStep[];
    readonly attachments: readonly { readonly id: string; readonly name: string; readonly url?: string }[];
    readonly events: readonly ApprovalEvent[];
    readonly eligibleActions: readonly ApprovalAction[];
    readonly readerProfileIds: readonly string[];
    readonly receiverUnitIds: readonly string[];
    readonly approvalLineSelections: ApprovalLineSelections;
};

export type ApprovalTemplate = {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly category: string;
    readonly version: number;
    readonly status: 'draft' | 'published' | 'archived';
    readonly fields: readonly ApprovalField[];
    readonly steps: readonly ApprovalTemplateStep[];
};

export type ApprovalTemplateStep = {
    readonly id: string;
    readonly label: string;
    readonly action: 'approval' | 'agreement' | 'acknowledgement';
    readonly mode: 'sequential' | 'parallel_all' | 'parallel_any';
    readonly targetLabel: string;
    readonly target: ApprovalStepTarget;
};

export type ApprovalStepTarget =
    | { readonly kind: 'profiles'; readonly profileIds: readonly string[] }
    | { readonly kind: 'role'; readonly roleKey: string; readonly unitId: string | null }
    | { readonly kind: 'unit_manager'; readonly unitId: string }
    | { readonly kind: 'unit_members'; readonly unitId: string }
    | { readonly kind: 'author_manager' };

export type ApprovalOrganizationUnit = {
    readonly id: string;
    readonly name: string;
    readonly parentId: string | null;
    readonly code?: string | null;
    readonly description?: string;
    readonly managerProfileId?: string | null;
    readonly sortOrder?: number;
    readonly active: boolean;
};

export type ApprovalMembership = {
    readonly id: string;
    readonly profileId: string;
    readonly unitId: string;
    readonly jobTitle: string;
    readonly positionRank?: number;
    readonly primary: boolean;
    readonly active?: boolean;
};

export type ApprovalRoleAssignment = {
    readonly id: string;
    readonly roleKey: string;
    readonly roleName: string;
    readonly profileId: string;
    readonly unitId: string | null;
    readonly active?: boolean;
};

export type ApprovalDelegation = {
    readonly id: string;
    readonly delegatorProfileId: string;
    readonly delegateProfileId: string;
    readonly actionScope: readonly string[];
    readonly startsAt: string;
    readonly endsAt: string;
    readonly reason?: string;
    readonly active?: boolean;
};

export type ApprovalOrganization = {
    readonly canManageOrganization: boolean;
    readonly requesterProfileId: string;
    readonly people: readonly ApprovalPerson[];
    readonly units: readonly ApprovalOrganizationUnit[];
    readonly memberships: readonly ApprovalMembership[];
    readonly roleAssignments: readonly ApprovalRoleAssignment[];
    readonly delegations: readonly ApprovalDelegation[];
};

export type ApprovalPerson = {
    readonly id: string;
    readonly name: string;
    readonly email: string;
    readonly role: string;
};

export type ApprovalInboxFilter = 'waiting' | 'drafted' | 'rejected' | 'reference' | 'received' | 'mine' | 'department';

export const STATUS_LABELS: Readonly<Record<ApprovalDocumentStatus, string>> = {
    draft: '임시저장',
    in_review: '결재 진행',
    approved: '승인',
    rejected: '반려',
    withdrawn: '회수',
    canceled: '취소',
    completed: '완료'
};
