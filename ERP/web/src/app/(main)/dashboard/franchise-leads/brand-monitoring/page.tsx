"use client";

import React from 'react';
import Link from 'next/link';
import {
    AlertTriangle,
    BarChart3,
    ExternalLink,
    MapPin,
    Newspaper,
    Radar,
    RefreshCw,
    Search,
    TrendingUp
} from 'lucide-react';
import FranchiseBrandSelector from '@/components/franchise/FranchiseBrandSelector';
import type { FranchiseBrand } from '@/lib/franchise-brands';
import { readApiError, unwrapApiData } from '@/utils/apiResponse';
import styles from '../page.module.css';

type AuthUser = {
    id?: string;
    uid?: string;
    name?: string;
    role?: string;
    companyName?: string;
    companyId?: string | null;
};

type NaverLocalTopItem = {
    rank: number;
    title: string;
    category: string;
    address: string;
    roadAddress: string;
    telephone: string;
    link: string;
};

type RiskMention = {
    keyword: string;
    blogTotal: number;
    newsTotal: number;
    samples: Array<{
        source: 'blog' | 'news';
        title: string;
        link: string;
        description: string;
        date?: string;
    }>;
};

type SerpResult = {
    rank: number;
    title: string;
    link: string;
    address: string;
    category: string;
    rating: number | null;
    reviewCount: number | null;
    blogReviewCount: number | null;
};

type MarketWatch = {
    id: string;
    companyId: string;
    brandId: string | null;
    brandName: string;
    region: string;
    keyword: string;
    ownStoreName: string;
    riskKeywords: string[];
    updatedAt: string;
};

type MarketSnapshot = {
    id: string;
    watchlistId: string | null;
    brandName: string;
    region: string;
    keyword: string;
    snapshotDate: string;
    provider: string;
    naverQuery: string;
    naverBlogTotal: number;
    naverNewsTotal: number;
    naverTrendLatest: number | null;
    naverTrendDelta: number | null;
    naverLocalTop5: NaverLocalTopItem[];
    serpProvider: string;
    serpQuery: string;
    serpResults: SerpResult[];
    ownStoreName: string;
    ownStoreRank: number | null;
    ownStoreVisible: boolean;
    riskMentions: RiskMention[];
    summary: {
        blogDeltaTotal?: number;
        newsDeltaTotal?: number;
        ownStoreRankDelta?: number | null;
        riskMentionTotal?: number;
        warnings?: string[];
    };
    createdAt: string;
};

type MonitoringResponse = {
    watchlist: MarketWatch[];
    snapshots: MarketSnapshot[];
    config: {
        naverConfigured: boolean;
        searchApiConfigured: boolean;
        serpApiConfigured: boolean;
        preferredSerpProvider: string;
    };
};

type ScanResponse = {
    watch: MarketWatch | null;
    snapshot: MarketSnapshot | null;
    warnings: string[];
};

const DEFAULT_RISK_KEYWORDS = '폐점, 위생, 불친절, 환불, 컴플레인, 논란';

function formatNumber(value: number | null | undefined) {
    return Number(value || 0).toLocaleString();
}

function formatDelta(value: number | null | undefined) {
    if (value === null || value === undefined) return '-';
    if (value > 0) return `+${formatNumber(value)}`;
    return formatNumber(value);
}

