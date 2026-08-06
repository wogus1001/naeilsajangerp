type CustomerUpdateAccessInput = {
    readonly requesterId: string;
    readonly requesterRole: string | null;
    readonly assignedManagerId: string | null | undefined;
};

export function canUpdateCustomer({
    requesterId,
    requesterRole,
    assignedManagerId
}: CustomerUpdateAccessInput): boolean {
    if (requesterRole === 'admin' || requesterRole === 'manager') return true;
    if (!assignedManagerId) return true;
    return assignedManagerId === requesterId;
}
