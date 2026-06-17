import type { SupabaseClient } from '@supabase/supabase-js';

export type FallbackLeadRegistrationRow = {
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
    readonly promoted_lead_id: null;
    readonly promoted_at: null;
    readonly created_at: string | null;
    readonly data: Record<string, unknown> | null;
};

type FranchiseLeadFallbackRow = Omit<FallbackLeadRegistrationRow, 'promoted_lead_id' | 'promoted_at'>;

export async function fetchFallbackLeadRegistrationRows(
    supabaseAdmin: SupabaseClient,
    companyIds: readonly string[]
): Promise<readonly FallbackLeadRegistrationRow[]> {
    if (companyIds.length === 0) return [];
    const { data, error } = await supabaseAdmin
        .from('franchise_leads')
        .select('id, company_id, manager_id, name, mobile, source, status, grade, desired_region, interested_brand, budget_min, budget_max, memo, next_contact_at, created_at, data')
        .in('company_id', [...companyIds])
        .eq('data->>sourceType', 'franchise_lead_registration')
        .neq('data->>adminIntakeStatus', 'promoted')
        .order('created_at', { ascending: false })
        .limit(200)
        .returns<FranchiseLeadFallbackRow[]>();
    if (error) throw error;
    return (data || []).map(row => ({
        ...row,
        promoted_lead_id: null,
        promoted_at: null
    }));
}

