export type ContractScope = 'mine' | 'company' | 'all';

export type PageMode = 'documents' | 'templates';

export type ElectronicContract = {
    readonly id: string;
    readonly name: string;
    readonly status: string;
    readonly ucansignDocumentId: string;
    readonly templateSource: string;
    readonly companyTemplateId: string;
    readonly companyTemplateVersionId: string;
    readonly licenseNumber: string;
    readonly sentAt: string;
    readonly createdAt: string;
    readonly businessName: string;
    readonly transferorName: string;
    readonly transfereeName: string;
    readonly companyName: string;
    readonly sentByProfileId: string;
};

export type ContractsResponse = {
    readonly data?: {
        readonly contracts?: readonly ElectronicContract[];
    };
    readonly message?: string;
};

export function statusLabel(status: string): string {
    if (status === 'draft') return '초안';
    if (status === 'sent') return '발송 완료';
    if (status === 'completed') return '서명 완료';
    if (status === 'send_failed') return '발송 실패';
    if (status === 'sending') return '발송 중';
    if (status === 'canceled') return '취소';
    return status || '대기';
}

export function formatDate(value: string): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export function draftHref(contract: ElectronicContract): string {
    if (contract.templateSource === 'company_uploaded' && contract.companyTemplateId) {
        return `/contracts/electronic/create?companyTemplateId=${encodeURIComponent(contract.companyTemplateId)}&draftId=${encodeURIComponent(contract.id)}`;
    }
    return `/contracts/electronic/create?draftId=${encodeURIComponent(contract.id)}`;
}
