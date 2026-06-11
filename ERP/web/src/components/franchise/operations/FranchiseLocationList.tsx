import LocationCompetitionPanel from '@/components/franchise/LocationCompetitionPanel';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import { formatDate, formatScanDate, getCompetitionKeyword, getLocationRegion } from './format';
import {
    FRANCHISE_LOCATION_STATUSES,
    type FranchiseLocation,
    toFranchiseLocationStatus
} from './types';

type FranchiseLocationListProps = {
    readonly locations: readonly FranchiseLocation[];
    readonly updatingStatusId: string;
    readonly scanningLocationId: string;
    readonly deletingLocationId: string;
    readonly onEdit: (location: FranchiseLocation) => void;
    readonly onDelete: (location: FranchiseLocation) => void;
    readonly onScan: (location: FranchiseLocation) => void;
    readonly onStatusChange: (location: FranchiseLocation, status: FranchiseLocation['status']) => void;
};

export function FranchiseLocationList({
    locations,
    updatingStatusId,
    scanningLocationId,
    deletingLocationId,
    onEdit,
    onDelete,
    onScan,
    onStatusChange
}: FranchiseLocationListProps) {
    if (locations.length === 0) {
        return <div className={styles.locationEmpty}>등록된 운영 가맹점이 없습니다.</div>;
    }

    return (
        <div className={styles.locationList}>
            {locations.slice(0, 12).map(location => {
                const scan = location.competitionScan;
                const competitors = scan?.competitors || [];
                const competitionKeyword = getCompetitionKeyword(location);

                return (
                    <article key={location.id} className={styles.locationItem}>
                        <div className={styles.locationItemMain}>
                            <strong>{location.name}</strong>
                            <span>{location.locationType} · {getLocationRegion(location)} · 오픈 {formatDate(location.openedAt)}</span>
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
                                onChange={(event) => onStatusChange(location, toFranchiseLocationStatus(event.target.value))}
                            >
                                {FRANCHISE_LOCATION_STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
                            </select>
                            <button
                                className={styles.locationScanButton}
                                onClick={() => onScan(location)}
                                disabled={scanningLocationId === location.id || !competitionKeyword}
                            >
                                {!competitionKeyword ? '키워드필요' : scanningLocationId === location.id ? '스캔중' : '경쟁스캔'}
                            </button>
                            <button onClick={() => onEdit(location)}>수정</button>
                            <button
                                className={styles.locationDeleteButton}
                                onClick={() => onDelete(location)}
                                disabled={deletingLocationId === location.id}
                            >
                                삭제
                            </button>
                        </div>
                    </article>
                );
            })}
        </div>
    );
}
