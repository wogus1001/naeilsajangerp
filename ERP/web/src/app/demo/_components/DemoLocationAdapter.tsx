'use client';

import React from 'react';
import pageStyles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import { useAppDialog } from '@/components/common/AppDialogProvider';
import type { KakaoAddressResult } from '@/components/franchise/KakaoAddressSearch';
import { FranchiseWorkspaceHero } from '@/components/franchise/FranchiseWorkspaceHero';
import { RealtyImportPanel } from '@/components/franchise/RealtyImportPanel';
import { LocationMasterSection } from '@/components/franchise/market-insights/LocationMasterSection';
import { MarketInsightOverview } from '@/components/franchise/market-insights/MarketInsightOverview';
import {
    MarketInsightViewTabs,
    type MarketInsightView
} from '@/components/franchise/market-insights/MarketInsightViewTabs';
import {
    MarketInsightWorkspaceTabs,
    type MarketInsightTab
} from '@/components/franchise/market-insights/MarketInsightWorkspaceTabs';
import type { FranchiseLocation, LocationFormState } from '@/components/franchise/market-insights/locationMasterTypes';
import {
    EMPTY_LOCATION_FILTERS,
    EMPTY_LOCATION_FORM,
    filterLocationMasterItems,
    toLocationFormState
} from '@/components/franchise/market-insights/locationMasterUtils';
import type { FranchiseBrand } from '@/lib/franchise-brands';
import { buildMarketInsights } from '@/lib/franchise-market-insights';
import type { DemoActionHandler, DemoRole, DemoScreenId } from '../demoTypes';
import {
    DEMO_LOCATION_MANAGERS,
    selectDemoLocationMasterItems
} from './DemoFranchiseSampleData';
import {
    createDemoLocationRuntime,
    DEMO_ADDRESS_LOOKUP_SOURCE,
    DEMO_BRAND_SEARCH_SOURCE
} from './DemoLocationRuntime';
import { DEMO_SAMPLE_LEADS } from './DemoLeadSampleData';
import { DemoGuideTarget, DemoGuidedLayout } from './DemoScreenGuide';

type DemoLocationAdapterProps = {
    readonly role: DemoRole;
    readonly onScreenChange: (screen: DemoScreenId) => void;
    readonly onSimulate: DemoActionHandler;
};

function toLocationItem(
    form: LocationFormState,
    fallbackId: string,
    existing?: FranchiseLocation
): FranchiseLocation {
    return {
        ...existing,
        id: form.id || fallbackId,
        companyId: 'demo-company',
        managerId: form.managerId || null,
        managerName: DEMO_LOCATION_MANAGERS.find(manager => manager.id === form.managerId)?.name,
        name: form.name || '샘플 후보지',
        locationType: form.locationType,
        brand: form.brand,
        status: form.status,
        region: form.region,
        address: form.address,
        addressDetail: form.addressDetail,
        latitude: form.latitude,
        longitude: form.longitude,
        openedAt: form.openedAt || null,
        memo: form.memo,
        createdAt: existing?.createdAt || '2026-07-30T01:00:00.000Z',
        updatedAt: '2026-07-30T01:00:00.000Z',
        sourcePropertyId: existing?.sourcePropertyId || null,
        competitionKeyword: form.competitionKeyword,
        meetingTool: form.meetingTool,
        brandId: form.brandId,
        industry: form.industry,
        businessType: form.businessType,
        categoryMajor: form.categoryMajor,
        categoryMiddle: form.categoryMiddle,
        categorySmall: form.categorySmall,
        developmentStage: form.developmentStage,
        importance: form.importance,
        fileNames: form.fileNames,
        fileAttachments: form.fileAttachments,
        siteCondition: form.siteCondition,
        landlord: form.landlord,
        cost: form.cost,
        lease: form.lease
    };
}

