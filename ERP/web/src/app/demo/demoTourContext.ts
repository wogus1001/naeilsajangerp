import type { DemoFeatureSurfacePath } from './_components/DemoFranchiseFeatureConfig';
import type { DemoScreenId, DemoStoryId } from './demoTypes';

export type DemoTourMode = 'welcome' | 'core' | 'story' | 'screen' | 'complete' | 'closed';

type DemoTourContextKeyInput = {
    readonly mode: DemoTourMode;
    readonly selectedStoryId: DemoStoryId | undefined;
    readonly activeFeaturePath: DemoFeatureSurfacePath | '';
    readonly activeScreen: DemoScreenId;
};

export function getDemoTourContextKey({
    mode,
    selectedStoryId,
    activeFeaturePath,
    activeScreen
}: DemoTourContextKeyInput): string {
    if (mode === 'core') return 'core';
    if (mode === 'story') return `story-${selectedStoryId ?? 'unselected'}`;
    if (mode === 'screen') return `screen-${activeFeaturePath || activeScreen}`;
    return mode;
}
