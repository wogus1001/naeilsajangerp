import type { DemoWorkspaceProps } from '../demoTypes';
import { DemoContractOwnersAdapter } from './DemoContractOwnersAdapter';
import { DemoFranchiseDashboardAdapter } from './DemoFranchiseDashboardAdapter';
import { DemoLocationAdapter } from './DemoLocationAdapter';
import { DemoOperationsAdapter } from './DemoOperationsAdapter';

export function PartnerDemoWorkspace({ activeScreen, onScreenChange, onSimulate }: DemoWorkspaceProps) {
    switch (activeScreen) {
        case 'dashboard':
            return <DemoFranchiseDashboardAdapter onScreenChange={onScreenChange} onSimulate={onSimulate} />;
        case 'contractOwners':
            return <DemoContractOwnersAdapter onScreenChange={onScreenChange} onSimulate={onSimulate} />;
        case 'leadDb':
        case 'location':
            return <DemoLocationAdapter onSimulate={onSimulate} />;
        case 'operations':
            return <DemoOperationsAdapter onSimulate={onSimulate} />;
    }
}
