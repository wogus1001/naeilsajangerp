"use client";

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { FranchiseWorkspaceHero } from '@/components/franchise/FranchiseWorkspaceHero';
import { OwnerPortalPanel } from '@/components/franchise/operations/OwnerPortalPanel';
import { useFranchiseOperationsController } from '@/components/franchise/operations/useFranchiseOperationsController';
import styles from '../../franchise-leads/page.module.css';

export default function FranchiseOwnerPortalPage() {
    const searchParams = useSearchParams();
    const controller = useFranchiseOperationsController();
    const selectedLocationId = searchParams.get('locationId') || '';

    return (
        <div className={styles.pageShell}>
            <FranchiseWorkspaceHero
                title="점주 소통"
                description="운영점별 점주 계정, 공지, 제출 요청을 본사에서 관리합니다."
            />
            <section className={styles.operationWorkspace}>
                <div className={styles.operationWorkspaceBody}>
                    <OwnerPortalPanel
                        userId={controller.userId}
                        companyName={controller.companyName}
                        locations={controller.operationalLocations}
                        selectedLocationId={selectedLocationId}
                    />
                </div>
            </section>
        </div>
    );
}
