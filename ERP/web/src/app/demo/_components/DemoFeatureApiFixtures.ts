import { DEFAULT_LABOR_SETTINGS, calculateLaborPlan } from '@/lib/franchise-labor-planning';
import type { SupervisionPayload } from '@/components/franchise/operations/supervisionTypes';
import type { RealtyListingRecord } from '@/components/franchise/realty-import/types';

const DEMO_COMPANY_ID = 'demo-company';
const DEMO_MANAGER_ID = 'demo-manager';
const DEMO_NOW = '2026-08-04T09:00:00.000Z';

const jsonResponse = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
});

const demoScheduleSeeds = [
    {
        id: 'demo-schedule-open',
        title: '강남점 오픈 준비 점검',
        date: '2026-08-04',
        dueAt: '2026-08-04T10:30:00+09:00',
        status: '진행중',
        sourceType: 'opening-project',
        visibility: 'shared',
        assigneeProfileId: DEMO_MANAGER_ID,
        assigneeName: '김담당',
        managerName: '김담당',
        details: '간판, 집기, 초도 물류 도착 여부를 확인합니다.'
    },
    {
        id: 'demo-schedule-location',
        title: '마포 후보지 현장 방문',
        date: '2026-08-05',
        dueAt: '2026-08-05T14:00:00+09:00',
        status: '예정',
        sourceType: 'franchise-location',
        visibility: 'shared',
        assigneeProfileId: 'demo-team-lead',
        assigneeName: '이팀장',
        managerName: '이팀장',
        details: '유동 인구와 전면 노출을 다시 확인합니다.'
    },
    {
        id: 'demo-schedule-disclosure',
        title: '송파점 정보공개서 확인',
        date: '2026-08-07',
        dueAt: '2026-08-07T16:30:00+09:00',
        status: '예정',
        sourceType: 'franchise-lead',
        visibility: 'personal',
        assigneeProfileId: DEMO_MANAGER_ID,
        assigneeName: '김담당',
        managerName: '김담당',
        details: '수신 여부와 14일 경과 일정을 확인합니다.'
    }
] as const;
let demoSchedules: Array<Record<string, unknown>> = demoScheduleSeeds.map(item => ({ ...item }));
let demoLaborPlans: Array<Record<string, unknown>> = [];

