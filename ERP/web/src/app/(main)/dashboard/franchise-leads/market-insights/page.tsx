"use client";

import React from 'react';
import {
    BriefcaseBusiness,
    FileSearch,
    MapPin,
    Plus,
    RefreshCw,
    Target,
    TrendingUp
} from 'lucide-react';
import { readApiError, unwrapApiData } from '@/utils/apiResponse';
import KakaoAddressSearch, { KakaoAddressResult } from '@/components/franchise/KakaoAddressSearch';
import FranchiseBrandSelector from '@/components/franchise/FranchiseBrandSelector';
import LocationCompetitionPanel, { LocationCompetitionScan } from '@/components/franchise/LocationCompetitionPanel';
import { RealtyImportPanel } from '@/components/franchise/RealtyImportPanel';
import type { FranchiseBrand } from '@/lib/franchise-brands';
import {
    buildMarketInsights,
    LocationInsightProperty,
    normalizeRegion
} from '@/lib/franchise-market-insights';
import styles from '../page.module.css';

type FranchiseLocationType = '직영점' | '가맹점' | '예정점';
type FranchiseLocationStatus = '운영중' | '오픈준비' | '검토중' | '휴점' | '폐점';
type MarketInsightTab = 'market-insights' | 'realty-import';

type AuthUser = {
    id?: string;
    uid?: string;
    name?: string;
    role?: string;
    companyName?: string;
    companyId?: string | null;
};

