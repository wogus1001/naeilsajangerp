import {
    getRequesterProfile,
    isAdmin
} from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import { FRANCHISE_MATCHING_REQUEST_SOURCE } from '@/lib/franchise-leads';
import {
    toLeadRegistrationRequestView,
    type FranchiseLeadRegistrationRequestRow
} from '@/lib/franchise-lead-registration-requests';
import { isMissingLeadRegistrationRequestTableError } from '@/lib/franchise-lead-registration-table';
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
    readonly status: string | null;
};

type PropertyRow = {
    readonly id: string;
    readonly company_id: string | null;
    readonly manager_id: string | null;
    readonly name: string | null;
    readonly status: string | null;
    readonly operation_type: string | null;
    readonly address: string | null;
    readonly created_at: string | null;
    readonly updated_at: string | null;
    readonly data: Record<string, unknown> | null;
};

type LocationRow = {
    readonly id: string;
    readonly source_property_id: string | null;
    readonly data: Record<string, unknown> | null;
};

type LeadRow = {
    readonly id: string;
    readonly company_id: string | null;
    readonly manager_id: string | null;
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
    readonly next_contact_at: string | null;
    readonly created_at: string | null;
    readonly updated_at: string | null;
    readonly data: Record<string, unknown> | null;
};

function displayName(profile: ProfileRow): string {
    return profile.name || profile.email || '이름 없음';
}

