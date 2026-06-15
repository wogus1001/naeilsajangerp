import React from 'react';
import { RefreshCw } from 'lucide-react';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import type { RealtyImportedListing, RealtyListingRecord } from './types';
import type { RealtySavedRegion } from './utils';
import { RealtySavedListings } from './RealtySavedListings';

type Props = {
    readonly selectedSavedRegion: string;
    readonly selectedSavedRegionListings: readonly RealtyImportedListing[];
    readonly allListingCount: number;
    readonly favoriteCount: number;
    readonly visibleSavedRegions: readonly RealtySavedRegion[];
    readonly isSavedRealtyLoading: boolean;
    readonly isRealtyImporting: boolean;
    readonly favoriteUpdatingId: string;
    readonly promotingListingId: string;
    readonly onRefreshRegionAction: (region: string) => void;
    readonly onSelectSavedRegionAction: (region: string) => void;
    readonly onToggleFavoriteAction: (listing: RealtyListingRecord) => void;
    readonly onPromoteListingAction: (listing: RealtyListingRecord) => void;
};

export function RealtySavedPanel({
    selectedSavedRegion,
    selectedSavedRegionListings,
    allListingCount,
    favoriteCount,
    visibleSavedRegions,
    isSavedRealtyLoading,
    isRealtyImporting,
    favoriteUpdatingId,
    promotingListingId,
    onRefreshRegionAction,
    onSelectSavedRegionAction,
    onToggleFavoriteAction,
    onPromoteListingAction
}: Props) {
    return (
        <div className={styles.realtySavedPanel}>
            <div className={styles.realtyResultHeader}>
                <div>
                    <strong>저장된 상가</strong>
                    <span>
                        {selectedSavedRegion} · {isSavedRealtyLoading ? '불러오는 중' : `${selectedSavedRegionListings.length.toLocaleString()}건`}
                        {allListingCount > selectedSavedRegionListings.length ? ` · 전체 ${allListingCount.toLocaleString()}건` : ''}
                        {favoriteCount > 0 ? ` · 별표 ${favoriteCount.toLocaleString()}건` : ''}
                    </span>
                </div>
                <button className={styles.secondaryButton} onClick={() => onRefreshRegionAction(selectedSavedRegion)} disabled={isRealtyImporting}>
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
                            onClick={() => onSelectSavedRegionAction(region.key)}
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
                promotingListingId={promotingListingId}
                onToggleFavoriteAction={onToggleFavoriteAction}
                onPromoteListingAction={onPromoteListingAction}
            />
        </div>
    );
}
