'use client';

import React from 'react';
import ElectronicContractsPage from '@/app/(main)/contracts/electronic/_components/ElectronicContractsPage';
import { VendorContractRegisterPage } from '@/app/(main)/contracts/vendor/VendorContractRegisterPage';
import VendorContractsPage from '@/app/(main)/contracts/vendor/VendorContractsPage';
import FranchiseVendorsPage from '@/app/(main)/dashboard/franchise-vendors/page';
import { OwnerDashboardHome } from '@/app/owner/_components/OwnerDashboardHome';
import { FranchiseWorkspaceHero } from '@/components/franchise/FranchiseWorkspaceHero';
import { LaborPlanningPanel } from '@/components/franchise/operations/LaborPlanningPanel';
import { SupervisionPanel } from '@/components/franchise/operations/SupervisionPanel';
import { FranchiseSchedulePage } from '@/components/franchise/schedules/FranchiseSchedulePage';
import { setStoredUserRuntimeOverride } from '@/utils/userUtils';
import pageStyles from '../../(main)/dashboard/franchise-leads/page.module.css';
import {
    DEMO_OPERATION_LOCATIONS
} from './DemoFranchiseSampleData';
import {
    DEMO_FEATURE_SURFACES,
    type DemoFeatureSurfacePath
} from './DemoFranchiseFeatureConfig';
import { DemoOwnerPortalAdapter } from './DemoOwnerPortalAdapter';
import type { DemoRole } from '../demoTypes';

type DemoFranchiseFeatureSurfaceProps = {
    readonly path: DemoFeatureSurfacePath;
    readonly role: DemoRole;
    readonly search?: string;
};

function useDemoProductionIdentity(role: DemoRole): boolean {
    const [ready, setReady] = React.useState(false);

    React.useLayoutEffect(() => {
        setStoredUserRuntimeOverride({
            id: `demo-${role}`,
            uid: `demo-${role}`,
            name: role === 'admin' ? '관리자' : role === 'partner' ? '김재현' : '김담당',
            role,
            companyId: 'demo-company',
            companyName: role === 'partner' ? '데모 협력업체' : '데모'
        });
        setReady(true);

        return () => {
            setStoredUserRuntimeOverride(undefined);
        };
    }, [role]);

    return ready;
}

function OperationsSurface({
    title,
    description,
    children
}: {
    readonly title: string;
    readonly description: string;
    readonly children: React.ReactNode;
}) {
    return (
        <div className={pageStyles.pageShell}>
            <FranchiseWorkspaceHero title={title} description={description} />
            <section className={pageStyles.operationWorkspace}>
                {children}
            </section>
        </div>
    );
}

export function DemoFranchiseFeatureSurface({ path, role, search = '' }: DemoFranchiseFeatureSurfaceProps) {
    const ready = useDemoProductionIdentity(role);
    const surface = DEMO_FEATURE_SURFACES[path];
    const demoUserId = `demo-${role}`;

    if (!ready) {
        return <div className={pageStyles.pageShell} aria-label={`${surface.title} 화면 준비 중`} />;
    }

    return (
        <div data-demo-feature-path={path}>
            {path === '/dashboard/franchise-leads/labor-planning' ? (
                <OperationsSurface title={surface.title} description={surface.description}>
                    <LaborPlanningPanel
                        userId={demoUserId}
                        companyName="데모"
                        locations={DEMO_OPERATION_LOCATIONS}
                        initialLocationId={DEMO_OPERATION_LOCATIONS[0]?.id}
                        initialMonthlySalesManwon={6000}
                    />
                </OperationsSurface>
            ) : null}

            {path === '/dashboard/franchise-operations/schedule' ? <FranchiseSchedulePage /> : null}

            {path === '/dashboard/franchise-supervision' ? (
                <OperationsSurface title={surface.title} description={surface.description}>
                    <SupervisionPanel userId={demoUserId} companyName="데모" />
                </OperationsSurface>
            ) : null}

            {path === '/dashboard/franchise-operations/owner-portal' ? (
                <OperationsSurface title={surface.title} description={surface.description}>
                    <div className={pageStyles.operationWorkspaceBody}>
                        <DemoOwnerPortalAdapter
                            userId={demoUserId}
                            companyName="데모"
                            locations={DEMO_OPERATION_LOCATIONS}
                        />
                    </div>
                </OperationsSurface>
            ) : null}

            {path === '/contracts/electronic' ? <ElectronicContractsPage /> : null}
            {path === '/dashboard/franchise-vendors' ? <FranchiseVendorsPage /> : null}
            {path === '/contracts/vendor' ? <VendorContractsPage /> : null}
            {path === '/contracts/vendor/register' ? (
                <VendorContractRegisterPage
                    initialContractId={new URLSearchParams(search).get('contractId') || ''}
                />
            ) : null}
            {path === '/owner/dashboard' ? <OwnerDashboardHome /> : null}
        </div>
    );
}