function formatDateTime(value: string | null | undefined) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('ko-KR', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

function getRequesterId(user: AuthUser | null) {
    return user?.uid || user?.id || '';
}

function getDeltaClass(value: number | null | undefined) {
    if (value === null || value === undefined || value === 0) return styles.monitorDeltaNeutral;
    return value > 0 ? styles.monitorDeltaGood : styles.monitorDeltaBad;
}

export default function FranchiseBrandMonitoringPage() {
    const [user, setUser] = React.useState<AuthUser | null>(null);
    const [brandName, setBrandName] = React.useState('');
    const [brandId, setBrandId] = React.useState<string | null>(null);
    const [region, setRegion] = React.useState('군자');
    const [keyword, setKeyword] = React.useState('맛집');
    const [ownStoreName, setOwnStoreName] = React.useState('');
    const [riskKeywords, setRiskKeywords] = React.useState(DEFAULT_RISK_KEYWORDS);
    const [includeSerp, setIncludeSerp] = React.useState(false);
    const [watchlist, setWatchlist] = React.useState<MarketWatch[]>([]);
    const [snapshots, setSnapshots] = React.useState<MarketSnapshot[]>([]);
    const [config, setConfig] = React.useState<MonitoringResponse['config'] | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isScanning, setIsScanning] = React.useState(false);
    const [message, setMessage] = React.useState('');
    const [messageType, setMessageType] = React.useState<'info' | 'warn' | 'error'>('info');

    const requesterId = getRequesterId(user);
    const latestSnapshot = snapshots[0] || null;
    const canUseSerp = Boolean(config?.searchApiConfigured || config?.serpApiConfigured);

    const fetchDashboard = React.useCallback(async (nextUser: AuthUser) => {
        const nextRequesterId = getRequesterId(nextUser);
        if (!nextRequesterId) return;

        setIsLoading(true);
        try {
            const params = new URLSearchParams({ requesterId: nextRequesterId });
            if (nextUser.companyName) params.set('company', nextUser.companyName);

            const response = await fetch(`/api/franchise-market-monitoring?${params.toString()}`, { cache: 'no-store' });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(readApiError(payload));

            const data = unwrapApiData<MonitoringResponse>(payload);
            setWatchlist(data.watchlist || []);
            setSnapshots(data.snapshots || []);
            setConfig(data.config || null);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : '브랜드 모니터링 정보를 불러오지 못했습니다.');
            setMessageType('error');
        } finally {
            setIsLoading(false);
        }
    }, []);

    React.useEffect(() => {
        const rawUser = localStorage.getItem('user');
        if (!rawUser) {
            setIsLoading(false);
            setMessage('로그인 정보가 필요합니다.');
            setMessageType('error');
            return;
        }

        try {
            const parsedUser = JSON.parse(rawUser) as AuthUser;
            setUser(parsedUser);
            void fetchDashboard(parsedUser);
        } catch {
            setIsLoading(false);
            setMessage('로그인 정보를 읽을 수 없습니다.');
            setMessageType('error');
        }
    }, [fetchDashboard]);

    const handleSelectBrand = (brand: FranchiseBrand) => {
        setBrandName(brand.brandName);
        setBrandId(brand.id.startsWith('custom-') ? null : brand.id);
        if (brand.recommendedKeywords?.[0]) {
            setKeyword(brand.recommendedKeywords[0]);
        }
    };

    const fillFromWatch = (watch: MarketWatch) => {
        setBrandName(watch.brandName);
        setBrandId(watch.brandId);
        setRegion(watch.region);
        setKeyword(watch.keyword);
        setOwnStoreName(watch.ownStoreName || '');
        setRiskKeywords((watch.riskKeywords || []).join(', ') || DEFAULT_RISK_KEYWORDS);
    };

    const runScan = async () => {
        if (!user || !requesterId) return;
        if (!brandName.trim() || !region.trim() || !keyword.trim()) {
            setMessage('브랜드, 지역, 키워드를 입력해주세요.');
            setMessageType('warn');
            return;
        }

        setIsScanning(true);
        setMessage('');
        try {
            const response = await fetch('/api/franchise-market-monitoring', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    requesterId,
                    companyName: user.companyName,
                    companyId: user.companyId,
                    brandName,
                    brandId,
                    region,
                    keyword,
                    ownStoreName,
                    riskKeywords,
                    includeSerp,
                    saveWatch: true
                })
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(readApiError(payload));

            const data = unwrapApiData<ScanResponse>(payload);
            setMessage(data.snapshot ? '브랜드 모니터링 스냅샷을 저장했습니다.' : '감시목록을 저장했습니다. API 키 설정 후 수집 결과가 저장됩니다.');
            setMessageType(data.warnings?.length ? 'warn' : 'info');
            await fetchDashboard(user);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : '브랜드 모니터링 수집 중 오류가 발생했습니다.');
            setMessageType('error');
        } finally {
            setIsScanning(false);
        }
    };

    const deleteWatch = async (watchId: string) => {
        if (!user || !requesterId) return;
        if (!window.confirm('감시목록에서 제거할까요? 기존 스냅샷은 유지됩니다.')) return;

        try {
            const params = new URLSearchParams({ id: watchId, requesterId });
            const response = await fetch(`/api/franchise-market-monitoring?${params.toString()}`, { method: 'DELETE' });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(readApiError(payload));
            await fetchDashboard(user);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : '감시목록 삭제 중 오류가 발생했습니다.');
            setMessageType('error');
        }
    };

    return (
        <div className={styles.pageShell}>
            <section className={styles.hero}>
                <div>
                    <span className={styles.eyebrow}>Brand Signal Console</span>
                    <h1>브랜드 모니터링</h1>
                    <p>지역 키워드의 검색량, 공식 지역검색 TOP5, 실제 SERP 순위, 위험 키워드를 일별로 저장합니다.</p>
                </div>
                <div className={styles.heroActions}>
                    <button
                        className={styles.secondaryButton}
                        onClick={() => user && void fetchDashboard(user)}
                        disabled={isLoading || !user}
                    >
                        <RefreshCw size={16} />
                        새로고침
                    </button>
                    <button className={styles.primaryButton} onClick={() => void runScan()} disabled={isScanning || isLoading}>
                        <Radar size={16} />
                        {isScanning ? '수집 중' : '수집 실행'}
                    </button>
                </div>
            </section>

            <nav className={styles.franchiseTabs} aria-label="모객 DB 하위 메뉴">
                <Link href="/dashboard/franchise-leads">후보자 관리</Link>
                <Link href="/dashboard/franchise-leads/market-insights">출점 후보지</Link>
                <Link href="/dashboard/franchise-leads/brand-monitoring" className={styles.franchiseTabActive}>
                    브랜드 모니터링
                </Link>
            </nav>

            <section className={styles.brandMonitorGrid}>
                <div className={styles.brandMonitorFormPanel}>
                    <div className={styles.monitorPanelHeader}>
                        <div>
                            <h2>수집 조건</h2>
                            <p>브랜드와 지역 키워드를 조합해 네이버 공식 API와 선택 SERP Provider를 호출합니다.</p>
                        </div>
                        <span>MVP</span>
                    </div>

                    <div className={styles.configPills}>
                        <span className={config?.naverConfigured ? styles.configPill : styles.configPillOff}>
                            Naver {config?.naverConfigured ? '연결됨' : '키 필요'}
                        </span>
                        <span className={canUseSerp ? styles.configPill : styles.configPillOff}>
                            SERP POC {canUseSerp ? '가능' : '키 필요'}
                        </span>
                    </div>

                    {message && (
                        <div className={`${styles.messageBox} ${messageType === 'warn' ? styles.messageBoxWarn : ''} ${messageType === 'error' ? styles.messageBoxError : ''}`}>
                            {messageType !== 'info' && <AlertTriangle size={16} />}
                            <span>{message}</span>
                        </div>
                    )}

                    <div className={styles.brandMonitorForm}>
                        <FranchiseBrandSelector
                            requesterId={requesterId}
                            companyName={user?.companyName || ''}
                            value={brandName}
                            disabled={isLoading || isScanning}
                            onBrandChange={(value) => {
                                setBrandName(value);
                                setBrandId(null);
                            }}
                            onSelectBrand={handleSelectBrand}
                            classNames={{
                                field: styles.brandMonitorField,
                                row: styles.brandSelectorRow,
                                input: styles.brandMonitorInput,
                                button: styles.brandMonitorSearchButton,
                                results: styles.brandSelectorResults,
                                resultItem: styles.brandSelectorResult,
                                resultMeta: styles.brandSelectorMeta,
                                badge: styles.brandSelectorBadge,
                                empty: styles.brandSelectorEmpty
                            }}
                        />
                        <label className={styles.brandMonitorField}>
                            지역
                            <input
                                className={styles.brandMonitorInput}
                                value={region}
                                onChange={(event) => setRegion(event.target.value)}
                                placeholder="예: 군자, 서울 강남구"
                            />
                        </label>
                        <label className={styles.brandMonitorField}>
                            키워드
                            <input
                                className={styles.brandMonitorInput}
                                value={keyword}
                                onChange={(event) => setKeyword(event.target.value)}
                                placeholder="예: 맛집, 카페, 치킨"
                            />
                        </label>
                        <label className={styles.brandMonitorField}>
                            우리 매장명
                            <input
                                className={styles.brandMonitorInput}
                                value={ownStoreName}
                                onChange={(event) => setOwnStoreName(event.target.value)}
                                placeholder="SERP 순위 확인용"
                            />
                        </label>
                        <label className={`${styles.brandMonitorField} ${styles.brandMonitorFieldFull}`}>
                            위험 키워드
                            <input
                                className={styles.brandMonitorInput}
                                value={riskKeywords}
                                onChange={(event) => setRiskKeywords(event.target.value)}
                                placeholder="쉼표 또는 띄어쓰기 구분"
                            />
                        </label>
                        <label className={`${styles.serpToggle} ${!canUseSerp ? styles.serpToggleDisabled : ''}`}>
                            <input
                                type="checkbox"
                                checked={includeSerp}
                                disabled={!canUseSerp}
                                onChange={(event) => setIncludeSerp(event.target.checked)}
                            />
                            <span>실제 검색 순위 POC 포함</span>
                        </label>
                    </div>

                    <div className={styles.monitorHint}>
                        <strong>수집 쿼리</strong>
                        <span>{[region, keyword].filter(Boolean).join(' ') || '-'}</span>
                    </div>
                </div>

                <div className={styles.monitorPanel}>
                    <div className={styles.monitorPanelHeader}>
                        <div>
                            <h2>최근 스냅샷</h2>
                            <p>{latestSnapshot ? `${latestSnapshot.brandName} · ${latestSnapshot.region} ${latestSnapshot.keyword}` : '아직 저장된 수집 결과가 없습니다.'}</p>
                        </div>
                        <span>{latestSnapshot ? formatDateTime(latestSnapshot.createdAt) : '대기'}</span>
                    </div>

                    <div className={styles.monitorCards}>
                        <article className={styles.monitorCard}>
                            <div className={styles.monitorCardIcon}><Search size={18} /></div>
                            <span>블로그 총량</span>
                            <strong>{formatNumber(latestSnapshot?.naverBlogTotal)}</strong>
                            <small className={getDeltaClass(latestSnapshot?.summary?.blogDeltaTotal)}>
                                전회 대비 {formatDelta(latestSnapshot?.summary?.blogDeltaTotal)}
                            </small>
                        </article>
                        <article className={styles.monitorCard}>
                            <div className={styles.monitorCardIcon}><Newspaper size={18} /></div>
                            <span>뉴스 총량</span>
                            <strong>{formatNumber(latestSnapshot?.naverNewsTotal)}</strong>
                            <small className={getDeltaClass(latestSnapshot?.summary?.newsDeltaTotal)}>
                                전회 대비 {formatDelta(latestSnapshot?.summary?.newsDeltaTotal)}
                            </small>
                        </article>
                        <article className={styles.monitorCard}>
                            <div className={styles.monitorCardIcon}><TrendingUp size={18} /></div>
                            <span>검색 트렌드</span>
                            <strong>{latestSnapshot?.naverTrendLatest === null || latestSnapshot?.naverTrendLatest === undefined ? '-' : latestSnapshot.naverTrendLatest.toFixed(1)}</strong>
                            <small className={getDeltaClass(latestSnapshot?.naverTrendDelta)}>
                                전일 대비 {formatDelta(latestSnapshot?.naverTrendDelta)}
                            </small>
                        </article>
                        <article className={styles.monitorCard}>
                            <div className={styles.monitorCardIcon}><BarChart3 size={18} /></div>
                            <span>우리 매장 노출</span>
                            <strong>{latestSnapshot?.ownStoreVisible ? `${latestSnapshot.ownStoreRank}위` : '-'}</strong>
                            <small>{latestSnapshot?.serpProvider ? latestSnapshot.serpProvider : 'SERP 미수집'}</small>
                        </article>
                    </div>
                </div>
            </section>

            <section className={styles.monitorLists}>
                <article className={styles.monitorPanel}>
                    <div className={styles.monitorPanelHeader}>
                        <div>
                            <h2>네이버 지역검색 TOP5</h2>
                            <p>공식 Local Search API 기준입니다. 실제 통합검색 순위는 SERP POC에서 보강합니다.</p>
                        </div>
                        <MapPin size={18} />
                    </div>
                    <div className={styles.localTopList}>
                        {(latestSnapshot?.naverLocalTop5 || []).length > 0 ? latestSnapshot?.naverLocalTop5.map(item => (
                            <div key={`${item.rank}-${item.title}`} className={styles.localTopItem}>
                                <strong>{item.rank}</strong>
                                <div>
                                    <span>{item.title}</span>
                                    <small>{item.category || '-'} · {item.roadAddress || item.address || '-'}</small>
                                </div>
                                {item.link && (
                                    <a href={item.link} target="_blank" rel="noreferrer">
                                        <ExternalLink size={14} />
                                    </a>
                                )}
                            </div>
                        )) : (
                            <p className={styles.emptyStateText}>수집된 지역검색 결과가 없습니다.</p>
                        )}
                    </div>
                </article>

                <article className={styles.monitorPanel}>
                    <div className={styles.monitorPanelHeader}>
                        <div>
                            <h2>위험 키워드 감지</h2>
                            <p>브랜드명과 위험 키워드를 조합해 블로그/뉴스 언급량을 추적합니다.</p>
                        </div>
                        <AlertTriangle size={18} />
                    </div>
                    <div className={styles.riskList}>
                        {(latestSnapshot?.riskMentions || []).length > 0 ? latestSnapshot?.riskMentions.map(item => (
                            <div key={item.keyword} className={styles.riskItem}>
                                <div>
                                    <strong>{item.keyword}</strong>
                                    <span>블로그 {formatNumber(item.blogTotal)} · 뉴스 {formatNumber(item.newsTotal)}</span>
                                </div>
                                <div className={styles.riskSamples}>
                                    {item.samples.slice(0, 2).map(sample => (
                                        <a key={`${item.keyword}-${sample.link}`} href={sample.link} target="_blank" rel="noreferrer">
                                            [{sample.source}] {sample.title}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )) : (
                            <p className={styles.emptyStateText}>감지된 위험 키워드 수집 결과가 없습니다.</p>
                        )}
                    </div>
                </article>
            </section>

            <section className={styles.monitorPanel}>
                <div className={styles.monitorPanelHeader}>
                    <div>
                        <h2>감시목록</h2>
                        <p>자주 보는 브랜드/지역 키워드를 저장하고 다시 수집할 수 있습니다.</p>
                    </div>
                    <span>{watchlist.length.toLocaleString()}개</span>
                </div>
                <div className={styles.watchList}>
                    {watchlist.length > 0 ? watchlist.map(watch => (
                        <div key={watch.id} className={styles.watchItem}>
                            <button type="button" onClick={() => fillFromWatch(watch)}>
                                <strong>{watch.brandName}</strong>
                                <span>{watch.region} · {watch.keyword}</span>
                                <small>수정 {formatDateTime(watch.updatedAt)}</small>
                            </button>
                            <button type="button" onClick={() => void deleteWatch(watch.id)}>삭제</button>
                        </div>
                    )) : (
                        <p className={styles.emptyStateText}>저장된 감시목록이 없습니다.</p>
                    )}
                </div>
            </section>

            <section className={styles.monitorPanel}>
                <div className={styles.monitorPanelHeader}>
                    <div>
                        <h2>수집 이력</h2>
                        <p>일별 스냅샷과 SERP 노출 여부를 비교합니다.</p>
                    </div>
                    <span>{snapshots.length.toLocaleString()}건</span>
                </div>
                <div className={styles.snapshotTableWrap}>
                    <table className={styles.snapshotTable}>
                        <thead>
                            <tr>
                                <th>수집시각</th>
                                <th>브랜드</th>
                                <th>지역/키워드</th>
                                <th>블로그</th>
                                <th>뉴스</th>
                                <th>트렌드</th>
                                <th>우리 매장</th>
                                <th>위험언급</th>
                                <th>Provider</th>
                            </tr>
                        </thead>
                        <tbody>
                            {snapshots.map(snapshot => (
                                <tr key={snapshot.id}>
                                    <td>{formatDateTime(snapshot.createdAt)}</td>
                                    <td>{snapshot.brandName}</td>
                                    <td>{snapshot.region} {snapshot.keyword}</td>
                                    <td>{formatNumber(snapshot.naverBlogTotal)}</td>
                                    <td>{formatNumber(snapshot.naverNewsTotal)}</td>
                                    <td>{snapshot.naverTrendLatest === null ? '-' : snapshot.naverTrendLatest.toFixed(1)}</td>
                                    <td>{snapshot.ownStoreVisible ? `${snapshot.ownStoreRank}위` : '-'}</td>
                                    <td>{formatNumber(snapshot.summary?.riskMentionTotal)}</td>
                                    <td>{snapshot.provider}</td>
                                </tr>
                            ))}
                            {snapshots.length === 0 && (
                                <tr>
                                    <td colSpan={9}>수집 이력이 없습니다.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
