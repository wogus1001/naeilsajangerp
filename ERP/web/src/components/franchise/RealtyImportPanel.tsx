"use client";

import React from 'react';
import { RefreshCw } from 'lucide-react';
import { readApiError, unwrapApiData } from '@/utils/apiResponse';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import {
    RealtyImportForm,
    RealtyImportResultPanel
} from './realty-import/RealtyImportControls';
import { RealtySavedListings } from './realty-import/RealtySavedListings';
import {
    buildRealtyRegionQuery,
    getRealtyRegionOption,
    parseRealtyRegionToSelection
} from './realty-import/regions';
import type { RealtyImportedListing, RealtyImportResult, RealtyListingRecord } from './realty-import/types';
import {
    getRealtySavedRegionKey,
    getRealtySavedRegionKeyFromText,
    getSavedRegions,
    isFavorite,
    mergeFavorite
} from './realty-import/utils';

type Props = {
    readonly userId: string;
    readonly initialRegionHint?: string;
};

const REALTY_IMPORT_LIMIT = 2000;
const REALTY_LIST_LIMIT = 2000;

export function RealtyImportPanel({ userId, initialRegionHint = '' }: Props) {
    const initialSelection = React.useMemo(
        () => parseRealtyRegionToSelection(initialRegionHint || '서울 광진구'),
        [initialRegionHint]
    );
    const initialSavedRegion = React.useMemo(
        () => getRealtySavedRegionKeyFromText(buildRealtyRegionQuery(initialSelection.sido, initialSelection.district)),
        [initialSelection]
    );
    const [realtySido, setRealtySido] = React.useState(initialSelection.sido);
    const [realtyDistrict, setRealtyDistrict] = React.useState(initialSelection.district);
    const [selectedSavedRegion, setSelectedSavedRegion] = React.useState(initialSavedRegion);
    const [isRealtyImporting, setIsRealtyImporting] = React.useState(false);
    const [isSavedRealtyLoading, setIsSavedRealtyLoading] = React.useState(false);
    const [realtyImportResult, setRealtyImportResult] = React.useState<RealtyImportResult | null>(null);
    const [allSavedRealtyListings, setAllSavedRealtyListings] = React.useState<readonly RealtyImportedListing[]>([]);
    const [favoriteUpdatingId, setFavoriteUpdatingId] = React.useState('');

    const realtyDistrictOptions = React.useMemo(() => getRealtyRegionOption(realtySido).districts, [realtySido]);
    const selectedRealtyRegion = React.useMemo(
        () => buildRealtyRegionQuery(realtySido, realtyDistrict),
        [realtyDistrict, realtySido]
    );
    const savedRegions = React.useMemo(() => getSavedRegions(allSavedRealtyListings), [allSavedRealtyListings]);
    const selectedSavedRegionListings = React.useMemo(
        () => allSavedRealtyListings.filter(item => getRealtySavedRegionKey(item.listing) === selectedSavedRegion),
        [allSavedRealtyListings, selectedSavedRegion]
    );
    const visibleSavedRegions = React.useMemo(() => {
        if (savedRegions.some(region => region.key === selectedSavedRegion)) return savedRegions;
        return [
            { key: selectedSavedRegion, count: 0, favoriteCount: 0 },
            ...savedRegions
        ];
    }, [savedRegions, selectedSavedRegion]);
    const favoriteCount = selectedSavedRegionListings.filter(isFavorite).length;

    React.useEffect(() => {
        const parsed = parseRealtyRegionToSelection(initialRegionHint || '서울 광진구');
        setRealtySido(parsed.sido);
        setRealtyDistrict(parsed.district);
        setSelectedSavedRegion(getRealtySavedRegionKeyFromText(buildRealtyRegionQuery(parsed.sido, parsed.district)));
    }, [initialRegionHint]);

    React.useEffect(() => {
        if (!realtyDistrictOptions.includes(realtyDistrict)) {
            const nextDistrict = realtyDistrictOptions[0] || '';
            setRealtyDistrict(nextDistrict);
            setSelectedSavedRegion(getRealtySavedRegionKeyFromText(buildRealtyRegionQuery(realtySido, nextDistrict)));
        }
    }, [realtyDistrict, realtyDistrictOptions, realtySido]);

    const fetchSavedRealtyListings = React.useCallback(async () => {
        if (!userId) return;
        setIsSavedRealtyLoading(true);
        try {
            const params = new URLSearchParams({
                requesterId: userId,
                source: 'daangn',
                limit: String(REALTY_LIST_LIMIT)
            });
            const response = await fetch(`/api/realty/listings?${params.toString()}`, { cache: 'no-store' });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(readApiError(payload));

            const data = unwrapApiData<{ readonly listings: readonly RealtyListingRecord[] }>(payload);
            setAllSavedRealtyListings((data.listings || []).map(listing => ({
                action: 'collected',
                duplicateOfPropertyId: listing.duplicateOfPropertyId,
                listing
            })));
        } catch (error) {
            console.error('Failed to fetch saved realty listings:', error);
            setAllSavedRealtyListings([]);
        } finally {
            setIsSavedRealtyLoading(false);
        }
    }, [userId]);

    React.useEffect(() => {
        void fetchSavedRealtyListings();
    }, [fetchSavedRealtyListings]);

    const runRealtyImport = async (regionOverride?: string) => {
        if (!userId) return;
        const region = (regionOverride || selectedRealtyRegion).trim();
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
                    limit: REALTY_IMPORT_LIMIT,
                    registerToProperties: false
                })
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(readApiError(payload));

            const data = unwrapApiData<RealtyImportResult>(payload);
            setRealtyImportResult(data);
            setSelectedSavedRegion(getRealtySavedRegionKeyFromText(region));
            await fetchSavedRealtyListings();
            if (data.job?.status === 'failed') {
                window.alert('상가 수집이 완료되지 않았습니다. 수집 결과 영역의 오류/경고를 확인해주세요.');
                return;
            }
            window.alert(`상가 수집을 완료했습니다. 신규수집 ${data.job?.createdCount || 0}건, 업데이트 ${data.job?.updatedCount || 0}건`);
        } catch (error) {
            window.alert(error instanceof Error ? error.message : '외부 상가 수집 중 오류가 발생했습니다.');
        } finally {
            setIsRealtyImporting(false);
        }
    };

    const toggleFavorite = async (listing: RealtyListingRecord) => {
        const nextFavorite = listing.data?.favorite !== true;
        setFavoriteUpdatingId(listing.id);
        setAllSavedRealtyListings(prev => mergeFavorite(prev, listing.id, nextFavorite));
        try {
            const params = new URLSearchParams({ requesterId: userId });
            const response = await fetch(`/api/realty/listings?${params.toString()}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ listingId: listing.id, favorite: nextFavorite })
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(readApiError(payload));
        } catch (error) {
            setAllSavedRealtyListings(prev => mergeFavorite(prev, listing.id, !nextFavorite));
            window.alert(error instanceof Error ? error.message : '별표 저장 중 오류가 발생했습니다.');
        } finally {
            setFavoriteUpdatingId('');
        }
    };

    return (
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
                    <RealtyImportForm
                        realtySido={realtySido}
                        realtyDistrict={realtyDistrict}
                        realtyDistrictOptions={realtyDistrictOptions}
                        isRealtyImporting={isRealtyImporting}
                        importLimit={REALTY_IMPORT_LIMIT}
                        onChangeSido={(nextSido) => {
                            const nextDistrict = getRealtyRegionOption(nextSido).districts[0] || '';
                            setRealtySido(nextSido);
                            setRealtyDistrict(nextDistrict);
                            setSelectedSavedRegion(getRealtySavedRegionKeyFromText(buildRealtyRegionQuery(nextSido, nextDistrict)));
                            setRealtyImportResult(null);
                        }}
                        onChangeDistrict={(nextDistrict) => {
                            setRealtyDistrict(nextDistrict);
                            setSelectedSavedRegion(getRealtySavedRegionKeyFromText(buildRealtyRegionQuery(realtySido, nextDistrict)));
                            setRealtyImportResult(null);
                        }}
                        onRunImport={() => void runRealtyImport()}
                    />
                    <RealtyImportResultPanel result={realtyImportResult} selectedRegion={selectedRealtyRegion} />
                </div>

                <div className={styles.realtySavedPanel}>
                    <div className={styles.realtyResultHeader}>
                        <div>
                            <strong>저장된 상가</strong>
                            <span>
                                {selectedSavedRegion} · {isSavedRealtyLoading ? '불러오는 중' : `${selectedSavedRegionListings.length.toLocaleString()}건`}
                                {allSavedRealtyListings.length > selectedSavedRegionListings.length ? ` · 전체 ${allSavedRealtyListings.length.toLocaleString()}건` : ''}
                                {favoriteCount > 0 ? ` · 별표 ${favoriteCount.toLocaleString()}건` : ''}
                            </span>
                        </div>
                        <button className={styles.secondaryButton} onClick={() => void runRealtyImport(selectedSavedRegion)} disabled={isRealtyImporting}>
                            <RefreshCw size={14} />
                            {isRealtyImporting ? '최신화 중' : '최신화'}
                        </button>
                    </div>
                    <div className={styles.realtySavedRegionBar}>
                        <strong>저장 지역</strong>
                        <div>
                            {visibleSavedRegions.map(region => (
                                <button
                                    key={region.key}
                                    type="button"
                                    className={region.key === selectedSavedRegion ? styles.realtySavedRegionActive : ''}
                                    onClick={() => setSelectedSavedRegion(region.key)}
                                >
                                    <span>{region.key}</span>
                                    <small>
                                        {region.count.toLocaleString()}건
                                        {region.favoriteCount > 0 ? ` · 별표 ${region.favoriteCount.toLocaleString()}` : ''}
                                    </small>
                                </button>
                            ))}
                        </div>
                    </div>
                    <RealtySavedListings
                        listings={selectedSavedRegionListings}
                        isLoading={isSavedRealtyLoading}
                        favoriteUpdatingId={favoriteUpdatingId}
                        onToggleFavoriteAction={toggleFavorite}
                    />
                </div>
            </div>
        </section>
    );
}
