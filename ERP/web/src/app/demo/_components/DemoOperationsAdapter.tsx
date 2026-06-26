'use client';

import React from 'react';
import { Plus } from 'lucide-react';
import pageStyles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import { FranchiseWorkspaceHero } from '@/components/franchise/FranchiseWorkspaceHero';
import { FranchiseLocationList } from '@/components/franchise/operations/FranchiseLocationList';
import { OperationsSummary } from '@/components/franchise/operations/OperationsSummary';
import type { FranchiseLocation } from '@/components/franchise/operations/types';
import type { DemoActionHandler, DemoScreenId } from '../demoTypes';
import { DEMO_OPERATION_LOCATIONS } from './DemoFranchiseSampleData';
import { DemoRecordDrawer } from './DemoRecordDrawer';
import { DemoGuideTarget, DemoGuidedLayout } from './DemoScreenGuide';

type DemoOperationsAdapterProps = {
    readonly onScreenChange: (screen: DemoScreenId) => void;
    readonly onSimulate: DemoActionHandler;
};

export function DemoOperationsAdapter({ onScreenChange, onSimulate }: DemoOperationsAdapterProps) {
    const [locations, setLocations] = React.useState<readonly FranchiseLocation[]>(DEMO_OPERATION_LOCATIONS);
    const [selectedLocationId, setSelectedLocationId] = React.useState<string | null>(null);
    const activeCount = locations.filter(location => location.status === '운영중').length;
    const openingCount = locations.filter(location => location.status === '오픈준비').length;
    const pausedCount = locations.filter(location => location.status === '휴점').length;
    const selectedLocation = selectedLocationId ? locations.find(location => location.id === selectedLocationId) || null : null;

    const updateStatus = (target: FranchiseLocation, status: FranchiseLocation['status']) => {
        setLocations(current => current.map(location => (
            location.id === target.id ? { ...location, status } : location
        )));
        onSimulate(`${target.name} 샘플 상태 변경`);
    };
    const openOperation = (location: FranchiseLocation) => {
        setSelectedLocationId(location.id);
        onSimulate(`${location.name} 샘플 운영 상세 열기`);
    };

    return (
        <div className={pageStyles.pageShell} data-demo-id="operations-panel">
            <FranchiseWorkspaceHero
                title="가맹 운영"
                description="운영 중인 직영점/가맹점과 오픈 준비 매장의 상태를 관리합니다."
                actions={(
                    <button className={pageStyles.primaryButton} onClick={() => onSimulate('샘플 운영 매장 등록')}>
                        <Plus size={16} />
                        운영 매장 등록
                    </button>
                )}
            />
            <DemoGuidedLayout screen="operations" onScreenChange={onScreenChange}>
                <div className={pageStyles.marketInsightPanel}>
                    <div className={pageStyles.marketInsightBody}>
                        <DemoGuideTarget marker={1} targetId="operations-summary" label="운영상태 확인">
                            <OperationsSummary
                                activeCount={activeCount}
                                openingCount={openingCount}
                                pausedCount={pausedCount}
                                totalCount={locations.length}
                            />
                        </DemoGuideTarget>
                        <DemoGuideTarget marker={2} targetId="operations-list" label="개별 매장 열기">
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
                                    onEdit={openOperation}
                                    onDelete={location => {
                                        setLocations(current => current.filter(item => item.id !== location.id));
                                        onSimulate(`${location.name} 샘플 삭제`);
                                    }}
                                    onStatusChange={updateStatus}
                                />
                            </div>
                        </DemoGuideTarget>
                        <DemoGuideTarget marker={3} targetId="operations-guide-link" label="지도 연결">
                            <button type="button" className={pageStyles.secondaryButton} onClick={() => onScreenChange('locationMap')}>
                                물건지 지도에서 지역 흐름 보기
                            </button>
                        </DemoGuideTarget>
                    </div>
                </div>
            </DemoGuidedLayout>
            {selectedLocation ? (
                <DemoRecordDrawer
                    badge={selectedLocation.locationType}
                    title={selectedLocation.name}
                    description={selectedLocation.memo || '운영 메모가 없습니다.'}
                    fields={[
                        { label: '브랜드', value: selectedLocation.brand },
                        { label: '상태', value: selectedLocation.status },
                        { label: '지역', value: selectedLocation.region },
                        { label: '주소', value: selectedLocation.address },
                        { label: '오픈일', value: selectedLocation.openedAt || '미정' },
                        { label: '업종', value: selectedLocation.industry || '미입력' },
                        { label: '경쟁 키워드', value: selectedLocation.competitionKeyword || '미입력' },
                        { label: '지도 좌표', value: selectedLocation.latitude && selectedLocation.longitude ? '등록됨' : '미등록' }
                    ]}
                    steps={[
                        { title: '운영상태 확인', description: '운영중, 오픈준비, 휴점, 폐점 상태를 기준으로 본사 관리 대상을 나눕니다.' },
                        { title: '오픈 준비 연결', description: '오픈준비 매장은 계약 완료 상세의 오픈 준비 프로젝트와 같은 흐름으로 봅니다.' },
                        { title: '지도와 함께 보기', description: '물건지 지도에서 주변 운영점과 후보지 밀집도를 함께 확인합니다.' }
                    ]}
                    primaryActionLabel="물건지 지도 열기"
                    onPrimaryAction={() => onScreenChange('locationMap')}
                    onCloseAction={() => setSelectedLocationId(null)}
                />
            ) : null}
        </div>
    );
}