const demoSupervision: SupervisionPayload = {
    schemaReady: true,
    canManage: true,
    companyId: DEMO_COMPANY_ID,
    locations: [
        { id: 'demo-operation-gangnam', name: '미카도 강남역점', brand: '미카도', region: '서울 강남구', address: '서울 강남구 테헤란로 132' },
        { id: 'demo-operation-seongsu', name: '미카도 성수점', brand: '미카도', region: '서울 성동구', address: '서울 성동구 왕십리로 92' },
        { id: 'demo-operation-songpa', name: '샘플카페 송파점', brand: '샘플카페', region: '서울 송파구', address: '서울 송파구 올림픽로 107' }
    ],
    supervisors: [
        { id: DEMO_MANAGER_ID, name: '김담당', loginId: 'demo-manager', email: 'demo-manager@example.com', role: 'manager' },
        { id: 'demo-team-lead', name: '이팀장', loginId: 'demo-team-lead', email: 'demo-team-lead@example.com', role: 'sub_manager' }
    ],
    assignments: [
        {
            id: 'demo-assignment-gangnam',
            companyId: DEMO_COMPANY_ID,
            locationId: 'demo-operation-gangnam',
            locationName: '미카도 강남역점',
            supervisorProfileId: DEMO_MANAGER_ID,
            supervisorName: '김담당',
            regionScope: '서울 강남권',
            memo: '주 1회 정기 점검',
            active: true,
            assignedAt: '2026-07-01',
            endedAt: null
        },
        {
            id: 'demo-assignment-seongsu',
            companyId: DEMO_COMPANY_ID,
            locationId: 'demo-operation-seongsu',
            locationName: '미카도 성수점',
            supervisorProfileId: 'demo-team-lead',
            supervisorName: '이팀장',
            regionScope: '서울 동부권',
            memo: '서비스 품질 집중 확인',
            active: true,
            assignedAt: '2026-07-01',
            endedAt: null
        }
    ],
    visits: [
        {
            id: 'demo-visit-gangnam',
            companyId: DEMO_COMPANY_ID,
            locationId: 'demo-operation-gangnam',
            locationName: '미카도 강남역점',
            supervisorProfileId: DEMO_MANAGER_ID,
            supervisorName: '김담당',
            assignmentId: 'demo-assignment-gangnam',
            scheduleId: 'demo-schedule-supervision',
            visitDate: '2026-08-04',
            purpose: '정기점검',
            status: '보고서대기',
            memo: '점심 피크 운영 동선 확인'
        },
        {
            id: 'demo-visit-songpa',
            companyId: DEMO_COMPANY_ID,
            locationId: 'demo-operation-songpa',
            locationName: '샘플카페 송파점',
            supervisorProfileId: 'demo-team-lead',
            supervisorName: '이팀장',
            assignmentId: null,
            scheduleId: null,
            visitDate: '2026-08-05',
            purpose: '오픈후점검',
            status: '예정',
            memo: '오픈 체크리스트 확인'
        }
    ],
    reports: [],
    reportTemplates: [],
    reportEvents: [],
    correctiveActions: [
        {
            id: 'demo-action-clean',
            companyId: DEMO_COMPANY_ID,
            reportId: null,
            locationId: 'demo-operation-seongsu',
            locationName: '미카도 성수점',
            assigneeProfileId: 'demo-team-lead',
            assigneeName: '이팀장',
            status: '진행중',
            title: '창고 정리 상태 개선',
            memo: '다음 방문 때 사진으로 확인합니다.',
            dueDate: '2026-08-08',
            completedAt: null
        }
    ],
    correctiveActionEvents: [],
    operationQueue: [
        {
            id: 'demo-queue-report',
            type: 'reportMissing',
            severity: '긴급',
            title: '점검 보고서 미제출',
            description: '미카도 강남역점 방문 후 보고서 제출이 필요합니다.',
            dueDate: '2026-08-04',
            locationId: 'demo-operation-gangnam',
            locationName: '미카도 강남역점',
            ownerName: '김담당',
            sourceId: 'demo-visit-gangnam',
            target: 'reports'
        }
    ],
    summary: {
        todayVisitCount: 1,
        weekVisitCount: 2,
        missingReportCount: 1,
        pendingApprovalCount: 0,
        activeCorrectiveActionCount: 1
    }
};

const demoOwnerAccounts = [
    {
        id: 'demo-owner-account',
        locationId: 'demo-operation-gangnam',
        loginId: 'gangnam-owner',
        ownerName: '박점주',
        ownerPhone: '010-4101-2001',
        status: 'active',
        temporaryPassword: false
    }
] as const;

const demoOwnerNotices = [
    {
        id: 'demo-owner-notice',
        location_id: null,
        title: '8월 운영 정책 및 신메뉴 안내',
        body: '신메뉴 적용일과 매장 안내물 교체 일정을 확인해주세요.',
        status: 'published',
        created_at: DEMO_NOW,
        attachments: [],
        targetCount: 4,
        readCount: 3,
        unreadCount: 1,
        recipients: []
    }
] as const;

const demoOwnerChecklists = [
    {
        locationId: 'demo-operation-songpa',
        locationName: '샘플카페 송파점',
        address: '서울 송파구 올림픽로 107',
        status: '오픈준비',
        tasks: [
            { id: 'signage', title: '간판 설치 확인', memo: '외부 조명 포함', completed: true },
            { id: 'logistics', title: '초도 물류 입고 확인', memo: '냉장·냉동 분리', completed: false }
        ],
        issues: []
    }
] as const;

const demoOwnerSubmissions = [
    {
        id: 'demo-owner-submission',
        location_id: 'demo-operation-gangnam',
        submission_type: 'facility_request',
        title: '주방 냉장고 점검 요청',
        body: '온도가 일정하지 않아 확인을 요청드립니다.',
        payload: { title: '주방 냉장고 점검 요청' },
        status: 'submitted',
        review_note: null,
        reviewed_at: null,
        submitted_at: DEMO_NOW,
        created_at: DEMO_NOW,
        files: []
    }
] as const;

