import type { DemoRole, DemoScreenId } from '../demoTypes';

export const DEMO_ROLE_PROFILES = {
    admin: { name: '관리자', company: '데모 운영팀' },
    manager: { name: '김담당', company: '데모' },
    partner: { name: '김재현', company: '데모 협력업체' }
} as const satisfies Record<DemoRole, { readonly name: string; readonly company: string }>;

export const DEMO_PATH_TO_SCREEN: Readonly<Record<string, DemoScreenId>> = {
    '/dashboard': 'dashboard',
    '/dashboard/franchise-leads': 'leadDb',
    '/dashboard/franchise-leads/market-insights': 'location',
    '/dashboard/franchise-operations': 'operations'
};

export function getDemoBreadcrumbRoot(screen: DemoScreenId): string {
    if (screen === 'dashboard') return '메인';
    return '프랜차이즈';
}
