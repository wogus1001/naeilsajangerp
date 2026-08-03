import type { DemoWorkspaceProps } from '../demoTypes';
import type { KpiMetrics } from '@/components/dashboard/MainDashboardTypeAStats';
import { DemoContractOwnersAdapter } from './DemoContractOwnersAdapter';
import { DemoFranchiseDashboardAdapter } from './DemoFranchiseDashboardAdapter';
import { DemoLocationAdapter } from './DemoLocationAdapter';
import { DemoLocationMapAdapter } from './DemoLocationMapAdapter';
import { DemoOperationsAdapter } from './DemoOperationsAdapter';

type PartnerDemoWorkspaceProps = DemoWorkspaceProps & {
    readonly dashboardMetrics: KpiMetrics;
};

export function PartnerDemoWorkspace({ activeScreen, dashboardUserName, dashboardMetrics, onScreenChange, onSimulate }: PartnerDemoWorkspaceProps) {
    const resolvedScreen = activeScreen === 'leadDb' ? 'location' : activeScreen;
    const surfaces = [
        {
            id: 'dashboard',
            content: <DemoFranchiseDashboardAdapter role="partner" userName={dashboardUserName} metrics={dashboardMetrics} canCreateSystemNotice={false} onScreenChange={onScreenChange} onSimulate={onSimulate} />
        },
        {
            id: 'contractOwners',
            content: <DemoContractOwnersAdapter role="partner" onScreenChange={onScreenChange} onSimulate={onSimulate} />
        },
        {
            id: 'location',
            content: <DemoLocationAdapter role="partner" onScreenChange={onScreenChange} onSimulate={onSimulate} />
        },
        {
            id: 'locationMap',
            content: <DemoLocationMapAdapter role="partner" onScreenChange={onScreenChange} onSimulate={onSimulate} />
        },
        {
            id: 'operations',
            content: <DemoOperationsAdapter role="partner" onScreenChange={onScreenChange} onSimulate={onSimulate} />
        }
    ] as const;

    return surfaces.map(surface => (
        <section
            key={surface.id}
            hidden={resolvedScreen !== surface.id}
            aria-hidden={resolvedScreen !== surface.id}
            data-demo-surface={surface.id}
        >
            {surface.content}
        </section>
    ));
}
