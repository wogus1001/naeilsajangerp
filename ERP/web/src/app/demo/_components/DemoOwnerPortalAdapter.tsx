'use client';

import React from 'react';
import { OwnerPortalPanel } from '@/components/franchise/operations/OwnerPortalPanel';
import type { FranchiseLocation } from '@/components/franchise/operations/types';
import { DEMO_TOUR_STEP_ADVANCE_EVENT } from '../demoTypes';

type DemoOwnerPortalAdapterProps = {
    readonly userId: string;
    readonly companyName: string;
    readonly locations: readonly FranchiseLocation[];
};

export function DemoOwnerPortalAdapter({
    userId,
    companyName,
    locations
}: DemoOwnerPortalAdapterProps) {
    const [selectedView, setSelectedView] = React.useState<'accounts' | 'notices'>('notices');

    React.useEffect(() => {
        const handleStepAdvance = (event: WindowEventMap[typeof DEMO_TOUR_STEP_ADVANCE_EVENT]) => {
            const targetId = event.detail.toTargetId;
            if (
                targetId === 'owner-portal-account-tab'
                || targetId === 'owner-portal-account-create'
                || targetId === 'owner-portal-login-link'
                || targetId === 'owner-portal-accounts-tab'
            ) {
                setSelectedView('accounts');
                return;
            }
            if (targetId === 'owner-portal-notices') setSelectedView('notices');
        };

        window.addEventListener(DEMO_TOUR_STEP_ADVANCE_EVENT, handleStepAdvance);
        return () => window.removeEventListener(DEMO_TOUR_STEP_ADVANCE_EVENT, handleStepAdvance);
    }, []);

    return (
        <OwnerPortalPanel
            userId={userId}
            companyName={companyName}
            locations={locations}
            selectedView={selectedView}
        />
    );
}
