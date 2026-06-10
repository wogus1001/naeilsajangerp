import { ExternalLink, Star } from 'lucide-react';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
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
    readonly onToggleFavoriteAction: (listing: RealtyListingRecord) => void;
};

export function RealtyListingRow({ item, favoriteUpdatingId, onToggleFavoriteAction }: Props) {
    const listing = item.listing;
    const favorite = isFavorite(item);
    const detailMeta = getRealtyDetailMeta(listing);
    const reactionMeta = getRealtyReactionMeta(listing);
    const contentSummary = summarizeRealtyContent(listing?.raw?.content);

    return (
        <tr>
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
                <span className={item.duplicateOfPropertyId ? styles.realtyStatusWarn : styles.realtyStatusOk}>
                    {item.duplicateOfPropertyId ? '중복후보' : '저장됨'}
                </span>
                <small>{getRealtySourceLabel(listing?.source)}</small>
            </td>
            <td>
                <strong>{listing?.address || listing?.region || '-'}</strong>
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
