"use client";

import { FranchiseWorkspaceHero } from '@/components/franchise/FranchiseWorkspaceHero';
import { RealtyImportPanel } from '@/components/franchise/RealtyImportPanel';
import { LocationMasterSection } from '@/components/franchise/market-insights/LocationMasterSection';
import { MarketInsightOverview } from '@/components/franchise/market-insights/MarketInsightOverview';
import { MarketInsightViewTabs } from '@/components/franchise/market-insights/MarketInsightViewTabs';
import { MarketInsightWorkspaceTabs } from '@/components/franchise/market-insights/MarketInsightWorkspaceTabs';
import { useMarketInsightsController } from '@/components/franchise/market-insights/useMarketInsightsController';
import styles from '../page.module.css';

export default function FranchiseMarketInsightsPage() {
    const controller = useMarketInsightsController();
    const openRegionLocations = (region: string) => {
        controller.updateLocationFilters({ region });
        controller.selectMarketView('location-list');
    };

    return (
        <div className={styles.pageShell}>
            <FranchiseWorkspaceHero
                title="출점 후보지"
                description="입점 후보지와 가맹 희망자의 희망지역을 연결해 지역 반응과 점포 조건을 확인합니다."
            />

            <MarketInsightWorkspaceTabs
                activeTab={controller.activeMarketTab}
                onTabChange={controller.selectMarketTab}
            />

            {controller.activeMarketTab === 'market-insights' && (
                <section className={styles.marketWorkspace}>
                    <div className={styles.marketViewToolbar}>
                        <div>
                            <h2>출점 후보지 관리</h2>
                            <p>후보지 목록을 먼저 관리하고, 필요할 때 지역 인사이트를 따로 확인합니다.</p>
                        </div>
                        <MarketInsightViewTabs
                            activeView={controller.activeMarketView}
                            filteredLocationCount={controller.filteredLocations.length}
                            locationCount={controller.franchiseLocations.length}
                            insightCount={controller.marketInsights.length}
                            onViewChange={controller.selectMarketView}
                        />
                    </div>

                    {controller.activeMarketView === 'location-list' ? (
                        <LocationMasterSection
                            userId={controller.userId}
                            companyName={controller.companyName}
                            form={controller.locationForm}
                            filters={controller.locationFilters}
                            managerOptions={controller.managerOptions}
                            locations={controller.franchiseLocations}
                            filteredLocations={controller.filteredLocations}
                            isManagerLoading={controller.isManagerLoading}
                            isSaving={controller.isLocationSaving}
                            deletingLocationId={controller.deletingLocationId}
                            onFormChange={controller.updateLocationForm}
                            onFiltersChange={controller.updateLocationFilters}
                            onResetForm={controller.resetLocationForm}
                            onResetFilters={controller.resetLocationFilters}
                            onSave={() => void controller.saveFranchiseLocation()}
                            onSelectAddress={controller.selectKakaoAddress}
                            onSelectBrand={controller.selectBrand}
                            onEdit={controller.editFranchiseLocation}
                            onDelete={(location) => void controller.deleteFranchiseLocation(location)}
                        />
                    ) : (
                        <section className={styles.marketInsightPanel}>
                            <div className={styles.panelHeader}>
                                <div>
                                    <h2>지역 인사이트</h2>
                                    <p>가맹 희망지역과 출점 후보지를 묶어 우선 검토 지역을 봅니다.</p>
                                </div>
                            </div>
                            <div className={styles.marketInsightBody}>
                                <MarketInsightOverview
                                    marketInsights={controller.marketInsights}
                                    onSelectRegion={openRegionLocations}
                                />
                            </div>
                        </section>
                    )}
                </section>
            )}

            {controller.activeMarketTab === 'realty-import' && (
                <RealtyImportPanel userId={controller.userId} initialRegionHint={controller.realtyInitialRegion} />
            )}
        </div>
    );
}
