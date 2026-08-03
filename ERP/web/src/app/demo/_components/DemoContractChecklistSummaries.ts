import type { LeadContractChecklistSummaryView } from '@/lib/franchise-lead-contract-checklist';

export const DEMO_CONTRACT_CHECKLIST_SUMMARIES: Readonly<Record<string, LeadContractChecklistSummaryView>> = {
    'demo-candidate-2': {
        leadId: 'demo-candidate-2',
        total: 17,
        completed: 5,
        resolved: 8,
        remaining: 9,
        progressPercent: 47,
        missingRequiredCount: 2,
        groups: {
            required: { total: 6, completed: 4, resolved: 4, remaining: 2, progressPercent: 67, missingDocumentCount: 2 },
            report: { total: 7, completed: 1, resolved: 2, remaining: 5, progressPercent: 29, missingDocumentCount: 5 },
            optional: { total: 4, completed: 0, resolved: 2, remaining: 2, progressPercent: 50, missingDocumentCount: 0 }
        },
        remainingLabels: ['가맹계약서', '사업자등록증/영업신고증'],
        schemaReady: true
    },
    'demo-candidate-4': {
        leadId: 'demo-candidate-4',
        total: 17,
        completed: 11,
        resolved: 13,
        remaining: 4,
        progressPercent: 76,
        missingRequiredCount: 0,
        groups: {
            required: { total: 6, completed: 6, resolved: 6, remaining: 0, progressPercent: 100, missingDocumentCount: 0 },
            report: { total: 7, completed: 4, resolved: 5, remaining: 2, progressPercent: 71, missingDocumentCount: 2 },
            optional: { total: 4, completed: 1, resolved: 2, remaining: 2, progressPercent: 50, missingDocumentCount: 0 }
        },
        remainingLabels: ['오픈물품 발주 확인서', '점주교육확인서'],
        schemaReady: true
    },
    'demo-candidate-6': {
        leadId: 'demo-candidate-6',
        total: 17,
        completed: 14,
        resolved: 16,
        remaining: 1,
        progressPercent: 94,
        missingRequiredCount: 0,
        groups: {
            required: { total: 6, completed: 6, resolved: 6, remaining: 0, progressPercent: 100, missingDocumentCount: 0 },
            report: { total: 7, completed: 6, resolved: 7, remaining: 0, progressPercent: 100, missingDocumentCount: 0 },
            optional: { total: 4, completed: 2, resolved: 3, remaining: 1, progressPercent: 75, missingDocumentCount: 0 }
        },
        remainingLabels: ['냉난방기 하자이행증권'],
        schemaReady: true
    }
};
