import { ExternalLink, Star } from 'lucide-react';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import { scoreRealtyListing } from './scoring';
import type { RealtyImportedListing, RealtyListingRecord } from './types';
import {
    formatRealtyAreaAndFloor,
    formatRealtyDate,
    formatRealtyMoney,
    formatSavedAt,
    getRealtyDetailMeta,
    getRealtyReactionMeta,
    getRealtySourceLabel,
    isFavorite,
    summarizeRealtyContent
} from './utils';

type Props = {
    readonly item: RealtyImportedListing;
    readonly favoriteUpdatingId: string;
    readonly mapMarkerNumber?: number;
    readonly isMapMarkerSelected?: boolean;
    readonly onSelectMapMarkerAction?: () => void;
    readonly onToggleFavoriteAction: (listing: RealtyListingRecord) => void;
};

export function RealtyListingRow({
    item,
    favoriteUpdatingId,
    mapMarkerNumber,
    isMapMarkerSelected = false,
    onSelectMapMarkerAction,
    onToggleFavoriteAction
}: Props) {
    const listing = item.listing;
    const favorite = isFavorite(item);
    const detailMeta = getRealtyDetailMeta(listing);
    const reactionMeta = getRealtyReactionMeta(listing);
    const contentSummary = summarizeRealtyContent(listing?.raw?.content);
    const candidateScore = scoreRealtyListing(item);
    const canSelectMapMarker = Boolean(mapMarkerNumber && onSelectMapMarkerAction);
    const addressText = listing?.address || listing?.region || '-';

    return (
        <tr className={isMapMarkerSelected ? styles.realtyTableRowSelected : undefined}>
            <td>
                {listing ? (
                    <button
                        type="button"
                        className={favorite ? styles.realtyFavoriteActive : styles.realtyFavoriteButton}
                        onClick={() => onToggleFavoriteAction(listing)}
                        disabled={favoriteUpdatingId === listing.id}
                        aria-label={favorite ? '별표 해제' : '별표 표시'}
                        title={favorite ? '별표 해제' : '별표 표시'}
                    >
                        <Star size={16} fill={favorite ? 'currentColor' : 'none'} />
                    </button>
                ) : '-'}
            </td>
            <td>
                {mapMarkerNumber ? (
                    <button
                        type="button"
                        className={isMapMarkerSelected ? styles.realtyTableMapBadgeActive : styles.realtyTableMapBadge}
                        onClick={onSelectMapMarkerAction}
                        aria-label={`지도 ${mapMarkerNumber}번 마커 보기`}
                    >
                        {mapMarkerNumber}
                    </button>
                ) : (
                    <span className={styles.realtyTableMapEmpty}>-</span>
                )}
            </td>
            <td>
                <strong className={styles.realtyScoreValue}>{candidateScore.score}점</strong>
                <small>{candidateScore.reasons.slice(0, 3).join(' · ') || '검토'}</small>
            </td>
            <td>
                <span className={item.duplicateOfPropertyId ? styles.realtyStatusWarn : styles.realtyStatusOk}>
                    {item.duplicateOfPropertyId ? '중복후보' : '저장됨'}
                </span>
                <small>{getRealtySourceLabel(listing?.source)}</small>
            </td>
            <td>
                {canSelectMapMarker ? (
                    <button type="button" className={styles.realtyAddressButton} onClick={onSelectMapMarkerAction}>
                        <strong>{addressText}</strong>
                    </button>
                ) : (
                    <strong>{addressText}</strong>
                )}
                <small>{listing?.region || listing?.sourceListingId || ''}</small>
                {contentSummary && <small>{contentSummary}</small>}
            </td>
            <td>{formatRealtyMoney(listing)}</td>
            <td>
                <strong>{formatSavedAt(listing)}</strong>
                <small>{listing?.updatedAt ? `갱신 ${formatRealtyDate(listing.updatedAt)}` : ''}</small>
            </td>
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
}
