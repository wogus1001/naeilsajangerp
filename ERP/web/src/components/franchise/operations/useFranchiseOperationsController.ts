import React from 'react';
import type { KakaoAddressResult } from '@/components/franchise/KakaoAddressSearch';
import type { FranchiseBrand } from '@/lib/franchise-brands';
import { normalizeRegion } from '@/lib/franchise-market-insights';
import {
    buildManualPromotedLocationDraft,
    buildManualPromotedOperationEntries,
    type ManualPromotedOperationEntry,
    type ManualPromotedOperationProperty
} from '@/lib/manual-promoted-operations';
import { getCompetitionKeyword, isOperationalLocation, toLocationFormState } from './format';
import {
    createManualPromotedLocation,
    deleteFranchiseLocation,
    fetchFranchiseLocations,
    fetchManualPromotedProperties as fetchManualPromotedPropertiesRequest,
    readStoredUser,
    saveBrandMaster,
    saveFranchiseLocation,
    scanFranchiseLocationCompetitors,
    updateFranchiseLocationStatus
} from './requests';
import {
    EMPTY_LOCATION_FORM,
    type FranchiseLocation,
    type FranchiseLocationStatus,
    type LocationFormState
} from './types';

type OperationsCounts = {
    readonly activeCount: number;
    readonly openingCount: number;
    readonly pausedCount: number;
    readonly scannedCount: number;
};

