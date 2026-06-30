import { getRequesterProfile, isAdmin, resolveCompanyIdByName } from '@/lib/api-auth';
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
    managerNames: ReadonlyMap<string, string>
) {
    const companyId = row.company_id || '';
    const form = toPropertyForm(row);
    return {
        id: row.id,
        companyId,
        companyName: companies.get(companyId) || '회사명 없음',
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
        form
    };
}

function toLeadRegistrationView(row: LeadLikeRow, managerNames: ReadonlyMap<string, string>) {
    const form = toLeadRegistrationForm(row);
    return {
        id: row.id,
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
        form
    };
}

function toMatchingRequestView(row: LeadLikeRow, managerNames: ReadonlyMap<string, string>) {
    const data = row.data || {};
    const form = toMatchingRequestForm(row);
    return {
        id: row.id,
        managerName: row.manager_id ? managerNames.get(row.manager_id) || '' : '',
        name: form.name || '이름 없음',
        mobile: form.mobile,
        email: form.email,
        desiredRegion: form.desiredRegion,
        desiredCategory: form.desiredCategory,
        interestedBrand: row.interested_brand || form.desiredBrand,
        totalBudget: form.totalBudget,
        ownedPropertyStatus: form.ownedPropertyStatus,
        matchPriority: form.matchPriority,
        urgency: form.urgency,
        memo: row.memo || '',
        createdAt: row.created_at || '',
        form
    };
}

export async function GET(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const requester = await getRequesterProfile(supabaseAdmin, request);
        if (!requester) return fail(401, 'AUTH_REQUIRED', 'requesterId is required');

        const { searchParams } = new URL(request.url);
        const requestedCompanyId = searchParams.get('companyId');
        const requestedCompanyName = searchParams.get('company');
        const resolvedCompanyId = requestedCompanyId || await resolveCompanyIdByName(supabaseAdmin, requestedCompanyName);
        if (!isAdmin(requester) && resolvedCompanyId && resolvedCompanyId !== requester.company_id) {
            return fail(403, 'FORBIDDEN', 'Forbidden: cross-company access denied');
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
        if (companyIds.length === 0) return ok({ properties: [], leadRegistrationRequests: [], matchingRequests: [] });

        const companyNames = new Map(companyRows.map(company => [company.id, company.name || '회사명 없음']));
        const { data: profiles, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('id, company_id, name, email, role')
            .in('company_id', companyIds)
            .returns<ProfileRow[]>();
        if (profileError) throw profileError;
        const managerNames = new Map((profiles || []).map(profile => [profile.id, displayName(profile)]));

        let propertyQuery = supabaseAdmin.from('properties')
            .select(WORK_INTAKE_PROPERTY_SELECT)
            .eq('operation_type', '물건등록')
            .in('company_id', companyIds)
            .order('created_at', { ascending: false })
            .limit(200);

        let leadRegistrationQuery = supabaseAdmin.from('franchise_lead_registration_requests')
            .select('id, company_id, manager_id, created_by, name, mobile, source, status, grade, desired_region, interested_brand, budget_min, budget_max, memo, next_contact_at, promoted_lead_id, promoted_at, created_at, data')
            .in('company_id', companyIds)
            .order('created_at', { ascending: false })
            .limit(200);

        let matchingRequestQuery = supabaseAdmin.from('franchise_leads')
            .select('id, company_id, manager_id, created_by, name, mobile, source, status, grade, desired_region, interested_brand, budget_min, budget_max, memo, created_at, data')
            .eq('source', FRANCHISE_MATCHING_REQUEST_SOURCE)
            .in('company_id', companyIds)
            .order('created_at', { ascending: false })
            .limit(200);
        if (isPartnerVendorRole(requester.role)) {
            propertyQuery = propertyQuery.eq('manager_id', requester.id);
            leadRegistrationQuery = leadRegistrationQuery.eq('created_by', requester.id);
            matchingRequestQuery = matchingRequestQuery.eq('created_by', requester.id);
        }

        const [
            { data: properties, error: propertyError },
            { data: leadRegistrations, error: leadRegistrationError },
            { data: matchingRequests, error: matchingError }
        ] = await Promise.all([
            propertyQuery.returns<PropertyRow[]>(),
            leadRegistrationQuery.returns<LeadLikeRow[]>(),
            matchingRequestQuery.returns<LeadLikeRow[]>()
        ]);

        if (propertyError) throw propertyError;
        if (leadRegistrationError && !isMissingLeadRegistrationRequestTableError(leadRegistrationError)) throw leadRegistrationError;
        if (matchingError) throw matchingError;

        return ok({
            properties: (properties || []).map(row => toPropertyView(row, companyNames, managerNames)),
            leadRegistrationRequests: leadRegistrationError ? [] : (leadRegistrations || []).map(row => toLeadRegistrationView(row, managerNames)),
            matchingRequests: (matchingRequests || []).map(row => toMatchingRequestView(row, managerNames))
        });
    } catch (error) {
        console.error('Franchise work intake GET error:', error);
        return fail(500, 'INTERNAL_ERROR', 'Failed to fetch franchise work intake');
    }
}
