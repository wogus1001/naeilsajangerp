'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DEMO_SCENARIOS, DEMO_SCREEN_GUIDES } from '../demoContent';
import type { DemoRole, DemoScreenId } from '../demoTypes';
import {
    DEMO_NAVIGATION_REQUEST_EVENT,
    useDemoApiGuard,
    type DemoNavigationRequestEventDetail
} from './DemoApiGuard';
import { DemoErpShell } from './DemoErpShell';
import { DEMO_PATH_TO_SCREEN, isDemoFeaturePathAllowed } from './DemoErpShellConfig';
import {
    DemoFranchiseFeatureSurface
} from './DemoFranchiseFeatureSurface';
import {
    DEMO_FEATURE_SURFACES,
    isDemoFeatureSurfacePath,
    type DemoFeatureSurfacePath
} from './DemoFranchiseFeatureConfig';
import { DEMO_FEATURE_GUIDES } from './DemoFranchiseFeatureGuides';
import { DemoRoleWorkspace } from './DemoRoleWorkspace';
import { DemoRuntimeProviders } from './DemoRuntimeProviders';
import { DemoTourExperience } from './DemoTourExperience';
import { useDemoTourController } from './useDemoTourController';
import styles from '../demo.module.css';

type DemoShellProps = {
    readonly role: DemoRole;
};

