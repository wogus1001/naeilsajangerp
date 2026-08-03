'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DEMO_SCENARIOS, DEMO_SCREEN_GUIDES } from '../demoContent';
import { DEMO_TOUR_STEP_ADVANCE_EVENT } from '../demoTypes';
import type { DemoRole, DemoScreenId, DemoTourStep, DemoTourStepAdvanceEventDetail } from '../demoTypes';
import { useDemoApiGuard } from './DemoApiGuard';
import { DemoErpShell } from './DemoErpShell';
import { DemoRoleWorkspace } from './DemoRoleWorkspace';
import { DemoRuntimeProviders } from './DemoRuntimeProviders';
import { DemoTourOverlay } from './DemoTourOverlay';
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
    const [tourRun, setTourRun] = useState(0);
    const [isTourOpen, setIsTourOpen] = useState(true);
    const [simulationMessage, setSimulationMessage] = useState('');
    const activeGuide = DEMO_SCREEN_GUIDES[activeScreen];
    const tourSteps = useMemo(
        () => activeGuide.steps.map((step, index) => ({
            id: `${activeScreen}-${index + 1}`,
            targetId: step.targetId,
            targetSelector: step.targetSelector,
            emphasisTargetIds: step.emphasisTargetIds,
            emphasisTargetSelectors: step.emphasisTargetSelectors,
            title: `${index + 1}. ${step.title}`,
            description: step.description
        })),
        [activeGuide.steps, activeScreen]
    );
    const finalTourAction = activeGuide.actions.find(action => (
        scenario.navItems.some(item => item.id === action.screen)
    ));
    const handleScreenChange = (screen: DemoScreenId) => {
        if (!scenario.navItems.some(item => item.id === screen)) {
            setSimulationMessage('현재 데모 역할에서는 이 화면을 제공하지 않습니다.');
            return;
        }
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        setActiveScreen(screen);
        setTourRun(run => run + 1);
        setIsTourOpen(true);
    };
    const handleTourStepAdvance = (currentStep: DemoTourStep, nextStep: DemoTourStep | undefined) => {
        window.dispatchEvent(new CustomEvent<DemoTourStepAdvanceEventDetail>(DEMO_TOUR_STEP_ADVANCE_EVENT, {
            detail: {
                screen: activeScreen,
                fromTargetId: currentStep.targetId,
                toTargetId: nextStep?.targetId
            }
        }));
    };
    const handleSimulate = (label: string) => {
        setSimulationMessage(label);
    };
    const handleTourClose = () => {
        setIsTourOpen(false);
        window.requestAnimationFrame(() => {
            window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        });
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
                onLogout={handleLogout}
                onScreenChange={handleScreenChange}
                onSimulate={handleSimulate}
                onRestartTour={() => {
                    setTourRun(run => run + 1);
                    setIsTourOpen(true);
                }}
            >
                <DemoRoleWorkspace
                    role={role}
                    activeScreen={activeScreen}
                    onScreenChange={handleScreenChange}
                    onSimulate={handleSimulate}
                />
            </DemoErpShell>
            {simulationMessage ? (
                <div className={styles.demoActionStatus} role="status" aria-live="polite">
                    {simulationMessage}
                </div>
            ) : null}
            {isTourOpen && (
                <DemoTourOverlay
                    key={`${role}-${activeScreen}-${tourRun}`}
                    steps={tourSteps}
                    finalAction={finalTourAction}
                    onCloseAction={handleTourClose}
                    onFinalAction={action => handleScreenChange(action.screen)}
                    onStepAdvanceAction={handleTourStepAdvance}
                />
            )}
        </DemoRuntimeProviders>
    );
}
