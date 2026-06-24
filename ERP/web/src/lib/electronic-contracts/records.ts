export type ElectronicContractRow = {
    readonly id: string;
    readonly company_id: string | null;
    readonly lead_id: string | null;
    readonly sent_by_profile_id: string | null;
    readonly ucansign_document_id: string | null;
    readonly template_key: string | null;
    readonly template_version: string | null;
    readonly template_source: string | null;
    readonly company_template_id: string | null;
    readonly company_template_version_id: string | null;
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
    readonly leadId: string;
    readonly sentByProfileId: string;
    readonly ucansignDocumentId: string;
    readonly templateKey: string;
    readonly templateVersion: string;
    readonly templateSource: string;
    readonly companyTemplateId: string;
    readonly companyTemplateVersionId: string;
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

function participantName(record: Record<string, unknown> | null, index: number): string {
    const participants = record?.participants;
    if (!Array.isArray(participants)) return '';
    const value = participants[index];
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return '';
    const name = value.name;
    return typeof name === 'string' ? name : '';
}

export function toElectronicContractView(row: ElectronicContractRow): ElectronicContractView {
    const snapshot = row.form_snapshot;
    return {
        id: row.id,
        companyId: row.company_id || '',
        leadId: row.lead_id || '',
        sentByProfileId: row.sent_by_profile_id || '',
        ucansignDocumentId: row.ucansign_document_id || '',
        templateKey: row.template_key || '',
        templateVersion: row.template_version || '',
        templateSource: row.template_source || '',
        companyTemplateId: row.company_template_id || '',
        companyTemplateVersionId: row.company_template_version_id || '',
        name: row.name || '전자계약',
        status: row.status || 'draft',
        licenseNumber: row.license_number || '',
        sentAt: row.sent_at || '',
        completedAt: row.completed_at || '',
        createdAt: row.created_at || '',
        updatedAt: row.updated_at || '',
        businessName: stringFromRecord(snapshot, 'businessName') || stringFromRecord(snapshot, 'templateName'),
        transferorName: stringFromRecord(snapshot, 'transferorName') || participantName(snapshot, 0),
        transfereeName: stringFromRecord(snapshot, 'transfereeName') || participantName(snapshot, 1),
        companyName: stringFromRecord(snapshot, 'companyName')
    };
}
