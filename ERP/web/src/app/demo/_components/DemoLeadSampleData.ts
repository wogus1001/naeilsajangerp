import type { FranchiseLead } from '@/components/franchise/leads/types';
import type { FranchiseLeadStatus } from '@/lib/franchise-leads';

export const DEMO_LEAD_MANAGERS = [
    { id: 'manager-kim', label: '김담당' },
    { id: 'manager-lee', label: '이팀장' },
    { id: 'partner-kim', label: '협력업체-김재현' }
] as const;

export const DEMO_SAMPLE_LEADS: readonly FranchiseLead[] = [
    createLead('demo-raw-1', '김민준', 'raw_intake', '상담중', 'HOT', '서울 강남구', 12000, 18000, '미카도', 'Meta Lead Ads', 'manager-kim', '2026-06-19T07:00:00.000Z'),
    createLead('demo-raw-2', '박서연', 'raw_intake', '문의접수', 'WARM', '서울 송파구', 9000, 13000, '샘플카페', '랜딩페이지', 'manager-kim', '2026-06-20T01:30:00.000Z'),
    createLead('demo-candidate-1', '이도윤', 'candidate', '입지검토', 'HOT', '서울 마포구', 10000, 16000, '미카도', '박람회', 'manager-lee', '2026-06-19T03:30:00.000Z', 'confirmed'),
    createLead('demo-candidate-2', '최하늘', 'candidate', '계약완료', 'WARM', '경기 성남시', 15000, 22000, '미카도', '소개', 'manager-kim', null, 'eligible')
];

function createLead(
    id: string,
    name: string,
    layer: 'raw_intake' | 'candidate',
    status: FranchiseLeadStatus,
    grade: string,
    desiredRegion: string,
    budgetMin: number,
    budgetMax: number,
    interestedBrand: string,
    source: string,
    managerId: string,
    nextContactAt: string | null,
    disclosureState: 'none' | 'confirmed' | 'eligible' = 'none'
): FranchiseLead {
    return {
        id,
        companyId: 'demo-company',
        managerId,
        name,
        mobile: `010-${id.endsWith('1') ? '1000' : '2000'}-${id.endsWith('1') ? '1000' : '2000'}`,
        source,
        status,
        grade,
        leadStage: layer,
        desiredRegion,
        budgetMin: budgetMin * 10000,
        budgetMax: budgetMax * 10000,
        interestedBrand,
        memo: `${desiredRegion} ${interestedBrand} 상담 샘플`,
        nextContactAt,
        lastContactedAt: null,
        nextAction: layer === 'raw_intake' ? '자료 발송' : '물건 제안',
        consultationResult: layer === 'raw_intake' ? '미상담' : '관심 높음',
        budgetFit: '적합',
        regionFit: '적합',
        brandFit: '보통',
        createdAt: '2026-06-18T02:00:00.000Z',
        updatedAt: '2026-06-19T02:00:00.000Z',
        locationLinks: layer === 'candidate' ? [{
            id: `${id}-link`,
            targetId: 'demo-location-1',
            targetType: 'franchise_location',
            status: '검토 예정',
            memo: '',
            createdAt: '2026-06-18T05:00:00.000Z'
        }] : [],
        disclosureSummary: buildDisclosure(disclosureState)
    };
}

function buildDisclosure(state: 'none' | 'confirmed' | 'eligible') {
    if (state === 'none') return undefined;
    return {
        state,
        label: state === 'eligible' ? '계약 가능' : '수신 확인 · D-10',
        latestDeliveryId: 'demo-delivery',
        latestSentAt: '2026-06-09T03:00:00.000Z',
        latestDocumentTitle: '미카도 정보공개서',
        latestDocumentVersion: '2026',
        latestSendStatus: 'sent',
        recipientEmail: 'sample@example.com',
        openedAt: state === 'confirmed' ? '2026-06-09T06:00:00.000Z' : null,
        confirmedAt: state === 'confirmed' ? '2026-06-09T06:03:00.000Z' : null,
        contractEligibleAt: state === 'eligible' ? '2026-06-18T03:00:00.000Z' : '2026-06-23T03:00:00.000Z',
        remainingDays: state === 'eligible' ? 0 : 10,
        waitDays: 14
    } as const;
}
