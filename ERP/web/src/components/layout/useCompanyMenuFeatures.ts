import React from 'react';
import {
    COMPANY_MENU_FEATURES,
    getCompanyMenuFeatureForPath,
    getDefaultCompanyMenuFlags,
    isCompanyMenuEnabled,
    type CompanyMenuFeatureDefinition,
    type CompanyMenuFlagMap
} from '@/lib/company-menu-features';
import { getApiAuthHeaders } from '@/utils/apiAuthHeaders';
import { getAdminCompanyScope } from '@/utils/userUtils';

type LayoutUser = {
    readonly id?: string;
    readonly uid?: string;
    readonly role?: string;
    readonly companyId?: string;
};

type CompanyMenuAccessState = {
    readonly flags: CompanyMenuFlagMap;
    readonly blockedFeature: CompanyMenuFeatureDefinition | null;
};

function isAdminRole(role: string | undefined): boolean {
    return role === 'admin' || role === 'super_admin';
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseFlagMap(value: unknown): CompanyMenuFlagMap | null {
    if (!isRecord(value)) return null;
    const flags: Record<string, boolean> = { ...getDefaultCompanyMenuFlags() };

    for (const feature of COMPANY_MENU_FEATURES) {
        const rawValue = value[feature.key];
        if (typeof rawValue === 'boolean') {
            flags[feature.key] = rawValue;
        }
    }

    return {
        dashboard: flags.dashboard !== false,
        franchiseLeads: flags.franchiseLeads !== false,
        franchiseWorkIntake: flags.franchiseWorkIntake !== false,
        franchiseMatchingRequest: flags.franchiseMatchingRequest !== false,
        franchisePropertyRegistration: flags.franchisePropertyRegistration !== false,
        marketInsights: flags.marketInsights !== false,
        franchiseOperations: flags.franchiseOperations !== false,
        properties: flags.properties !== false,
        propertyRegister: flags.propertyRegister !== false,
        propertyMap: flags.propertyMap !== false,
        schedule: flags.schedule !== false,
        customers: flags.customers !== false,
        customerRegister: flags.customerRegister !== false,
        businessCards: flags.businessCards !== false,
        businessCardRegister: flags.businessCardRegister !== false,
        contracts: flags.contracts !== false,
        electronicPremiumContracts: flags.electronicPremiumContracts !== false,
        contractCreate: flags.contractCreate !== false,
        contractBuilder: flags.contractBuilder !== false,
        companyStaff: flags.companyStaff !== false
    };
}

function parseResponseFlags(value: unknown): CompanyMenuFlagMap | null {
    if (!isRecord(value) || !isRecord(value.data)) return null;
    return parseFlagMap(value.data.flags);
}

export function useCompanyMenuFeatures(user: LayoutUser | null, pathname: string): CompanyMenuAccessState {
    const [flags, setFlags] = React.useState<CompanyMenuFlagMap>(getDefaultCompanyMenuFlags());

    React.useEffect(() => {
        let cancelled = false;

        const loadFlags = async () => {
            if (!user) {
                setFlags(getDefaultCompanyMenuFlags());
                return;
            }

            const requesterId = user.uid || user.id || '';
            if (!requesterId) {
                setFlags(getDefaultCompanyMenuFlags());
                return;
            }

            const userIsAdmin = isAdminRole(user.role);
            const adminScope = userIsAdmin ? getAdminCompanyScope() : null;
            const targetCompanyId = adminScope?.id || user.companyId || '';
            if (userIsAdmin && !targetCompanyId) {
                setFlags(getDefaultCompanyMenuFlags());
                return;
            }

            const params = new URLSearchParams();
            params.set('requesterId', requesterId);
            if (targetCompanyId) params.set('companyId', targetCompanyId);

            try {
                const response = await fetch(`/api/company-menu-features?${params.toString()}`, {
                    cache: 'no-store',
                    headers: await getApiAuthHeaders()
                });
                const nextFlags = parseResponseFlags(await response.json());
                if (!cancelled && response.ok && nextFlags) {
                    setFlags(nextFlags);
                }
            } catch (error) {
                console.error('Failed to load company menu features:', error);
            }
        };

        void loadFlags();

        return () => {
            cancelled = true;
        };
    }, [user]);

    const feature = getCompanyMenuFeatureForPath(pathname);
    const blockedFeature = feature && !isCompanyMenuEnabled(flags, feature.key) && !isAdminRole(user?.role) ? feature : null;

    return { flags, blockedFeature };
}
