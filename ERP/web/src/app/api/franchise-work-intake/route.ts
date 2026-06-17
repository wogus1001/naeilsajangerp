import { getRequesterProfile, isAdmin, resolveCompanyIdByName } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import { isMissingLeadRegistrationRequestTableError } from '@/lib/franchise-lead-registration-table';
import { FRANCHISE_MATCHING_REQUEST_SOURCE } from '@/lib/franchise-leads';
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
};

type PropertyRow = {
    readonly id: string;
    readonly company_id: string | null;
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

function displayName(profile: ProfileRow): string {
    return profile.name || profile.email || '이름 없음';
}

function toPropertyView(row: PropertyRow, companies: ReadonlyMap<string, string>) {
    const companyId = row.company_id || '';
    return {
        id: row.id,
        companyId,
        companyName: companies.get(companyId) || '회사명 없음',
        name: row.name || readDataString(row.data, 'name') || '이름 없는 물건',
        status: row.status || '',
        address: row.address || '',
        region: readDataString(row.data, 'region'),
        desiredBrand: readDataString(row.data, 'desiredBrand'),
        desiredCategory: readDataString(row.data, 'desiredCategory'),
        deposit: readDataString(row.data, 'deposit'),
        monthlyRent: readDataString(row.data, 'monthlyRent'),
        createdAt: row.created_at || ''
    };
}

function toLeadRegistrationView(row: LeadLikeRow, managerNames: ReadonlyMap<string, string>) {
    return {
        id: row.id,
        managerName: row.manager_id ? managerNames.get(row.manager_id) || '' : '',
        name: row.name || '이름 없음',
        mobile: row.mobile || '',
        source: row.source || '',
        status: row.status || '',
        grade: row.grade || '',
        desiredRegion: row.desired_region || '',
        budgetMin: row.budget_min,
        budgetMax: row.budget_max,
        interestedBrand: row.interested_brand || '',
        memo: row.memo || '',
        nextContactAt: row.next_contact_at || '',
        promotedAt: row.promoted_at || '',
        promotedLeadId: row.promoted_lead_id || '',
        createdAt: row.created_at || ''
    };
}

function toMatchingRequestView(row: LeadLikeRow, managerNames: ReadonlyMap<string, string>) {
    const data = row.data || {};
    return {
        id: row.id,
        managerName: row.manager_id ? managerNames.get(row.manager_id) || '' : '',
        name: row.name || '이름 없음',
        mobile: row.mobile || '',
        email: readDataString(data, 'email'),
        desiredRegion: row.desired_region || '',
        desiredCategory: readDataString(data, 'desiredCategory'),
        interestedBrand: row.interested_brand || '',
        totalBudget: readDataString(data, 'totalBudget'),
        ownedPropertyStatus: readDataString(data, 'ownedPropertyStatus'),
        matchPriority: readDataString(data, 'matchPriority'),
        urgency: readDataString(data, 'urgency'),
        memo: row.memo || '',
        createdAt: row.created_at || ''
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
            .select('id, company_id, name, email')
            .in('company_id', companyIds)
            .returns<ProfileRow[]>();
        if (profileError) throw profileError;
        const managerNames = new Map((profiles || []).map(profile => [profile.id, displayName(profile)]));

        const [
            { data: properties, error: propertyError },
            { data: leadRegistrations, error: leadRegistrationError },
            { data: matchingRequests, error: matchingError }
        ] = await Promise.all([
            supabaseAdmin.from('properties')
                .select('id, company_id, name, status, address, created_at, data')
                .eq('operation_type', '물건등록')
                .in('company_id', companyIds)
                .order('created_at', { ascending: false })
                .limit(200)
                .returns<PropertyRow[]>(),
            supabaseAdmin.from('franchise_lead_registration_requests')
                .select('id, company_id, manager_id, name, mobile, source, status, grade, desired_region, interested_brand, budget_min, budget_max, memo, next_contact_at, promoted_lead_id, promoted_at, created_at, data')
                .in('company_id', companyIds)
                .order('created_at', { ascending: false })
                .limit(200)
                .returns<LeadLikeRow[]>(),
            supabaseAdmin.from('franchise_leads')
                .select('id, company_id, manager_id, name, mobile, source, status, grade, desired_region, interested_brand, budget_min, budget_max, memo, created_at, data')
                .eq('source', FRANCHISE_MATCHING_REQUEST_SOURCE)
                .in('company_id', companyIds)
                .order('created_at', { ascending: false })
                .limit(200)
                .returns<LeadLikeRow[]>()
        ]);

        if (propertyError) throw propertyError;
        if (leadRegistrationError && !isMissingLeadRegistrationRequestTableError(leadRegistrationError)) throw leadRegistrationError;
        if (matchingError) throw matchingError;

        return ok({
            properties: (properties || []).map(row => toPropertyView(row, companyNames)),
            leadRegistrationRequests: leadRegistrationError ? [] : (leadRegistrations || []).map(row => toLeadRegistrationView(row, managerNames)),
            matchingRequests: (matchingRequests || []).map(row => toMatchingRequestView(row, managerNames))
        });
    } catch (error) {
        console.error('Franchise work intake GET error:', error);
        return fail(500, 'INTERNAL_ERROR', 'Failed to fetch franchise work intake');
    }
}
