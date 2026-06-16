import type { SupabaseClient } from '@supabase/supabase-js';
import {
    COMPANY_MENU_FEATURES,
    DEFAULT_COMPANY_DASHBOARD_MODE,
    getDefaultCompanyMenuFlags,
    normalizeCompanyDashboardMode,
    normalizeCompanyMenuFlags,
    type CompanyDashboardMode,
    type CompanyMenuFeatureKey,
    type CompanyMenuFlagMap,
    type CompanyMenuFeatureRow
} from '@/lib/company-menu-features';

type CompanyMenuFeatureWriteRow = {
    readonly company_id: string;
    readonly feature_key: string;
    readonly enabled: boolean;
    readonly updated_by: string;
    readonly updated_at: string;
};

const DASHBOARD_MODE_SETTING_KEYS: Record<CompanyDashboardMode, string> = {
    a: 'dashboard_mode_a',
    b: 'dashboard_mode_b'
} as const;

export class CompanyMenuFeatureStoreError extends Error {
    readonly code: 'TABLE_MISSING' | 'QUERY_FAILED';

    constructor(code: 'TABLE_MISSING' | 'QUERY_FAILED', message: string) {
        super(message);
        this.name = 'CompanyMenuFeatureStoreError';
        this.code = code;
    }
}

export type CompanyMenuFeatureUpdate = {
    readonly key: CompanyMenuFeatureKey;
    readonly enabled: boolean;
};

export type CompanyMenuFeatureView = {
    readonly key: CompanyMenuFeatureKey;
    readonly category: string;
    readonly title: string;
    readonly description: string;
    readonly enabled: boolean;
};

type CompanyDashboardModeRow = {
    readonly feature_key: string;
    readonly enabled: boolean | null;
};

function getDashboardModeFromSettingKey(value: string): CompanyDashboardMode | null {
    if (value === DASHBOARD_MODE_SETTING_KEYS.a) return 'a';
    if (value === DASHBOARD_MODE_SETTING_KEYS.b) return 'b';
    return null;
}

export function toCompanyMenuFeatureViews(flags: CompanyMenuFlagMap): readonly CompanyMenuFeatureView[] {
    return COMPANY_MENU_FEATURES.map(feature => ({
        key: feature.key,
        category: feature.category,
        title: feature.title,
        description: feature.description,
        enabled: flags[feature.key] !== false
    }));
}

export async function fetchCompanyMenuFlags(
    supabaseAdmin: SupabaseClient,
    companyId: string
): Promise<CompanyMenuFlagMap> {
    const { data, error } = await supabaseAdmin
        .from('company_menu_features')
        .select('feature_key, enabled')
        .eq('company_id', companyId)
        .returns<CompanyMenuFeatureRow[]>();

    if (error) {
        if (error.message.includes('company_menu_features')) {
            return getDefaultCompanyMenuFlags();
        }
        throw new CompanyMenuFeatureStoreError('QUERY_FAILED', `Failed to fetch company menu features: ${error.message}`);
    }

    return normalizeCompanyMenuFlags(data || []);
}

export async function fetchCompanyDashboardMode(
    supabaseAdmin: SupabaseClient,
    companyId: string
): Promise<CompanyDashboardMode> {
    const { data, error } = await supabaseAdmin
        .from('company_menu_features')
        .select('feature_key, enabled')
        .eq('company_id', companyId)
        .in('feature_key', [DASHBOARD_MODE_SETTING_KEYS.a, DASHBOARD_MODE_SETTING_KEYS.b])
        .returns<CompanyDashboardModeRow[]>();

    if (error) {
        if (error.message.includes('company_menu_features')) {
            return DEFAULT_COMPANY_DASHBOARD_MODE;
        }
        throw new CompanyMenuFeatureStoreError('QUERY_FAILED', `Failed to fetch company dashboard mode: ${error.message}`);
    }

    for (const row of data || []) {
        const mode = getDashboardModeFromSettingKey(row.feature_key);
        if (mode && row.enabled !== false) return mode;
    }

    return DEFAULT_COMPANY_DASHBOARD_MODE;
}

export async function saveCompanyMenuFlags(
    supabaseAdmin: SupabaseClient,
    companyId: string,
    flags: readonly CompanyMenuFeatureUpdate[],
    requesterId: string
): Promise<CompanyMenuFlagMap> {
    const nowIso = new Date().toISOString();
    const rows: CompanyMenuFeatureWriteRow[] = flags.map(flag => ({
        company_id: companyId,
        feature_key: flag.key,
        enabled: flag.enabled,
        updated_by: requesterId,
        updated_at: nowIso
    }));

    const { error } = await supabaseAdmin
        .from('company_menu_features')
        .upsert(rows, { onConflict: 'company_id,feature_key' });

    if (error) {
        if (error.message.includes('company_menu_features')) {
            throw new CompanyMenuFeatureStoreError(
                'TABLE_MISSING',
                'company_menu_features 테이블이 없습니다. supabase_company_menu_features_migration.sql 적용 후 다시 저장하세요.'
            );
        }
        throw new CompanyMenuFeatureStoreError('QUERY_FAILED', `Failed to save company menu features: ${error.message}`);
    }

    return fetchCompanyMenuFlags(supabaseAdmin, companyId);
}

export async function saveCompanyDashboardMode(
    supabaseAdmin: SupabaseClient,
    companyId: string,
    mode: CompanyDashboardMode,
    requesterId: string
): Promise<CompanyDashboardMode> {
    const normalizedMode = normalizeCompanyDashboardMode(mode);
    const nowIso = new Date().toISOString();
    const rows: CompanyMenuFeatureWriteRow[] = [
        {
            company_id: companyId,
            feature_key: DASHBOARD_MODE_SETTING_KEYS.a,
            enabled: normalizedMode === 'a',
            updated_by: requesterId,
            updated_at: nowIso
        },
        {
            company_id: companyId,
            feature_key: DASHBOARD_MODE_SETTING_KEYS.b,
            enabled: normalizedMode === 'b',
            updated_by: requesterId,
            updated_at: nowIso
        }
    ];

    const { error } = await supabaseAdmin
        .from('company_menu_features')
        .upsert(rows, { onConflict: 'company_id,feature_key' });

    if (error) {
        if (error.message.includes('company_menu_features')) {
            throw new CompanyMenuFeatureStoreError(
                'TABLE_MISSING',
                'company_menu_features 테이블이 없습니다. supabase_company_menu_features_migration.sql 적용 후 다시 저장하세요.'
            );
        }
        throw new CompanyMenuFeatureStoreError('QUERY_FAILED', `Failed to save company dashboard mode: ${error.message}`);
    }

    return fetchCompanyDashboardMode(supabaseAdmin, companyId);
}
