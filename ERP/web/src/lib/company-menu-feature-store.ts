import type { SupabaseClient } from '@supabase/supabase-js';
import {
    COMPANY_MENU_FEATURES,
    getDefaultCompanyMenuFlags,
    normalizeCompanyMenuFlags,
    type CompanyMenuFeatureKey,
    type CompanyMenuFlagMap,
    type CompanyMenuFeatureRow
} from '@/lib/company-menu-features';

type CompanyMenuFeatureWriteRow = {
    readonly company_id: string;
    readonly feature_key: CompanyMenuFeatureKey;
    readonly enabled: boolean;
    readonly updated_by: string;
    readonly updated_at: string;
};

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
