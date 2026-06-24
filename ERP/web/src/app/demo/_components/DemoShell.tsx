'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DEMO_SCENARIOS } from '../demoContent';
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
    const [notice, setNotice] = useState('데모 설명을 따라가거나 직접 메뉴를 눌러 체험할 수 있습니다.');
    const [tourRun, setTourRun] = useState(0);
    const [isTourOpen, setIsTourOpen] = useState(true);
    const activeNav = useMemo(
        () => scenario.navItems.find(item => item.id === activeScreen) ?? scenario.navItems[0],
        [activeScreen, scenario.navItems]
    );
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
                notice={`${activeNav?.description ?? '프랜차이즈 샘플 화면'} · ${notice}`}
                onLogout={handleLogout}
                onScreenChange={setActiveScreen}
                onRestartTour={() => {
                    setTourRun(run => run + 1);
                    setIsTourOpen(true);
                }}
            >
                <DemoRoleWorkspace
                    role={role}
                    activeScreen={activeScreen}
                    onScreenChange={setActiveScreen}
                    onSimulate={label => setNotice(`${label} 시뮬레이션이 완료됐습니다.`)}
                />
            </DemoErpShell>
            {isTourOpen && (
                <DemoTourOverlay
                    key={`${role}-${tourRun}`}
                    steps={scenario.tourSteps}
                    onCloseAction={() => setIsTourOpen(false)}
                />
            )}
        </>
    );
}