export function useFranchiseOperationsController() {
    const [userId, setUserId] = React.useState('');
    const [companyName, setCompanyName] = React.useState('');
    const [locations, setLocations] = React.useState<FranchiseLocation[]>([]);
    const [manualPromotedProperties, setManualPromotedProperties] = React.useState<ManualPromotedOperationProperty[]>([]);
    const [locationForm, setLocationForm] = React.useState<LocationFormState>(EMPTY_LOCATION_FORM);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isLoadingPromotedProperties, setIsLoadingPromotedProperties] = React.useState(false);
    const [isSaving, setIsSaving] = React.useState(false);
    const [deletingLocationId, setDeletingLocationId] = React.useState('');
    const [scanningLocationId, setScanningLocationId] = React.useState('');
    const [updatingStatusId, setUpdatingStatusId] = React.useState('');
    const [creatingLocationPropertyId, setCreatingLocationPropertyId] = React.useState('');

    React.useEffect(() => {
        const parsedUser = readStoredUser();
        const currentUserId = parsedUser.uid || parsedUser.id || localStorage.getItem('userId') || '';
        const storedCompanyName = parsedUser.companyName || parsedUser.company_name || '';
        setUserId(currentUserId);
        setCompanyName(storedCompanyName || '');
    }, []);

    const fetchLocations = React.useCallback(async () => {
        if (!userId) return;
        setIsLoading(true);
        try {
            setLocations(await fetchFranchiseLocations({ userId, companyName }));
        } catch (error) {
            console.error('Failed to fetch franchise operations:', error);
            setLocations([]);
            window.alert(error instanceof Error ? error.message : '가맹 운영 데이터를 불러오지 못했습니다.');
        } finally {
            setIsLoading(false);
        }
    }, [companyName, userId]);

    const fetchManualPromotedProperties = React.useCallback(async () => {
        if (!userId) return;
        setIsLoadingPromotedProperties(true);
        try {
            setManualPromotedProperties(await fetchManualPromotedPropertiesRequest({ userId, companyName }));
        } catch (error) {
            console.error('Failed to fetch manual promoted properties:', error);
            setManualPromotedProperties([]);
            window.alert(error instanceof Error ? error.message : '수동 승격 물건지를 불러오지 못했습니다.');
        } finally {
            setIsLoadingPromotedProperties(false);
        }
    }, [companyName, userId]);

    React.useEffect(() => {
        if (!userId) return;
        void fetchLocations();
        void fetchManualPromotedProperties();
    }, [fetchLocations, fetchManualPromotedProperties, userId]);

    const operationalLocations = React.useMemo(() => locations.filter(isOperationalLocation), [locations]);
    const manualPromotedEntries = React.useMemo(
        () => buildManualPromotedOperationEntries(manualPromotedProperties, locations),
        [locations, manualPromotedProperties]
    );
    const counts: OperationsCounts = {
        activeCount: operationalLocations.filter(location => location.status === '운영중').length,
        openingCount: operationalLocations.filter(location => location.status === '오픈준비').length,
        pausedCount: operationalLocations.filter(location => location.status === '휴점').length,
        scannedCount: operationalLocations.filter(location => location.competitionScan).length
    };

    const resetLocationForm = () => setLocationForm(EMPTY_LOCATION_FORM);
    const updateLocationForm = (patch: Partial<LocationFormState>) => setLocationForm(prev => ({ ...prev, ...patch }));
    const editLocation = (location: FranchiseLocation) => setLocationForm(toLocationFormState(location));

    const selectKakaoAddress = (result: KakaoAddressResult) => setLocationForm(prev => ({
        ...prev,
        address: result.address,
        region: result.region || normalizeRegion(result.address),
        latitude: result.latitude,
        longitude: result.longitude
    }));

    const selectBrand = (brand: FranchiseBrand) => {
        const nextKeyword = brand.recommendedKeywords?.[0] || '';
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

    const saveLocation = async () => {
        if (!userId) return;
        if (!locationForm.name.trim()) {
            window.alert('가맹점명을 입력해주세요.');
            return;
        }
        if (!locationForm.region.trim() && !locationForm.address.trim()) {
            window.alert('지역 또는 주소를 입력해주세요.');
            return;
        }
        setIsSaving(true);
        try {
            const form = { ...locationForm, region: locationForm.region || normalizeRegion(locationForm.address) };
            await saveFranchiseLocation({ userId, companyName, form });
            await saveBrandMaster({ userId, companyName, form });
            resetLocationForm();
            await fetchLocations();
            window.alert(locationForm.id ? '가맹점 정보를 수정했습니다.' : '가맹점을 등록했습니다.');
        } catch (error) {
            window.alert(error instanceof Error ? error.message : '가맹점 저장 중 오류가 발생했습니다.');
        } finally {
            setIsSaving(false);
        }
    };

    const createLocationFromManualPromotedProperty = async (entry: ManualPromotedOperationEntry) => {
        if (!userId || entry.kind === 'linked') return;
        setCreatingLocationPropertyId(entry.property.id);
        try {
            const draft = buildManualPromotedLocationDraft(entry.property);
            await createManualPromotedLocation({ userId, companyName, draft });
            await fetchLocations();
            await fetchManualPromotedProperties();
            window.alert('외부 승격 물건지를 운영점 마스터에 등록했습니다.');
        } catch (error) {
            window.alert(error instanceof Error ? error.message : '운영점 등록 중 오류가 발생했습니다.');
        } finally {
            setCreatingLocationPropertyId('');
        }
    };

    const updateLocationStatus = async (location: FranchiseLocation, status: FranchiseLocationStatus) => {
        if (!userId) return;
        setUpdatingStatusId(location.id);
        try {
            await updateFranchiseLocationStatus({ userId, companyName, locationId: location.id, status });
            await fetchLocations();
        } catch (error) {
            window.alert(error instanceof Error ? error.message : '상태 변경 중 오류가 발생했습니다.');
        } finally {
            setUpdatingStatusId('');
        }
    };

    const deleteLocation = async (location: FranchiseLocation) => {
        if (!userId) return;
        const confirmed = window.confirm(`${location.name} 가맹점 정보를 삭제할까요? 기존 모객DB 데이터는 삭제되지 않습니다.`);
        if (!confirmed) return;
        setDeletingLocationId(location.id);
        try {
            await deleteFranchiseLocation({ userId, companyName, locationId: location.id });
            if (locationForm.id === location.id) resetLocationForm();
            await fetchLocations();
            window.alert('가맹점 정보를 삭제했습니다.');
        } catch (error) {
            window.alert(error instanceof Error ? error.message : '가맹점 삭제 중 오류가 발생했습니다.');
        } finally {
            setDeletingLocationId('');
        }
    };

    const scanLocationCompetitors = async (location: FranchiseLocation) => {
        if (!userId) return;
        const query = getCompetitionKeyword(location);
        if (!query) {
            window.alert('경쟁스캔 키워드를 입력해주세요. 예: 한식, 고기집, 카페, 치킨');
            return;
        }
        setScanningLocationId(location.id);
        try {
            await scanFranchiseLocationCompetitors({ userId, companyName, locationId: location.id, query });
            await fetchLocations();
            window.alert('주변 경쟁업체 스캔을 완료했습니다.');
        } catch (error) {
            window.alert(error instanceof Error ? error.message : '경쟁업체 스캔 중 오류가 발생했습니다.');
        } finally {
            setScanningLocationId('');
        }
    };

    return {
        userId,
        companyName,
        locationForm,
        isLoading,
        isLoadingPromotedProperties,
        isSaving,
        deletingLocationId,
        scanningLocationId,
        updatingStatusId,
        creatingLocationPropertyId,
        operationalLocations,
        manualPromotedEntries,
        counts,
        fetchLocations,
        fetchManualPromotedProperties,
        resetLocationForm,
        updateLocationForm,
        editLocation,
        selectKakaoAddress,
        selectBrand,
        saveLocation,
        createLocationFromManualPromotedProperty,
        updateLocationStatus,
        deleteLocation,
        scanLocationCompetitors
    };
}