function readDataString(data: Record<string, unknown> | null, key: string): string {
    const value = data?.[key];
    return typeof value === 'string' ? value : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readSnapshotUpdatedAt(data: Record<string, unknown> | null): string {
    const snapshot = data?.sourcePropertySnapshot;
    if (!isRecord(snapshot)) return '';
    const value = snapshot.updatedAt;
    return typeof value === 'string' ? value : '';
}

function isNewer(sourceAt: string | null, syncedAt: string): boolean {
    if (!sourceAt || !syncedAt) return false;
    const sourceTime = new Date(sourceAt).getTime();
    const syncedTime = new Date(syncedAt).getTime();
    return Number.isFinite(sourceTime) && Number.isFinite(syncedTime) && sourceTime > syncedTime;
}

function toPropertyView(row: PropertyRow, companies: ReadonlyMap<string, string>, locations: ReadonlyMap<string, LocationRow>) {
    const companyId = row.company_id || '';
    const location = locations.get(row.id);
    const syncedAt = readSnapshotUpdatedAt(location?.data || null);
    return {
        id: row.id,
        companyId,
        companyName: companies.get(companyId) || '회사명 없음',
        managerId: row.manager_id || '',
        name: row.name || readDataString(row.data, 'name') || '이름 없는 물건',
        status: row.status || '',
        operationType: row.operation_type || '',
        address: row.address || '',
        region: readDataString(row.data, 'region'),
        createdAt: row.created_at || '',
        updatedAt: row.updated_at || '',
        promotedLocationId: location?.id || '',
        syncStatus: location && isNewer(row.updated_at, syncedAt) ? 'stale' : 'synced'
    };
}

function toLeadView(row: LeadRow, managerNames: ReadonlyMap<string, string>) {
    const data = row.data || {};
    const promotedAt = readDataString(data, 'matchingRequestPromotedAt');
    return {
        id: row.id,
        companyId: row.company_id || '',
        managerId: row.manager_id || '',
        managerName: row.manager_id ? managerNames.get(row.manager_id) || '' : '',
        name: row.name || '이름 없음',
        mobile: row.mobile || '',
        email: readDataString(data, 'email'),
        residence: readDataString(data, 'residence'),
        currentJob: readDataString(data, 'currentJob'),
        desiredRegion: row.desired_region || '',
        desiredCategory: readDataString(data, 'desiredCategory'),
        interestedBrand: row.interested_brand || '',
        brandPreference: readDataString(data, 'brandPreference'),
        budgetMin: row.budget_min,
        budgetMax: row.budget_max,
        totalBudget: readDataString(data, 'totalBudget'),
        ownCapital: readDataString(data, 'ownCapital'),
        loanPreference: readDataString(data, 'loanPreference'),
        desiredDeposit: readDataString(data, 'desiredDeposit'),
        desiredRent: readDataString(data, 'desiredRent'),
        desiredPremium: readDataString(data, 'desiredPremium'),
        desiredSize: readDataString(data, 'desiredSize'),
        desiredFloor: readDataString(data, 'desiredFloor'),
        excludedRegion: readDataString(data, 'excludedRegion'),
        ownedPropertyStatus: readDataString(data, 'ownedPropertyStatus'),
        ownedPropertyName: readDataString(data, 'ownedPropertyName'),
        ownedPropertyAddress: readDataString(data, 'ownedPropertyAddress'),
        matchPriority: readDataString(data, 'matchPriority'),
        proposalRange: readDataString(data, 'proposalRange'),
        urgency: readDataString(data, 'urgency'),
        summaryNote: readDataString(data, 'summaryNote'),
        riskMemo: readDataString(data, 'riskMemo'),
        recommendedBrands: readDataString(data, 'recommendedBrands'),
        recommendedProperties: readDataString(data, 'recommendedProperties'),
        nextAction: readDataString(data, 'nextAction'),
        memo: row.memo || '',
        createdAt: row.created_at || '',
        updatedAt: row.updated_at || '',
        promotedLeadId: readDataString(data, 'matchingRequestPromotedLeadId'),
        promotedAt,
        syncStatus: promotedAt && isNewer(row.updated_at, promotedAt) ? 'stale' : 'synced'
    };
}

export async function GET(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const requester = await getRequesterProfile(supabaseAdmin, request);
        if (!requester) return fail(401, 'AUTH_REQUIRED', 'requesterId is required');
        if (!isAdmin(requester)) return fail(403, 'FORBIDDEN', 'Admin access required');

        const { searchParams } = new URL(request.url);
        const requestedCompanyId = searchParams.get('companyId');

        const { data: companies, error: companyError } = await supabaseAdmin
            .from('companies')
            .select('id, name')
            .order('created_at', { ascending: false })
            .returns<CompanyRow[]>();
        if (companyError) throw companyError;

        const companyRows = companies || [];
        const companyIds = companyRows.map(company => company.id);
        const companyNames = new Map(companyRows.map(company => [company.id, company.name || '회사명 없음']));
        const selectedCompanyId = companyRows.some(company => company.id === requestedCompanyId)
            ? requestedCompanyId || ''
            : '';

        const { data: profiles, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('id, company_id, name, email, role, status')
            .in('company_id', companyIds.length > 0 ? companyIds : ['00000000-0000-0000-0000-000000000000'])
            .returns<ProfileRow[]>();
        if (profileError) throw profileError;

        if (companyIds.length === 0) {
            return ok({ companies: [], selectedCompanyId: '', managers: [], properties: [], leadRegistrationRequests: [], matchingRequests: [] });
        }

        const managerRows = (profiles || []).filter(profile => (
            profile.company_id && profile.role !== 'admin' && profile.status !== 'blocked'
        ));
        const managerNames = new Map(managerRows.map(profile => [profile.id, displayName(profile)]));

        let propertyQuery = supabaseAdmin
            .from('properties')
            .select('id, company_id, manager_id, name, status, operation_type, address, created_at, updated_at, data')
            .eq('operation_type', '물건등록');
        let locationQuery = supabaseAdmin
            .from('franchise_locations')
            .select('id, source_property_id, data')
            .not('source_property_id', 'is', null);
        let leadQuery = supabaseAdmin
            .from('franchise_leads')
            .select('id, company_id, manager_id, name, mobile, source, status, grade, desired_region, interested_brand, budget_min, budget_max, memo, next_contact_at, created_at, updated_at, data')
            .eq('source', FRANCHISE_MATCHING_REQUEST_SOURCE);
        let leadRegistrationQuery = supabaseAdmin
            .from('franchise_lead_registration_requests')
            .select('id, company_id, manager_id, name, mobile, source, status, grade, desired_region, interested_brand, budget_min, budget_max, memo, next_contact_at, promoted_lead_id, promoted_at, created_at, updated_at, data');

        if (selectedCompanyId) {
            propertyQuery = propertyQuery.eq('company_id', selectedCompanyId);
            locationQuery = locationQuery.eq('company_id', selectedCompanyId);
            leadQuery = leadQuery.eq('company_id', selectedCompanyId);
            leadRegistrationQuery = leadRegistrationQuery.eq('company_id', selectedCompanyId);
        } else {
            propertyQuery = propertyQuery.in('company_id', companyIds);
            locationQuery = locationQuery.in('company_id', companyIds);
            leadQuery = leadQuery.in('company_id', companyIds);
            leadRegistrationQuery = leadRegistrationQuery.in('company_id', companyIds);
        }

        const [
            { data: properties, error: propertyError },
            { data: locations, error: locationError },
            { data: leads, error: leadError },
            { data: leadRegistrations, error: leadRegistrationError }
        ] = await Promise.all([
            propertyQuery.order('updated_at', { ascending: false }).limit(200).returns<PropertyRow[]>(),
            locationQuery.returns<LocationRow[]>(),
            leadQuery.order('created_at', { ascending: false }).limit(200).returns<LeadRow[]>(),
            leadRegistrationQuery.order('created_at', { ascending: false }).limit(200).returns<FranchiseLeadRegistrationRequestRow[]>()
        ]);

        if (propertyError) throw propertyError;
        if (locationError) throw locationError;
        if (leadError) throw leadError;
        if (leadRegistrationError && !isMissingLeadRegistrationRequestTableError(leadRegistrationError)) throw leadRegistrationError;

        const locationsByPropertyId = new Map((locations || []).map(location => [location.source_property_id || '', location]));
        return ok({
            companies: companyRows.map(company => ({ id: company.id, name: companyNames.get(company.id) || '회사명 없음' })),
            selectedCompanyId,
            managers: managerRows.map(profile => ({
                id: profile.id,
                companyId: profile.company_id || '',
                name: displayName(profile),
                role: profile.role || ''
            })),
            properties: (properties || []).map(row => toPropertyView(row, companyNames, locationsByPropertyId)),
            leadRegistrationRequests: leadRegistrationError ? [] : (leadRegistrations || []).map(row => toLeadRegistrationRequestView(row, managerNames)),
            matchingRequests: (leads || []).map(row => toLeadView(row, managerNames))
        });
    } catch (error) {
        console.error('Admin franchise intake GET error:', error);
        return fail(500, 'INTERNAL_ERROR', 'Failed to fetch franchise intake data');
    }
}
