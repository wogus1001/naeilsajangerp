import {
    getRequesterProfile,
    isAdmin
} from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import {
    displayProfileName,
    toAdminIntakePropertyView,
    toAdminMatchingRequestView,
    type FranchiseAdminIntakeLocationRow,
    type FranchiseAdminIntakeMatchingRequestRow,
    type FranchiseAdminIntakeProfileRow,
    type FranchiseAdminIntakePropertyRow
} from '@/lib/franchise-admin-intake-view';
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
            .returns<FranchiseAdminIntakeProfileRow[]>();
        if (profileError) throw profileError;

        if (companyIds.length === 0) {
            return ok({ companies: [], selectedCompanyId: '', managers: [], properties: [], leadRegistrationRequests: [], matchingRequests: [] });
        }

        const managerRows = (profiles || []).filter(profile => (
            profile.company_id && profile.role !== 'admin' && profile.status !== 'blocked'
        ));
        const managerNames = new Map(managerRows.map(profile => [profile.id, displayProfileName(profile)]));

        let propertyQuery = supabaseAdmin
            .from('properties')
            .select('id, company_id, manager_id, name, status, operation_type, address, created_at, updated_at, data')
            .eq('operation_type', '물건등록');
        let locationQuery = supabaseAdmin
            .from('franchise_locations')
            .select('id, company_id, manager_id, source_property_id, updated_at, data')
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
            propertyQuery.order('updated_at', { ascending: false }).limit(200).returns<FranchiseAdminIntakePropertyRow[]>(),
            locationQuery.order('updated_at', { ascending: false }).returns<FranchiseAdminIntakeLocationRow[]>(),
            leadQuery.order('created_at', { ascending: false }).limit(200).returns<FranchiseAdminIntakeMatchingRequestRow[]>(),
            leadRegistrationQuery.order('created_at', { ascending: false }).limit(200).returns<FranchiseLeadRegistrationRequestRow[]>()
        ]);

        if (propertyError) throw propertyError;
        if (locationError) throw locationError;
        if (leadError) throw leadError;
        if (leadRegistrationError && !isMissingLeadRegistrationRequestTableError(leadRegistrationError)) throw leadRegistrationError;

        const locationsByPropertyId = new Map<string, FranchiseAdminIntakeLocationRow[]>();
        for (const location of locations || []) {
            const propertyId = location.source_property_id || '';
            if (!propertyId) continue;
            const group = locationsByPropertyId.get(propertyId) || [];
            group.push(location);
            locationsByPropertyId.set(propertyId, group);
        }
        return ok({
            companies: companyRows.map(company => ({ id: company.id, name: companyNames.get(company.id) || '회사명 없음' })),
            selectedCompanyId,
            managers: managerRows.map(profile => ({
                id: profile.id,
                companyId: profile.company_id || '',
                name: displayProfileName(profile),
                role: profile.role || ''
            })),
            properties: (properties || []).map(row => (
                toAdminIntakePropertyView(row, companyNames, locationsByPropertyId.get(row.id) || [], selectedCompanyId)
            )),
            leadRegistrationRequests: leadRegistrationError ? [] : (leadRegistrations || []).map(row => toLeadRegistrationRequestView(row, managerNames)),
            matchingRequests: (leads || []).map(row => toAdminMatchingRequestView(row, managerNames, companyNames, selectedCompanyId))
        });
    } catch (error) {
        console.error('Admin franchise intake GET error:', error);
        return fail(500, 'INTERNAL_ERROR', 'Failed to fetch franchise intake data');
    }
}
