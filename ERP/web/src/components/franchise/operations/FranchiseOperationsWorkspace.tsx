"use client";

import React from 'react';
import { BarChart3, List, PencilLine } from 'lucide-react';
import type {
    KakaoAddressLookupSource,
    KakaoAddressResult
} from '@/components/franchise/KakaoAddressSearch';
import type { FranchiseBrandSearchSource } from '@/components/franchise/FranchiseBrandSelector';
import { FranchiseWorkspaceHero } from '@/components/franchise/FranchiseWorkspaceHero';
import type { FranchiseBrand } from '@/lib/franchise-brands';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import { FranchiseLocationForm } from './FranchiseLocationForm';
import { FranchiseLocationList } from './FranchiseLocationList';
import { FranchiseOperationDashboard } from './FranchiseOperationDashboard';
import { OperationsSummary } from './OperationsSummary';
import type {
    FranchiseLocation,
    FranchiseLocationStatus,
    LocationFormState
} from './types';

export type FranchiseOperationsWorkspaceModel = {
    readonly userId: string;
    readonly companyName: string;
    readonly locationForm: LocationFormState;
    readonly isSaving: boolean;
    readonly deletingLocationId: string;
    readonly updatingStatusId: string;
    readonly locations: readonly FranchiseLocation[];
    readonly counts: {
        readonly activeCount: number;
        readonly openingCount: number;
        readonly pausedCount: number;
    };
};

export type FranchiseOperationsWorkspaceActions = {
    readonly updateLocationForm: (patch: Partial<LocationFormState>) => void;
    readonly resetLocationForm: () => void;
    readonly saveLocation: () => void | Promise<void>;
    readonly editLocation: (location: FranchiseLocation) => void;
    readonly selectAddress: (result: KakaoAddressResult) => void;
    readonly selectBrand: (brand: FranchiseBrand) => void;
    readonly confirmDeleteLocation: (location: FranchiseLocation) => boolean | Promise<boolean>;
    readonly deleteLocation: (location: FranchiseLocation) => void | Promise<void>;
    readonly updateLocationStatus: (
        location: FranchiseLocation,
        status: FranchiseLocationStatus
    ) => void | Promise<void>;
    readonly openOwnerPortal?: ((location: FranchiseLocation) => void) | undefined;
};

type FranchiseOperationsWorkspaceProps = {
    readonly model: FranchiseOperationsWorkspaceModel;
    readonly actions: FranchiseOperationsWorkspaceActions;
    readonly addressLookupSource?: KakaoAddressLookupSource | undefined;
    readonly brandSearchSource?: FranchiseBrandSearchSource | undefined;
};

type MasterView = 'dashboard' | 'list' | 'form';

const MASTER_VIEWS: readonly {
    readonly key: MasterView;
    readonly label: string;
    readonly icon: React.ComponentType<{ readonly size?: number }>;
}[] = [
    { key: 'dashboard', label: '대시보드', icon: BarChart3 },
    { key: 'list', label: '가맹점 목록', icon: List },
    { key: 'form', label: '가맹점 등록', icon: PencilLine }
];

export function FranchiseOperationsWorkspace({
    model,
    actions,
    addressLookupSource,
    brandSearchSource
}: FranchiseOperationsWorkspaceProps) {
    const [masterView, setMasterView] = React.useState<MasterView>('dashboard');

    React.useEffect(() => {
        if (model.locationForm.id) {
            setMasterView('form');
        }
    }, [model.locationForm.id]);

    const editLocation = (location: FranchiseLocation) => {
        actions.editLocation(location);
        setMasterView('form');
    };

    const requestDeleteLocation = async (location: FranchiseLocation) => {
        const confirmed = await actions.confirmDeleteLocation(location);
        if (!confirmed) return;
        await actions.deleteLocation(location);
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
                                activeCount={model.counts.activeCount}
                                openingCount={model.counts.openingCount}
                                pausedCount={model.counts.pausedCount}
                                totalCount={model.locations.length}
                            />
                            <FranchiseOperationDashboard locations={model.locations} />
                        </>
                    ) : null}

                    {masterView === 'list' ? (
                        <FranchiseLocationList
                            locations={model.locations}
                            updatingStatusId={model.updatingStatusId}
                            deletingLocationId={model.deletingLocationId}
                            onEdit={editLocation}
                            onOpenOwnerPortal={actions.openOwnerPortal}
                            onDelete={(location) => void requestDeleteLocation(location)}
                            onStatusChange={(location, status) => void actions.updateLocationStatus(location, status)}
                        />
                    ) : null}

                    {masterView === 'form' ? (
                        <div className={styles.locationMasterFormPane}>
                            <FranchiseLocationForm
                                userId={model.userId}
                                companyName={model.companyName}
                                form={model.locationForm}
                                isSaving={model.isSaving}
                                addressLookupSource={addressLookupSource}
                                brandSearchSource={brandSearchSource}
                                onChange={actions.updateLocationForm}
                                onReset={actions.resetLocationForm}
                                onSave={() => void actions.saveLocation()}
                                onSelectAddress={actions.selectAddress}
                                onSelectBrand={actions.selectBrand}
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