const demoVendorSeeds = [
    {
        id: 'demo-vendor-interior',
        companyId: DEMO_COMPANY_ID,
        category: 'interior',
        categoryLabel: '인테리어/시공',
        vendorName: '샘플인테리어',
        contactName: '김현장',
        contactPhone: '010-4101-3001',
        contactEmail: 'interior@example.com',
        businessNumber: '123-45-67890',
        status: 'active',
        statusLabel: '거래중',
        memo: '수도권 시공 협력업체',
        createdBy: DEMO_MANAGER_ID,
        updatedBy: DEMO_MANAGER_ID,
        createdAt: '2026-01-10',
        updatedAt: '2026-08-01'
    },
    {
        id: 'demo-vendor-logistics',
        companyId: DEMO_COMPANY_ID,
        category: 'logistics',
        categoryLabel: '물류',
        vendorName: '빠른물류',
        contactName: '이배송',
        contactPhone: '010-4101-3002',
        contactEmail: 'logistics@example.com',
        businessNumber: '234-56-78901',
        status: 'active',
        statusLabel: '거래중',
        memo: '초도물류 및 정기 배송',
        createdBy: DEMO_MANAGER_ID,
        updatedBy: DEMO_MANAGER_ID,
        createdAt: '2026-02-01',
        updatedAt: '2026-08-02'
    }
] as const;
let demoVendors: Array<Record<string, unknown>> = demoVendorSeeds.map(item => ({ ...item }));

const demoVendorContractSeeds = [
    {
        id: 'demo-vendor-contract-interior',
        companyId: DEMO_COMPANY_ID,
        vendorId: 'demo-vendor-interior',
        ownerProfileId: DEMO_MANAGER_ID,
        createdBy: DEMO_MANAGER_ID,
        category: 'interior',
        categoryLabel: '인테리어/시공',
        vendorName: '샘플인테리어',
        contractTitle: '2026 인테리어 단가 계약',
        contractStartDate: '2026-01-01',
        contractEndDate: '2027-03-31',
        status: 'active',
        statusLabel: '진행중',
        remainingDays: 239,
        ddayLabel: 'D-239',
        documentSource: 'manual',
        electronicContractId: '',
        storageBucket: '',
        storagePath: '',
        fileName: '',
        memo: '신규점 시공 단가 기준',
        createdAt: '2026-01-10',
        updatedAt: '2026-08-01'
    },
    {
        id: 'demo-vendor-contract-logistics',
        companyId: DEMO_COMPANY_ID,
        vendorId: 'demo-vendor-logistics',
        ownerProfileId: 'demo-team-lead',
        createdBy: DEMO_MANAGER_ID,
        category: 'logistics',
        categoryLabel: '물류',
        vendorName: '빠른물류',
        contractTitle: '하반기 초도물류 계약',
        contractStartDate: '2026-07-01',
        contractEndDate: '2026-08-28',
        status: 'renewal_due',
        statusLabel: '만료예정',
        remainingDays: 24,
        ddayLabel: 'D-24',
        documentSource: 'electronic_contract',
        electronicContractId: 'demo-electronic-vendor',
        storageBucket: '',
        storagePath: '',
        fileName: '',
        memo: '갱신 조건 검토 필요',
        createdAt: '2026-07-01',
        updatedAt: '2026-08-03'
    }
] as const;
let demoVendorContracts: Array<Record<string, unknown>> = demoVendorContractSeeds.map(item => ({ ...item }));

const demoElectronicContracts = [
    {
        id: 'demo-electronic-franchise',
        leadId: 'demo-lead-moon',
        name: '가맹계약 · 송파점',
        status: 'sent',
        ucansignDocumentId: 'demo-doc-1',
        templateSource: 'company_uploaded',
        companyTemplateId: 'demo-template-franchise',
        companyTemplateVersionId: 'demo-template-version-1',
        licenseNumber: '',
        sentAt: '2026-08-03T02:00:00.000Z',
        createdAt: '2026-08-02T02:00:00.000Z',
        businessName: '샘플카페 송파점',
        transferorName: '',
        transfereeName: '문태오',
        companyName: '데모',
        sentByProfileId: DEMO_MANAGER_ID
    },
    {
        id: 'demo-electronic-complete',
        leadId: 'demo-lead-park',
        name: '가맹계약 · 강남점',
        status: 'completed',
        ucansignDocumentId: 'demo-doc-2',
        templateSource: 'company_uploaded',
        companyTemplateId: 'demo-template-franchise',
        companyTemplateVersionId: 'demo-template-version-1',
        licenseNumber: '',
        sentAt: '2026-07-25T02:00:00.000Z',
        createdAt: '2026-07-23T02:00:00.000Z',
        businessName: '미카도 강남역점',
        transferorName: '',
        transfereeName: '박서연',
        companyName: '데모',
        sentByProfileId: DEMO_MANAGER_ID
    }
] as const;

