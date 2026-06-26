'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DEMO_SCENARIOS, DEMO_SCREEN_GUIDES } from '../demoContent';
import type { DemoRole, DemoScreenId } from '../demoTypes';
import { useDemoApiGuard } from './DemoApiGuard';
import { DemoErpShell } from './DemoErpShell';
import { DemoRoleWorkspace } from './DemoRoleWorkspace';
import { DemoTourOverlay } from './DemoTourOverlay';

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
    const activeGuide = DEMO_SCREEN_GUIDES[activeScreen];
    const tourSteps = useMemo(
        () => activeGuide.steps.map((step, index) => ({
            id: `${activeScreen}-${index + 1}`,
            targetId: step.targetId,
            targetSelector: 'targetSelector' in step ? step.targetSelector : undefined,
            title: `${index + 1}. ${step.title}`,
            description: step.description
        })),
        [activeGuide.steps, activeScreen]
    );
    const finalTourAction = activeGuide.actions[0];
    const handleScreenChange = (screen: DemoScreenId) => {
        setActiveScreen(screen);
        setTourRun(run => run + 1);
        setIsTourOpen(true);
    };
    const handleLogout = async () => {
        const response = await fetch('/api/demo/access', { method: 'DELETE' });
        if (response.ok) {
            router.replace('/demo');
            router.refresh();
        }
    };

    return (
        <>
            <DemoErpShell
                scenario={scenario}
                activeScreen={activeScreen}
                onLogout={handleLogout}
                onScreenChange={handleScreenChange}
                onRestartTour={() => {
                    setTourRun(run => run + 1);
                    setIsTourOpen(true);
                }}
            >
                <DemoRoleWorkspace
                    role={role}
                    activeScreen={activeScreen}
                    onScreenChange={handleScreenChange}
                    onSimulate={() => undefined}
                />
            </DemoErpShell>
            {isTourOpen && (
                <DemoTourOverlay
                    key={`${role}-${activeScreen}-${tourRun}`}
                    steps={tourSteps}
                    finalAction={finalTourAction}
                    onCloseAction={() => setIsTourOpen(false)}
                    onFinalAction={action => handleScreenChange(action.screen)}
                />
            )}
        </>
    );
}