type FranchiseLead = {
    id: string;
    desiredRegion: string;
    grade: string;
    status: string;
    source: string;
    budgetMin: number | null;
    budgetMax: number | null;
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
    sourcePropertyId?: string | null;
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

type LeadListResponse = {
    leads: FranchiseLead[];
    total: number;
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
    locationType: '예정점',
    brand: '',
    brandId: '',
    industry: '',
    businessType: '',
    categoryMajor: '',
    categoryMiddle: '',
    categorySmall: '',
    competitionKeyword: '',
    status: '검토중',
    region: '',
    address: '',
    latitude: null,
    longitude: null,
    openedAt: '',
    memo: ''
};

function formatBudgetManwon(value: number | null) {
    if (value === null) return '-';
    return `${value.toLocaleString()}만원`;
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

function isSitePlanningLocation(location: FranchiseLocation) {
    return location.locationType === '예정점' || location.status === '검토중' || location.status === '오픈준비';
}

function getCompetitionKeyword(location: Pick<FranchiseLocation, 'brand' | 'competitionKeyword'>) {
    return (location.competitionKeyword || location.brand || '').trim();
}

export default function FranchiseMarketInsightsPage() {
    const [activeMarketTab, setActiveMarketTab] = React.useState<MarketInsightTab>('market-insights');
    const [userId, setUserId] = React.useState('');
    const [companyName, setCompanyName] = React.useState('');
    const [leads, setLeads] = React.useState<FranchiseLead[]>([]);
    const [locationProperties, setLocationProperties] = React.useState<LocationInsightProperty[]>([]);
    const [franchiseLocations, setFranchiseLocations] = React.useState<FranchiseLocation[]>([]);
    const [locationForm, setLocationForm] = React.useState<LocationFormState>(EMPTY_LOCATION_FORM);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isLocationSaving, setIsLocationSaving] = React.useState(false);
    const [deletingLocationId, setDeletingLocationId] = React.useState('');
    const [scanningLocationId, setScanningLocationId] = React.useState('');

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
        setUserId(currentUserId);
        setCompanyName(parsedUser.role === 'admin' ? '' : parsedUser.companyName || '');
    }, []);

    React.useEffect(() => {
        const syncTabFromUrl = () => {
            const queryTab = new URLSearchParams(window.location.search).get('tab');
            setActiveMarketTab(queryTab === 'realty-import' ? 'realty-import' : 'market-insights');
        };

        syncTabFromUrl();
        window.addEventListener('popstate', syncTabFromUrl);
        return () => window.removeEventListener('popstate', syncTabFromUrl);
    }, []);

    const fetchInsightData = React.useCallback(async () => {
        if (!userId) return;

        setIsLoading(true);
        try {
            const leadParams = new URLSearchParams({
                requesterId: userId,
                limit: 'all',
                summary: 'true'
            });
            const locationParams = new URLSearchParams({ requesterId: userId });
            const propertyParams = new URLSearchParams({
                requesterId: userId,
                limit: 'all'
            });
            if (companyName) {
                leadParams.set('company', companyName);
                locationParams.set('company', companyName);
                propertyParams.set('company', companyName);
            }

            const [leadResponse, propertyResponse, locationResponse] = await Promise.all([
                fetch(`/api/franchise-leads?${leadParams.toString()}`, { cache: 'no-store' }),
                fetch(`/api/properties?${propertyParams.toString()}`, { cache: 'no-store' }),
                fetch(`/api/franchise-locations?${locationParams.toString()}`, { cache: 'no-store' })
            ]);

            const [leadPayload, propertyPayload, locationPayload] = await Promise.all([
                leadResponse.json(),
                propertyResponse.json(),
                locationResponse.json()
            ]);

            if (!leadResponse.ok) throw new Error(readApiError(leadPayload));
            if (!propertyResponse.ok) throw new Error(readApiError(propertyPayload));
            if (!locationResponse.ok) throw new Error(readApiError(locationPayload));

            const leadData = unwrapApiData<LeadListResponse>(leadPayload);
            const propertyData = unwrapApiData<LocationInsightProperty[]>(propertyPayload);
            const locationData = unwrapApiData<{ locations: FranchiseLocation[] }>(locationPayload);

            setLeads(leadData.leads || []);
            setLocationProperties(propertyData || []);
            setFranchiseLocations(locationData.locations || []);
        } catch (error) {
            console.error('Failed to fetch market insight data:', error);
            setLeads([]);
            setLocationProperties([]);
            setFranchiseLocations([]);
            window.alert(error instanceof Error ? error.message : '출점 후보지 인사이트를 불러오지 못했습니다.');
        } finally {
            setIsLoading(false);
        }
    }, [companyName, userId]);

    React.useEffect(() => {
        if (!userId) return;
        void fetchInsightData();
    }, [fetchInsightData, userId]);

    const sitePlanningLocations = React.useMemo(
        () => franchiseLocations.filter(isSitePlanningLocation),
        [franchiseLocations]
    );
    const locationInsightItems = React.useMemo<LocationInsightProperty[]>(
        () => [
            ...locationProperties,
            ...sitePlanningLocations.map(location => ({
                id: location.id,
                name: location.name,
                region: location.region,
                address: location.address,
                status: location.status,
                locationType: location.locationType,
                lat: location.latitude ?? undefined,
                lng: location.longitude ?? undefined,
                externalCompetitorCount: location.competitionScan?.totalCount || location.competitionScan?.competitors?.length || 0
            }))
        ],
        [locationProperties, sitePlanningLocations]
    );
    const marketInsights = React.useMemo(
        () => buildMarketInsights(leads, locationInsightItems),
        [leads, locationInsightItems]
    );
    const topMarketInsight = marketInsights[0] || null;
    const highCompetitionCount = marketInsights.filter(item => item.competitionScore >= 70).length;
    const strongMarketingCount = marketInsights.filter(item => item.marketingScore >= 70).length;
    const firstSitePlanningLocation = sitePlanningLocations[0];
    const realtyInitialRegion = topMarketInsight?.region
        || firstSitePlanningLocation?.region
        || (firstSitePlanningLocation?.address ? normalizeRegion(firstSitePlanningLocation.address) : '서울 광진구');

    const selectMarketTab = (tab: MarketInsightTab) => {
        setActiveMarketTab(tab);
        const params = new URLSearchParams(window.location.search);
        if (tab === 'realty-import') {
            params.set('tab', 'realty-import');
        } else {
            params.delete('tab');
        }

        const queryString = params.toString();
        const nextUrl = `${window.location.pathname}${queryString ? `?${queryString}` : ''}`;
        window.history.pushState(null, '', nextUrl);
    };

    const resetLocationForm = () => {
        setLocationForm(EMPTY_LOCATION_FORM);
    };

    const editFranchiseLocation = (location: FranchiseLocation) => {
        setLocationForm({
            id: location.id,
            name: location.name || '',
            locationType: location.locationType || '예정점',
            brand: location.brand || '',
            brandId: location.brandId || '',
            industry: location.industry || '',
            businessType: location.businessType || '',
            categoryMajor: location.categoryMajor || '',
            categoryMiddle: location.categoryMiddle || '',
            categorySmall: location.categorySmall || '',
            competitionKeyword: location.competitionKeyword || '',
            status: location.status || '검토중',
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

    const saveFranchiseLocation = async () => {
        if (!userId) return;
        if (!locationForm.name.trim()) {
            window.alert('위치명을 입력해주세요.');
            return;
        }
        if (!locationForm.region.trim() && !locationForm.address.trim()) {
            window.alert('지역 또는 주소를 입력해주세요.');
            return;
        }

        setIsLocationSaving(true);
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
            await fetchInsightData();
            window.alert(locationForm.id ? '출점 후보지를 수정했습니다.' : '출점 후보지를 등록했습니다.');
        } catch (error) {
            window.alert(error instanceof Error ? error.message : '위치 저장 중 오류가 발생했습니다.');
        } finally {
            setIsLocationSaving(false);
        }
    };

    const deleteFranchiseLocation = async (location: FranchiseLocation) => {
        if (!userId) return;
        const confirmed = window.confirm(`${location.name} 후보지를 삭제할까요? 기존 모객DB 데이터는 삭제되지 않습니다.`);
        if (!confirmed) return;

        setDeletingLocationId(location.id);
        try {
            const params = new URLSearchParams({ id: location.id, requesterId: userId });
            const response = await fetch(`/api/franchise-locations?${params.toString()}`, { method: 'DELETE' });
            const payload = await response.json().catch(() => ({}));

            if (!response.ok) throw new Error(readApiError(payload));

            if (locationForm.id === location.id) resetLocationForm();
            await fetchInsightData();
            window.alert('출점 후보지를 삭제했습니다.');
        } catch (error) {
            window.alert(error instanceof Error ? error.message : '위치 삭제 중 오류가 발생했습니다.');
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

            await fetchInsightData();
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
                    <h1>출점 후보지</h1>
                    <p>향후 입점 후보지와 모객 리드의 희망지역을 연결해 지역별 반응과 경쟁강도를 확인합니다.</p>
                </div>
                <div className={styles.heroActions}>
                    <button className={styles.secondaryButton} onClick={() => void fetchInsightData()} disabled={isLoading}>
                        <RefreshCw size={16} />
                        {isLoading ? '불러오는 중' : '새로고침'}
                    </button>
                </div>
            </section>

            <nav className={styles.workspaceTabs} aria-label="출점 후보지 작업 영역">
                <button
                    type="button"
                    className={activeMarketTab === 'market-insights' ? styles.workspaceTabActive : styles.workspaceTab}
                    onClick={() => selectMarketTab('market-insights')}
                >
                    <BriefcaseBusiness size={15} />
                    출점 후보지
                </button>
                <button
                    type="button"
                    className={activeMarketTab === 'realty-import' ? styles.workspaceTabActive : styles.workspaceTab}
                    onClick={() => selectMarketTab('realty-import')}
                >
                    <FileSearch size={15} />
                    외부 상가 수집
                </button>
            </nav>

            {activeMarketTab === 'market-insights' && (
            <section className={styles.marketInsightPanel}>
                <div className={styles.panelHeader}>
                    <div>
                        <h2>출점 후보지 인사이트</h2>
                        <p>후보자 희망지역, 점포DB, 출점 후보지를 묶어 우선 검토 지역을 봅니다.</p>
                    </div>
                    <span>출점 계획 · 경쟁스캔</span>
                </div>
                <div className={styles.marketInsightBody}>
                    <div className={styles.marketSummaryCards}>
                        <article>
                            <MapPin size={18} />
                            <span>우선 검토 지역</span>
                            <strong>{topMarketInsight?.region || '-'}</strong>
                            <small>{topMarketInsight ? `기회점수 ${topMarketInsight.opportunityScore}점` : '지역 데이터 없음'}</small>
                        </article>
                        <article>
                            <TrendingUp size={18} />
                            <span>마케팅 반응 우수</span>
                            <strong>{strongMarketingCount.toLocaleString()}곳</strong>
                            <small>마케팅 반응 70점 이상</small>
                        </article>
                        <article>
                            <Target size={18} />
                            <span>경쟁 주의 지역</span>
                            <strong>{highCompetitionCount.toLocaleString()}곳</strong>
                            <small>내부+외부 경쟁강도 70점 이상</small>
                        </article>
                        <article>
                            <BriefcaseBusiness size={18} />
                            <span>분석 후보지</span>
                            <strong>{locationInsightItems.length.toLocaleString()}개</strong>
                            <small>점포DB + 출점 후보지</small>
                        </article>
                    </div>

                    {marketInsights.length === 0 ? (
                        <div className={styles.marketEmpty}>
                            희망지역이 있는 후보자나 주소가 있는 출점 후보지가 쌓이면 지역별 인사이트가 표시됩니다.
                        </div>
                    ) : (
                        <div className={styles.marketInsightTableWrap}>
                            <table className={styles.marketInsightTable}>
                                <thead>
                                    <tr>
                                        <th>지역</th>
                                        <th>리드</th>
                                        <th>즉시상담</th>
                                        <th>계약권</th>
                                        <th>내부점포</th>
                                        <th>평균예산</th>
                                        <th>경쟁업체</th>
                                        <th>마케팅</th>
                                        <th>경쟁</th>
                                        <th>추천 액션</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {marketInsights.map(item => (
                                        <tr key={item.region}>
                                            <td>
                                                <strong>{item.region}</strong>
                                                <small>유입 {item.sourceCount.toLocaleString()}채널</small>
                                            </td>
                                            <td>{item.leadCount.toLocaleString()}</td>
                                            <td>{item.hotCount.toLocaleString()}</td>
                                            <td>{item.contractCount.toLocaleString()}</td>
                                            <td>{item.propertyCount.toLocaleString()}</td>
                                            <td>{formatBudgetManwon(item.avgBudgetManwon)}</td>
                                            <td>{item.externalCompetitorCount.toLocaleString()}</td>
                                            <td><div className={styles.scorePill}>{item.marketingScore}</div></td>
                                            <td>
                                                <div className={item.competitionScore >= 70 ? styles.scorePillWarn : styles.scorePill}>
                                                    {item.competitionScore}
                                                </div>
                                            </td>
                                            <td>
                                                <span className={
                                                    item.tone === 'good'
                                                        ? styles.marketActionGood
                                                        : item.tone === 'warning'
                                                            ? styles.marketActionWarn
                                                            : styles.marketActionNeutral
                                                }>
                                                    {item.action}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className={styles.marketRoadmap}>
                        <strong>다음 확장</strong>
                        <span>후보자-후보지 추천 매칭</span>
                        <span>Naver 검색 트렌드</span>
                        <span>Meta 광고 성과는 HOLD 해제 후 연결</span>
                    </div>

                    <div className={styles.locationMasterPanel}>
                        <div className={styles.locationMasterHeader}>
                            <div>
                                <h3>출점 후보지 마스터</h3>
                                <p>예정점과 검토중 후보지를 등록하면 모객 반응과 경쟁강도 계산에 반영됩니다.</p>
                            </div>
                            <button className={styles.secondaryButton} onClick={resetLocationForm}>
                                <Plus size={14} />
                                새 후보지
                            </button>
                        </div>
                        <div className={styles.locationMasterGrid}>
                            <div className={styles.locationFormGrid}>
                                <label>
                                    위치명
                                    <input
                                        value={locationForm.name}
                                        onChange={(event) => setLocationForm(prev => ({ ...prev, name: event.target.value }))}
                                        placeholder="예: 강남역 직영점"
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
                                    메모
                                    <textarea
                                        value={locationForm.memo}
                                        onChange={(event) => setLocationForm(prev => ({ ...prev, memo: event.target.value }))}
                                        placeholder="상권 특이사항, 예정 일정, 운영 메모"
                                    />
                                </label>
                                <div className={styles.locationFormActions}>
                                    <button className={styles.secondaryButton} onClick={resetLocationForm} disabled={isLocationSaving}>
                                        초기화
                                    </button>
                                    <button className={styles.primaryButton} onClick={() => void saveFranchiseLocation()} disabled={isLocationSaving}>
                                        {isLocationSaving ? '저장 중' : locationForm.id ? '위치 수정' : '위치 등록'}
                                    </button>
                                </div>
                            </div>

                            <div className={styles.locationList}>
                                {franchiseLocations.length === 0 ? (
                                    <div className={styles.locationEmpty}>등록된 출점 후보지가 없습니다.</div>
                                ) : sitePlanningLocations.slice(0, 8).map(location => {
                                    const scan = location.competitionScan;
                                    const competitors = scan?.competitors || [];
                                    const competitionKeyword = getCompetitionKeyword(location);
                                    return (
                                        <article key={location.id} className={styles.locationItem}>
                                        <div className={styles.locationItemMain}>
                                            <strong>{location.name}</strong>
                                            <span>{location.locationType} · {location.status} · {location.region || normalizeRegion(location.address)}</span>
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
                                            <button
                                                className={styles.locationScanButton}
                                                onClick={() => void scanLocationCompetitors(location)}
                                                disabled={scanningLocationId === location.id || !competitionKeyword}
                                            >
                                                {!competitionKeyword ? '키워드필요' : scanningLocationId === location.id ? '스캔중' : '경쟁스캔'}
                                            </button>
                                            <button onClick={() => editFranchiseLocation(location)}>수정</button>
                                            <button
                                                className={styles.locationDeleteButton}
                                                onClick={() => void deleteFranchiseLocation(location)}
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
                </div>
            </section>
            )}

            {activeMarketTab === 'realty-import' && (
                <RealtyImportPanel userId={userId} initialRegionHint={realtyInitialRegion} />
            )}
        </div>
    );
}
