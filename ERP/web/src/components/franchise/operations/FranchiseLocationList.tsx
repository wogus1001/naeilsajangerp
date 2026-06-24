import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import { formatDate, getLocationRegion } from './format';
import {
    FRANCHISE_LOCATION_STATUSES,
    type FranchiseLocation,
    toFranchiseLocationStatus
} from './types';

type FranchiseLocationListProps = {
    readonly locations: readonly FranchiseLocation[];
    readonly updatingStatusId: string;
    readonly deletingLocationId: string;
    readonly onEdit: (location: FranchiseLocation) => void;
    readonly onDelete: (location: FranchiseLocation) => void;
    readonly onStatusChange: (location: FranchiseLocation, status: FranchiseLocation['status']) => void;
};

export function FranchiseLocationList({
    locations,
    updatingStatusId,
    deletingLocationId,
    onEdit,
    onDelete,
    onStatusChange
}: FranchiseLocationListProps) {
    if (locations.length === 0) {
        return <div className={styles.locationEmpty}>등록된 운영 가맹점이 없습니다.</div>;
    }

    return (
        <div className={styles.locationList}>
            {locations.slice(0, 12).map(location => {
                return (
                    <article key={location.id} className={styles.locationItem}>
                        <div className={styles.locationItemMain}>
                            <strong>{location.name}</strong>
                            <span>{location.locationType} · {getLocationRegion(location)} · 오픈 {formatDate(location.openedAt)}</span>
                            <small>{location.brand || '브랜드 미지정'} · {location.address || '주소 미입력'}</small>
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
