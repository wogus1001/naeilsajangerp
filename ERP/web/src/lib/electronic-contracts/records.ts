export type ElectronicContractRow = {
    readonly id: string;
    readonly company_id: string | null;
    readonly sent_by_profile_id: string | null;
    readonly ucansign_document_id: string | null;
    readonly template_key: string | null;
    readonly template_version: string | null;
    readonly name: string | null;
    readonly status: string | null;
    readonly license_number: string | null;
    readonly sent_at: string | null;
    readonly completed_at: string | null;
    readonly created_at: string | null;
    readonly updated_at: string | null;
    readonly form_snapshot: Record<string, unknown> | null;
    readonly payload_snapshot: Record<string, unknown> | null;
};

export type ElectronicContractView = {
    readonly id: string;
    readonly companyId: string;
    readonly sentByProfileId: string;
    readonly ucansignDocumentId: string;
    readonly templateKey: string;
    readonly templateVersion: string;
    readonly name: string;
    readonly status: string;
    readonly licenseNumber: string;
    readonly sentAt: string;
    readonly completedAt: string;
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly businessName: string;
    readonly transferorName: string;
    readonly transfereeName: string;
    readonly companyName: string;
};

function stringFromRecord(record: Record<string, unknown> | null, key: string): string {
    const value = record?.[key];
    return typeof value === 'string' ? value : '';
}

export function toElectronicContractView(row: ElectronicContractRow): ElectronicContractView {
    const snapshot = row.form_snapshot;
    return {
        id: row.id,
        companyId: row.company_id || '',
        sentByProfileId: row.sent_by_profile_id || '',
        ucansignDocumentId: row.ucansign_document_id || '',
        templateKey: row.template_key || '',
        templateVersion: row.template_version || '',
        name: row.name || '전자계약',
        status: row.status || 'draft',
        licenseNumber: row.license_number || '',
        sentAt: row.sent_at || '',
        completedAt: row.completed_at || '',
        createdAt: row.created_at || '',
        updatedAt: row.updated_at || '',
        businessName: stringFromRecord(snapshot, 'businessName'),
        transferorName: stringFromRecord(snapshot, 'transferorName'),
        transfereeName: stringFromRecord(snapshot, 'transfereeName'),
        companyName: stringFromRecord(snapshot, 'companyName')
    };
}
