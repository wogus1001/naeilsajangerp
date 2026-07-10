import { NextResponse } from 'next/server';
import { canAccessCompanyScope, getAuthenticatedRequesterProfile, isAdmin } from '@/lib/api-auth';
import type { RequesterProfile } from '@/lib/api-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { isUcansignNotConnectedError } from '@/lib/ucansign/client';

export const dynamic = 'force-dynamic';

type SupabaseAdminClient = ReturnType<typeof getSupabaseAdmin>;
type DashboardRouteDependencies = {
    readonly getSupabaseAdmin: () => SupabaseAdminClient;
    readonly resolveRequester: (
        supabaseAdmin: SupabaseAdminClient,
        request: Request
    ) => Promise<RequesterProfile | null>;
    readonly getContracts: (requesterId: string) => Promise<readonly ElectronicContractRow[]>;
};

type ScheduleWidgetRow = {
    readonly id: string;
    readonly date: string;
    readonly time?: string | null;
    readonly title: string;
    readonly location?: string | null;
    readonly type?: string | null;
    readonly scope?: string | null;
    readonly user_id?: string | null;
};

type ContractRow = {
    readonly id: string;
    readonly name?: string | null;
    readonly status?: string | null;
    readonly created_at?: string | null;
};

type PropertyRow = {
    readonly id: string;
    readonly created_at?: string | null;
};

type ElectronicContractRow = {
    readonly documentId?: string | number | null;
    readonly id?: string | number | null;
    readonly title?: string | null;
    readonly name?: string | null;
    readonly receiverName?: string | null;
    readonly status?: string | null;
    readonly createdAt?: string | null;
};

function createDefaultDashboardRouteDependencies(): DashboardRouteDependencies {
    return {
        getSupabaseAdmin,
        resolveRequester: getAuthenticatedRequesterProfile,
        getContracts: async (requesterId: string) => {
            const { getContracts } = await import('@/lib/ucansign/client');
            return await getContracts(requesterId) || [];
        }
    };
}

