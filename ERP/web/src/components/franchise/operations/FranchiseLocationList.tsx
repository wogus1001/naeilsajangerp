import React from 'react';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import { formatDate, getLocationRegion } from './format';
import {
    FRANCHISE_LOCATION_TYPES,
    FRANCHISE_LOCATION_STATUSES,
    type FranchiseLocation,
    toFranchiseLocationStatus
} from './types';

type FranchiseLocationListProps = {
    readonly locations: readonly FranchiseLocation[];
    readonly updatingStatusId: string;
    readonly deletingLocationId: string;
    readonly onEdit: (location: FranchiseLocation) => void;
    readonly onOpenOwnerPortal?: (location: FranchiseLocation) => void;
    readonly onDelete: (location: FranchiseLocation) => void;
    readonly onStatusChange: (location: FranchiseLocation, status: FranchiseLocation['status']) => void;
};

export function FranchiseLocationList({
    locations,
    updatingStatusId,
    deletingLocationId,
    onEdit,
    onOpenOwnerPortal,
    onDelete,
    onStatusChange
}: FranchiseLocationListProps) {
    const [query, setQuery] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState('all');
    const [typeFilter, setTypeFilter] = React.useState('all');
    const [page, setPage] = React.useState(1);
    const normalizedQuery = query.trim().toLocaleLowerCase('ko-KR');
    const pageSize = 8;
    const filteredLocations = locations.filter(location => {
        if (statusFilter !== 'all' && location.status !== statusFilter) return false;
        if (typeFilter !== 'all' && location.locationType !== typeFilter) return false;
        if (!normalizedQuery) return true;
        return [
            location.name,
            location.brand,
            location.locationType,
            location.status,
            location.region,
            location.address,
            location.memo
        ].some(value => value.toLocaleLowerCase('ko-KR').includes(normalizedQuery));
    });
    const maxPage = Math.max(1, Math.ceil(filteredLocations.length / pageSize));
    const safePage = Math.min(page, maxPage);
    const pagedLocations = filteredLocations.slice((safePage - 1) * pageSize, safePage * pageSize);

    React.useEffect(() => {
        setPage(1);
    }, [normalizedQuery, statusFilter, typeFilter]);

    if (locations.length === 0) {
        return <div className={styles.locationEmpty}>등록된 운영 가맹점이 없습니다.</div>;
    }

    return (
        <div className={styles.locationListShell}>
            <div className={styles.locationListControlBar}>
                <input
                    className={styles.locationListSearch}
                    type="search"
                    value={query}
                    placeholder="가맹점명, 브랜드, 지역, 주소, 메모 검색"
                    onChange={event => setQuery(event.currentTarget.value)}
                />
                <label className={styles.locationSortControl}>
                    상태
                    <select value={statusFilter} onChange={event => setStatusFilter(event.currentTarget.value)}>
                        <option value="all">전체 상태</option>
                        {FRANCHISE_LOCATION_STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
                    </select>
                </label>
                <label className={styles.locationSortControl}>
                    유형
                    <select value={typeFilter} onChange={event => setTypeFilter(event.currentTarget.value)}>
                        <option value="all">전체 유형</option>
                        {FRANCHISE_LOCATION_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                </label>
                <span className={styles.locationListMeta}>
                    {filteredLocations.length.toLocaleString()} / {locations.length.toLocaleString()}건
                </span>
            </div>
            {filteredLocations.length === 0 ? (
                <div className={styles.locationEmpty}>조건에 맞는 가맹점이 없습니다.</div>
            ) : (
                <>
                    <div className={styles.locationList}>
                        {pagedLocations.map(location => {
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
                                        {onOpenOwnerPortal ? (
                                            <button onClick={() => onOpenOwnerPortal(location)}>점주 계정</button>
                                        ) : null}
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
                    <div className={styles.paginationBar}>
                        <span>총 {filteredLocations.length.toLocaleString()}건</span>
                        <div className={styles.paginationControls}>
                            <button type="button" className={styles.paginationButton} disabled={safePage <= 1} onClick={() => setPage(current => Math.max(1, current - 1))}>
                                이전
                            </button>
                            <strong>
                                <span>페이지</span>
                                {safePage.toLocaleString()} / {maxPage.toLocaleString()}
                            </strong>
                            <button type="button" className={styles.paginationButton} disabled={safePage >= maxPage} onClick={() => setPage(current => Math.min(maxPage, current + 1))}>
                                다음
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
