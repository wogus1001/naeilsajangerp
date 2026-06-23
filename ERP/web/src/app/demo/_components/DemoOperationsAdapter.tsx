'use client';

import React from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import pageStyles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import { FranchiseWorkspaceHero } from '@/components/franchise/FranchiseWorkspaceHero';
import { FranchiseLocationList } from '@/components/franchise/operations/FranchiseLocationList';
import { OperationsSummary } from '@/components/franchise/operations/OperationsSummary';
import type { FranchiseLocation } from '@/components/franchise/operations/types';
import type { DemoActionHandler } from '../demoTypes';
import { DEMO_OPERATION_LOCATIONS } from './DemoFranchiseSampleData';

type DemoOperationsAdapterProps = {
    readonly onSimulate: DemoActionHandler;
};

export function DemoOperationsAdapter({ onSimulate }: DemoOperationsAdapterProps) {
    const [locations, setLocations] = React.useState<readonly FranchiseLocation[]>(DEMO_OPERATION_LOCATIONS);
    const activeCount = locations.filter(location => location.status === '운영중').length;
    const openingCount = locations.filter(location => location.status === '오픈준비').length;
    const pausedCount = locations.filter(location => location.status === '휴점').length;

    const updateStatus = (target: FranchiseLocation, status: FranchiseLocation['status']) => {
        setLocations(current => current.map(location => (
            location.id === target.id ? { ...location, status } : location
        )));
        onSimulate(`${target.name} 샘플 상태 변경`);
    };

    return (
        <div className={pageStyles.pageShell} data-demo-id="operations-panel">
            <FranchiseWorkspaceHero
                title="가맹 운영"
                description="운영 중인 직영점/가맹점과 오픈 준비 매장의 상태를 관리합니다."
                actions={(
                    <>
                        <button className={pageStyles.secondaryButton} onClick={() => onSimulate('샘플 새로고침')}>
                            <RefreshCw size={16} />
                            새로고침
                        </button>
                        <button className={pageStyles.primaryButton} onClick={() => onSimulate('샘플 운영 매장 등록')}>
                            <Plus size={16} />
                            운영 매장 등록
                        </button>
                    </>
                )}
            />
            <div className={pageStyles.marketInsightPanel}>
                <div className={pageStyles.marketInsightBody}>
                    <OperationsSummary
                        activeCount={activeCount}
                        openingCount={openingCount}
                        pausedCount={pausedCount}
                        addressedCount={locations.filter(location => location.address).length}
                    />
                    <div className={pageStyles.locationMasterPanel}>
                        <div className={pageStyles.locationMasterHeader}>
                            <div>
                                <h3>가맹점 목록</h3>
                                <p>데모에서는 샘플 매장 상태만 로컬로 변경됩니다.</p>
                            </div>
                        </div>
                        <FranchiseLocationList
                            locations={locations}
                            updatingStatusId=""
                            deletingLocationId=""
                            onEdit={location => onSimulate(`${location.name} 샘플 수정`)}
                            onDelete={location => {
                                setLocations(current => current.filter(item => item.id !== location.id));
                                onSimulate(`${location.name} 샘플 삭제`);
                            }}
                            onStatusChange={updateStatus}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
