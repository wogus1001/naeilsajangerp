"use client";

import React from 'react';
import { BarChart3, Calculator, ClipboardCheck, List, PencilLine } from 'lucide-react';
import { FranchiseWorkspaceHero } from '@/components/franchise/FranchiseWorkspaceHero';
import { FranchiseOperationDashboard } from '@/components/franchise/operations/FranchiseOperationDashboard';
import { FranchiseLocationForm } from '@/components/franchise/operations/FranchiseLocationForm';
import { FranchiseLocationList } from '@/components/franchise/operations/FranchiseLocationList';
import { LaborPlanningPanel } from '@/components/franchise/operations/LaborPlanningPanel';
import { OperationsSummary } from '@/components/franchise/operations/OperationsSummary';
import { SupervisionPanel } from '@/components/franchise/operations/SupervisionPanel';
import type { FranchiseLocation } from '@/components/franchise/operations/types';
import { useFranchiseOperationsController } from '@/components/franchise/operations/useFranchiseOperationsController';
import styles from '../franchise-leads/page.module.css';

type MasterView = 'dashboard' | 'supervision' | 'labor' | 'list' | 'form';

const MASTER_VIEWS: readonly {
    readonly key: MasterView;
    readonly label: string;
    readonly icon: React.ComponentType<{ readonly size?: number }>;
}[] = [
    { key: 'dashboard', label: '대시보드', icon: BarChart3 },
    { key: 'supervision', label: '슈퍼바이징', icon: ClipboardCheck },
    { key: 'labor', label: '인력 세팅', icon: Calculator },
    { key: 'list', label: '가맹점 목록', icon: List },
    { key: 'form', label: '가맹점 등록', icon: PencilLine }
];

export default function FranchiseOperationsPage() {
    const controller = useFranchiseOperationsController();
    const [masterView, setMasterView] = React.useState<MasterView>('dashboard');

    React.useEffect(() => {
        if (controller.locationForm.id) {
            setMasterView('form');
        }
    }, [controller.locationForm.id]);

    const editLocation = (location: FranchiseLocation) => {
        controller.editLocation(location);
        setMasterView('form');
    };

    return (
        <div className={styles.pageShell}>
            <FranchiseWorkspaceHero
                title="가맹 운영"
                description="운영중인 직영점과 가맹점의 상태, 주소, 담당 메모를 본사용 운영 관점에서 관리합니다."
            />

            <section className={styles.operationWorkspace}>
                <div className={styles.locationMasterToolbar}>
                    <div className={styles.locationModeTabs} role="tablist" aria-label="가맹 운영 보기">
                        {MASTER_VIEWS.map(view => {
                            const Icon = view.icon;
                            const isActive = masterView === view.key;
                            return (
                                <button
                                    key={view.key}
                                    type="button"
                                    role="tab"
                                    aria-selected={isActive}
                                    className={isActive ? styles.locationModeTabActive : styles.locationModeTab}
                                    onClick={() => setMasterView(view.key)}
                                >
                                    <Icon size={13} />
                                    {view.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
                <div className={styles.operationWorkspaceBody}>
                    {masterView === 'dashboard' ? (
                        <>
                            <OperationsSummary
                                activeCount={controller.counts.activeCount}
                                openingCount={controller.counts.openingCount}
                                pausedCount={controller.counts.pausedCount}
                                totalCount={controller.operationalLocations.length}
                            />
                            <FranchiseOperationDashboard locations={controller.operationalLocations} />
                        </>
                    ) : null}

                    {masterView === 'list' ? (
                        <FranchiseLocationList
                            locations={controller.operationalLocations}
                            updatingStatusId={controller.updatingStatusId}
                            deletingLocationId={controller.deletingLocationId}
                            onEdit={editLocation}
                            onDelete={(location) => void controller.deleteLocation(location)}
                            onStatusChange={(location, status) => void controller.updateLocationStatus(location, status)}
                        />
                    ) : null}

                    {masterView === 'supervision' ? (
                        <SupervisionPanel userId={controller.userId} companyName={controller.companyName} />
                    ) : null}

                    {masterView === 'labor' ? (
                        <LaborPlanningPanel
                            userId={controller.userId}
                            companyName={controller.companyName}
                            locations={controller.operationalLocations}
                        />
                    ) : null}

                    {masterView === 'form' ? (
                        <div className={styles.locationMasterFormPane}>
                            <FranchiseLocationForm
                                userId={controller.userId}
                                companyName={controller.companyName}
                                form={controller.locationForm}
                                isSaving={controller.isSaving}
                                onChange={controller.updateLocationForm}
                                onReset={controller.resetLocationForm}
                                onSave={() => void controller.saveLocation()}
                                onSelectAddress={controller.selectKakaoAddress}
                                onSelectBrand={controller.selectBrand}
                            />
                        </div>
                    ) : null}
                </div>
                <div className={styles.marketRoadmap}>
                    <strong>운영 확장</strong>
                    <span>SV 방문/점검</span>
                    <span>계약완료 인계</span>
                    <span>CS/이슈 티켓</span>
                    <span>공지/매뉴얼 배포</span>
                </div>
            </section>
        </div>
    );
}