const demoRealtyListingSeeds: readonly RealtyListingRecord[] = [
    {
        id: 'demo-realty-gangnam-1',
        propertyId: null,
        source: 'daangn',
        sourceListingId: 'sample-gangnam-1',
        sourceUrl: '#',
        title: '강남역 대로변 1층 상가',
        address: '서울 강남구 테헤란로 118',
        region: '서울 강남구',
        latitude: 37.4986,
        longitude: 127.0275,
        tradeType: '월세',
        propertyType: '상가',
        depositAmount: 80000000,
        monthlyRent: 5500000,
        salePrice: null,
        maintenanceFee: 450000,
        areaSqm: 91.2,
        areaPyeong: '27.6',
        floorInfo: '1층',
        status: 'active',
        collectedAt: DEMO_NOW,
        createdAt: DEMO_NOW,
        updatedAt: DEMO_NOW,
        data: { favorite: true }
    },
    {
        id: 'demo-realty-gangnam-2',
        propertyId: null,
        source: 'daangn',
        sourceListingId: 'sample-gangnam-2',
        sourceUrl: '#',
        title: '역삼 오피스 상권 코너 상가',
        address: '서울 강남구 논현로 412',
        region: '서울 강남구',
        latitude: 37.4958,
        longitude: 127.0381,
        tradeType: '월세',
        propertyType: '상가',
        depositAmount: 60000000,
        monthlyRent: 4200000,
        salePrice: null,
        maintenanceFee: 300000,
        areaSqm: 74.1,
        areaPyeong: '22.4',
        floorInfo: '1층',
        status: 'active',
        collectedAt: DEMO_NOW,
        createdAt: DEMO_NOW,
        updatedAt: DEMO_NOW,
        data: { favorite: false }
    },
    {
        id: 'demo-realty-songpa-1',
        propertyId: null,
        source: 'daangn',
        sourceListingId: 'sample-songpa-1',
        sourceUrl: '#',
        title: '송파 대단지 배후 상가',
        address: '서울 송파구 올림픽로 102',
        region: '서울 송파구',
        latitude: 37.5142,
        longitude: 127.1039,
        tradeType: '월세',
        propertyType: '상가',
        depositAmount: 50000000,
        monthlyRent: 3900000,
        salePrice: null,
        maintenanceFee: 250000,
        areaSqm: 82.6,
        areaPyeong: '25.0',
        floorInfo: '1층',
        status: 'active',
        collectedAt: DEMO_NOW,
        createdAt: DEMO_NOW,
        updatedAt: DEMO_NOW,
        data: { favorite: false }
    }
];
let demoRealtyListings: RealtyListingRecord[] = demoRealtyListingSeeds.map(item => ({ ...item, data: { ...item.data } }));

function isWrite(method: string): boolean {
    return method !== 'GET' && method !== 'HEAD';
}

function readBody(init?: RequestInit): Record<string, unknown> {
    if (typeof init?.body !== 'string') return {};
    try {
        const value: unknown = JSON.parse(init.body);
        return typeof value === 'object' && value !== null && !Array.isArray(value)
            ? value as Record<string, unknown>
            : {};
    } catch {
        return {};
    }
}

