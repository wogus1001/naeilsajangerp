import { NextResponse } from 'next/server';
import { canAccessCompanyScope, getAuthenticatedRequesterProfile, isAdmin } from '@/lib/api-auth';
import { isMissingDashboardScheduleSourceType, selectDashboardUpcomingSchedules } from '@/lib/dashboard-schedules';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { isUcansignNotConnectedError } from '@/lib/ucansign/client';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const requestedCompanyId = searchParams.get('companyId');

        const supabaseAdmin = getSupabaseAdmin();
        const requesterProfile = await getAuthenticatedRequesterProfile(supabaseAdmin, request);

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

        const createScheduleQuery = (excludeApprovalDocuments: boolean) => {
            let query = supabaseAdmin.from('schedules').select('*');
            if (companyId) query = query.eq('company_id', companyId);
            let datedQuery = query.gte('date', todayStr);
            if (excludeApprovalDocuments) {
                datedQuery = datedQuery.or('source_type.is.null,source_type.neq.approval-document');
            }
            return datedQuery
                .not('type', 'in', '("work","completed","canceled","postponed")')
                .order('date', { ascending: true })
                .order('title', { ascending: true })
                .limit(20);
        };

        // Prepare Queries
        let contractQuery = supabaseAdmin.from('contracts').select('*');
        let propertyQuery = supabaseAdmin.from('properties').select('id, created_at');
        let customerQuery = supabaseAdmin.from('customers').select('id', { count: 'exact', head: true });

        if (companyId) {
            contractQuery = contractQuery.eq('company_id', companyId);
            propertyQuery = propertyQuery.eq('company_id', companyId);
            customerQuery = customerQuery.eq('company_id', companyId);
        }

        const queries = [
            // A. Schedules
            createScheduleQuery(true),

            // B. Contracts (Project)
            contractQuery
                .order('created_at', { ascending: false }),

            // C. Properties
            propertyQuery,

            // D. Customers
            customerQuery
        ];

        const [
            { data: initialSchedules, error: initialScheduleError },
            { data: contracts, error: contractError },
            { data: properties, error: propError },
            { count: customerCount, error: custError }
        ] = await Promise.all(queries);

        let schedules = initialSchedules;
        let scheduleError = initialScheduleError;
        if (isMissingDashboardScheduleSourceType(scheduleError)) {
            const fallbackResult = await createScheduleQuery(false);
            schedules = fallbackResult.data;
            scheduleError = fallbackResult.error;
        }

        if (scheduleError) console.error('Error fetching schedules:', scheduleError);
        if (contractError) console.error('Error fetching contracts:', contractError);
        if (propError) console.error('Error fetching properties:', propError);
        if (custError) console.error('Error fetching customers:', custError);

        // 3. Process Data

        // A. Schedules
        const validSchedules = selectDashboardUpcomingSchedules(schedules, requesterProfile.id);

        // Upcoming Count (Today ~ D+2)
        const shortTermCount = validSchedules.filter(schedule => schedule.date <= dPlus2Str).length;

        // Top 5 for Widget
        const widgetSchedules = validSchedules.slice(0, 5).map(schedule => ({
            id: schedule.id,
            time: `${schedule.date.slice(5)} ${schedule.time?.slice(0, 5) || ''}`.trim(), // MM-DD HH:mm
            title: schedule.title,
            location: schedule.location,
            type: schedule.type
        }));


        // B. Contracts
        // 1. Projects (DB)
        const projectContracts = contracts || [];
        const projectOngoing = projectContracts.filter((c: any) =>
            ['on_going', 'active', 'progress', 'WAITING', 'APPROVAL_REQUESTED'].includes(c.status)
        );

        // 2. Electronic (API)
        let electronicOngoingCount = 0;
        let apiRecentContracts: any[] = [];

        try {
            const { getContracts } = await import('@/lib/ucansign/client');
            const apiContracts = await getContracts(requesterProfile.id) || [];

            const ongoingMerged = apiContracts.filter((c: any) => {
                const status = (c.status || '').toLowerCase();
                return !['completed', 'canceled', 'rejected', 'trash', 'expired', 'deleted'].includes(status);
            });
            electronicOngoingCount = ongoingMerged.length;

            apiRecentContracts = apiContracts.slice(0, 10).map((c: any) => ({
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
        const localProjects = projectContracts.map((c: any) => ({
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
        const newPropertiesCount = (properties || []).filter((p: any) => {
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
