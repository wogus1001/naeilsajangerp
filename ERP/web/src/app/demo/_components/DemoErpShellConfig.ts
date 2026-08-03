import type { DemoRole, DemoScreenId } from '../demoTypes';
import type { DemoScenario } from '../demoTypes';
import type { SidebarMenuSection } from '@/components/layout/SidebarMenuConfig';

export const DEMO_ROLE_PROFILES = {
    admin: { name: '관리자', company: '데모 운영팀' },
    manager: { name: '김담당', company: '데모' },
    partner: { name: '김재현', company: '데모 협력업체' }
} as const satisfies Record<DemoRole, { readonly name: string; readonly company: string }>;

export const DEMO_PATH_TO_SCREEN: Readonly<Record<string, DemoScreenId>> = {
    '/dashboard': 'dashboard',
    '/dashboard/franchise-leads': 'leadDb',
    '/dashboard/franchise-leads?tab=contract': 'contractOwners',
    '/dashboard/franchise-leads/market-insights': 'location',
    '/dashboard/franchise-locations': 'locationMap',
    '/dashboard/franchise-operations': 'operations'
};

export const DEMO_SCREEN_TO_PATH: Readonly<Record<DemoScreenId, string>> = {
    dashboard: '/dashboard',
    leadDb: '/dashboard/franchise-leads',
    contractOwners: '/dashboard/franchise-leads?tab=contract',
    location: '/dashboard/franchise-leads/market-insights',
    locationMap: '/dashboard/franchise-locations',
    operations: '/dashboard/franchise-operations'
};

const DEMO_SCREEN_FEATURES = {
    dashboard: 'dashboard',
    leadDb: 'franchiseLeads',
    contractOwners: 'franchiseLeads',
    location: 'marketInsights',
    locationMap: 'franchiseLocations',
    operations: 'franchiseOperations'
} as const;

const DEMO_SCREEN_ICONS = {
    dashboard: 'list',
    leadDb: 'target',
    contractOwners: 'list',
    location: 'mapPin',
    locationMap: 'mapPin',
    operations: 'store'
} as const;

export function buildDemoSidebarSections(scenario: DemoScenario): readonly SidebarMenuSection[] {
    const dashboard = scenario.navItems.find(item => item.id === 'dashboard');
    const franchiseItems = scenario.navItems.filter(item => item.id !== 'dashboard');
    return [
        {
            key: 'dashboard',
            title: dashboard?.label ?? '대시보드',
            collapsedTitle: dashboard?.label ?? '대시보드',
            direct: true,
            items: [{
                title: dashboard?.label ?? '대시보드',
                url: DEMO_SCREEN_TO_PATH.dashboard,
                category: '대시보드',
                featureKey: 'dashboard'
            }]
        },
        {
            key: 'franchise',
            title: '프랜차이즈',
            collapsedTitle: '프랜차이즈',
            items: franchiseItems.map(item => ({
                title: item.label,
                url: DEMO_SCREEN_TO_PATH[item.id],
                category: '프랜차이즈',
                featureKey: DEMO_SCREEN_FEATURES[item.id],
                icon: DEMO_SCREEN_ICONS[item.id]
            }))
        }
    ];
}

export function getDemoBreadcrumbRoot(screen: DemoScreenId): string {
    if (screen === 'dashboard') return '메인';
    return '프랜차이즈';
}
