"use client";

import React from 'react';
import {
    AlertTriangle,
    Building2,
    CheckCircle2,
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

const FRANCHISE_LOCATION_TYPES: FranchiseLocationType[] = ['직영점', '가맹점', '예정점'];
const FRANCHISE_LOCATION_STATUSES: FranchiseLocationStatus[] = ['운영중', '오픈준비', '검토중', '휴점', '폐점'];
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

export default function FranchiseOperationsPage() {
    const [userId, setUserId] = React.useState('');
    const [companyName, setCompanyName] = React.useState('');
    const [locations, setLocations] = React.useState<FranchiseLocation[]>([]);
    const [locationForm, setLocationForm] = React.useState<LocationFormState>(EMPTY_LOCATION_FORM);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSaving, setIsSaving] = React.useState(false);
    const [deletingLocationId, setDeletingLocationId] = React.useState('');
    const [scanningLocationId, setScanningLocationId] = React.useState('');
    const [updatingStatusId, setUpdatingStatusId] = React.useState('');

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
        </div>
    );
}
