export type LocationMessageKind = 'note' | 'request';
export type LocationRequestStatus = 'open' | 'done';

export type FranchiseLocationMessage = {
    readonly id: string;
    readonly companyId: string;
    readonly locationId: string;
    readonly authorId: string;
    readonly authorName: string;
    readonly body: string;
    readonly kind: LocationMessageKind;
    readonly requestStatus: LocationRequestStatus | null;
    readonly resolvedBy: string | null;
    readonly resolvedByName: string;
    readonly resolvedAt: string | null;
    readonly createdAt: string;
    readonly updatedAt: string;
};

export type FranchiseLocationMessageSummary = {
    readonly locationId: string;
    readonly totalCount: number;
    readonly openRequestCount: number;
    readonly latestMessageAt: string | null;
};

export type LocationMessagesResponse = {
    readonly messages: readonly FranchiseLocationMessage[];
    readonly summary: FranchiseLocationMessageSummary;
};

export type LocationMessageSummariesResponse = {
    readonly summaries: readonly FranchiseLocationMessageSummary[];
};