function text(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function vendorCategoryLabel(value: unknown): string {
    return ({
        interior: '인테리어/시공',
        logistics: '물류',
        equipment: '설비',
        marketing: '마케팅',
        other: '기타'
    } as Record<string, string>)[text(value)] || '기타';
}

function vendorStatusLabel(value: unknown): string {
    return text(value) === 'inactive' ? '거래중지' : '거래중';
}

function contractStatusLabel(value: unknown): string {
    return ({
        draft: '작성중',
        review: '검토중',
        active: '진행중',
        renewal_due: '만료예정',
        expired: '만료',
        terminated: '종료'
    } as Record<string, string>)[text(value)] || '작성중';
}

export function resetDemoFeatureApiFixtures(): void {
    demoSchedules = demoScheduleSeeds.map(item => ({ ...item }));
    demoLaborPlans = [];
    demoVendors = demoVendorSeeds.map(item => ({ ...item }));
    demoVendorContracts = demoVendorContractSeeds.map(item => ({ ...item }));
    demoRealtyListings = demoRealtyListingSeeds.map(item => ({ ...item, data: { ...item.data } }));
}

export function getDemoFeatureApiResponse(requestUrl: URL, method: string, init?: RequestInit): Response | null {
    const path = requestUrl.pathname;

    if (path === '/api/franchise-labor/settings') {
        return jsonResponse({ data: { companyId: DEMO_COMPANY_ID, schemaReady: true, settings: DEFAULT_LABOR_SETTINGS } });
    }
    if (path === '/api/franchise-labor/plans') {
        if (method === 'DELETE') {
            const id = requestUrl.searchParams.get('id') || '';
            demoLaborPlans = demoLaborPlans.filter(plan => plan.id !== id);
            return jsonResponse({ data: { id } });
        }
        if (isWrite(method)) {
            const body = readBody(init);
            const id = text(body.id) || `demo-labor-plan-${demoLaborPlans.length + 1}`;
            const result = calculateLaborPlan(body as Parameters<typeof calculateLaborPlan>[0]);
            const plan = {
                ...body,
                id,
                companyId: text(body.companyId) || DEMO_COMPANY_ID,
                locationId: text(body.locationId),
                title: text(body.title) || '데모 인력 계획',
                summary: result,
                status: 'active',
                createdAt: DEMO_NOW
            };
            const currentIndex = demoLaborPlans.findIndex(item => item.id === id);
            if (currentIndex >= 0) demoLaborPlans[currentIndex] = plan;
            else demoLaborPlans = [plan, ...demoLaborPlans];
            return jsonResponse({ data: { id } });
        }
        return jsonResponse({ data: { companyId: DEMO_COMPANY_ID, schemaReady: true, plans: demoLaborPlans } });
    }
    if (path === '/api/franchise-labor/calculate') {
        const body = typeof init?.body === 'string' ? JSON.parse(init.body) as Parameters<typeof calculateLaborPlan>[0] : null;
        return jsonResponse({ data: { result: body ? calculateLaborPlan(body) : null } });
    }

    if (path === '/api/franchise-schedules') {
        if (requestUrl.searchParams.get('view') === 'assignees') {
            return jsonResponse({
                data: {
                    requesterProfileId: DEMO_MANAGER_ID,
                    assignees: [
                        { id: DEMO_MANAGER_ID, name: '김담당' },
                        { id: 'demo-team-lead', name: '이팀장' }
                    ]
                }
            });
        }
        if (method === 'DELETE') {
            const id = requestUrl.searchParams.get('id') || '';
            demoSchedules = demoSchedules.filter(item => item.id !== id);
            return jsonResponse({ data: { id } });
        }
        if (isWrite(method)) {
            const body = readBody(init);
            const id = text(body.id) || `demo-schedule-${demoSchedules.length + 1}`;
            const current = demoSchedules.find(item => item.id === id) || {};
            const completed = requestUrl.searchParams.get('action') === 'complete';
            const assigneeProfileId = text(body.assigneeProfileId) || text(current.assigneeProfileId) || DEMO_MANAGER_ID;
            const item: Record<string, unknown> = {
                ...current,
                ...body,
                id,
                title: text(body.title) || text(current.title) || '데모 일정',
                date: text(body.date) || text(current.date) || '2026-08-04',
                dueAt: text(body.dueAt) || text(current.dueAt) || `${text(body.date) || '2026-08-04'}T09:00:00+09:00`,
                status: completed ? '완료' : text(body.status) || text(current.status) || '예정',
                sourceType: text(current.sourceType) || 'manual',
                visibility: text(body.visibility) || text(current.visibility) || 'shared',
                assigneeProfileId,
                assigneeName: assigneeProfileId === 'demo-team-lead' ? '이팀장' : '김담당',
                managerName: assigneeProfileId === 'demo-team-lead' ? '이팀장' : '김담당',
                details: text(body.details) || text(current.details)
            };
            const currentIndex = demoSchedules.findIndex(schedule => schedule.id === id);
            if (currentIndex >= 0) demoSchedules[currentIndex] = item;
            else demoSchedules = [item, ...demoSchedules];
            return jsonResponse({ data: { id } });
        }
        return jsonResponse({ data: demoSchedules });
    }

    if (path === '/api/franchise-supervision') {
        return jsonResponse({ data: demoSupervision });
    }
    if (path.startsWith('/api/franchise-supervision/')) {
        return jsonResponse({ data: { ok: true, id: 'demo-supervision-record' } });
    }

    if (path === '/api/franchise-owner-portal/accounts') {
        return jsonResponse({ data: isWrite(method)
            ? { account: demoOwnerAccounts[0], temporaryPassword: 'DEMO-1234' }
            : { accounts: demoOwnerAccounts } });
    }
    if (path === '/api/franchise-owner-portal/notices') {
        return jsonResponse({ data: isWrite(method) ? { notice: demoOwnerNotices[0] } : { notices: demoOwnerNotices } });
    }
    if (path === '/api/franchise-owner-portal/checklists') {
        return jsonResponse({ data: { checklists: demoOwnerChecklists } });
    }
    if (path === '/api/franchise-owner-portal/submissions') {
        return jsonResponse({
            data: {
                activitySummary: { averageResolutionHours: 5.5, completedLast7Days: 3, overdueCount: 0, pendingCount: 1 },
                pagination: { page: 1, totalPages: 1 },
                submissions: demoOwnerSubmissions
            }
        });
    }
    if (path === '/api/franchise-owner-portal/reminders') {
        return jsonResponse({ data: { reminders: [], stats: { acknowledged: 2, unacknowledged: 1, ownerCount: 3 } } });
    }
    if (path === '/api/franchise-owner-portal/content') {
        return jsonResponse({ data: { items: [] } });
    }
    if (path === '/api/franchise-owner-portal/settlements') {
        return jsonResponse({ data: { requests: [], submissions: [], scheduleSyncRequired: false } });
    }
    if (path.startsWith('/api/franchise-owner-portal/')) {
        return jsonResponse({ data: { ok: true, url: '', contentVersion: 1 } });
    }

    if (path === '/api/electronic-contracts') {
        return jsonResponse({ data: { contracts: demoElectronicContracts } });
    }
    if (path === '/api/electronic-contract-templates') {
        return jsonResponse({ data: { templates: [], schemaReady: true } });
    }

    if (path === '/api/franchise-vendors') {
        if (isWrite(method)) {
            const body = readBody(init);
            const id = text(body.id) || `demo-vendor-${demoVendors.length + 1}`;
            const current = demoVendors.find(item => item.id === id) || {};
            const vendor = {
                ...current,
                ...body,
                id,
                companyId: text(body.companyId) || text(current.companyId) || DEMO_COMPANY_ID,
                category: text(body.category) || text(current.category) || 'other',
                categoryLabel: vendorCategoryLabel(body.category || current.category),
                vendorName: text(body.vendorName) || text(current.vendorName) || '새 협력업체',
                status: text(body.status) || text(current.status) || 'active',
                statusLabel: vendorStatusLabel(body.status || current.status),
                createdBy: text(current.createdBy) || DEMO_MANAGER_ID,
                updatedBy: DEMO_MANAGER_ID,
                createdAt: text(current.createdAt) || DEMO_NOW,
                updatedAt: DEMO_NOW
            };
            const currentIndex = demoVendors.findIndex(item => item.id === id);
            if (currentIndex >= 0) demoVendors[currentIndex] = vendor;
            else demoVendors = [vendor, ...demoVendors];
            return jsonResponse({ data: { vendor } });
        }
        return jsonResponse({ data: { schemaReady: true, vendors: demoVendors } });
    }
    if (path === '/api/franchise-vendor-contracts') {
        if (method === 'DELETE') {
            const id = requestUrl.searchParams.get('id') || '';
            demoVendorContracts = demoVendorContracts.filter(contract => contract.id !== id);
            return jsonResponse({ data: { id } });
        }
        if (isWrite(method)) {
            const body = readBody(init);
            const id = text(body.id) || `demo-vendor-contract-${demoVendorContracts.length + 1}`;
            const current = demoVendorContracts.find(item => item.id === id) || {};
            const status = text(body.status) || text(current.status) || 'draft';
            const contract = {
                ...current,
                ...body,
                id,
                companyId: text(body.companyId) || text(current.companyId) || DEMO_COMPANY_ID,
                category: text(body.category) || text(current.category) || 'other',
                categoryLabel: vendorCategoryLabel(body.category || current.category),
                vendorName: text(body.vendorName) || text(current.vendorName) || '새 협력업체',
                contractTitle: text(body.contractTitle) || text(current.contractTitle) || '새 업체 계약',
                status,
                statusLabel: contractStatusLabel(status),
                remainingDays: typeof current.remainingDays === 'number' ? current.remainingDays : 0,
                ddayLabel: text(current.ddayLabel) || '일정 확인',
                createdBy: text(current.createdBy) || DEMO_MANAGER_ID,
                createdAt: text(current.createdAt) || DEMO_NOW,
                updatedAt: DEMO_NOW
            };
            const currentIndex = demoVendorContracts.findIndex(item => item.id === id);
            if (currentIndex >= 0) demoVendorContracts[currentIndex] = contract;
            else demoVendorContracts = [contract, ...demoVendorContracts];
            return jsonResponse({ data: { contract } });
        }
        return jsonResponse({ data: { schemaReady: true, contracts: demoVendorContracts } });
    }
    if (path === '/api/franchise-vendor-contracts/actions') {
        if (requestUrl.searchParams.has('contractId')) return jsonResponse({ data: { events: [] } });
        const body = readBody(init);
        const contractId = text(body.contractId);
        const action = text(body.action);
        const currentIndex = demoVendorContracts.findIndex(contract => contract.id === contractId);
        if (currentIndex >= 0 && (action === 'renew' || action === 'terminate')) {
            const current = demoVendorContracts[currentIndex] || {};
            const status = action === 'terminate' ? 'terminated' : 'active';
            demoVendorContracts[currentIndex] = {
                ...current,
                status,
                statusLabel: contractStatusLabel(status),
                contractEndDate: text(body.contractEndDate) || current.contractEndDate,
                updatedAt: DEMO_NOW
            };
        }
        return jsonResponse({ data: { contract: demoVendorContracts[currentIndex] || demoVendorContracts[0] } });
    }
    if (path === '/api/realty/listings') {
        if (method === 'PATCH') {
            const body = readBody(init);
            const listingId = text(body.listingId);
            const nextFavorite = body.favorite === true;
            demoRealtyListings = demoRealtyListings.map(listing => (
                listing.id === listingId
                    ? { ...listing, data: { ...listing.data, favorite: nextFavorite }, updatedAt: DEMO_NOW }
                    : listing
            ));
            return jsonResponse({ data: { listing: demoRealtyListings.find(listing => listing.id === listingId) } });
        }
        return jsonResponse({ data: { listings: demoRealtyListings } });
    }
    if (path === '/api/realty/import-jobs') {
        const body = readBody(init);
        const region = text(body.region) || '서울 강남구';
        const listings = demoRealtyListings
            .filter(listing => listing.region === region)
            .map(listing => ({ action: 'collected' as const, propertyId: listing.propertyId || undefined, listing }));
        return jsonResponse({
            data: {
                job: {
                    id: 'demo-realty-import-job',
                    status: 'completed',
                    source: 'daangn',
                    region,
                    totalCount: listings.length,
                    createdCount: listings.length,
                    updatedCount: 0,
                    duplicateCount: 0,
                    failedCount: 0,
                    warnings: [],
                    errors: []
                },
                listings
            }
        });
    }
    if (path === '/api/realty/listings/promote') {
        const body = readBody(init);
        const listingId = text(body.listingId);
        const propertyId = `demo-property-${listingId || 'external'}`;
        demoRealtyListings = demoRealtyListings.map(listing => (
            listing.id === listingId ? { ...listing, propertyId, updatedAt: DEMO_NOW } : listing
        ));
        return jsonResponse({ data: { action: 'created', propertyId } });
    }
    if (path === '/api/users') {
        return jsonResponse([
            { uuid: DEMO_MANAGER_ID, name: '김담당', role: 'manager' },
            { uuid: 'demo-team-lead', name: '이팀장', role: 'sub_manager' }
        ]);
    }

    return null;
}
