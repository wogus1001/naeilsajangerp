"use client";

import React from 'react';
import {
    AlertTriangle,
    Building2,
    CheckCircle2,
    ExternalLink,
    FileSearch,
    Plus,
    RefreshCw,
    Store
} from 'lucide-react';
import { readApiError, unwrapApiData } from '@/utils/apiResponse';
import KakaoAddressSearch, { KakaoAddressResult } from '@/components/franchise/KakaoAddressSearch';
import FranchiseBrandSelector from '@/components/franchise/FranchiseBrandSelector';
import LocationCompetitionPanel, { LocationCompetitionScan } from '@/components/franchise/LocationCompetitionPanel';
import type { FranchiseBrand } from '@/lib/franchise-brands';
import { normalizeRegion } from '@/lib/franchise-market-insights';
import styles from '../franchise-leads/page.module.css';

type FranchiseLocationType = '직영점' | '가맹점' | '예정점';
type FranchiseLocationStatus = '운영중' | '오픈준비' | '검토중' | '휴점' | '폐점';

type AuthUser = {
    id?: string;
    uid?: string;
    role?: string;
    companyName?: string;
    company_name?: string;
};

type CompetitorScan = LocationCompetitionScan;

type FranchiseLocation = {
    id: string;
    companyId?: string;
    managerId?: string | null;
    name: string;
    locationType: FranchiseLocationType;
    brand: string;
    status: FranchiseLocationStatus;
    region: string;
    address: string;
    latitude: number | null;
    longitude: number | null;
    openedAt: string | null;
    memo: string;
    createdAt?: string;
    updatedAt?: string;
    competitionScan?: CompetitorScan;
    competitionKeyword?: string;
    brandId?: string;
    industry?: string;
    businessType?: string;
    categoryMajor?: string;
    categoryMiddle?: string;
    categorySmall?: string;
};

type LocationFormState = {
    id?: string;
    name: string;
    locationType: FranchiseLocationType;
    brand: string;
    brandId: string;
    industry: string;
    businessType: string;
    categoryMajor: string;
    categoryMiddle: string;
    categorySmall: string;
    competitionKeyword: string;
    status: FranchiseLocationStatus;
    region: string;
    address: string;
    latitude: number | null;
    longitude: number | null;
    openedAt: string;
    memo: string;
};

type OperationTab = 'locations' | 'realty-import';

type RealtyImportedListing = {
    action: 'collected' | 'created' | 'updated';
    propertyId?: string;
    duplicateOfPropertyId?: string | null;
    listing?: {
        id: string;
        duplicateOfPropertyId?: string | null;
        source: string;
        sourceListingId?: string;
        sourceUrl: string;
        title: string;
        address: string;
        region: string;
        tradeType: string;
        propertyType: string;
        depositAmount: number | null;
        monthlyRent: number | null;
        salePrice: number | null;
        maintenanceFee: number | null;
        areaSqm: number | null;
        areaPyeong: string;
        floorInfo: string;
        imageUrls?: string[];
        status: string;
        collectedAt?: string;
        raw?: Record<string, unknown>;
        data?: Record<string, unknown>;
    };
};

type RealtyListingRecord = NonNullable<RealtyImportedListing['listing']>;

type RealtyImportResult = {
    job?: {
        id: string;
        status: string;
        source: string;
        region: string;
        totalCount: number;
        createdCount: number;
        updatedCount: number;
        duplicateCount: number;
        failedCount: number;
        warnings?: string[];
        errors?: Array<string | { message?: string; source?: string; listingId?: string }>;
        data?: { sourceUrls?: Record<string, string> };
    };
    listings?: RealtyImportedListing[];
};

