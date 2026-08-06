import type { DemoFeatureSurfacePath } from './_components/DemoFranchiseFeatureConfig';
import type { DemoScreenId, DemoTourStep } from './demoTypes';

export type DemoTourDestination =
    | {
        readonly kind: 'screen';
        readonly screen: DemoScreenId;
    }
    | {
        readonly kind: 'feature';
        readonly path: DemoFeatureSurfacePath;
        readonly screen: DemoScreenId;
    };

export function getDemoTourDestination(
    step: DemoTourStep,
    currentScreen: DemoScreenId
): DemoTourDestination {
    if (step.featurePath) {
        return {
            kind: 'feature',
            path: step.featurePath,
            screen: currentScreen
        };
    }

    return {
        kind: 'screen',
        screen: step.screen ?? currentScreen
    };
}
