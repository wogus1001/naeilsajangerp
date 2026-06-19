import type { DemoRole, DemoWorkspaceProps } from '../demoTypes';
import { ManagerDemoWorkspace } from './ManagerDemoWorkspace';
import { PartnerDemoWorkspace } from './PartnerDemoWorkspace';

type DemoRoleWorkspaceProps = DemoWorkspaceProps & {
    readonly role: DemoRole;
};

export function DemoRoleWorkspace({ role, activeScreen, onScreenChange, onSimulate }: DemoRoleWorkspaceProps) {
    switch (role) {
        case 'admin':
        case 'manager':
            return <ManagerDemoWorkspace activeScreen={activeScreen} onScreenChange={onScreenChange} onSimulate={onSimulate} />;
        case 'partner':
            return <PartnerDemoWorkspace activeScreen={activeScreen} onScreenChange={onScreenChange} onSimulate={onSimulate} />;
    }
}
