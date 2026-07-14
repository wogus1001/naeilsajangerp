export {
    COMPANY_DASHBOARD_MODES,
    COMPANY_MENU_FEATURES,
    DEFAULT_COMPANY_DASHBOARD_MODE,
    type CompanyDashboardMode,
    type CompanyMenuFeatureDefinition,
    type CompanyMenuFeatureKey,
    type CompanyMenuFeatureRow,
    type CompanyMenuFlagMap
} from './company-menu-feature-definitions';

import {
    COMPANY_MENU_FEATURES,
    DEFAULT_COMPANY_DASHBOARD_MODE,
    DEFAULT_COMPANY_MENU_FLAGS,
    type CompanyDashboardMode,
    type CompanyMenuFeatureDefinition,
    type CompanyMenuFeatureKey,
    type CompanyMenuFeatureRow,
    type CompanyMenuFlagMap
} from './company-menu-feature-definitions';

export function getDefaultCompanyMenuFlags(): CompanyMenuFlagMap {
    return { ...DEFAULT_COMPANY_MENU_FLAGS };
}

export function isCompanyMenuFeatureKey(value: string): value is CompanyMenuFeatureKey {
    return COMPANY_MENU_FEATURES.some(feature => feature.key === value);
}

export function isCompanyDashboardMode(value: unknown): value is CompanyDashboardMode {
    return value === 'a' || value === 'b';
}

export function normalizeCompanyDashboardMode(value: unknown): CompanyDashboardMode {
    return isCompanyDashboardMode(value) ? value : DEFAULT_COMPANY_DASHBOARD_MODE;
}

export function normalizeCompanyMenuFlags(rows: readonly CompanyMenuFeatureRow[]): CompanyMenuFlagMap {
    const hasSavedMenuRows = rows.some(row => isCompanyMenuFeatureKey(row.feature_key));
    const flags: Record<CompanyMenuFeatureKey, boolean> = hasSavedMenuRows
        ? Object.fromEntries(COMPANY_MENU_FEATURES.map(feature => [feature.key, false])) as Record<CompanyMenuFeatureKey, boolean>
        : getDefaultCompanyMenuFlags();

    for (const row of rows) {
        if (isCompanyMenuFeatureKey(row.feature_key)) {
            flags[row.feature_key] = row.enabled !== false;
        }
    }

    return flags;
}

export function isCompanyMenuEnabled(flags: CompanyMenuFlagMap | null | undefined, key: CompanyMenuFeatureKey): boolean {
    return flags?.[key] !== false;
}

export function getCompanyMenuFeatureForPath(pathname: string): CompanyMenuFeatureDefinition | null {
    let bestFeature: CompanyMenuFeatureDefinition | null = null;
    let bestPrefixLength = 0;

    for (const feature of COMPANY_MENU_FEATURES) {
        for (const prefix of feature.routePrefixes) {
            const isMatch = pathname === prefix || pathname.startsWith(`${prefix}/`);
            if (isMatch && prefix.length > bestPrefixLength) {
                bestFeature = feature;
                bestPrefixLength = prefix.length;
            }
        }
    }

    return bestFeature;
}
