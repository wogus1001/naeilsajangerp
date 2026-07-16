import { getRequesterProfile, isAdmin, resolveCompanyIdByName, type RequesterProfile } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import {
    LEAD_REGISTRATION_INITIAL_FORM,
    type LeadRegistrationForm
} from '@/lib/franchise-lead-registration';
import { isMissingLeadRegistrationRequestTableError } from '@/lib/franchise-lead-registration-table';
import { FRANCHISE_MATCHING_REQUEST_SOURCE, normalizeLeadStatus } from '@/lib/franchise-leads';
import { isPartnerVendorRole } from '@/lib/franchise-location-access';
import { formatManagerDisplayName } from '@/lib/franchise-manager-display';
import {
    MATCHING_REQUEST_INITIAL_FORM,
    type MatchingRequestForm
} from '@/lib/franchise-matching-request';
import {
    PROPERTY_REGISTRATION_INITIAL_FORM,
    type PropertyRegistrationForm
} from '@/lib/franchise-property-registration';
import {
    normalizeFranchiseFileAttachments,
    normalizeFranchiseFileNames
} from '@/lib/franchise-file-attachments';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { canDeleteWorkIntakeRecord, canEditWorkIntakeRecord } from '@/lib/work-intake-access';
import { fetchAllWorkIntakeRows } from '@/lib/work-intake-batch';
import {
    paginateWorkIntakeItems,
    parseWorkIntakeQuery,
    type WorkIntakePageMeta
} from '@/lib/work-intake-query';

export const dynamic = 'force-dynamic';

type CompanyRow = {
    readonly id: string;
    readonly name: string | null;
};

type ProfileRow = {
    readonly id: string;
    readonly company_id: string | null;
    readonly name: string | null;
    readonly email: string | null;
    readonly role: string | null;
};

type PropertyRow = {
    readonly id: string;
    readonly company_id: string | null;
    readonly manager_id: string | null;
    readonly name: string | null;
    readonly status: string | null;
    readonly address: string | null;
    readonly created_at: string | null;
    readonly data: Record<string, unknown> | null;
};

type LeadLikeRow = {
    readonly id: string;
    readonly company_id: string | null;
    readonly manager_id: string | null;
    readonly created_by?: string | null;
    readonly name: string | null;
    readonly mobile: string | null;
    readonly source: string | null;
    readonly status: string | null;
    readonly grade: string | null;
    readonly desired_region: string | null;
    readonly interested_brand: string | null;
    readonly budget_min: number | null;
    readonly budget_max: number | null;
    readonly memo: string | null;
    readonly next_contact_at?: string | null;
    readonly promoted_lead_id?: string | null;
    readonly promoted_at?: string | null;
    readonly created_at: string | null;
    readonly data: Record<string, unknown> | null;
};

type DeletedRecordRow = {
    readonly id: string;
    readonly company_id: string | null;
    readonly kind: string;
    readonly source_id: string;
    readonly deleted_by: string | null;
    readonly title: string | null;
    readonly summary: string | null;
    readonly snapshot: Record<string, unknown> | null;
    readonly deleted_at: string | null;
};

type WorkIntakeTab = 'properties' | 'leadRegistrations' | 'matchingRequests' | 'deletedRecords';

function readDataString(data: Record<string, unknown> | null, key: string): string {
    const value = data?.[key];
    return typeof value === 'string' ? value : '';
}

function readText(data: Record<string, unknown> | null, key: string): string {
    const value = data?.[key];
    if (value === null || value === undefined) return '';
    return String(value);
}

function readBoolean(data: Record<string, unknown> | null, key: string, fallback = false): boolean {
    const value = data?.[key];
    return typeof value === 'boolean' ? value : fallback;
}

function toManwonInput(value: number | null): string {
    if (value === null) return '';
    return String(Math.round(value / 10_000));
}

function toDatetimeInput(value: string | null | undefined): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const offsetMs = date.getTimezoneOffset() * 60_000;
    return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function displayName(profile: ProfileRow): string {
    return formatManagerDisplayName({
        id: profile.id,
        name: profile.name || profile.email || '이름 없음',
        role: profile.role
    });
}

