export type DemoRole = 'admin' | 'manager' | 'partner';

export type DemoScreenId =
    | 'dashboard'
    | 'leadDb'
    | 'contractOwners'
    | 'location'
    | 'locationMap'
    | 'operations';

export type DemoRoleCard = {
    readonly id: DemoRole;
    readonly title: string;
    readonly badge: string;
    readonly href: string;
    readonly description: string;
    readonly highlights: readonly string[];
};

export type DemoNavItem = {
    readonly id: DemoScreenId;
    readonly label: string;
    readonly description: string;
};

export type DemoMetric = {
    readonly label: string;
    readonly value: string;
    readonly helper: string;
};

export type DemoTourStep = {
    readonly id: string;
    readonly targetId: string;
    readonly targetSelector?: string;
    readonly title: string;
    readonly description: string;
};

export type DemoGuideAction = {
    readonly label: string;
    readonly screen: DemoScreenId;
};

export type DemoGuideStep = {
    readonly targetId: string;
    readonly targetSelector?: string;
    readonly title: string;
    readonly description: string;
};

export type DemoScreenGuide = {
    readonly badge: string;
    readonly title: string;
    readonly description: string;
    readonly steps: readonly DemoGuideStep[];
    readonly actions: readonly DemoGuideAction[];
};

export type DemoScenario = {
    readonly role: DemoRole;
    readonly title: string;
    readonly subtitle: string;
    readonly defaultScreen?: DemoScreenId;
    readonly navItems: readonly DemoNavItem[];
    readonly metrics: readonly DemoMetric[];
    readonly tourSteps: readonly DemoTourStep[];
};

export type DemoActionHandler = (label: string) => void;

export type DemoWorkspaceProps = {
    readonly activeScreen: DemoScreenId;
    readonly onSimulate: DemoActionHandler;
    readonly onScreenChange: (screen: DemoScreenId) => void;
};
