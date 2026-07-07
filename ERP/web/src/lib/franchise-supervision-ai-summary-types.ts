import type {
    SupervisionInspectionItem,
    SupervisionItemResult
} from './franchise-supervision';

export const SUPERVISION_AI_SUMMARY_MAX_INPUT_LENGTH = 12_000;
export const SUPERVISION_AI_SUMMARY_MAX_FIELD_LENGTH = 2_000;
export const SUPERVISION_AI_ITEM_MEMO_MAX_LENGTH = 1_000;

export type SupervisionReportAiItemSummary = {
    readonly id: string;
    readonly label: string;
    readonly result: SupervisionItemResult;
    readonly memo: string;
    readonly evidence: string;
};

export type SupervisionReportAiSummary = {
    readonly overallNote: string;
    readonly specialNote: string;
    readonly inspectionItems: readonly SupervisionReportAiItemSummary[];
};

export type SupervisionReportAiPromptMessage = {
    readonly role: 'system' | 'user';
    readonly content: string;
};

export type ApplySupervisionReportAiSummaryInput = {
    readonly inspectionItems: readonly SupervisionInspectionItem[];
    readonly specialNote: string;
    readonly summary: SupervisionReportAiSummary;
};

export type ApplySupervisionReportAiSummaryResult = {
    readonly inspectionItems: readonly SupervisionInspectionItem[];
    readonly specialNote: string;
};

export type BuildFallbackSupervisionReportAiSummaryInput = {
    readonly transcript: string;
    readonly inspectionItems: readonly SupervisionInspectionItem[];
};

export type SupervisionReportAiPromptInput = {
    readonly transcript: string;
    readonly locationName: string;
    readonly supervisorName: string;
    readonly visitDate: string | null;
    readonly purpose: string;
    readonly inspectionItems: readonly SupervisionInspectionItem[];
};

export type SupervisionReportAiQualityWarning = {
    readonly key: string;
    readonly label: string;
    readonly message: string;
};
