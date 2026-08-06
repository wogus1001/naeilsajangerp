'use client';

import type { DemoRole, DemoStoryId, DemoTourStep } from '../demoTypes';
import type { DemoTourMode } from '../demoTourContext';
import { DemoExperienceDialog } from './DemoExperienceDialog';
import { DemoTourOverlay } from './DemoTourOverlay';

type DemoTourExperienceProps = {
    readonly role: DemoRole;
    readonly mode: DemoTourMode;
    readonly run: number;
    readonly contextKey: string;
    readonly steps: readonly DemoTourStep[];
    readonly completedStoryId: DemoStoryId | undefined;
    readonly onStartCoreAction: () => void;
    readonly onStartStoryAction: (storyId: DemoStoryId) => void;
    readonly onChooseStoryAction: () => void;
    readonly onExploreAction: () => void;
    readonly onContactAction: () => void;
    readonly onCompleteAction: () => void;
    readonly onStepAdvanceAction: (currentStep: DemoTourStep, nextStep: DemoTourStep | undefined) => void;
};

export function DemoTourExperience({
    role,
    mode,
    run,
    contextKey,
    steps,
    completedStoryId,
    onStartCoreAction,
    onStartStoryAction,
    onChooseStoryAction,
    onExploreAction,
    onContactAction,
    onCompleteAction,
    onStepAdvanceAction
}: DemoTourExperienceProps) {
    if (mode === 'welcome' || mode === 'complete') {
        return (
            <DemoExperienceDialog
                role={role}
                mode={mode}
                completedStoryId={completedStoryId}
                onStartCoreAction={onStartCoreAction}
                onStartStoryAction={onStartStoryAction}
                onChooseStoryAction={onChooseStoryAction}
                onExploreAction={onExploreAction}
                onContactAction={onContactAction}
            />
        );
    }

    if (mode !== 'core' && mode !== 'story' && mode !== 'screen') return null;

    return (
        <DemoTourOverlay
            key={`${role}-${mode}-${contextKey}-${run}`}
            steps={steps}
            finalAction={undefined}
            onCloseAction={onExploreAction}
            onCompleteAction={mode === 'core' || mode === 'story' ? onCompleteAction : undefined}
            onStepAdvanceAction={onStepAdvanceAction}
        />
    );
}
