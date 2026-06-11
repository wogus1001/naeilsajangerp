"use client";

import React from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { FranchiseLocationForm } from '@/components/franchise/operations/FranchiseLocationForm';
import { FranchiseLocationList } from '@/components/franchise/operations/FranchiseLocationList';
import { ManualPromotedPropertyPanel } from '@/components/franchise/operations/ManualPromotedPropertyPanel';
import { OpeningProjectPanel } from '@/components/franchise/operations/OpeningProjectPanel';
import { OperationsSummary } from '@/components/franchise/operations/OperationsSummary';
import { useFranchiseOperationsController } from '@/components/franchise/operations/useFranchiseOperationsController';
import styles from '../franchise-leads/page.module.css';

export default function FranchiseOperationsPage() {
    const controller = useFranchiseOperationsController();

    return (
        <div className={styles.pageShell}>
            <section className={styles.hero}>
                <div>
                    <h1>가맹 운영</h1>
                    <p>운영중인 직영점과 가맹점의 상태, 주소, 경쟁환경을 본사용 운영 관점에서 관리합니다.</p>
                </div>
                <div className={styles.heroActions}>
                    <button
                        className={styles.secondaryButton}
                        onClick={() => void controller.fetchLocations()}
                        disabled={controller.isLoading}
                    >
                        <RefreshCw size={16} />
                        {controller.isLoading ? '불러오는 중' : '새로고침'}
                    </button>
                </div>
            </section>

            <section className={styles.marketInsightPanel}>
                <div className={styles.panelHeader}>
                    <div>
                        <h2>가맹점 운영 현황</h2>
                        <p>출점 후보지와 분리된 현재 점포 관리 화면입니다. 추후 SV 점검, CS, 오픈 준비 프로젝트와 연결합니다.</p>
                    </div>
                    <span>운영관리 · 본사 전용</span>
                </div>
                <div className={styles.marketInsightBody}>
                    <OperationsSummary
                        activeCount={controller.counts.activeCount}
                        openingCount={controller.counts.openingCount}
                        pausedCount={controller.counts.pausedCount}
                        scannedCount={controller.counts.scannedCount}
                    />

                    <div className={styles.locationMasterPanel}>
                        <div className={styles.locationMasterHeader}>
                            <div>
                                <h3>가맹점 마스터</h3>
                                <p>운영중/오픈준비/휴점 매장을 관리합니다. 예정지 관리는 모객DB의 출점 후보지에서 분리해 다룹니다.</p>
                            </div>
                            <button className={styles.secondaryButton} onClick={controller.resetLocationForm}>
                                <Plus size={14} />
                                새 가맹점
                            </button>
                        </div>
                        <div className={styles.locationMasterGrid}>
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
                            <FranchiseLocationList
                                locations={controller.operationalLocations}
                                updatingStatusId={controller.updatingStatusId}
                                scanningLocationId={controller.scanningLocationId}
                                deletingLocationId={controller.deletingLocationId}
                                onEdit={controller.editLocation}
                                onDelete={(location) => void controller.deleteLocation(location)}
                                onScan={(location) => void controller.scanLocationCompetitors(location)}
                                onStatusChange={(location, status) => void controller.updateLocationStatus(location, status)}
                            />
                        </div>
                    </div>

                    <ManualPromotedPropertyPanel
                        entries={controller.manualPromotedEntries}
                        isLoading={controller.isLoadingPromotedProperties}
                        creatingPropertyId={controller.creatingLocationPropertyId}
                        onRefresh={() => void controller.fetchManualPromotedProperties()}
                        onCreateLocation={(entry) => void controller.createLocationFromManualPromotedProperty(entry)}
                    />

                    <OpeningProjectPanel
                        userId={controller.userId}
                        companyName={controller.companyName}
                        locations={controller.operationalLocations}
                    />

                    <div className={styles.marketRoadmap}>
                        <strong>운영 확장</strong>
                        <span>SV 방문/점검</span>
                        <span>오픈 준비 프로젝트</span>
                        <span>CS/이슈 티켓</span>
                        <span>공지/매뉴얼 배포</span>
                    </div>
                </div>
            </section>
        </div>
    );
}
