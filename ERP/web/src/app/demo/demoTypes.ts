import type { DemoFeatureSurfacePath } from './_components/DemoFranchiseFeatureConfig';

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
    readonly screen?: DemoScreenId;
    readonly featurePath?: DemoFeatureSurfacePath;
    readonly targetSelector?: string;
    readonly emphasisTargetIds?: readonly string[];
    readonly emphasisTargetSelectors?: readonly string[];
    readonly title: string;
    readonly description: string;
};

export type DemoStoryId = 'sales' | 'siteDevelopment' | 'openingOperations' | 'headOffice';

export type DemoStory = {
    readonly id: DemoStoryId;
    readonly roleLabel: string;
    readonly title: string;
    readonly description: string;
    readonly duration: string;
    readonly outcome: string;
    readonly features: readonly string[];
    readonly roles: readonly Exclude<DemoRole, 'partner'>[];
    readonly steps: readonly DemoTourStep[];
};

export const DEMO_TOUR_STEP_ADVANCE_EVENT = 'demo-tour-step-advance' as const;

export type DemoTourStepAdvanceEventDetail = {
    readonly screen: DemoScreenId;
    readonly fromTargetId: string;
    readonly toTargetId: string | undefined;
};

declare global {
    interface WindowEventMap {
        'demo-tour-step-advance': CustomEvent<DemoTourStepAdvanceEventDetail>;
    }
}

export type DemoGuideAction = {
    readonly label: string;
    readonly screen: DemoScreenId;
};

export type DemoGuideStep = {
    readonly targetId: string;
    readonly targetSelector?: string;
    readonly emphasisTargetIds?: readonly string[];
    readonly emphasisTargetSelectors?: readonly string[];
    readonly title: string;
    readonly description: string;
};

export type DemoGuide = {
    readonly badge: string;
    readonly title: string;
    readonly description: string;
    readonly steps: readonly DemoGuideStep[];
};

export type DemoScreenGuide = DemoGuide & {
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
    readonly dashboardUserName?: string;
    readonly onSimulate: DemoActionHandler;
    readonly onScreenChange: (screen: DemoScreenId) => void;
};
