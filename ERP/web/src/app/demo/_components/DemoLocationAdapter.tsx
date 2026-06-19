'use client';

import React from 'react';
import pageStyles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import type { KakaoAddressResult } from '@/components/franchise/KakaoAddressSearch';
import { FranchiseWorkspaceHero } from '@/components/franchise/FranchiseWorkspaceHero';
import { LocationMasterSection } from '@/components/franchise/market-insights/LocationMasterSection';
import { MarketInsightViewTabs } from '@/components/franchise/market-insights/MarketInsightViewTabs';
import { MarketInsightWorkspaceTabs } from '@/components/franchise/market-insights/MarketInsightWorkspaceTabs';
import type { FranchiseLocation, LocationFormState } from '@/components/franchise/market-insights/locationMasterTypes';
import {
    EMPTY_LOCATION_FILTERS,
    EMPTY_LOCATION_FORM,
    filterLocationMasterItems,
    toLocationFormState
} from '@/components/franchise/market-insights/locationMasterUtils';
import type { FranchiseBrand } from '@/lib/franchise-brands';
import type { DemoActionHandler } from '../demoTypes';
import {
    DEMO_LOCATION_MANAGERS,
    DEMO_LOCATION_MASTER_ITEMS
} from './DemoFranchiseSampleData';

type DemoLocationAdapterProps = {
    readonly onSimulate: DemoActionHandler;
};

function toLocationItem(form: LocationFormState, fallbackId: string): FranchiseLocation {
    return {
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
        createdAt: '2026-06-19T01:00:00.000Z',
        updatedAt: '2026-06-19T01:00:00.000Z',
        sourcePropertyId: null,
        competitionKeyword: form.competitionKeyword,
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

export function DemoLocationAdapter({ onSimulate }: DemoLocationAdapterProps) {
    const [locations, setLocations] = React.useState<readonly FranchiseLocation[]>(DEMO_LOCATION_MASTER_ITEMS);
    const [filters, setFilters] = React.useState(EMPTY_LOCATION_FILTERS);
    const [form, setForm] = React.useState<LocationFormState>(() => ({
        ...EMPTY_LOCATION_FORM,
        brand: '미카도',
        managerId: 'manager-kim'
    }));
    const filteredLocations = React.useMemo(
        () => filterLocationMasterItems(locations, filters),
        [filters, locations]
    );

    const resetForm = () => setForm({
        ...EMPTY_LOCATION_FORM,
        brand: '미카도',
        managerId: 'manager-kim'
    });
    const resetFilters = () => setFilters(EMPTY_LOCATION_FILTERS);
    const updateForm = (patch: Partial<LocationFormState>) => setForm(current => ({ ...current, ...patch }));
    const saveLocation = () => {
        const nextLocation = toLocationItem(form, `demo-location-${locations.length + 1}`);
        setLocations(current => {
            const exists = current.some(location => location.id === nextLocation.id);
            if (exists) return current.map(location => location.id === nextLocation.id ? nextLocation : location);
            return [nextLocation, ...current];
        });
        onSimulate(form.id ? '샘플 후보지 수정' : '샘플 후보지 반영');
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

    return (
        <div className={pageStyles.pageShell} data-demo-id="location-panel">
            <FranchiseWorkspaceHero
                title="출점 후보지"
                description="후보지 목록을 따로 관리하고, 필요한 지역 인사이트를 함께 확인합니다."
            />
            <MarketInsightWorkspaceTabs activeTab="market-insights" onTabChange={() => onSimulate('샘플 출점 후보지 탭')} />
            <div className={pageStyles.marketInsightPanel}>
                <MarketInsightViewTabs
                    activeView="location-list"
                    filteredLocationCount={filteredLocations.length}
                    locationCount={locations.length}
                    insightCount={4}
                    onViewChange={() => onSimulate('샘플 지역 인사이트 보기')}
                />
                <div className={pageStyles.marketInsightBody}>
                    <LocationMasterSection
                        userId=""
                        companyName="민티아"
                        form={form}
                        filters={filters}
                        managerOptions={DEMO_LOCATION_MANAGERS}
                        locations={locations}
                        filteredLocations={filteredLocations}
                        isManagerLoading={false}
                        isSaving={false}
                        deletingLocationId=""
                        onFormChange={updateForm}
                        onFiltersChange={patch => setFilters(current => ({ ...current, ...patch }))}
                        onResetForm={resetForm}
                        onResetFilters={resetFilters}
                        onSave={saveLocation}
                        onSelectAddress={selectAddress}
                        onSelectBrand={selectBrand}
                        onEdit={location => setForm(toLocationFormState(location))}
                        onDelete={location => {
                            setLocations(current => current.filter(item => item.id !== location.id));
                            onSimulate(`${location.name} 샘플 삭제`);
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
