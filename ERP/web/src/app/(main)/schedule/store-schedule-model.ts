export function buildLegacyScheduleRedirectPath(value: string | readonly string[] | undefined): string {
    const approvalDocumentId = Array.isArray(value) ? value[0] : value;
    if (!approvalDocumentId) return '';
    const encoded = encodeURIComponent(approvalDocumentId);
    return `/dashboard/franchise-operations/schedule?approvalDocumentId=${encoded}`;
}
