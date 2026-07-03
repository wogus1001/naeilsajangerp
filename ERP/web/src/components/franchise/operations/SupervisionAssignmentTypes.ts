export type AssignmentFormState = {
    readonly locationId: string;
    readonly supervisorProfileId: string;
    readonly assignedAt: string;
    readonly memo: string;
};

export type AssignmentPaginationState = {
    readonly page: number;
    readonly pageSize: number;
    readonly total: number;
    readonly onPrevious: () => void;
    readonly onNext: () => void;
};