export function DemoLocationAdapter({ role, onScreenChange, onSimulate }: DemoLocationAdapterProps) {
    const { showAlert, showConfirm } = useAppDialog();
    const defaultManagerId = role === 'partner' ? 'partner-kim' : 'manager-kim';
    const managerOptions = role === 'partner'
        ? DEMO_LOCATION_MANAGERS.filter(manager => manager.id === 'partner-kim')
        : DEMO_LOCATION_MANAGERS;
    const [locations, setLocations] = React.useState<readonly FranchiseLocation[]>(() => selectDemoLocationMasterItems(role));
    const [filters, setFilters] = React.useState(EMPTY_LOCATION_FILTERS);
    const [activeMarketTab, setActiveMarketTab] = React.useState<MarketInsightTab>('market-insights');
    const [activeMarketView, setActiveMarketView] = React.useState<MarketInsightView>('location-list');
    const [form, setForm] = React.useState<LocationFormState>(() => ({
        ...EMPTY_LOCATION_FORM,
        brand: '미카도',
        managerId: defaultManagerId
    }));
    const [deletingLocationId, setDeletingLocationId] = React.useState('');
    const [interactionRuntime] = React.useState(createDemoLocationRuntime);
    const filteredLocations = React.useMemo(
        () => filterLocationMasterItems(locations, filters),
        [filters, locations]
    );
    const marketInsights = React.useMemo(() => {
        const scopedLeads = role === 'partner'
            ? DEMO_SAMPLE_LEADS.filter(lead => lead.managerId === 'partner-kim')
            : DEMO_SAMPLE_LEADS;
        return buildMarketInsights(scopedLeads, locations);
    }, [locations, role]);

    const resetForm = () => setForm({
        ...EMPTY_LOCATION_FORM,
        brand: '미카도',
        managerId: defaultManagerId
    });
    const resetFilters = () => setFilters(EMPTY_LOCATION_FILTERS);
    const updateForm = (patch: Partial<LocationFormState>) => setForm(current => ({ ...current, ...patch }));
    const saveLocation = () => {
        if (!form.name.trim()) {
            void showAlert({ title: '후보지 저장', message: '후보지명을 입력해주세요.', type: 'error' });
            return;
        }
        if (!form.region.trim() && !form.address.trim()) {
            void showAlert({ title: '후보지 저장', message: '지역 또는 주소를 입력해주세요.', type: 'error' });
            return;
        }
        const existing = form.id ? locations.find(location => location.id === form.id) : undefined;
        const nextLocation = toLocationItem(form, `demo-location-${locations.length + 1}`, existing);
        const isEditing = Boolean(form.id);
        setLocations(current => {
            if (isEditing) return current.map(location => location.id === nextLocation.id ? nextLocation : location);
            return [nextLocation, ...current];
        });
        resetForm();
        onSimulate(isEditing ? '샘플 후보지 수정 완료' : '샘플 후보지 등록 완료');
    };
    const openLocation = (location: FranchiseLocation) => {
        setForm(toLocationFormState(location));
        onSimulate(`${location.name} 수정 양식을 열었습니다.`);
    };
    const selectAddress = (result: KakaoAddressResult) => {
        updateForm({
            address: result.address,
            region: result.region,
            latitude: result.latitude,
            longitude: result.longitude
        });
    };
    const selectBrand = (brand: FranchiseBrand) => {
        updateForm({
            brand: brand.brandName,
            brandId: brand.id,
            industry: brand.industry || '',
            businessType: brand.categoryMajor || '',
            categoryMajor: brand.categoryMajor || '',
            categoryMiddle: brand.categoryMiddle || '',
            categorySmall: brand.categorySmall || '',
            competitionKeyword: brand.recommendedKeywords?.[0] || brand.brandName
        });
    };
    const deleteLocation = async (location: FranchiseLocation) => {
        const confirmed = await showConfirm({
            title: '출점 후보지 삭제',
            message: `${location.name} 후보지를 삭제할까요? 데모의 로컬 목록에서만 삭제됩니다.`,
            confirmText: '삭제',
            isDanger: true
        });
        if (!confirmed) return;
        setDeletingLocationId(location.id);
        setLocations(current => current.filter(item => item.id !== location.id));
        if (form.id === location.id) resetForm();
        setDeletingLocationId('');
        onSimulate(`${location.name} 샘플 후보지를 삭제했습니다.`);
    };
    const openRegionLocations = (region: string) => {
        setFilters(current => ({ ...current, region }));
        setActiveMarketView('location-list');
        onSimulate(`${region} 후보지만 모아봅니다.`);
    };

    return (
        <div className={pageStyles.pageShell} data-demo-id="location-panel">
            <FranchiseWorkspaceHero
                title="출점 후보지"
                description="입점 후보지와 가맹 희망자의 희망지역을 연결해 지역 반응과 점포 조건을 확인합니다."
            />
            <DemoGuidedLayout screen="location" onScreenChange={onScreenChange}>
                <div data-demo-id="location-workspace-tabs">
                    <MarketInsightWorkspaceTabs
                        activeTab={activeMarketTab}
                        onTabChange={setActiveMarketTab}
                    />
                </div>

                {activeMarketTab === 'market-insights' && (
                    <DemoGuideTarget marker={1} targetId="location-master" label="출점 후보지 관리">
                        <section className={pageStyles.marketWorkspace}>
                            <div className={pageStyles.marketViewToolbar} data-demo-id="location-view-tabs">
                                <div>
                                    <h2>출점 후보지 관리</h2>
                                    <p>후보지 목록을 먼저 관리하고, 필요할 때 지역 인사이트를 따로 확인합니다.</p>
                                </div>
                                <MarketInsightViewTabs
                                    activeView={activeMarketView}
                                    filteredLocationCount={filteredLocations.length}
                                    locationCount={locations.length}
                                    insightCount={marketInsights.length}
                                    onViewChange={setActiveMarketView}
                                />
                            </div>

                            {activeMarketView === 'location-list' ? (
                                <LocationMasterSection
                                    userId={role === 'partner' ? 'demo-partner' : 'demo-manager'}
                                    companyName="민티아"
                                    form={form}
                                    filters={filters}
                                    managerOptions={managerOptions}
                                    locations={locations}
                                    filteredLocations={filteredLocations}
                                    isManagerLoading={false}
                                    isSaving={false}
                                    deletingLocationId={deletingLocationId}
                                    addressLookupSource={DEMO_ADDRESS_LOOKUP_SOURCE}
                                    brandSearchSource={DEMO_BRAND_SEARCH_SOURCE}
                                    interactionRuntime={interactionRuntime}
                                    mapRuntime="offline"
                                    onFormChange={updateForm}
                                    onFiltersChange={patch => setFilters(current => ({ ...current, ...patch }))}
                                    onResetForm={resetForm}
                                    onResetFilters={resetFilters}
                                    onSave={saveLocation}
                                    onSelectAddress={selectAddress}
                                    onSelectBrand={selectBrand}
                                    onEdit={openLocation}
                                    onDelete={location => void deleteLocation(location)}
                                />
                            ) : (
                                <section className={pageStyles.marketInsightPanel} data-demo-id="location-region-insight">
                                    <div className={pageStyles.panelHeader}>
                                        <div>
                                            <h2>지역 인사이트</h2>
                                            <p>가맹 희망지역과 출점 후보지를 묶어 우선 검토 지역을 봅니다.</p>
                                        </div>
                                    </div>
                                    <div className={pageStyles.marketInsightBody}>
                                        <MarketInsightOverview
                                            marketInsights={marketInsights}
                                            onSelectRegion={openRegionLocations}
                                        />
                                    </div>
                                </section>
                            )}
                        </section>
                    </DemoGuideTarget>
                )}

                {activeMarketTab === 'realty-import' && (
                    <div data-demo-id="location-realty-import">
                        <RealtyImportPanel
                            userId={role === 'partner' ? 'demo-partner' : 'demo-manager'}
                            initialRegionHint="서울 강남구"
                        />
                    </div>
                )}
            </DemoGuidedLayout>
        </div>
    );
}
