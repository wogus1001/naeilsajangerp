import type { DemoRole, DemoWorkspaceProps } from '../demoTypes';
import type { KpiMetrics } from '@/components/dashboard/MainDashboardTypeAStats';
import { ManagerDemoWorkspace } from './ManagerDemoWorkspace';
import { PartnerDemoWorkspace } from './PartnerDemoWorkspace';

type DemoRoleWorkspaceProps = DemoWorkspaceProps & {
    readonly role: DemoRole;
};

const DEMO_ROLE_DASHBOARD_METRICS: Readonly<Record<DemoRole, KpiMetrics>> = {
    admin: { leadTotal: 18, eligible: 9, candidateLocations: 12, matchingNeeded: 6 },
    manager: { leadTotal: 8, eligible: 2, candidateLocations: 4, matchingNeeded: 11 },
    partner: { leadTotal: 4, eligible: 2, candidateLocations: 1, matchingNeeded: 0 }
};

export function DemoRoleWorkspace({ role, activeScreen, onScreenChange, onSimulate }: DemoRoleWorkspaceProps) {
    const dashboardUserName = role === 'partner' ? '김재현' : role === 'manager' ? '김담당' : '관리자';
    const dashboardMetrics = DEMO_ROLE_DASHBOARD_METRICS[role];

    switch (role) {
        case 'admin':
        case 'manager':
            return <ManagerDemoWorkspace dashboardUserName={dashboardUserName} dashboardMetrics={dashboardMetrics} canCreateSystemNotice={role === 'admin'} fixtureRole={role} activeScreen={activeScreen} onScreenChange={onScreenChange} onSimulate={onSimulate} />;
        case 'partner':
            return <PartnerDemoWorkspace dashboardUserName={dashboardUserName} dashboardMetrics={dashboardMetrics} activeScreen={activeScreen} onScreenChange={onScreenChange} onSimulate={onSimulate} />;
    }
}