export const WORK_INTAKE_PROPERTY_SELECT = 'id, company_id, manager_id, name, status, address, created_at, data';
export const WORK_INTAKE_DELETED_RECORD_SELECT = 'id, company_id, kind, source_id, deleted_by, title, summary, snapshot, deleted_at';

function isWorkIntakeTab(value: string | null): value is WorkIntakeTab {
    return value === 'properties'
        || value === 'leadRegistrations'
        || value === 'matchingRequests'
        || value === 'deletedRecords';
}

function emptyMeta(pageSize: number): WorkIntakePageMeta {
    return { page: 1, pageSize, total: 0, pageCount: 1 };
}

function isMissingDeletedRecordsTableError(error: { readonly code?: string; readonly message?: string }): boolean {
    const message = error.message || '';
    return error.code === 'PGRST205'
        || error.code === 'PGRST204'
        || message.includes('franchise_work_intake_deleted_records');
}

function kindLabel(kind: string): string {
    if (kind === 'properties') return '입점 요청';
    if (kind === 'leadRegistrations' || kind === 'matchingRequests') return '예비 창업자 등록';
    return '진행현황';
}

function toPropertyForm(row: PropertyRow): PropertyRegistrationForm {
    const data = row.data || {};
    const fileAttachments = normalizeFranchiseFileAttachments(data.fileAttachments);
    const fileNames = normalizeFranchiseFileNames(data.fileNames, fileAttachments);

    return {
        ...PROPERTY_REGISTRATION_INITIAL_FORM,
        desiredBrand: readText(data, 'desiredBrand'),
        desiredBusinessType: readText(data, 'desiredBusinessType'),
        desiredCategory: readText(data, 'desiredCategory'),
        matchPriority: readText(data, 'matchPriority') || PROPERTY_REGISTRATION_INITIAL_FORM.matchPriority,
        propertyName: readText(data, 'propertyName') || row.name || '',
        propertyAddress: readText(data, 'propertyAddress') || row.address || '',
        propertyRegion: readText(data, 'propertyRegion') || readText(data, 'region'),
        roadAddress: readText(data, 'roadAddress'),
        jibunAddress: readText(data, 'jibunAddress'),
        zoneNo: readText(data, 'zoneNo'),
        detailAddress: readText(data, 'detailAddress'),
        privateArea: readText(data, 'privateAreaInput') || readText(data, 'privateArea'),
        privateAreaUnit: readText(data, 'privateAreaUnit') || PROPERTY_REGISTRATION_INITIAL_FORM.privateAreaUnit,
        supplyArea: readText(data, 'supplyArea'),
        floor: readText(data, 'floor'),
        totalFloors: readText(data, 'totalFloors'),
        parkingAvailable: readText(data, 'parkingAvailable') || PROPERTY_REGISTRATION_INITIAL_FORM.parkingAvailable,
        currentStatus: row.status || readText(data, 'currentStatus') || PROPERTY_REGISTRATION_INITIAL_FORM.currentStatus,
        operatingStoreName: readText(data, 'operatingStoreName'),
        fileNames,
        fileAttachments,
        deposit: readText(data, 'deposit'),
        monthlyRent: readText(data, 'monthlyRent'),
        maintenanceFee: readText(data, 'maintenanceFee'),
        premium: readText(data, 'premium'),
        vatIncluded: readText(data, 'vatIncluded') || PROPERTY_REGISTRATION_INITIAL_FORM.vatIncluded,
        leaseAvailableDate: readText(data, 'leaseAvailableDate'),
        contractPeriod: readText(data, 'contractPeriod'),
        negotiable: readText(data, 'negotiable') || PROPERTY_REGISTRATION_INITIAL_FORM.negotiable,
        rentFreeAvailable: readText(data, 'rentFreeAvailable') || PROPERTY_REGISTRATION_INITIAL_FORM.rentFreeAvailable,
        rentFreePeriod: readText(data, 'rentFreePeriod'),
        interiorSupportAvailable: readText(data, 'interiorSupportAvailable') || PROPERTY_REGISTRATION_INITIAL_FORM.interiorSupportAvailable,
        simpleInstallSupportAvailable: readText(data, 'simpleInstallSupportAvailable') || PROPERTY_REGISTRATION_INITIAL_FORM.simpleInstallSupportAvailable,
        facilityWorkNegotiable: readText(data, 'facilityWorkNegotiable') || PROPERTY_REGISTRATION_INITIAL_FORM.facilityWorkNegotiable,
        landlordSupportMemo: readText(data, 'landlordSupportMemo'),
        consultationMemo: readText(data, 'consultationMemo'),
        riskMemo: readText(data, 'riskMemo'),
        nextAction: readText(data, 'nextAction') || PROPERTY_REGISTRATION_INITIAL_FORM.nextAction,
        nextContactAt: readText(data, 'nextContactAt')
    };
}