export async function handleDashboardGET(
    request: Request,
    dependencies: DashboardRouteDependencies = createDefaultDashboardRouteDependencies()
) {
    try {
        const { searchParams } = new URL(request.url);
        const requestedCompanyId = searchParams.get('companyId');

        const supabaseAdmin = dependencies.getSupabaseAdmin();
        const requesterProfile = await dependencies.resolveRequester(supabaseAdmin, request);

        if (!requesterProfile) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        if (!requesterProfile.company_id && !isAdmin(requesterProfile)) {
            console.error('Dashboard: User profile or company not found');
            return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
        }

        if (requestedCompanyId && !canAccessCompanyScope(requesterProfile, requestedCompanyId)) {
            return NextResponse.json({ error: 'Forbidden company scope' }, { status: 403 });
        }

        const companyId = requestedCompanyId || (isAdmin(requesterProfile) ? null : requesterProfile.company_id);

        // 2. Parallel Data Fetching
        const now = new Date();
        const kstOffset = 9 * 60; // KST is UTC+9
        const kstDate = new Date(now.getTime() + (kstOffset * 60 * 1000));
        const todayStr = kstDate.toISOString().split('T')[0];

        const dPlus2Date = new Date(kstDate);
        dPlus2Date.setDate(dPlus2Date.getDate() + 2);
        const dPlus2Str = dPlus2Date.toISOString().split('T')[0];

        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth(); // 0-indexed

        // Prepare Queries
        let scheduleQuery = supabaseAdmin.from('schedules').select('*').is('source_type', null);
        let contractQuery = supabaseAdmin.from('contracts').select('*');
        let propertyQuery = supabaseAdmin.from('properties').select('id, created_at');
        let customerQuery = supabaseAdmin.from('customers').select('id', { count: 'exact', head: true });

        if (companyId) {
            scheduleQuery = scheduleQuery.eq('company_id', companyId);
            contractQuery = contractQuery.eq('company_id', companyId);
            propertyQuery = propertyQuery.eq('company_id', companyId);
            customerQuery = customerQuery.eq('company_id', companyId);
        }

        const queries = [
            // A. Schedules
            scheduleQuery
                .gte('date', todayStr)
                .not('type', 'in', '("work","completed","canceled","postponed")') // Exclude work logs & finished
                .order('date', { ascending: true })
                .order('title', { ascending: true }) // fallback sort
                .limit(20),

            // B. Contracts (Project)
            contractQuery
                .order('created_at', { ascending: false }),

            // C. Properties
            propertyQuery,

            // D. Customers
            customerQuery
        ];

        const [
            { data: schedules, error: schedError },
            { data: contracts, error: contractError },
            { data: properties, error: propError },
            { count: customerCount, error: custError }
        ] = await Promise.all(queries);

        if (schedError) console.error('Error fetching schedules:', schedError);
        if (contractError) console.error('Error fetching contracts:', contractError);
        if (propError) console.error('Error fetching properties:', propError);
        if (custError) console.error('Error fetching customers:', custError);

        // 3. Process Data

        // A. Schedules
        const scheduleRows = Array.isArray(schedules) ? schedules as readonly ScheduleWidgetRow[] : [];
        const validSchedules = scheduleRows.filter(s => {
            // Additional filtering if needed (e.g., private logic)
            // Assuming DB policy/query handles mostly correct data.
            // Check Scope if 'private' (personal)
            if (s.scope === 'personal' && s.user_id !== requesterProfile.id) return false;
            return true;
        });

        // Upcoming Count (Today ~ D+2)
        const shortTermCount = validSchedules.filter(s => s.date <= dPlus2Str).length;

        // Top 5 for Widget
        const widgetSchedules = validSchedules.slice(0, 5).map(s => ({
            id: s.id,
            time: `${s.date.slice(5)} ${s.time?.slice(0, 5) || ''}`.trim(), // MM-DD HH:mm
            title: s.title,
            location: s.location || '',
            type: s.type || 'schedule'
        }));


        // B. Contracts
        // 1. Projects (DB)
        const projectContracts = Array.isArray(contracts) ? contracts as readonly ContractRow[] : [];
        const projectOngoing = projectContracts.filter(c =>
            ['on_going', 'active', 'progress', 'WAITING', 'APPROVAL_REQUESTED'].includes(c.status || '')
        );

        // 2. Electronic (API)
        let electronicOngoingCount = 0;
        let apiRecentContracts: Array<{
            readonly id: string;
            readonly title: string;
            readonly customer: string;
            readonly status?: string | null;
            readonly date: string;
            readonly type: string;
        }> = [];

        try {
            const apiContracts = await dependencies.getContracts(requesterProfile.id);

            const ongoingMerged = apiContracts.filter(c => {
                const status = (c.status || '').toLowerCase();
                return !['completed', 'canceled', 'rejected', 'trash', 'expired', 'deleted'].includes(status);
            });
            electronicOngoingCount = ongoingMerged.length;

            apiRecentContracts = apiContracts.slice(0, 10).map(c => ({
                id: String(c.documentId || c.id),
                title: c.title || c.name || '전자계약',
                customer: c.receiverName || '고객',
                status: c.status,
                date: (c.createdAt || '').split('T')[0],
                type: '전자계약'
            }));
        } catch (error) {
            if (!isUcansignNotConnectedError(error)) {
                console.error('Failed to fetch electronic contracts:', error);
            }
            // Non-blocking
        }

        // Merge Recent Contracts
        const localProjects = projectContracts.map(c => ({
            id: c.id,
            title: c.name || '계약 프로젝트',
            customer: '고객', // Join with customer table if needed, or store name
            status: c.status,
            date: (c.created_at || '').split('T')[0],
            type: '프로젝트'
        }));

        const mergedRecent = [...apiRecentContracts, ...localProjects]
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, 5);


        // C. Properties (New This Month)
        const propertyRows = Array.isArray(properties) ? properties as readonly PropertyRow[] : [];
        const newPropertiesCount = propertyRows.filter(p => {
            if (!p.created_at) return false;
            const d = new Date(p.created_at);
            return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
        }).length;


        // 4. Response
        const dashboardData = {
            stats: {
                scheduleCount: shortTermCount,
                ongoingContractCount: projectOngoing.length + electronicOngoingCount,
                projectContractCount: projectOngoing.length,
                apiContractCount: electronicOngoingCount,
                newPropertyCount: newPropertiesCount,
                totalCustomerCount: customerCount || 0,
            },
            todaySchedules: widgetSchedules,
            recentContracts: mergedRecent
        };

        return NextResponse.json(dashboardData);

    } catch (error) {
        console.error('Dashboard API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET(request: Request) {
    return handleDashboardGET(request);
}