export function DemoShell({ role }: DemoShellProps) {
    useDemoApiGuard();

    const router = useRouter();
    const scenario = DEMO_SCENARIOS[role];
    const defaultScreen = scenario.defaultScreen;
    const [activeScreen, setActiveScreen] = useState<DemoScreenId>(defaultScreen);
    const [simulationMessage, setSimulationMessage] = useState('');
    const [activeFeaturePath, setActiveFeaturePath] = useState<DemoFeatureSurfacePath | ''>('');
    const [activeFeatureSearch, setActiveFeatureSearch] = useState('');
    const activeGuide = activeFeaturePath
        ? DEMO_FEATURE_GUIDES[activeFeaturePath]
        : DEMO_SCREEN_GUIDES[activeScreen];
    const screenTourSteps = useMemo(
        () => activeGuide.steps.map((step, index) => ({
            id: `${activeFeaturePath || activeScreen}-${index + 1}`,
            targetId: step.targetId,
            targetSelector: step.targetSelector,
            emphasisTargetIds: step.emphasisTargetIds,
            emphasisTargetSelectors: step.emphasisTargetSelectors,
            title: `${index + 1}. ${step.title}`,
            description: step.description
        })),
        [activeFeaturePath, activeGuide.steps, activeScreen]
    );
    const tour = useDemoTourController({
        role,
        defaultScreen,
        allowedScreens: scenario.navItems.map(item => item.id),
        activeScreen,
        activeFeaturePath,
        coreSteps: scenario.tourSteps,
        screenSteps: screenTourSteps,
        setActiveScreen,
        setActiveFeaturePath,
        clearActiveFeatureSearch: () => setActiveFeatureSearch('')
    });
    const { setTourMode } = tour;
    useEffect(() => {
        if (!simulationMessage) return;
        const timer = window.setTimeout(() => setSimulationMessage(''), 4_000);
        return () => window.clearTimeout(timer);
    }, [simulationMessage]);
    useEffect(() => {
        const handleNavigationRequest = (event: CustomEvent<DemoNavigationRequestEventDetail>) => {
            const requestedPath = event.detail.path;
            const requestedUrl = new URL(requestedPath, window.location.origin);
            if (
                isDemoFeatureSurfacePath(requestedUrl.pathname)
                && isDemoFeaturePathAllowed(role, requestedUrl.pathname)
            ) {
                setActiveFeaturePath(requestedUrl.pathname);
                setActiveFeatureSearch(requestedUrl.search);
                setTourMode('closed');
                setSimulationMessage('');
                window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
                return;
            }
            const screen = DEMO_PATH_TO_SCREEN[`${requestedUrl.pathname}${requestedUrl.search}`]
                || DEMO_PATH_TO_SCREEN[requestedUrl.pathname];
            if (screen && scenario.navItems.some(item => item.id === screen)) {
                setActiveFeaturePath('');
                setActiveFeatureSearch('');
                setActiveScreen(screen);
                setTourMode('closed');
                setSimulationMessage('');
                window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
                return;
            }
            setSimulationMessage(event.detail.kind === 'popup'
                ? '데모에서는 출력·첨부 파일 새 창을 열지 않습니다.'
                : '이 화면은 데모 범위 밖이어서 현재 메뉴에서 계속 확인할 수 있습니다.'
            );
        };
        window.addEventListener(DEMO_NAVIGATION_REQUEST_EVENT, handleNavigationRequest);
        return () => window.removeEventListener(DEMO_NAVIGATION_REQUEST_EVENT, handleNavigationRequest);
    }, [role, scenario.navItems, setTourMode]);

    const handleScreenChange = (screen: DemoScreenId) => {
        if (!scenario.navItems.some(item => item.id === screen)) {
            setSimulationMessage('현재 데모 역할에서는 이 화면을 제공하지 않습니다.');
            return;
        }
        setActiveFeaturePath('');
        setActiveFeatureSearch('');
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        setActiveScreen(screen);
        setTourMode('closed');
    };
    const handleSimulate = (label: string) => {
        setSimulationMessage(label);
    };
    const handlePreviewPathChange = (path: string) => {
        if (!isDemoFeatureSurfacePath(path) || !isDemoFeaturePathAllowed(role, path)) {
            setSimulationMessage('현재 데모에서는 핵심 프랜차이즈 흐름을 먼저 확인해 주세요.');
            return;
        }
        setActiveFeaturePath(path);
        setActiveFeatureSearch('');
        setTourMode('closed');
        setSimulationMessage('');
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    };
    const handleLogout = async () => {
        const response = await fetch('/api/demo/access', { method: 'DELETE' });
        if (response.ok) {
            router.replace('/demo');
            router.refresh();
        }
    };

    return (
        <DemoRuntimeProviders>
            <DemoErpShell
                scenario={scenario}
                activeScreen={activeScreen}
                activePath={activeFeaturePath || undefined}
                activeTitle={activeFeaturePath ? DEMO_FEATURE_SURFACES[activeFeaturePath].title : undefined}
                onLogout={handleLogout}
                onScreenChange={handleScreenChange}
                onPreviewPathChange={handlePreviewPathChange}
                onSimulate={handleSimulate}
                onOpenExperience={tour.chooseStory}
            >
                <div hidden={Boolean(activeFeaturePath)} aria-hidden={Boolean(activeFeaturePath)}>
                    <DemoRoleWorkspace
                        role={role}
                        activeScreen={activeScreen}
                        onScreenChange={handleScreenChange}
                        onSimulate={handleSimulate}
                    />
                </div>
                {activeFeaturePath ? (
                    <DemoFranchiseFeatureSurface
                        path={activeFeaturePath}
                        role={role}
                        search={activeFeatureSearch}
                    />
                ) : null}
            </DemoErpShell>
            {simulationMessage ? (
                <div className={styles.demoActionStatus} role="status" aria-live="polite">
                    {simulationMessage}
                </div>
            ) : null}
            <DemoTourExperience
                role={role}
                mode={tour.tourMode}
                run={tour.tourRun}
                contextKey={tour.contextKey}
                steps={tour.tourSteps}
                completedStoryId={tour.selectedStoryId}
                onStartCoreAction={tour.startCoreTour}
                onStartStoryAction={tour.startStoryTour}
                onChooseStoryAction={tour.chooseStory}
                onExploreAction={tour.closeTour}
                onCompleteAction={tour.completeTour}
                onStepAdvanceAction={tour.handleStepAdvance}
                onContactAction={() => {
                    setTourMode('closed');
                    setSimulationMessage('도입 상담 요청을 확인했습니다. 담당자가 안내할 수 있도록 문의 채널을 준비 중입니다.');
                }}
            />
        </DemoRuntimeProviders>
    );
}