function toLeadRegistrationForm(row: LeadLikeRow): LeadRegistrationForm {
    const data = row.data || {};
    return {
        ...LEAD_REGISTRATION_INITIAL_FORM,
        name: row.name || '',
        mobile: row.mobile || '',
        source: readText(data, 'registrationSource') || row.source || '',
        status: normalizeLeadStatus(row.status),
        grade: row.grade || '',
        desiredRegion: row.desired_region || '',
        budgetMin: toManwonInput(row.budget_min),
        budgetMax: toManwonInput(row.budget_max),
        interestedBrand: row.interested_brand || '',
        managerId: row.manager_id || '',
        nextContactAt: toDatetimeInput(row.next_contact_at),
        memo: row.memo || ''
    };
}

function toMatchingRequestForm(row: LeadLikeRow): MatchingRequestForm {
    const data = row.data || {};
    const desiredBrand = readText(data, 'desiredBrand') || row.interested_brand || '';
    return {
        ...MATCHING_REQUEST_INITIAL_FORM,
        name: row.name || '',
        mobile: row.mobile || '',
        email: readText(data, 'email'),
        residence: readText(data, 'residence'),
        currentJob: readText(data, 'currentJob'),
        startupExperience: readText(data, 'startupExperience') || MATCHING_REQUEST_INITIAL_FORM.startupExperience,
        decisionMaker: readText(data, 'decisionMaker') || MATCHING_REQUEST_INITIAL_FORM.decisionMaker,
        startupTiming: readText(data, 'startupTiming'),
        desiredCategory: readText(data, 'desiredCategory'),
        desiredBrand,
        brandUnknown: readBoolean(data, 'brandUnknown', row.interested_brand === '브랜드 미정'),
        brandPreference: readText(data, 'brandPreference') || MATCHING_REQUEST_INITIAL_FORM.brandPreference,
        totalBudget: readText(data, 'totalBudget'),
        ownCapital: readText(data, 'ownCapital'),
        loanPreference: readText(data, 'loanPreference') || MATCHING_REQUEST_INITIAL_FORM.loanPreference,
        desiredDeposit: readText(data, 'desiredDeposit'),
        desiredRent: readText(data, 'desiredRent'),
        desiredPremium: readText(data, 'desiredPremium'),
        desiredSize: readText(data, 'desiredSize'),
        desiredFloor: readText(data, 'desiredFloor'),
        desiredRegion: row.desired_region || readText(data, 'desiredRegion'),
        excludedRegion: readText(data, 'excludedRegion'),
        ownedPropertyStatus: readText(data, 'ownedPropertyStatus'),
        ownedPropertyName: readText(data, 'ownedPropertyName'),
        ownedPropertyAddress: readText(data, 'ownedPropertyAddress'),
        ownedPropertyAddressDetail: readText(data, 'ownedPropertyAddressDetail'),
        ownedArea: readText(data, 'ownedArea'),
        ownedFloor: readText(data, 'ownedFloor'),
        ownedDeposit: readText(data, 'ownedDeposit'),
        ownedRent: readText(data, 'ownedRent'),
        ownedMaintenance: readText(data, 'ownedMaintenance'),
        ownedPremium: readText(data, 'ownedPremium'),
        ownedCurrentStatus: readText(data, 'ownedCurrentStatus'),
        ownerAgreement: readText(data, 'ownerAgreement') || MATCHING_REQUEST_INITIAL_FORM.ownerAgreement,
        ownedDescription: readText(data, 'ownedDescription'),
        matchPriority: readText(data, 'matchPriority') || MATCHING_REQUEST_INITIAL_FORM.matchPriority,
        proposalRange: readText(data, 'proposalRange') || MATCHING_REQUEST_INITIAL_FORM.proposalRange,
        urgency: readText(data, 'urgency') || MATCHING_REQUEST_INITIAL_FORM.urgency,
        extraRequest: readText(data, 'extraRequest'),
        summaryNote: readText(data, 'summaryNote'),
        riskMemo: readText(data, 'riskMemo'),
        recommendedBrands: readText(data, 'recommendedBrands'),
        recommendedProperties: readText(data, 'recommendedProperties'),
        nextAction: readText(data, 'nextAction') || MATCHING_REQUEST_INITIAL_FORM.nextAction
    };
}

