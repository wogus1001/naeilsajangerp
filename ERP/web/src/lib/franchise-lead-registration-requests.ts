export type FranchiseLeadRegistrationRequestRow = {
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
    readonly promoted_lead_id: string | null;
    readonly promoted_at: string | null;
    readonly created_at: string | null;
    readonly updated_at?: string | null;
    readonly data: Record<string, unknown> | null;
};

function readDataString(data: Record<string, unknown> | null, key: string): string {
    const value = data?.[key];
    return typeof value === 'string' ? value : '';
}

export function toLeadRegistrationRequestView(
    row: FranchiseLeadRegistrationRequestRow,
    managerNames: ReadonlyMap<string, string>
) {
    return {
        id: row.id,
        companyId: row.company_id || '',
        managerId: row.manager_id || '',
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
        leadStage: row.promoted_lead_id ? 'candidate' : 'raw_intake',
        adminIntakeStatus: row.promoted_at ? 'promoted' : readDataString(row.data, 'adminIntakeStatus') || 'pending',
        promotedLeadId: row.promoted_lead_id || '',
        createdAt: row.created_at || '',
        updatedAt: row.updated_at || '',
        syncStatus: row.promoted_at && row.updated_at && new Date(row.updated_at) > new Date(row.promoted_at) ? 'stale' : 'synced',
        promotedAt: row.promoted_at || ''
    };
}
