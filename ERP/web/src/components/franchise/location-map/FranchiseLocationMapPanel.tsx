"use client";

import { ExternalLink, MapPin } from 'lucide-react';
import {
    buildLocationMapLink,
    formatLocationMapDate
} from './mapUtils';
import type {
    LocationMapCounts,
    LocationMapPoint
} from './types';
import styles from './FranchiseLocationMapService.module.css';

type Props = {
    readonly activePoint: LocationMapPoint | null;
    readonly counts: LocationMapCounts;
    readonly points: readonly LocationMapPoint[];
    readonly onSelectPoint: (locationId: string) => void;
};

export function FranchiseLocationMapPanel({
    activePoint,
    counts,
    points,
    onSelectPoint
}: Props) {
    return (
        <aside className={styles.mapPanel} aria-label="물건지 지도 목록">
            <div className={styles.panelStats}>
                <div>
                    <span>지도 표시</span>
                    <strong>{counts.mappable.toLocaleString()}건</strong>
                </div>
                <div>
                    <span>좌표 없음</span>
                    <strong>{counts.unmapped.toLocaleString()}건</strong>
                </div>
                <div>
                    <span>필터 결과</span>
                    <strong>{counts.visible.toLocaleString()}건</strong>
                </div>
            </div>

            {activePoint ? (
                <article className={styles.activeCard}>
                    <div className={styles.activeCardHeader}>
                        <span className={activePoint.kind === 'operation' ? styles.operationBadge : styles.candidateBadge}>
                            {activePoint.kind === 'operation' ? '가맹 운영점' : '출점 후보지'}
                        </span>
                        <small>{activePoint.source === 'stored' ? '저장 좌표' : '주소 좌표'}</small>
                    </div>
                    <h2>{activePoint.location.name}</h2>
                    <dl>
                        <div>
                            <dt>상태</dt>
                            <dd>{activePoint.location.status}</dd>
                        </div>
                        <div>
                            <dt>브랜드</dt>
                            <dd>{activePoint.location.brand || '-'}</dd>
                        </div>
                        <div>
                            <dt>오픈일</dt>
                            <dd>{formatLocationMapDate(activePoint.location.openedAt)}</dd>
                        </div>
                    </dl>
                    <p className={styles.addressLine}>
                        <MapPin size={14} />
                        {activePoint.location.address || activePoint.location.region || '주소 미입력'}
                    </p>
                    {activePoint.location.memo ? (
                        <p className={styles.memoLine}>{activePoint.location.memo}</p>
                    ) : null}
                    <a className={styles.primaryLink} href={buildLocationMapLink(activePoint.location)}>
                        관리 화면 열기
                        <ExternalLink size={14} />
                    </a>
                </article>
            ) : (
                <div className={styles.emptyPanel}>마커를 선택하면 상세 정보가 표시됩니다.</div>
            )}

            <div className={styles.pointList}>
                {points.slice(0, 40).map((point, index) => (
                    <button
                        key={point.location.id}
                        type="button"
                        className={activePoint?.location.id === point.location.id ? styles.pointRowActive : styles.pointRow}
                        onClick={() => onSelectPoint(point.location.id)}
                    >
                        <span>{index + 1}</span>
                        <strong>{point.location.name}</strong>
                        <small>{point.location.region || point.location.address || point.location.status}</small>
                    </button>
                ))}
            </div>
        </aside>
    );
}
