"use client";

import React from 'react';
import { useAppDialog } from '@/components/common/AppDialogProvider';
import type { KakaoAddressResult } from '@/components/franchise/KakaoAddressSearch';
import type { FranchiseBrand } from '@/lib/franchise-brands';
import { buildMarketInsights, normalizeRegion } from '@/lib/franchise-market-insights';
import { useLocationManagers } from './useLocationManagers';
import type {
    FranchiseLead,
    FranchiseLocation,
    LocationFormState,
    LocationMasterFilters
} from './locationMasterTypes';
import {
    deleteFranchiseLocationRequest,
    fetchMarketInsightData,
    getSelectedBrandKeyword,
    saveBrandMaster,
    saveFranchiseLocationRequest,
    scanLocationCompetitorsRequest
} from './locationMasterRequests';
import {
    EMPTY_LOCATION_FILTERS,
    EMPTY_LOCATION_FORM,
    filterLocationMasterItems,
    getCompetitionKeyword,
    isSitePlanningLocation,
    toLocationFormState
} from './locationMasterUtils';
import { useMarketInsightIdentity } from './useMarketInsightIdentity';
import { useMarketInsightNavigation } from './useMarketInsightNavigation';

export function useMarketInsightsController() {
    const { showAlert, showConfirm } = useAppDialog();
    const { activeMarketTab, activeMarketView, selectMarketTab, selectMarketView } = useMarketInsightNavigation();
    const { userId, companyName, currentUserName, currentUserRole } = useMarketInsightIdentity();
    const { managerOptions, isManagerLoading, defaultManagerId } = useLocationManagers({
        userId,
        companyName,
        currentUserName,
        currentUserRole
    });
    const [leads, setLeads] = React.useState<readonly FranchiseLead[]>([]);
    const [franchiseLocations, setFranchiseLocations] = React.useState<readonly FranchiseLocation[]>([]);
    const [locationForm, setLocationForm] = React.useState<LocationFormState>(EMPTY_LOCATION_FORM);
    const [locationFilters, setLocationFilters] = React.useState<LocationMasterFilters>(EMPTY_LOCATION_FILTERS);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isLocationSaving, setIsLocationSaving] = React.useState(false);
    const [deletingLocationId, setDeletingLocationId] = React.useState('');
    const [scanningLocationId, setScanningLocationId] = React.useState('');

    React.useEffect(() => {
        if (!defaultManagerId) return;
        setLocationForm(prev => {
            if (prev.id || (prev.managerId && prev.managerId !== userId)) return prev;
            if (prev.managerId === defaultManagerId) return prev;
            return { ...prev, managerId: defaultManagerId };
        });
    }, [defaultManagerId, userId]);

    const fetchInsightData = React.useCallback(async () => {
        if (!userId) return;
        setIsLoading(true);
        try {
            const data = await fetchMarketInsightData({ userId, companyName });
            setLeads(data.leads);
            setFranchiseLocations(data.locations);
        } catch (error) {
            if (error instanceof Error) {
                console.error('Failed to fetch market insight data:', error);
                void showAlert({ message: error.message, title: '후보지 정보 조회 실패', type: 'error' });
            } else {
                throw error;
            }
            setLeads([]);
            setFranchiseLocations([]);
        } finally {
            setIsLoading(false);
        }
    }, [companyName, showAlert, userId]);

    React.useEffect(() => {
        if (!userId) return;
        void fetchInsightData();
    }, [fetchInsightData, userId]);

    const sitePlanningLocations = React.useMemo(
        () => franchiseLocations.filter(isSitePlanningLocation),
        [franchiseLocations]
    );
    const filteredLocations = React.useMemo(
        () => filterLocationMasterItems(sitePlanningLocations, locationFilters),
        [locationFilters, sitePlanningLocations]
    );
    const marketInsights = React.useMemo(
        () => buildMarketInsights(leads, sitePlanningLocations.map(location => ({
            id: location.id,
            name: location.name,
            region: location.region,
            address: location.address,
            status: location.status,
            locationType: location.locationType,
            lat: location.latitude ?? undefined,
            lng: location.longitude ?? undefined
        }))),
        [leads, sitePlanningLocations]
    );
    const topMarketInsight = marketInsights[0] || null;
    const firstSitePlanningLocation = sitePlanningLocations[0];
    const realtyInitialRegion = topMarketInsight?.region
        || firstSitePlanningLocation?.region
        || (firstSitePlanningLocation?.address ? normalizeRegion(firstSitePlanningLocation.address) : '서울 광진구');

    const resetLocationForm = () => setLocationForm({ ...EMPTY_LOCATION_FORM, managerId: defaultManagerId });
    const updateLocationForm = (patch: Partial<LocationFormState>) => setLocationForm(prev => ({ ...prev, ...patch }));
    const updateLocationFilters = (patch: Partial<LocationMasterFilters>) => setLocationFilters(prev => ({ ...prev, ...patch }));
    const editFranchiseLocation = (location: FranchiseLocation) => {
        const nextForm = toLocationFormState(location);
        const canKeepManager = managerOptions.some(
            option => option.id === nextForm.managerId || option.displayId === nextForm.managerId
        );
        setLocationForm({ ...nextForm, managerId: canKeepManager ? nextForm.managerId : defaultManagerId });
    };

    const selectKakaoAddress = (result: KakaoAddressResult) => setLocationForm(prev => ({
        ...prev,
        address: result.address,
        region: result.region || normalizeRegion(result.address),
        latitude: result.latitude,
        longitude: result.longitude
    }));

    const selectBrand = (brand: FranchiseBrand) => {
        const nextKeyword = getSelectedBrandKeyword(brand);
        setLocationForm(prev => ({
            ...prev,
            brand: brand.brandName,
            brandId: brand.id.startsWith('custom-') ? '' : brand.id,
            industry: brand.industry || '',
            businessType: brand.businessType || '',
            categoryMajor: brand.categoryMajor || '',
            categoryMiddle: brand.categoryMiddle || '',
            categorySmall: brand.categorySmall || '',
            competitionKeyword: nextKeyword || prev.competitionKeyword
        }));
    };

    const saveFranchiseLocation = async () => {
        if (!userId) return;
        if (!locationForm.name.trim()) {
            void showAlert({ message: '후보지명을 입력해주세요.', type: 'info' });
            return;
        }
        if (!locationForm.region.trim() && !locationForm.address.trim()) {
            void showAlert({ message: '지역 또는 주소를 입력해주세요.', type: 'info' });
            return;
        }
        setIsLocationSaving(true);
        try {
            await saveFranchiseLocationRequest({
                userId,
                companyName,
                form: locationForm,
                region: locationForm.region || normalizeRegion(locationForm.address)
            });
            await saveBrandMaster({ userId, companyName, form: locationForm });
            resetLocationForm();
            await fetchInsightData();
            void showAlert({
                message: locationForm.id ? '출점 후보지를 수정했습니다.' : '출점 후보지를 등록했습니다.',
                title: locationForm.id ? '후보지 수정 완료' : '후보지 등록 완료',
                type: 'success'
            });
        } catch (error) {
            if (error instanceof Error) void showAlert({ message: error.message, title: '후보지 저장 실패', type: 'error' });
            else throw error;
        } finally {
            setIsLocationSaving(false);
        }
    };

    const deleteFranchiseLocation = async (location: FranchiseLocation) => {
        if (!userId) return;
        const confirmed = await showConfirm({
            message: `${location.name} 후보지를 삭제할까요? 기존 모객DB 데이터는 삭제되지 않습니다.`,
            title: '출점 후보지 삭제',
            confirmText: '삭제',
            isDanger: true
        });
        if (!confirmed) return;
        setDeletingLocationId(location.id);
        try {
            await deleteFranchiseLocationRequest({ userId, companyName, locationId: location.id });
            if (locationForm.id === location.id) resetLocationForm();
            await fetchInsightData();
            void showAlert({ message: '출점 후보지를 삭제했습니다.', title: '삭제 완료', type: 'success' });
        } catch (error) {
            if (error instanceof Error) void showAlert({ message: error.message, title: '후보지 삭제 실패', type: 'error' });
            else throw error;
        } finally {
            setDeletingLocationId('');
        }
    };

    const scanLocationCompetitors = async (location: FranchiseLocation) => {
        if (!userId) return;
        const query = getCompetitionKeyword(location);
        if (!query) {
            void showAlert({ message: '경쟁스캔 키워드를 입력해주세요. 예: 한식, 고기집, 카페, 치킨', type: 'info' });
            return;
        }
        setScanningLocationId(location.id);
        try {
            await scanLocationCompetitorsRequest({ userId, companyName, locationId: location.id, query });
            await fetchInsightData();
            void showAlert({ message: '주변 경쟁업체 스캔을 완료했습니다.', title: '경쟁업체 스캔 완료', type: 'success' });
        } catch (error) {
            if (error instanceof Error) void showAlert({ message: error.message, title: '경쟁업체 스캔 실패', type: 'error' });
            else throw error;
        } finally {
            setScanningLocationId('');
        }
    };

    return {
        activeMarketTab,
        activeMarketView,
        companyName,
        userId,
        marketInsights,
        locationForm,
        locationFilters,
        managerOptions,
        isManagerLoading,
        franchiseLocations: sitePlanningLocations,
        filteredLocations,
        isLoading,
        isLocationSaving,
        deletingLocationId,
        scanningLocationId,
        realtyInitialRegion,
        selectMarketTab,
        selectMarketView,
        fetchInsightData,
        updateLocationForm,
        updateLocationFilters,
        resetLocationForm,
        resetLocationFilters: () => setLocationFilters(EMPTY_LOCATION_FILTERS),
        saveFranchiseLocation,
        deleteFranchiseLocation,
        editFranchiseLocation,
        scanLocationCompetitors,
        selectKakaoAddress,
        selectBrand
    };
}
