export type FranchiseNotificationAlimtalkScope = {
    readonly companyId: string | null;
    readonly requesterIsAdmin: boolean;
};

export function canDispatchFranchiseNotificationAlimtalk(scope: FranchiseNotificationAlimtalkScope): boolean {
    if (scope.companyId) return true;
    return !scope.requesterIsAdmin;
}