function toPropertyView(
    row: PropertyRow,
    companies: ReadonlyMap<string, string>,
    managerNames: ReadonlyMap<string, string>,
    requester: RequesterProfile
) {
    const companyId = row.company_id || '';
    const form = toPropertyForm(row);
    const canEdit = canEditWorkIntakeRecord(requester, row);
    const canDelete = canDeleteWorkIntakeRecord(requester, row);
    return {
        id: row.id,
        companyId,
        companyName: companies.get(companyId) || '회사명 없음',
        managerId: row.manager_id || '',
        authorId: row.manager_id || '',
        authorName: row.manager_id ? managerNames.get(row.manager_id) || '' : '',
        name: row.name || form.propertyName || '이름 없는 물건',
        status: row.status || form.currentStatus,
        address: row.address || form.propertyAddress,
        region: form.propertyRegion,
        desiredBrand: form.desiredBrand,
        desiredCategory: form.desiredCategory,
        deposit: form.deposit,
        monthlyRent: form.monthlyRent,
        createdAt: row.created_at || '',
        canEdit,
        canDelete,
        form
    };
}

type PropertyView = ReturnType<typeof toPropertyView>;

function toLeadRegistrationView(row: LeadLikeRow, managerNames: ReadonlyMap<string, string>, requester: RequesterProfile) {
    const form = toLeadRegistrationForm(row);
    const canEdit = canEditWorkIntakeRecord(requester, row);
    const canDelete = canDeleteWorkIntakeRecord(requester, row);
    return {
        id: row.id,
        managerId: row.manager_id || '',
        authorId: row.created_by || row.manager_id || '',
        managerName: row.manager_id ? managerNames.get(row.manager_id) || '' : '',
        name: form.name || '이름 없음',
        mobile: form.mobile,
        source: row.source || '',
        status: form.status,
        grade: form.grade,
        desiredRegion: form.desiredRegion,
        budgetMin: row.budget_min,
        budgetMax: row.budget_max,
        interestedBrand: form.interestedBrand,
        memo: form.memo,
        nextContactAt: row.next_contact_at || '',
        promotedAt: row.promoted_at || '',
        promotedLeadId: row.promoted_lead_id || '',
        createdAt: row.created_at || '',
        canEdit,
        canDelete,
        form
    };
}

type LeadRegistrationView = ReturnType<typeof toLeadRegistrationView>;