const FRANCHISE_LOCATION_TYPES: FranchiseLocationType[] = ['직영점', '가맹점', '예정점'];
const FRANCHISE_LOCATION_STATUSES: FranchiseLocationStatus[] = ['운영중', '오픈준비', '검토중', '휴점', '폐점'];
const REALTY_REGION_OPTIONS = [
    { label: '서울특별시', queryName: '서울', districts: ['강남구', '강동구', '강북구', '강서구', '관악구', '광진구', '구로구', '금천구', '노원구', '도봉구', '동대문구', '동작구', '마포구', '서대문구', '서초구', '성동구', '성북구', '송파구', '양천구', '영등포구', '용산구', '은평구', '종로구', '중구', '중랑구'] },
    { label: '부산광역시', queryName: '부산', districts: ['강서구', '금정구', '기장군', '남구', '동구', '동래구', '부산진구', '북구', '사상구', '사하구', '서구', '수영구', '연제구', '영도구', '중구', '해운대구'] },
    { label: '대구광역시', queryName: '대구', districts: ['군위군', '남구', '달서구', '달성군', '동구', '북구', '서구', '수성구', '중구'] },
    { label: '인천광역시', queryName: '인천', districts: ['강화군', '계양구', '남동구', '동구', '미추홀구', '부평구', '서구', '연수구', '옹진군', '중구'] },
    { label: '광주광역시', queryName: '광주', districts: ['광산구', '남구', '동구', '북구', '서구'] },
    { label: '대전광역시', queryName: '대전', districts: ['대덕구', '동구', '서구', '유성구', '중구'] },
    { label: '울산광역시', queryName: '울산', districts: ['남구', '동구', '북구', '울주군', '중구'] },
    { label: '세종특별자치시', queryName: '세종', districts: ['세종시'] },
    { label: '경기도', queryName: '경기', districts: ['가평군', '고양시', '과천시', '광명시', '광주시', '구리시', '군포시', '김포시', '남양주시', '동두천시', '부천시', '성남시', '수원시', '시흥시', '안산시', '안성시', '안양시', '양주시', '양평군', '여주시', '연천군', '오산시', '용인시', '의왕시', '의정부시', '이천시', '파주시', '평택시', '포천시', '하남시', '화성시'] },
    { label: '강원특별자치도', queryName: '강원', districts: ['강릉시', '고성군', '동해시', '삼척시', '속초시', '양구군', '양양군', '영월군', '원주시', '인제군', '정선군', '철원군', '춘천시', '태백시', '평창군', '홍천군', '화천군', '횡성군'] },
    { label: '충청북도', queryName: '충북', districts: ['괴산군', '단양군', '보은군', '영동군', '옥천군', '음성군', '제천시', '증평군', '진천군', '청주시', '충주시'] },
    { label: '충청남도', queryName: '충남', districts: ['계룡시', '공주시', '금산군', '논산시', '당진시', '보령시', '부여군', '서산시', '서천군', '아산시', '예산군', '천안시', '청양군', '태안군', '홍성군'] },
    { label: '전북특별자치도', queryName: '전북', districts: ['고창군', '군산시', '김제시', '남원시', '무주군', '부안군', '순창군', '완주군', '익산시', '임실군', '장수군', '전주시', '정읍시', '진안군'] },
    { label: '전라남도', queryName: '전남', districts: ['강진군', '고흥군', '곡성군', '광양시', '구례군', '나주시', '담양군', '목포시', '무안군', '보성군', '순천시', '신안군', '여수시', '영광군', '영암군', '완도군', '장성군', '장흥군', '진도군', '함평군', '해남군', '화순군'] },
    { label: '경상북도', queryName: '경북', districts: ['경산시', '경주시', '고령군', '구미시', '김천시', '문경시', '봉화군', '상주시', '성주군', '안동시', '영덕군', '영양군', '영주시', '영천시', '예천군', '울릉군', '울진군', '의성군', '청도군', '청송군', '칠곡군', '포항시'] },
    { label: '경상남도', queryName: '경남', districts: ['거제시', '거창군', '고성군', '김해시', '남해군', '밀양시', '사천시', '산청군', '양산시', '의령군', '진주시', '창녕군', '창원시', '통영시', '하동군', '함안군', '함양군', '합천군'] },
    { label: '제주특별자치도', queryName: '제주', districts: ['서귀포시', '제주시'] }
];
const EMPTY_LOCATION_FORM: LocationFormState = {
    name: '',
    locationType: '가맹점',
    brand: '',
    brandId: '',
    industry: '',
    businessType: '',
    categoryMajor: '',
    categoryMiddle: '',
    categorySmall: '',
    competitionKeyword: '',
    status: '운영중',
    region: '',
    address: '',
    latitude: null,
    longitude: null,
    openedAt: '',
    memo: ''
};

function isOperationalLocation(location: FranchiseLocation) {
    return location.locationType === '직영점' || location.locationType === '가맹점' || ['운영중', '휴점', '폐점'].includes(location.status);
}

