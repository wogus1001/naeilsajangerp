export type CommonElectronicContractTemplate = {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly href: string;
    readonly sourceLabel: string;
    readonly status: 'ready' | 'hidden';
};

const COMMON_ELECTRONIC_CONTRACT_TEMPLATE_CATALOG: readonly CommonElectronicContractTemplate[] = [
    {
        id: 'premium-rights-contract',
        name: '권리금계약서',
        description: '상가 권리금 계약을 전자서명으로 발송합니다.',
        href: '/contracts/electronic/create',
        sourceLabel: '기본 제공',
        status: 'hidden'
    }
];

export const COMMON_ELECTRONIC_CONTRACT_TEMPLATES = COMMON_ELECTRONIC_CONTRACT_TEMPLATE_CATALOG.filter(
    template => template.status === 'ready'
);