function toMatchingRequestView(row: LeadLikeRow, managerNames: ReadonlyMap<string, string>, requester: RequesterProfile) {
    const data = row.data || {};
    const form = toMatchingRequestForm(row);
    const canEdit = canEditWorkIntakeRecord(requester, row);
    const canDelete = canDeleteWorkIntakeRecord(requester, row);
    return {
        id: row.id,
        managerId: row.manager_id || '',
        authorId: row.created_by || row.manager_id || '',
        managerName: row.manager_id ? managerNames.get(row.manager_id) || '' : '',
        name: form.name || '이름 없음',
        mobile: form.mobile,
        email: form.email,
        status: row.status || '',
        desiredRegion: form.desiredRegion,
        desiredCategory: form.desiredCategory,
        interestedBrand: row.interested_brand || form.desiredBrand,
        totalBudget: form.totalBudget,
        ownedPropertyStatus: form.ownedPropertyStatus,
        matchPriority: form.matchPriority,
        urgency: form.urgency,
        memo: row.memo || '',
        createdAt: row.created_at || '',
        canEdit,
        canDelete,
        form
    };
}

type MatchingRequestView = ReturnType<typeof toMatchingRequestView>;

function toDeletedRecordView(
    row: DeletedRecordRow,
    companies: ReadonlyMap<string, string>,
    managerNames: ReadonlyMap<string, string>
) {
    const companyId = row.company_id || '';
    const deletedBy = row.deleted_by || '';
    return {
        id: row.id,
        kind: row.kind,
        kindLabel: kindLabel(row.kind),
        sourceId: row.source_id,
        companyId,
        companyName: companies.get(companyId) || '회사명 없음',
        deletedBy,
        deletedByName: deletedBy ? managerNames.get(deletedBy) || '이름 없음' : '이름 없음',
        title: row.title || kindLabel(row.kind),
        summary: row.summary || '',
        deletedAt: row.deleted_at || '',
        snapshot: row.snapshot || {}
    };
}

type DeletedRecordView = ReturnType<typeof toDeletedRecordView>;

