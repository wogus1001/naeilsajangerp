import type { DemoWorkspaceProps } from '../demoTypes';
import type { DemoRole } from '../demoTypes';
import type { KpiMetrics } from '@/components/dashboard/MainDashboardTypeAStats';
import { DemoContractOwnersAdapter } from './DemoContractOwnersAdapter';
import { DemoFranchiseDashboardAdapter } from './DemoFranchiseDashboardAdapter';
import { DemoLeadDbAdapter } from './DemoLeadDbAdapter';
import { DemoLocationAdapter } from './DemoLocationAdapter';
import { DemoLocationMapAdapter } from './DemoLocationMapAdapter';
import { DemoOperationsAdapter } from './DemoOperationsAdapter';

type ManagerDemoWorkspaceProps = DemoWorkspaceProps & {
    readonly canCreateSystemNotice: boolean;
    readonly dashboardMetrics: KpiMetrics;
    readonly fixtureRole: Extract<DemoRole, 'admin' | 'manager'>;
};

export function ManagerDemoWorkspace({ activeScreen, dashboardUserName, dashboardMetrics, canCreateSystemNotice, fixtureRole, onScreenChange, onSimulate }: ManagerDemoWorkspaceProps) {
    const surfaces = [
        {
            id: 'dashboard',
            content: <DemoFranchiseDashboardAdapter role={fixtureRole} userName={dashboardUserName} metrics={dashboardMetrics} canCreateSystemNotice={canCreateSystemNotice} onScreenChange={onScreenChange} onSimulate={onSimulate} />
        },
        {
            id: 'leadDb',
            content: <DemoLeadDbAdapter onScreenChange={onScreenChange} onSimulate={onSimulate} />
        },
        {
            id: 'contractOwners',
            content: <DemoContractOwnersAdapter role={fixtureRole} onScreenChange={onScreenChange} onSimulate={onSimulate} />
        },
        {
            id: 'location',
            content: <DemoLocationAdapter role={fixtureRole} onScreenChange={onScreenChange} onSimulate={onSimulate} />
        },
        {
            id: 'locationMap',
            content: <DemoLocationMapAdapter role={fixtureRole} onScreenChange={onScreenChange} onSimulate={onSimulate} />
        },
        {
            id: 'operations',
            content: <DemoOperationsAdapter role={fixtureRole} onScreenChange={onScreenChange} onSimulate={onSimulate} />
        }
    ] as const;

    return surfaces.map(surface => (
        <section
            key={surface.id}
            hidden={activeScreen !== surface.id}
            aria-hidden={activeScreen !== surface.id}
            data-demo-surface={surface.id}
        >
            {surface.content}
        </section>
    ));
}
