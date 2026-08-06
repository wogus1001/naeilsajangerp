'use client';

import { useMemo, useState } from 'react';
import { DEMO_STORIES, selectDemoStoriesForRole } from '../demoStories';
import { getDemoTourContextKey, type DemoTourMode } from '../demoTourContext';
import { getDemoTourDestination } from '../demoTourDestination';
import {
    DEMO_TOUR_STEP_ADVANCE_EVENT,
    type DemoRole,
    type DemoScreenId,
    type DemoStoryId,
    type DemoTourStep,
    type DemoTourStepAdvanceEventDetail
} from '../demoTypes';
import { isDemoFeaturePathAllowed } from './DemoErpShellConfig';
import type { DemoFeatureSurfacePath } from './DemoFranchiseFeatureConfig';

type UseDemoTourControllerOptions = {
    readonly role: DemoRole;
    readonly defaultScreen: DemoScreenId;
    readonly allowedScreens: readonly DemoScreenId[];
    readonly activeScreen: DemoScreenId;
    readonly activeFeaturePath: DemoFeatureSurfacePath | '';
    readonly coreSteps: readonly DemoTourStep[];
    readonly screenSteps: readonly DemoTourStep[];
    readonly setActiveScreen: (screen: DemoScreenId) => void;
    readonly setActiveFeaturePath: (path: DemoFeatureSurfacePath | '') => void;
    readonly clearActiveFeatureSearch: () => void;
};

export function useDemoTourController({
    role,
    defaultScreen,
    allowedScreens,
    activeScreen,
    activeFeaturePath,
    coreSteps,
    screenSteps,
    setActiveScreen,
    setActiveFeaturePath,
    clearActiveFeatureSearch
}: UseDemoTourControllerOptions) {
    const [tourRun, setTourRun] = useState(0);
    const [tourMode, setTourMode] = useState<DemoTourMode>('welcome');
    const [selectedStoryId, setSelectedStoryId] = useState<DemoStoryId>();
    const selectedStory = selectedStoryId ? DEMO_STORIES[selectedStoryId] : undefined;
    const contextKey = getDemoTourContextKey({
        mode: tourMode,
        selectedStoryId,
        activeFeaturePath,
        activeScreen
    });
    const tourSteps = useMemo(() => {
        if (tourMode === 'core') return coreSteps;
        if (tourMode === 'story' && selectedStory) return selectedStory.steps;
        return screenSteps;
    }, [coreSteps, screenSteps, selectedStory, tourMode]);

    const isScreenAllowed = (screen: DemoScreenId) => allowedScreens.includes(screen);
    const clearFeature = () => {
        setActiveFeaturePath('');
        clearActiveFeatureSearch();
    };
    const navigateToStep = (step: DemoTourStep, fallbackScreen: DemoScreenId) => {
        const destination = getDemoTourDestination(step, fallbackScreen);
        if (destination.kind === 'feature') {
            if (isDemoFeaturePathAllowed(role, destination.path)) {
                setActiveFeaturePath(destination.path);
                clearActiveFeatureSearch();
            }
            return fallbackScreen;
        }
        if (isScreenAllowed(destination.screen)) {
            clearFeature();
            setActiveScreen(destination.screen);
            return destination.screen;
        }
        return fallbackScreen;
    };
    const dispatchTourTarget = (
        step: DemoTourStep | undefined,
        screen: DemoScreenId,
        fromTargetId = ''
    ) => {
        if (!step) return;
        window.dispatchEvent(new CustomEvent<DemoTourStepAdvanceEventDetail>(DEMO_TOUR_STEP_ADVANCE_EVENT, {
            detail: { screen, fromTargetId, toTargetId: step.targetId }
        }));
    };
    const beginTour = (mode: 'core' | 'story', steps: readonly DemoTourStep[]) => {
        const firstStep = steps[0];
        if (!firstStep) return;
        const screen = navigateToStep(firstStep, defaultScreen);
        dispatchTourTarget(firstStep, screen);
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        setTourRun(run => run + 1);
        setTourMode(mode);
    };

    const startCoreTour = () => {
        setSelectedStoryId(undefined);
        beginTour('core', coreSteps);
    };
    const startStoryTour = (storyId: DemoStoryId) => {
        const story = selectDemoStoriesForRole(role).find(item => item.id === storyId);
        if (!story) return;
        setSelectedStoryId(storyId);
        beginTour('story', story.steps);
    };
    const openScreenGuide = () => {
        dispatchTourTarget(screenSteps[0], activeScreen);
        setTourRun(run => run + 1);
        setTourMode('screen');
    };
    const closeTour = () => {
        setTourMode('closed');
        window.requestAnimationFrame(() => {
            window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        });
    };
    const chooseStory = () => {
        setSelectedStoryId(undefined);
        setTourMode('welcome');
    };
    const completeTour = () => setTourMode('complete');
    const handleStepAdvance = (currentStep: DemoTourStep, nextStep: DemoTourStep | undefined) => {
        if (!nextStep) return;
        const screen = navigateToStep(nextStep, activeScreen);
        dispatchTourTarget(nextStep, screen, currentStep.targetId);
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    };

    return {
        tourRun,
        tourMode,
        tourSteps,
        selectedStoryId,
        contextKey,
        setTourMode,
        startCoreTour,
        startStoryTour,
        openScreenGuide,
        closeTour,
        chooseStory,
        completeTour,
        handleStepAdvance
    };
}
