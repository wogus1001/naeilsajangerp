export type SupervisionAssignmentViewInput = {
    readonly locations: readonly {
        readonly id: string;
        readonly name: string;
        readonly brand: string;
        readonly address: string;
    }[];
    readonly supervisors: readonly {
        readonly id: string;
        readonly name: string;
        readonly loginId?: string;
        readonly email?: string;
        readonly role: string;
    }[];
    readonly assignments: readonly {
        readonly id: string;
        readonly locationId: string;
        readonly locationName: string;
        readonly supervisorProfileId: string;
        readonly supervisorName: string;
        readonly memo: string;
        readonly active: boolean;
        readonly assignedAt: string | null;
        readonly endedAt: string | null;
    }[];
};

export type StoreAssignmentRow = {
    readonly locationId: string;
    readonly locationName: string;
    readonly brand: string;
    readonly address: string;
    readonly assignmentId: string | null;
    readonly supervisorProfileId: string | null;
    readonly supervisorName: string;
    readonly assignedAt: string | null;
    readonly memo: string;
    readonly historyCount: number;
    readonly assigned: boolean;
};

export type SupervisorAssignmentRow = {
    readonly supervisorProfileId: string;
    readonly supervisorName: string;
    readonly loginId: string;
    readonly email: string;
    readonly role: string;
    readonly activeStoreCount: number;
    readonly storeNames: readonly string[];
    readonly recentAssignedAt: string | null;
};

function compareNullableDateDesc(left: string | null, right: string | null): number {
    return (right || '').localeCompare(left || '');
}

export function buildStoreAssignmentRows(input: SupervisionAssignmentViewInput): readonly StoreAssignmentRow[] {
    return input.locations.map(location => {
        const locationAssignments = input.assignments
            .filter(assignment => assignment.locationId === location.id)
            .sort((left, right) => compareNullableDateDesc(left.assignedAt, right.assignedAt));
        const activeAssignment = locationAssignments.find(assignment => assignment.active) || null;
        return {
            locationId: location.id,
            locationName: location.name,
            brand: location.brand,
            address: location.address,
            assignmentId: activeAssignment?.id || null,
            supervisorProfileId: activeAssignment?.supervisorProfileId || null,
            supervisorName: activeAssignment?.supervisorName || 'SV 미배정',
            assignedAt: activeAssignment?.assignedAt || null,
            memo: activeAssignment?.memo || '',
            historyCount: locationAssignments.length,
            assigned: Boolean(activeAssignment)
        };
    });
}

export function buildSupervisorAssignmentRows(input: SupervisionAssignmentViewInput): readonly SupervisorAssignmentRow[] {
    return input.supervisors.map(supervisor => {
        const assignments = input.assignments
            .filter(assignment => assignment.active && assignment.supervisorProfileId === supervisor.id)
            .sort((left, right) => compareNullableDateDesc(left.assignedAt, right.assignedAt));
        return {
            supervisorProfileId: supervisor.id,
            supervisorName: supervisor.name,
            loginId: supervisor.loginId || '',
            email: supervisor.email || '',
            role: supervisor.role,
            activeStoreCount: assignments.length,
            storeNames: assignments.map(assignment => assignment.locationName),
            recentAssignedAt: assignments[0]?.assignedAt || null
        };
    });
}
