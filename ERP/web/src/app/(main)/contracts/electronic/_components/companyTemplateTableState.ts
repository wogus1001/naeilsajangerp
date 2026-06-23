import type { CompanyTemplateSummary } from './companyTemplatesClient';

export type CompanyTemplateUsageState = {
    readonly canCreateContract: boolean;
    readonly statusLabel: string;
    readonly createLabel: string;
    readonly editLabel: string;
};

export function getCompanyTemplateUsageState(template: CompanyTemplateSummary): CompanyTemplateUsageState {
    const isLinkedToUcansign = Boolean(template.latestVersion?.ucansignTemplateId);
    const canCreateContract = template.status === 'active' && isLinkedToUcansign;

    if (template.status === 'archived') {
        return {
            canCreateContract: false,
            statusLabel: '보관됨',
            createLabel: '연결 후 작성',
            editLabel: isLinkedToUcansign ? '수정' : '연결하기'
        };
    }

    if (canCreateContract) {
        return {
            canCreateContract: true,
            statusLabel: '발송 가능',
            createLabel: '문서 작성',
            editLabel: '수정'
        };
    }

    return {
        canCreateContract: false,
        statusLabel: 'UCanSign 연결 필요',
        createLabel: '연결 후 작성',
        editLabel: '연결하기'
    };
}