function formatDate(value?: string | null) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function formatScanDate(value?: string) {
    if (!value) return '미수집';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('ko-KR', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getCompetitionKeyword(location: Pick<FranchiseLocation, 'brand' | 'competitionKeyword'>) {
    return (location.competitionKeyword || location.brand || '').trim();
}

function formatRealtyMoney(listing?: RealtyImportedListing['listing']) {
    if (!listing) return '-';
    const format = (value: number | null | undefined) => {
        if (value === null || value === undefined) return '';
        return `${Number(value).toLocaleString()}만원`;
    };
    if (listing.salePrice) return `매매 ${format(listing.salePrice)}`;
    if (listing.depositAmount || listing.monthlyRent) {
        return `보증금 ${format(listing.depositAmount) || '0만원'} / 월세 ${format(listing.monthlyRent) || '0만원'}`;
    }
    return '-';
}

function getRealtySourceLabel(source?: string) {
    if (source === 'daangn') return '당근';
    return source || '-';
}

function formatRealtyMaintenance(listing?: RealtyImportedListing['listing']) {
    if (!listing) return '-';
    if (listing.maintenanceFee === null || listing.maintenanceFee === undefined) return '관리비 확인';
    return `관리비 ${Number(listing.maintenanceFee).toLocaleString()}만원`;
}

function formatRealtyAreaAndFloor(listing?: RealtyImportedListing['listing']) {
    if (!listing) return '-';
    const parts = [
        listing.areaPyeong || (listing.areaSqm ? `${listing.areaSqm}㎡` : ''),
        listing.floorInfo ? `${listing.floorInfo}층` : ''
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(' · ') : '-';
}

function formatRealtyDate(value: unknown) {
    const dateValue = String(value || '').trim();
    if (!dateValue) return '';
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return dateValue;
    return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

function summarizeRealtyContent(value: unknown) {
    const text = String(value || '')
        .replace(/[^\S\r\n]+/g, ' ')
        .split('\n')
        .map(line => line.replace(/[^\w가-힣㎡.,/()~· -]/g, '').trim())
        .filter(Boolean)
        .find(line => !/매물번호|전화|010-|02-/.test(line));
    return text ? text.slice(0, 70) : '';
}

function getRealtyDetailMeta(listing?: RealtyImportedListing['listing']) {
    const raw = listing?.raw || {};
    return [
        formatRealtyMaintenance(listing),
        raw.buildingApprovalDate ? `사용승인 ${formatRealtyDate(raw.buildingApprovalDate)}` : '',
        raw.createdAt ? `등록 ${formatRealtyDate(raw.createdAt)}` : '',
        raw.writerType === 'BROKER' ? '중개사' : raw.writerType === 'OWNER' ? '직거래' : ''
    ].filter(Boolean);
}

function getRealtyReactionMeta(listing?: RealtyImportedListing['listing']) {
    const raw = listing?.raw || {};
    return [
        raw.chatRoomCount !== undefined ? `채팅 ${Number(raw.chatRoomCount).toLocaleString()}` : '',
        raw.watchCount !== undefined ? `관심 ${Number(raw.watchCount).toLocaleString()}` : ''
    ].filter(Boolean);
}

function getRealtyRegionOption(sido: string) {
    return REALTY_REGION_OPTIONS.find(option => option.label === sido) || REALTY_REGION_OPTIONS[0];
}

function buildRealtyRegionQuery(sido: string, district: string) {
    const option = getRealtyRegionOption(sido);
    return `${option.queryName} ${district}`.trim();
}

function parseRealtyRegionToSelection(region: string) {
    const compact = region.replace(/\s+/g, '');
    const sido = REALTY_REGION_OPTIONS.find(option => {
        const labels = [option.label, option.queryName].map(value => value.replace(/\s+/g, ''));
        return labels.some(label => compact.includes(label));
    }) || REALTY_REGION_OPTIONS[0];
    const district = sido.districts.find(item => compact.includes(item.replace(/\s+/g, ''))) || sido.districts[0];
    return { sido: sido.label, district };
}

export default function FranchiseOperationsPage() {
    const hasInitializedRealtyRegionRef = React.useRef(false);
    const [activeOperationsTab, setActiveOperationsTab] = React.useState<OperationTab>('locations');
    const [userId, setUserId] = React.useState('');
    const [companyName, setCompanyName] = React.useState('');
    const [locations, setLocations] = React.useState<FranchiseLocation[]>([]);
    const [locationForm, setLocationForm] = React.useState<LocationFormState>(EMPTY_LOCATION_FORM);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSaving, setIsSaving] = React.useState(false);
    const [deletingLocationId, setDeletingLocationId] = React.useState('');
    const [scanningLocationId, setScanningLocationId] = React.useState('');
    const [updatingStatusId, setUpdatingStatusId] = React.useState('');
    const [realtySido, setRealtySido] = React.useState('서울특별시');
    const [realtyDistrict, setRealtyDistrict] = React.useState('광진구');
    const [isRealtyImporting, setIsRealtyImporting] = React.useState(false);
    const [isSavedRealtyLoading, setIsSavedRealtyLoading] = React.useState(false);
    const [realtyImportResult, setRealtyImportResult] = React.useState<RealtyImportResult | null>(null);
    const [savedRealtyListings, setSavedRealtyListings] = React.useState<RealtyImportedListing[]>([]);

    React.useEffect(() => {
        const stored = localStorage.getItem('user');
        let parsedUser: AuthUser = {};

        if (stored) {
            try {
                parsedUser = JSON.parse(stored);
            } catch (error) {
                console.error('Failed to parse stored user:', error);
            }
        }

        const currentUserId = parsedUser.uid || parsedUser.id || localStorage.getItem('userId') || '';
        const storedCompanyName = parsedUser.companyName || parsedUser.company_name || '';
        setUserId(currentUserId);
        setCompanyName(parsedUser.role === 'admin' ? '' : storedCompanyName || '');
    }, []);

    const fetchLocations = React.useCallback(async () => {
        if (!userId) return;

        setIsLoading(true);
        try {
            const params = new URLSearchParams({ requesterId: userId });
            if (companyName) params.set('company', companyName);

            const response = await fetch(`/api/franchise-locations?${params.toString()}`, { cache: 'no-store' });
            const payload = await response.json();
            if (!response.ok) throw new Error(readApiError(payload));

            const data = unwrapApiData<{ locations: FranchiseLocation[] }>(payload);
            setLocations(data.locations || []);
        } catch (error) {
            console.error('Failed to fetch franchise operations:', error);
            setLocations([]);
            window.alert(error instanceof Error ? error.message : '가맹 운영 데이터를 불러오지 못했습니다.');
        } finally {
            setIsLoading(false);
        }
    }, [companyName, userId]);

    React.useEffect(() => {
        if (!userId) return;
        void fetchLocations();
    }, [fetchLocations, userId]);

    const operationalLocations = React.useMemo(
        () => locations.filter(isOperationalLocation),
        [locations]
    );
    const activeCount = operationalLocations.filter(location => location.status === '운영중').length;
    const openingCount = operationalLocations.filter(location => location.status === '오픈준비').length;
    const pausedCount = operationalLocations.filter(location => location.status === '휴점').length;
    const scannedCount = operationalLocations.filter(location => location.competitionScan).length;

    const realtyDistrictOptions = React.useMemo(
        () => getRealtyRegionOption(realtySido).districts,
        [realtySido]
    );
    const selectedRealtyRegion = React.useMemo(
        () => buildRealtyRegionQuery(realtySido, realtyDistrict),
        [realtyDistrict, realtySido]
    );

    React.useEffect(() => {
        if (!realtyDistrictOptions.includes(realtyDistrict)) {
            setRealtyDistrict(realtyDistrictOptions[0] || '');
        }
    }, [realtyDistrict, realtyDistrictOptions]);

    React.useEffect(() => {
        if (hasInitializedRealtyRegionRef.current) return;
        const firstLocation = operationalLocations.find(location => location.region || location.address);
        if (!firstLocation) return;
        const parsed = parseRealtyRegionToSelection(firstLocation.region || normalizeRegion(firstLocation.address));
        setRealtySido(parsed.sido);
        setRealtyDistrict(parsed.district);
        hasInitializedRealtyRegionRef.current = true;
    }, [operationalLocations]);

    const resetLocationForm = () => {
        setLocationForm(EMPTY_LOCATION_FORM);
    };

    const editLocation = (location: FranchiseLocation) => {
        setLocationForm({
            id: location.id,
            name: location.name || '',
            locationType: location.locationType || '가맹점',
            brand: location.brand || '',
            brandId: location.brandId || '',
            industry: location.industry || '',
            businessType: location.businessType || '',
            categoryMajor: location.categoryMajor || '',
            categoryMiddle: location.categoryMiddle || '',
            categorySmall: location.categorySmall || '',
            competitionKeyword: location.competitionKeyword || '',
            status: location.status || '운영중',
            region: location.region || normalizeRegion(location.address),
            address: location.address || '',
            latitude: location.latitude,
            longitude: location.longitude,
            openedAt: location.openedAt || '',
            memo: location.memo || ''
        });
    };

    const selectKakaoAddress = (result: KakaoAddressResult) => {
        setLocationForm(prev => ({
            ...prev,
            address: result.address,
            region: result.region || normalizeRegion(result.address),
            latitude: result.latitude,
            longitude: result.longitude
        }));
    };

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

    const saveBrandMaster = async () => {
        if (!userId || !locationForm.brand.trim()) return;
        try {
            await fetch('/api/franchise-brands', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    requesterId: userId,
                    companyName,
                    brandName: locationForm.brand,
                    industry: locationForm.industry,
                    businessType: locationForm.businessType,
                    categoryMajor: locationForm.categoryMajor,
                    categoryMiddle: locationForm.categoryMiddle,
                    categorySmall: locationForm.categorySmall,
                    recommendedKeywords: locationForm.competitionKeyword ? [locationForm.competitionKeyword] : []
                })
            });
        } catch (error) {
            console.error('Failed to save brand master:', error);
        }
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
            const response = await fetch('/api/franchise-locations', {
                method: locationForm.id ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...locationForm,
                    requesterId: userId,
                    companyName,
                    region: locationForm.region || normalizeRegion(locationForm.address)
                })
            });
            const payload = await response.json();
            if (!response.ok) throw new Error(readApiError(payload));

            await saveBrandMaster();
            resetLocationForm();
            await fetchLocations();
            window.alert(locationForm.id ? '가맹점 정보를 수정했습니다.' : '가맹점을 등록했습니다.');
        } catch (error) {
            window.alert(error instanceof Error ? error.message : '가맹점 저장 중 오류가 발생했습니다.');
        } finally {
            setIsSaving(false);
        }
    };

    const updateLocationStatus = async (location: FranchiseLocation, status: FranchiseLocationStatus) => {
        if (!userId) return;

        setUpdatingStatusId(location.id);
        try {
            const response = await fetch('/api/franchise-locations', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: location.id,
                    requesterId: userId,
                    status
                })
            });
            const payload = await response.json();
            if (!response.ok) throw new Error(readApiError(payload));

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
            const params = new URLSearchParams({ id: location.id, requesterId: userId });
            const response = await fetch(`/api/franchise-locations?${params.toString()}`, { method: 'DELETE' });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(readApiError(payload));

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
            const response = await fetch('/api/franchise-locations/competitors', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    requesterId: userId,
                    locationId: location.id,
                    query,
                    radius: 700
                })
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(readApiError(payload));

            await fetchLocations();
            window.alert('주변 경쟁업체 스캔을 완료했습니다.');
        } catch (error) {
            window.alert(error instanceof Error ? error.message : '경쟁업체 스캔 중 오류가 발생했습니다.');
        } finally {
            setScanningLocationId('');
        }
    };

    const fetchSavedRealtyListings = React.useCallback(async () => {
        if (!userId) return;

        setIsSavedRealtyLoading(true);
        try {
            const params = new URLSearchParams({
                requesterId: userId,
                source: 'daangn',
                region: selectedRealtyRegion,
                limit: '200'
            });
            const response = await fetch(`/api/realty/listings?${params.toString()}`, { cache: 'no-store' });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(readApiError(payload));

            const data = unwrapApiData<{ listings: RealtyListingRecord[] }>(payload);
            setSavedRealtyListings((data.listings || []).map(listing => ({
                action: 'collected',
                duplicateOfPropertyId: listing.duplicateOfPropertyId,
                listing
            })));
        } catch (error) {
            console.error('Failed to fetch saved realty listings:', error);
            setSavedRealtyListings([]);
        } finally {
            setIsSavedRealtyLoading(false);
        }
    }, [selectedRealtyRegion, userId]);

    React.useEffect(() => {
        if (activeOperationsTab !== 'realty-import') return;
        void fetchSavedRealtyListings();
    }, [activeOperationsTab, fetchSavedRealtyListings]);

    const runRealtyImport = async () => {
        if (!userId) return;
        const region = selectedRealtyRegion.trim();

        if (!region) {
            window.alert('수집할 지역을 선택해주세요.');
            return;
        }

        setIsRealtyImporting(true);
        try {
            const response = await fetch('/api/realty/import-jobs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    requesterId: userId,
                    region,
                    query: region,
                    sources: ['daangn'],
                    listingTypes: ['store'],
                    limit: 500,
                    registerToProperties: false
                })
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(readApiError(payload));

            const data = unwrapApiData<RealtyImportResult>(payload);
            setRealtyImportResult(data);
            if (data.job?.status === 'failed') {
                window.alert('상가 수집이 완료되지 않았습니다. 수집 결과 영역의 오류/경고를 확인해주세요.');
                return;
            }
            await fetchSavedRealtyListings();
            window.alert(`상가 수집을 완료했습니다. 신규수집 ${data.job?.createdCount || 0}건, 업데이트 ${data.job?.updatedCount || 0}건`);
        } catch (error) {
            window.alert(error instanceof Error ? error.message : '외부 상가 수집 중 오류가 발생했습니다.');
        } finally {
            setIsRealtyImporting(false);
        }
    };

    return (
        <div className={styles.pageShell}>
            <section className={styles.hero}>
                <div>
                    <h1>가맹 운영</h1>
                    <p>운영중인 직영점과 가맹점의 상태, 주소, 경쟁환경을 본사용 운영 관점에서 관리합니다.</p>
                </div>
                <div className={styles.heroActions}>
                    <button className={styles.secondaryButton} onClick={() => void fetchLocations()} disabled={isLoading}>
                        <RefreshCw size={16} />
                        {isLoading ? '불러오는 중' : '새로고침'}
                    </button>
                </div>
            </section>

            <nav className={`${styles.viewTabs} ${styles.operationTabs}`} aria-label="가맹 운영 탭">
                <button
                    type="button"
                    className={activeOperationsTab === 'locations' ? styles.viewTabActive : styles.viewTab}
                    onClick={() => setActiveOperationsTab('locations')}
                >
                    <Store size={14} />
                    가맹점 마스터
                </button>
                <button
                    type="button"
                    className={activeOperationsTab === 'realty-import' ? styles.viewTabActive : styles.viewTab}
                    onClick={() => setActiveOperationsTab('realty-import')}
                >
                    <FileSearch size={14} />
                    외부 상가 수집
                </button>
            </nav>

            {activeOperationsTab === 'locations' && (
                <section className={styles.marketInsightPanel}>
                <div className={styles.panelHeader}>
                    <div>
                        <h2>가맹점 운영 현황</h2>
                        <p>출점 후보지와 분리된 현재 점포 관리 화면입니다. 추후 SV 점검, CS, 오픈 준비 프로젝트와 연결합니다.</p>
                    </div>
                    <span>운영관리 · 본사 전용</span>
                </div>
                <div className={styles.marketInsightBody}>
                    <div className={styles.marketSummaryCards}>
                        <article>
                            <Store size={18} />
                            <span>운영중</span>
                            <strong>{activeCount.toLocaleString()}개</strong>
                            <small>현재 영업 중인 직영점/가맹점</small>
                        </article>
                        <article>
                            <Building2 size={18} />
                            <span>오픈준비</span>
                            <strong>{openingCount.toLocaleString()}개</strong>
                            <small>오픈 전 준비가 필요한 매장</small>
                        </article>
                        <article>
                            <AlertTriangle size={18} />
                            <span>운영주의</span>
                            <strong>{pausedCount.toLocaleString()}개</strong>
                            <small>휴점 상태로 확인이 필요한 매장</small>
                        </article>
                        <article>
                            <CheckCircle2 size={18} />
                            <span>경쟁스캔</span>
                            <strong>{scannedCount.toLocaleString()}개</strong>
                            <small>주변 경쟁업체 수집 완료</small>
                        </article>
                    </div>

                    <div className={styles.locationMasterPanel}>
                        <div className={styles.locationMasterHeader}>
                            <div>
                                <h3>가맹점 마스터</h3>
                                <p>운영중/오픈준비/휴점 매장을 관리합니다. 예정지 관리는 모객DB의 출점 후보지에서 분리해 다룹니다.</p>
                            </div>
                            <button className={styles.secondaryButton} onClick={resetLocationForm}>
                                <Plus size={14} />
                                새 가맹점
                            </button>
                        </div>
                        <div className={styles.locationMasterGrid}>
                            <div className={styles.locationFormGrid}>
                                <label>
                                    가맹점명
                                    <input
                                        value={locationForm.name}
                                        onChange={(event) => setLocationForm(prev => ({ ...prev, name: event.target.value }))}
                                        placeholder="예: 강남역점"
                                    />
                                </label>
                                <label>
                                    구분
                                    <select
                                        value={locationForm.locationType}
                                        onChange={(event) => setLocationForm(prev => ({ ...prev, locationType: event.target.value as FranchiseLocationType }))}
                                    >
                                        {FRANCHISE_LOCATION_TYPES.map(type => (
                                            <option key={type} value={type}>{type}</option>
                                        ))}
                                    </select>
                                </label>
                                <label>
                                    상태
                                    <select
                                        value={locationForm.status}
                                        onChange={(event) => setLocationForm(prev => ({ ...prev, status: event.target.value as FranchiseLocationStatus }))}
                                    >
                                        {FRANCHISE_LOCATION_STATUSES.map(status => (
                                            <option key={status} value={status}>{status}</option>
                                        ))}
                                    </select>
                                </label>
                                <FranchiseBrandSelector
                                    requesterId={userId}
                                    companyName={companyName}
                                    value={locationForm.brand}
                                    onBrandChange={(brand) => setLocationForm(prev => ({
                                        ...prev,
                                        brand,
                                        brandId: ''
                                    }))}
                                    onSelectBrand={selectBrand}
                                    classNames={{
                                        row: styles.locationAddressSearchRow,
                                        button: styles.locationAddressSearchButton,
                                        results: styles.locationAddressResults,
                                        resultItem: styles.locationAddressResult,
                                        resultMeta: styles.locationAddressResultMeta,
                                        badge: styles.locationBrandSavedBadge,
                                        empty: styles.locationAddressEmpty
                                    }}
                                />
                                <label>
                                    경쟁검색 키워드
                                    <input
                                        value={locationForm.competitionKeyword}
                                        onChange={(event) => setLocationForm(prev => ({ ...prev, competitionKeyword: event.target.value }))}
                                        placeholder="예: 한식, 고기집, 카페"
                                    />
                                </label>
                                <label>
                                    지역
                                    <input
                                        value={locationForm.region}
                                        onChange={(event) => setLocationForm(prev => ({ ...prev, region: event.target.value }))}
                                        placeholder="예: 서울 강남구"
                                    />
                                </label>
                                <KakaoAddressSearch
                                    requesterId={userId}
                                    value={locationForm.address}
                                    onAddressChange={(address) => setLocationForm(prev => ({
                                        ...prev,
                                        address,
                                        latitude: null,
                                        longitude: null
                                    }))}
                                    onSelect={selectKakaoAddress}
                                    classNames={{
                                        row: styles.locationAddressSearchRow,
                                        button: styles.locationAddressSearchButton,
                                        results: styles.locationAddressResults,
                                        resultItem: styles.locationAddressResult,
                                        resultMeta: styles.locationAddressResultMeta,
                                        empty: styles.locationAddressEmpty
                                    }}
                                />
                                <label>
                                    오픈일
                                    <input
                                        type="date"
                                        value={locationForm.openedAt}
                                        onChange={(event) => setLocationForm(prev => ({ ...prev, openedAt: event.target.value }))}
                                    />
                                </label>
                                <label className={styles.locationMemoField}>
                                    운영 메모
                                    <textarea
                                        value={locationForm.memo}
                                        onChange={(event) => setLocationForm(prev => ({ ...prev, memo: event.target.value }))}
                                        placeholder="SV 점검, 오픈 준비, 운영 이슈 메모"
                                    />
                                </label>
                                <div className={styles.locationFormActions}>
                                    <button className={styles.secondaryButton} onClick={resetLocationForm} disabled={isSaving}>
                                        초기화
                                    </button>
                                    <button className={styles.primaryButton} onClick={() => void saveLocation()} disabled={isSaving}>
                                        {isSaving ? '저장 중' : locationForm.id ? '가맹점 수정' : '가맹점 등록'}
                                    </button>
                                </div>
                            </div>

                            <div className={styles.locationList}>
                                {operationalLocations.length === 0 ? (
                                    <div className={styles.locationEmpty}>등록된 운영 가맹점이 없습니다.</div>
                                ) : operationalLocations.slice(0, 12).map(location => {
                                    const scan = location.competitionScan;
                                    const competitors = scan?.competitors || [];
                                    const competitionKeyword = getCompetitionKeyword(location);

                                    return (
                                        <article key={location.id} className={styles.locationItem}>
                                            <div className={styles.locationItemMain}>
                                                <strong>{location.name}</strong>
                                                <span>{location.locationType} · {location.region || normalizeRegion(location.address)} · 오픈 {formatDate(location.openedAt)}</span>
                                                <small>{location.brand || '브랜드 미지정'} · 경쟁키워드 {competitionKeyword || '미입력'} · {location.address || '주소 미입력'}</small>
                                                <div className={styles.locationScanSummary}>
                                                    <b>경쟁 {Number(scan?.totalCount || competitors.length || 0).toLocaleString()}곳</b>
                                                    <span>{scan?.query || '키워드 미수집'}</span>
                                                    <span>{scan?.radius ? `${scan.radius.toLocaleString()}m` : '반경 700m'}</span>
                                                    <span>{formatScanDate(scan?.scannedAt)}</span>
                                                </div>
                                                <LocationCompetitionPanel
                                                    locationName={location.name}
                                                    address={location.address}
                                                    lat={location.latitude}
                                                    lng={location.longitude}
                                                    scan={scan}
                                                />
                                            </div>
                                            <div className={styles.locationItemActions}>
                                                <select
                                                    className={styles.locationStatusSelect}
                                                    value={location.status}
                                                    disabled={updatingStatusId === location.id}
                                                    onChange={(event) => void updateLocationStatus(location, event.target.value as FranchiseLocationStatus)}
                                                >
                                                    {FRANCHISE_LOCATION_STATUSES.map(status => (
                                                        <option key={status} value={status}>{status}</option>
                                                    ))}
                                                </select>
                                                <button
                                                    className={styles.locationScanButton}
                                                    onClick={() => void scanLocationCompetitors(location)}
                                                    disabled={scanningLocationId === location.id || !competitionKeyword}
                                                >
                                                    {!competitionKeyword ? '키워드필요' : scanningLocationId === location.id ? '스캔중' : '경쟁스캔'}
                                                </button>
                                                <button onClick={() => editLocation(location)}>수정</button>
                                                <button
                                                    className={styles.locationDeleteButton}
                                                    onClick={() => void deleteLocation(location)}
                                                    disabled={deletingLocationId === location.id}
                                                >
                                                    삭제
                                                </button>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className={styles.marketRoadmap}>
                        <strong>운영 확장</strong>
                        <span>SV 방문/점검</span>
                        <span>오픈 준비 프로젝트</span>
                        <span>CS/이슈 티켓</span>
                        <span>공지/매뉴얼 배포</span>
                    </div>
                </div>
                </section>
            )}

            {activeOperationsTab === 'realty-import' && (
                <section className={styles.marketInsightPanel}>
                    <div className={styles.panelHeader}>
                        <div>
                            <h2>외부 상가 수집</h2>
                            <p>지역 기준으로 외부 상가 매물을 수집해 별도 원본 목록으로 관리합니다. 점포목록에는 자동 등록하지 않습니다.</p>
                        </div>
                        <span>상가 전용 MVP</span>
                    </div>
                    <div className={styles.marketInsightBody}>
                        <div className={styles.realtyImportGrid}>
                            <div className={styles.realtyImportForm}>
                                <div className={styles.realtyRegionPicker}>
                                    <label>
                                        시도
                                        <select
                                            value={realtySido}
                                            onChange={(event) => {
                                                const nextSido = event.target.value;
                                                const nextDistrict = getRealtyRegionOption(nextSido).districts[0] || '';
                                                setRealtySido(nextSido);
                                                setRealtyDistrict(nextDistrict);
                                                setRealtyImportResult(null);
                                            }}
                                        >
                                            {REALTY_REGION_OPTIONS.map(option => (
                                                <option key={option.label} value={option.label}>{option.label}</option>
                                            ))}
                                        </select>
                                    </label>
                                    <label>
                                        시군구
                                        <select
                                            value={realtyDistrict}
                                            onChange={(event) => {
                                                setRealtyDistrict(event.target.value);
                                                setRealtyImportResult(null);
                                            }}
                                        >
                                            {realtyDistrictOptions.map(district => (
                                                <option key={district} value={district}>{district}</option>
                                            ))}
                                        </select>
                                    </label>
                                </div>
                                <div className={styles.realtySourceBox}>
                                    <span>수집 소스</span>
                                    <div>
                                        <span className={styles.realtySourcePill}>당근 상가</span>
                                    </div>
                                    <small>네이버부동산은 향후 고도화 예정입니다. 현재 MVP는 당근 상가 공개 목록만 저장합니다.</small>
                                </div>
                                <button
                                    className={styles.primaryButton}
                                    onClick={() => void runRealtyImport()}
                                    disabled={isRealtyImporting}
                                >
                                    <FileSearch size={15} />
                                    {isRealtyImporting ? '수집 중' : '상가 수집 실행'}
                                </button>
                            </div>

                            <div className={styles.realtyResultPanel}>
                                <div className={styles.realtyResultHeader}>
                                    <div>
                                        <strong>수집 결과</strong>
                                        <span>{realtyImportResult?.job ? `${realtyImportResult.job.region} · ${realtyImportResult.job.status}` : '아직 실행 전'}</span>
                                    </div>
                                    <span className={styles.realtySourcePill}>{selectedRealtyRegion}</span>
                                </div>

                                <div className={styles.realtySummaryCards}>
                                    <article>
                                        <span>수집</span>
                                        <strong>{realtyImportResult?.job?.totalCount || 0}건</strong>
                                    </article>
                                    <article>
                                        <span>신규수집</span>
                                        <strong>{realtyImportResult?.job?.createdCount || 0}건</strong>
                                    </article>
                                    <article>
                                        <span>업데이트</span>
                                        <strong>{realtyImportResult?.job?.updatedCount || 0}건</strong>
                                    </article>
                                    <article>
                                        <span>중복후보</span>
                                        <strong>{realtyImportResult?.job?.duplicateCount || 0}건</strong>
                                    </article>
                                    <article>
                                        <span>실패</span>
                                        <strong>{realtyImportResult?.job?.failedCount || 0}건</strong>
                                    </article>
                                </div>

                                {(realtyImportResult?.job?.warnings || []).length > 0 && (
                                    <div className={styles.realtyNotice}>
                                        {(realtyImportResult?.job?.warnings || []).map((warning, index) => (
                                            <span key={`${warning}-${index}`}>{warning}</span>
                                        ))}
                                    </div>
                                )}
                                {(realtyImportResult?.job?.errors || []).length > 0 && (
                                    <div className={styles.realtyErrorNotice}>
                                        {(realtyImportResult?.job?.errors || []).map((error, index) => (
                                            <span key={`realty-error-${index}`}>
                                                {typeof error === 'string' ? error : error.message || '수집 오류'}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                <div className={styles.realtyResultEmpty}>
                                    {realtyImportResult?.job
                                        ? '수집된 원본은 아래 저장된 상가 목록에 반영됩니다. 같은 매물은 중복 추가하지 않고 최신 정보만 갱신합니다.'
                                        : '지역을 선택하고 상가 수집을 실행하면 수집 요약이 표시됩니다.'}
                                </div>
                            </div>
                        </div>

                        <div className={styles.realtySavedPanel}>
                            <div className={styles.realtyResultHeader}>
                                <div>
                                    <strong>저장된 상가</strong>
                                    <span>{selectedRealtyRegion} · {isSavedRealtyLoading ? '불러오는 중' : `${savedRealtyListings.length.toLocaleString()}건`}</span>
                                </div>
                                <button
                                    className={styles.secondaryButton}
                                    onClick={() => void runRealtyImport()}
                                    disabled={isRealtyImporting}
                                >
                                    <RefreshCw size={14} />
                                    {isRealtyImporting ? '최신화 중' : '최신화'}
                                </button>
                            </div>

                            <div className={styles.realtyTableWrap}>
                                {savedRealtyListings.length === 0 ? (
                                    <div className={styles.locationEmpty}>저장된 상가 매물이 없습니다. 상가 수집 실행 후 이 목록에 누적됩니다.</div>
                                ) : (
                                    <table className={styles.realtyTable}>
                                        <thead>
                                            <tr>
                                                <th>상태</th>
                                                <th>소스</th>
                                                <th>주소</th>
                                                <th>가격</th>
                                                <th>세부</th>
                                                <th>반응</th>
                                                <th>원문</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {savedRealtyListings.map(item => {
                                                const listing = item.listing;
                                                const detailMeta = getRealtyDetailMeta(listing);
                                                const reactionMeta = getRealtyReactionMeta(listing);
                                                const contentSummary = summarizeRealtyContent(listing?.raw?.content);
                                                const statusLabel = item.duplicateOfPropertyId ? '중복후보' : '저장됨';
                                                return (
                                                    <tr key={`${listing?.source || 'source'}-${listing?.id || listing?.sourceListingId}`}>
                                                        <td>
                                                            <span className={item.duplicateOfPropertyId ? styles.realtyStatusWarn : styles.realtyStatusOk}>
                                                                {statusLabel}
                                                            </span>
                                                        </td>
                                                        <td>{getRealtySourceLabel(listing?.source)}</td>
                                                        <td>
                                                            <strong>{listing?.address || listing?.region || '-'}</strong>
                                                            <small>{listing?.region || listing?.sourceListingId || ''}</small>
                                                            {contentSummary && <small>{contentSummary}</small>}
                                                        </td>
                                                        <td>{formatRealtyMoney(listing)}</td>
                                                        <td>
                                                            <strong>{formatRealtyAreaAndFloor(listing)}</strong>
                                                            <small>{detailMeta.join(' · ') || '-'}</small>
                                                        </td>
                                                        <td>
                                                            <strong>{reactionMeta.join(' · ') || '-'}</strong>
                                                            <small>{listing?.imageUrls?.length ? `사진 ${listing.imageUrls.length}장` : ''}</small>
                                                        </td>
                                                        <td>
                                                            {listing?.sourceUrl ? (
                                                                <a className={styles.realtyLinkButton} href={listing.sourceUrl} target="_blank" rel="noreferrer">
                                                                    <ExternalLink size={13} />
                                                                    열기
                                                                </a>
                                                            ) : '-'}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
}
