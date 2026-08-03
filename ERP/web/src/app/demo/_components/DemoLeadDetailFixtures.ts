import {
    buildDefaultOpeningProjectTasks,
    summarizeOpeningProjectTasks
} from '@/lib/franchise-opening-projects';
import type {
    FranchiseDisclosureDocument,
    FranchiseLeadDisclosureDelivery
} from '@/lib/franchise-disclosure-deliveries';
import {
    LEAD_CONTRACT_CHECKLIST_DEFINITIONS,
    type LeadContractChecklistStepInput
} from '@/lib/franchise-lead-contract-checklist';
import type { FranchiseLeadDocument } from '@/lib/franchise-lead-documents';
import type { FranchiseOpeningProject } from '@/components/franchise/operations/types';
import type { FranchiseLocation } from '@/components/franchise/leads/types';

export const DEMO_DETAIL_NOW = '2026-07-30T03:00:00.000Z';
export const DEMO_DETAIL_USER_ID = 'demo-manager-kim';
export const DEMO_DETAIL_COMPANY_ID = 'demo-company';
export const DEMO_DETAIL_COMPANY_NAME = 'FC ERP 데모 본사';

const STORE_FIXTURES = {
    'demo-candidate-2': {
        id: 'demo-operation-bundang',
        name: '미카도 판교점',
        brand: '미카도',
        region: '경기 성남시',
        address: '경기 성남시 분당구 판교역로 166'
    },
    'demo-candidate-4': {
        id: 'demo-operation-busan',
        name: '샘플카페 센텀점',
        brand: '샘플카페',
        region: '부산 해운대구',
        address: '부산 해운대구 센텀중앙로 97'
    },
    'demo-candidate-6': {
        id: 'demo-operation-jeju',
        name: '샘플치킨 제주점',
        brand: '샘플치킨',
        region: '제주 제주시',
        address: '제주 제주시 연북로 12'
    }
};

function findStoreFixture(leadId: string) {
    if (leadId === 'demo-candidate-2') return STORE_FIXTURES['demo-candidate-2'];
    if (leadId === 'demo-candidate-4') return STORE_FIXTURES['demo-candidate-4'];
    if (leadId === 'demo-candidate-6') return STORE_FIXTURES['demo-candidate-6'];
    return null;
}

export function createDemoDisclosureDocument(): FranchiseDisclosureDocument {
    return {
        id: 'demo-disclosure-2026',
        companyId: DEMO_DETAIL_COMPANY_ID,
        createdBy: DEMO_DETAIL_USER_ID,
        title: '2026 미카도 정보공개서',
        brandName: '미카도',
        franchisorName: DEMO_DETAIL_COMPANY_NAME,
        version: '2026.1',
        fileUrl: 'data:application/pdf;base64,JVBERi0xLjQK',
        fileName: '미카도_정보공개서_2026.pdf',
        issuedAt: '2026-06-01',
        memo: '데모 발송용 최신본',
        status: 'active',
        createdAt: '2026-06-01T03:00:00.000Z',
        updatedAt: '2026-07-15T03:00:00.000Z'
    };
}

export function createDemoDisclosureDelivery(
    leadId: string,
    document: FranchiseDisclosureDocument
): FranchiseLeadDisclosureDelivery {
    return {
        id: `demo-delivery-${leadId}`,
        companyId: DEMO_DETAIL_COMPANY_ID,
        leadId,
        documentId: document.id,
        sentBy: DEMO_DETAIL_USER_ID,
        sentAt: '2026-07-10T03:00:00.000Z',
        channel: 'email',
        recipientName: '가맹 희망자',
        recipientContact: 'demo@example.com',
        documentTitle: document.title,
        documentVersion: document.version,
        evidenceUrl: '',
        sendStatus: 'sent',
        gmailConnectionId: 'demo-gmail',
        gmailMessageId: `message-${leadId}`,
        gmailThreadId: `thread-${leadId}`,
        gmailSenderEmail: 'franchise@example.com',
        recipientEmail: 'demo@example.com',
        openedAt: '2026-07-10T04:00:00.000Z',
        confirmedAt: '2026-07-10T04:05:00.000Z',
        sendError: '',
        memo: '데모 발송 이력',
        createdAt: '2026-07-10T03:00:00.000Z',
        updatedAt: '2026-07-10T04:05:00.000Z'
    };
}

export function createDemoChecklistRows(): readonly LeadContractChecklistStepInput[] {
    return LEAD_CONTRACT_CHECKLIST_DEFINITIONS.slice(0, 5).map((definition, index) => ({
        stepKey: definition.stepKey,
        completed: index < 3,
        completedAt: index < 3 ? '2026-07-20T03:00:00.000Z' : '',
        completedBy: index < 3 ? DEMO_DETAIL_USER_ID : '',
        memo: index < 3 ? '데모 확인 완료' : '',
        applicability: definition.defaultApplicability,
        updatedAt: '2026-07-20T03:00:00.000Z'
    }));
}

export function createDemoLeadDocument(
    leadId: string,
    title = '가맹계약서 서명본',
    checklistStepKey: string | undefined = LEAD_CONTRACT_CHECKLIST_DEFINITIONS[0]?.stepKey
): FranchiseLeadDocument {
    return {
        id: `demo-document-${leadId}-${title}`,
        companyId: DEMO_DETAIL_COMPANY_ID,
        leadId,
        sourceType: 'upload',
        sourceId: '',
        title,
        documentStatus: 'stored',
        fileUrl: 'data:application/pdf;base64,JVBERi0xLjQK',
        fileName: `${title}.pdf`,
        memo: '데모 문서함 샘플',
        status: 'active',
        createdBy: DEMO_DETAIL_USER_ID,
        createdByName: '김담당',
        createdAt: '2026-07-20T03:00:00.000Z',
        updatedAt: '2026-07-20T03:00:00.000Z',
        checklistStepKeys: checklistStepKey ? [checklistStepKey] : []
    };
}

export function createDemoStore(leadId: string): FranchiseLocation {
    const fixture = findStoreFixture(leadId);
    const fallback = {
        id: `demo-store-${leadId}`,
        name: '미카도 데모점',
        brand: '미카도',
        region: '서울 강남구',
        address: '서울 강남구 테헤란로 123'
    };
    const store = fixture || fallback;
    return {
        ...store,
        companyId: DEMO_DETAIL_COMPANY_ID,
        contractLeadId: leadId,
        status: '오픈준비',
        locationType: '가맹점',
        latitude: 37.5,
        longitude: 127.03,
        openedAt: null,
        memo: '계약 완료 후 오픈 준비 전환'
    };
}

export function createDemoOpeningProject(
    leadId: string,
    locationId: string
): FranchiseOpeningProject {
    const tasks = buildDefaultOpeningProjectTasks().map((task, index) => ({
        ...task,
        status: index < 2 ? '완료' as const : index === 2 ? '진행중' as const : task.status,
        owner: index < 3 ? '김담당' : task.owner,
        dueDate: index === 2 ? '2026-08-03' : task.dueDate
    }));
    return {
        id: `demo-opening-${leadId}`,
        companyId: DEMO_DETAIL_COMPANY_ID,
        locationId,
        managerId: DEMO_DETAIL_USER_ID,
        status: '진행중',
        targetOpenDate: '2026-09-15',
        memo: '집기 발주와 점주 교육 일정을 확인합니다.',
        tasks,
        summary: summarizeOpeningProjectTasks(tasks, new Date(DEMO_DETAIL_NOW))
    };
}
