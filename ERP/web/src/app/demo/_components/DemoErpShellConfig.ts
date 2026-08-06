import type { DemoRole, DemoScreenId } from '../demoTypes';
import {
    SIDEBAR_SECTIONS,
    type SidebarMenuSection
} from '@/components/layout/SidebarMenuConfig';

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

export function buildDemoSidebarSections(role: DemoRole): readonly SidebarMenuSection[] {
    const baseSections = SIDEBAR_SECTIONS.filter(section => (
        section.key === 'dashboard'
        || section.key === 'franchise'
    ));
    if (role !== 'partner') return baseSections;

    const allowedPartnerPaths = new Set([
        '/dashboard/franchise-leads/market-insights',
        '/dashboard/franchise-locations',
        '/dashboard/franchise-operations'
    ]);
    const allowedPartnerGroups = new Set(['출점 후보지', '가맹 운영']);

    return baseSections.map(section => (
        section.key !== 'franchise'
            ? section
            : {
                ...section,
                items: section.items.filter(item => (
                    (item.group && allowedPartnerGroups.has(item.title))
                    || Boolean(item.url && allowedPartnerPaths.has(item.url))
                ))
            }
    ));
}

export function isDemoFeaturePathAllowed(role: DemoRole, path: string): boolean {
    return role !== 'partner' && (
        path.startsWith('/dashboard/franchise-leads/labor-planning')
        || path.startsWith('/dashboard/franchise-operations/schedule')
        || path.startsWith('/dashboard/franchise-supervision')
        || path.startsWith('/dashboard/franchise-operations/owner-portal')
        || path.startsWith('/owner/dashboard')
        || path.startsWith('/contracts/electronic')
        || path.startsWith('/dashboard/franchise-vendors')
        || path.startsWith('/contracts/vendor')
    );
}

export function getDemoBreadcrumbRoot(screen: DemoScreenId): string {
    if (screen === 'dashboard') return '메인';
    return '프랜차이즈';
}
