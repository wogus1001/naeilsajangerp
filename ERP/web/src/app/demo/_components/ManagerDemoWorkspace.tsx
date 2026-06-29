import type { DemoWorkspaceProps } from '../demoTypes';
import { DemoContractOwnersAdapter } from './DemoContractOwnersAdapter';
import { DemoFranchiseDashboardAdapter } from './DemoFranchiseDashboardAdapter';
import { DemoLeadDbAdapter } from './DemoLeadDbAdapter';
import { DemoLocationAdapter } from './DemoLocationAdapter';
import { DemoLocationMapAdapter } from './DemoLocationMapAdapter';
import { DemoOperationsAdapter } from './DemoOperationsAdapter';

export function ManagerDemoWorkspace({ activeScreen, onScreenChange, onSimulate }: DemoWorkspaceProps) {
    switch (activeScreen) {
        case 'dashboard':
            return <DemoFranchiseDashboardAdapter onScreenChange={onScreenChange} onSimulate={onSimulate} />;
        case 'leadDb':
            return <DemoLeadDbAdapter activeTab="db" onScreenChange={onScreenChange} onSimulate={onSimulate} />;
        case 'contractOwners':
            return <DemoContractOwnersAdapter onScreenChange={onScreenChange} onSimulate={onSimulate} />;
        case 'location':
            return <DemoLocationAdapter onScreenChange={onScreenChange} onSimulate={onSimulate} />;
        case 'locationMap':
            return <DemoLocationMapAdapter onScreenChange={onScreenChange} onSimulate={onSimulate} />;
        case 'operations':
            return <DemoOperationsAdapter onScreenChange={onScreenChange} onSimulate={onSimulate} />;
    }
}