export async function GET(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const requester = await getRequesterProfile(supabaseAdmin, request);
        if (!requester) return fail(401, 'AUTH_REQUIRED', '로그인 세션을 확인할 수 없습니다. 다시 로그인해주세요.');

        const { searchParams } = new URL(request.url);
        const query = parseWorkIntakeQuery(searchParams);
        const requestedTab = searchParams.get('tab');
        const activeTab: WorkIntakeTab = isWorkIntakeTab(requestedTab) ? requestedTab : 'properties';
        const requestedCompanyId = searchParams.get('companyId');
        const requestedCompanyName = searchParams.get('company');
        if (activeTab === 'deletedRecords' && !isAdmin(requester)) {
            return fail(403, 'FORBIDDEN', '삭제 목록은 관리자만 조회할 수 있습니다.');
        }
        const resolvedCompanyId = requestedCompanyId || await resolveCompanyIdByName(supabaseAdmin, requestedCompanyName);
        if (!isAdmin(requester) && resolvedCompanyId && resolvedCompanyId !== requester.company_id) {
            return fail(403, 'FORBIDDEN', '다른 회사의 진행현황은 조회할 수 없습니다.');
        }
        if (!isAdmin(requester) && !requester.company_id) {
            return fail(403, 'FORBIDDEN', '소속 회사가 확인되지 않아 진행현황을 조회할 수 없습니다. 관리자에게 소속 정보를 확인해주세요.');
        }

        let companyQuery = supabaseAdmin.from('companies').select('id, name');
        if (resolvedCompanyId) {
            companyQuery = companyQuery.eq('id', resolvedCompanyId);
        } else if (!isAdmin(requester) && requester.company_id) {
            companyQuery = companyQuery.eq('id', requester.company_id);
        }

        const { data: companies, error: companyError } = await companyQuery.returns<CompanyRow[]>();
        if (companyError) throw companyError;
        const companyRows = companies || [];
        const companyIds = companyRows.map(company => company.id);
        if (companyIds.length === 0) {
            return ok({
                properties: [],
                leadRegistrationRequests: [],
                matchingRequests: [],
                deletedRecords: [],
                isAdmin: isAdmin(requester),
                meta: {
                    properties: emptyMeta(query.pageSize),
                    leadRegistrationRequests: emptyMeta(query.pageSize),
                    matchingRequests: emptyMeta(query.pageSize),
                    deletedRecords: emptyMeta(query.pageSize)
                }
            });
        }

        const companyNames = new Map(companyRows.map(company => [company.id, company.name || '회사명 없음']));
        const { data: profiles, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('id, company_id, name, email, role')
            .in('company_id', companyIds)
            .returns<ProfileRow[]>();
        if (profileError) throw profileError;
        const managerNames = new Map((profiles || []).map(profile => [profile.id, displayName(profile)]));

        const restrictToOwnRecords = isPartnerVendorRole(requester.role);
        let leadRegistrationTableMissing = false;
        let deletedRecordsTableMissing = false;
        const [properties, leadRegistrations, matchingRequests, deletedRecords] = await Promise.all([
            fetchAllWorkIntakeRows<PropertyRow>(async (from, to) => {
                let requestQuery = supabaseAdmin.from('properties')
                    .select(WORK_INTAKE_PROPERTY_SELECT)
                    .eq('operation_type', '물건등록')
                    .in('company_id', companyIds)
                    .order('created_at', { ascending: false })
                    .order('id', { ascending: false })
                    .range(from, to);
                if (restrictToOwnRecords) requestQuery = requestQuery.eq('manager_id', requester.id);
                const { data, error } = await requestQuery.returns<PropertyRow[]>();
                if (error) throw error;
                return data || [];
            }),
            fetchAllWorkIntakeRows<LeadLikeRow>(async (from, to) => {
                let requestQuery = supabaseAdmin.from('franchise_lead_registration_requests')
                    .select('id, company_id, manager_id, created_by, name, mobile, source, status, grade, desired_region, interested_brand, budget_min, budget_max, memo, next_contact_at, promoted_lead_id, promoted_at, created_at, data')
                    .in('company_id', companyIds)
                    .order('created_at', { ascending: false })
                    .order('id', { ascending: false })
                    .range(from, to);
                if (restrictToOwnRecords) requestQuery = requestQuery.eq('created_by', requester.id);
                const { data, error } = await requestQuery.returns<LeadLikeRow[]>();
                if (error) {
                    if (isMissingLeadRegistrationRequestTableError(error)) {
                        leadRegistrationTableMissing = true;
                        return [];
                    }
                    throw error;
                }
                return data || [];
            }),
            fetchAllWorkIntakeRows<LeadLikeRow>(async (from, to) => {
                let requestQuery = supabaseAdmin.from('franchise_leads')
                    .select('id, company_id, manager_id, created_by, name, mobile, source, status, grade, desired_region, interested_brand, budget_min, budget_max, memo, created_at, data')
                    .eq('source', FRANCHISE_MATCHING_REQUEST_SOURCE)
                    .in('company_id', companyIds)
                    .order('created_at', { ascending: false })
                    .order('id', { ascending: false })
                    .range(from, to);
                if (restrictToOwnRecords) requestQuery = requestQuery.eq('created_by', requester.id);
                const { data, error } = await requestQuery.returns<LeadLikeRow[]>();
                if (error) throw error;
                return data || [];
            }),
            isAdmin(requester)
                ? fetchAllWorkIntakeRows<DeletedRecordRow>(async (from, to) => {
                    let requestQuery = supabaseAdmin.from('franchise_work_intake_deleted_records')
                        .select(WORK_INTAKE_DELETED_RECORD_SELECT)
                        .in('company_id', companyIds)
                        .order('deleted_at', { ascending: false })
                        .order('id', { ascending: false })
                        .range(from, to);
                    if (resolvedCompanyId) requestQuery = requestQuery.eq('company_id', resolvedCompanyId);
                    const { data, error } = await requestQuery.returns<DeletedRecordRow[]>();
                    if (error) {
                        if (isMissingDeletedRecordsTableError(error)) {
                            deletedRecordsTableMissing = true;
                            return [];
                        }
                        throw error;
                    }
                    return data || [];
                })
                : Promise.resolve([] as readonly DeletedRecordRow[])
        ]);

        if (deletedRecordsTableMissing && activeTab === 'deletedRecords') {
            return fail(500, 'INTERNAL_ERROR', '삭제 목록 SQL이 아직 적용되지 않았습니다. supabase_franchise_work_intake_deleted_records_migration.sql 등록이 필요합니다.');
        }

        const missingDeletedByIds = Array.from(new Set(deletedRecords
            .map(record => record.deleted_by)
            .filter((id): id is string => Boolean(id && !managerNames.has(id)))));
        if (missingDeletedByIds.length > 0) {
            const { data: deletedByProfiles, error: deletedByProfileError } = await supabaseAdmin
                .from('profiles')
                .select('id, company_id, name, email, role')
                .in('id', missingDeletedByIds)
                .returns<ProfileRow[]>();
            if (deletedByProfileError) throw deletedByProfileError;
            (deletedByProfiles || []).forEach(profile => managerNames.set(profile.id, displayName(profile)));
        }

        const propertyViews = properties.map(row => toPropertyView(row, companyNames, managerNames, requester));
        const leadRegistrationViews = leadRegistrationTableMissing ? [] : leadRegistrations.map(row => toLeadRegistrationView(row, managerNames, requester));
        const matchingViews = matchingRequests.map(row => toMatchingRequestView(row, managerNames, requester));
        const deletedViews = deletedRecordsTableMissing ? [] : deletedRecords.map(row => toDeletedRecordView(row, companyNames, managerNames));

        const pagedProperties = paginateWorkIntakeItems<PropertyView>(propertyViews, query, {
            getSearchFields: item => [item.name, item.status, item.address, item.region, item.desiredBrand, item.desiredCategory, item.companyName, item.authorName],
            getStatus: item => item.status,
            getDate: item => item.createdAt
        });
        const pagedLeadRegistrations = paginateWorkIntakeItems<LeadRegistrationView>(leadRegistrationViews, query, {
            getSearchFields: item => [item.name, item.mobile, item.source, item.status, item.grade, item.desiredRegion, item.interestedBrand, item.managerName, item.memo],
            getStatus: item => item.status,
            getDate: item => item.createdAt
        });
        const pagedMatchingRequests = paginateWorkIntakeItems<MatchingRequestView>(matchingViews, query, {
            getSearchFields: item => [item.name, item.mobile, item.email, item.desiredRegion, item.desiredCategory, item.interestedBrand, item.totalBudget, item.ownedPropertyStatus, item.matchPriority, item.urgency, item.managerName, item.memo],
            getStatus: item => item.status,
            getDate: item => item.createdAt
        });
        const pagedDeletedRecords = paginateWorkIntakeItems<DeletedRecordView>(deletedViews, query, {
            getSearchFields: item => [item.kindLabel, item.title, item.summary, item.companyName, item.deletedByName],
            getStatus: item => '',
            getDate: item => item.deletedAt
        });

        return ok({
            properties: !query.paginate || activeTab === 'properties' ? pagedProperties.items : pagedProperties.items.slice(0, query.pageSize),
            leadRegistrationRequests: !query.paginate || activeTab === 'leadRegistrations' ? pagedLeadRegistrations.items : pagedLeadRegistrations.items.slice(0, query.pageSize),
            matchingRequests: !query.paginate || activeTab === 'matchingRequests' ? pagedMatchingRequests.items : pagedMatchingRequests.items.slice(0, query.pageSize),
            deletedRecords: isAdmin(requester) && activeTab === 'deletedRecords' ? pagedDeletedRecords.items : [],
            isAdmin: isAdmin(requester),
            meta: {
                properties: pagedProperties.meta,
                leadRegistrationRequests: pagedLeadRegistrations.meta,
                matchingRequests: pagedMatchingRequests.meta,
                deletedRecords: isAdmin(requester) ? pagedDeletedRecords.meta : emptyMeta(query.pageSize)
            }
        });
    } catch (error) {
        console.error('Franchise work intake GET error:', error);
        return fail(500, 'INTERNAL_ERROR', '진행현황을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
    }
}
