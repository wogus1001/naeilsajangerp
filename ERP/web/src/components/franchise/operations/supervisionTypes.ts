import type {
    CorrectiveActionStatus,
    SupervisionInspectionItem,
    SupervisionPhotoAttachment,
    SupervisionReportEventType,
    SupervisionReportTemplate,
    SupervisionReportStatus,
    SupervisionVisitPurpose,
    SupervisionVisitStatus
} from '@/lib/franchise-supervision';
import type { SupervisionOperationQueueItem } from '@/lib/franchise-supervision-operation-queue';

export type SupervisionLocationOption = {
    readonly id: string;
    readonly name: string;
    readonly brand: string;
    readonly region: string;
    readonly address: string;
};

export type SupervisionSupervisorOption = {
    readonly id: string;
    readonly name: string;
    readonly role: string;
};

export type SupervisionAssignment = {
    readonly id: string;
    readonly companyId: string;
    readonly locationId: string;
    readonly locationName: string;
    readonly supervisorProfileId: string;
    readonly supervisorName: string;
    readonly regionScope: string;
    readonly memo: string;
    readonly active: boolean;
    readonly assignedAt: string | null;
    readonly endedAt: string | null;
};

export type SupervisionVisit = {
    readonly id: string;
    readonly companyId: string;
    readonly locationId: string;
    readonly locationName: string;
    readonly supervisorProfileId: string;
    readonly supervisorName: string;
    readonly assignmentId: string | null;
    readonly scheduleId: string | null;
    readonly visitDate: string | null;
    readonly purpose: SupervisionVisitPurpose;
    readonly status: SupervisionVisitStatus;
    readonly memo: string;
};

export type SupervisionReport = {
    readonly id: string;
    readonly companyId: string;
    readonly locationId: string;
    readonly locationName: string;
    readonly supervisorProfileId: string;
    readonly supervisorName: string;
    readonly visitId: string | null;
    readonly templateId: string | null;
    readonly status: SupervisionReportStatus;
    readonly inspectionItems: readonly SupervisionInspectionItem[];
    readonly photoAttachments: readonly SupervisionPhotoAttachment[];
    readonly specialNote: string;
    readonly rejectReason: string;
    readonly submittedAt: string | null;
    readonly reviewedAt: string | null;
    readonly updatedAt: string | null;
};

export type SupervisionReportEvent = {
    readonly id: string;
    readonly reportId: string;
    readonly eventType: SupervisionReportEventType;
    readonly actorName: string;
    readonly memo: string;
    readonly createdAt: string | null;
};

export type SupervisionCorrectiveAction = {
    readonly id: string;
    readonly companyId: string;
    readonly reportId: string | null;
    readonly locationId: string;
    readonly locationName: string;
    readonly assigneeProfileId: string | null;
    readonly assigneeName: string;
    readonly status: CorrectiveActionStatus;
    readonly title: string;
    readonly memo: string;
    readonly dueDate: string | null;
    readonly completedAt: string | null;
};

export type SupervisionCorrectiveActionEvent = {
    readonly id: string;
    readonly correctiveActionId: string;
    readonly eventType: string;
    readonly actorName: string;
    readonly fromStatus: string;
    readonly toStatus: string;
    readonly memo: string;
    readonly createdAt: string | null;
};

export type SupervisionSummaryView = {
    readonly todayVisitCount: number;
    readonly weekVisitCount: number;
    readonly missingReportCount: number;
    readonly pendingApprovalCount: number;
    readonly activeCorrectiveActionCount: number;
};

export type SupervisionPayload = {
    readonly schemaReady: boolean;
    readonly canManage: boolean;
    readonly companyId: string;
    readonly locations: readonly SupervisionLocationOption[];
    readonly supervisors: readonly SupervisionSupervisorOption[];
    readonly assignments: readonly SupervisionAssignment[];
    readonly visits: readonly SupervisionVisit[];
    readonly reports: readonly SupervisionReport[];
    readonly reportTemplates: readonly SupervisionReportTemplate[];
    readonly reportEvents: readonly SupervisionReportEvent[];
    readonly correctiveActions: readonly SupervisionCorrectiveAction[];
    readonly correctiveActionEvents: readonly SupervisionCorrectiveActionEvent[];
    readonly summary: SupervisionSummaryView;
    readonly operationQueue: readonly SupervisionOperationQueueItem[];
};

export type SupervisionScope = {
    readonly userId: string;
    readonly companyName: string;
};
