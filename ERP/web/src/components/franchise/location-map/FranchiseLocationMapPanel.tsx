"use client";

import { ExternalLink, MapPin, Ruler, Trash2, Undo2 } from 'lucide-react';
import {
    formatLocationArea,
    buildLocationMapLink,
    formatLocationDistance,
    formatLocationMapDate
} from './mapUtils';
import type {
    LocationMapCounts,
    LocationMapMeasurementMode,
    LocationMapPoint,
    LocationMapPosition,
    LocationMapRadiusBaseMode,
    LocationMapRadiusMeters,
    LocationRadiusAnalysis
} from './types';
import { LOCATION_MAP_RADIUS_OPTIONS } from './types';
import styles from './FranchiseLocationMapService.module.css';

type Props = {
    readonly activePoint: LocationMapPoint | null;
    readonly counts: LocationMapCounts;
    readonly measurementAreaSquareMeters: number;
    readonly measurementDistanceMeters: number;
    readonly measurementMode: LocationMapMeasurementMode;
    readonly measurementPoints: readonly LocationMapPosition[];
    readonly points: readonly LocationMapPoint[];
    readonly radiusAnalysis: LocationRadiusAnalysis;
    readonly radiusBaseMode: LocationMapRadiusBaseMode;
    readonly radiusMeters: LocationMapRadiusMeters;
    readonly isRadiusPicking: boolean;
    readonly onMeasurementClear: () => void;
    readonly onMeasurementModeChange: (mode: LocationMapMeasurementMode) => void;
    readonly onMeasurementUndo: () => void;
    readonly onRadiusChange: (radiusMeters: LocationMapRadiusMeters) => void;
    readonly onStartRadiusPicking: () => void;
    readonly onUseSelectedRadius: () => void;
    readonly onSelectPoint: (locationId: string) => void;
};

export function FranchiseLocationMapPanel({
    activePoint,
    counts,
    measurementAreaSquareMeters,
    measurementDistanceMeters,
    measurementMode,
    measurementPoints,
    points,
    radiusAnalysis,
    radiusBaseMode,
    radiusMeters,
    isRadiusPicking,
    onMeasurementClear,
    onMeasurementModeChange,
    onMeasurementUndo,
    onRadiusChange,
    onStartRadiusPicking,
    onUseSelectedRadius,
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
                    <a className={styles.primaryLink} href={buildLocationMapLink(activePoint.location)}>
                        관리 화면 열기
                        <ExternalLink size={14} />
                    </a>
                </article>
            ) : (
                <div className={styles.emptyPanel}>마커를 선택하면 상세 정보가 표시됩니다.</div>
            )}

            <section className={styles.analysisCard} aria-label="지도 분석 도구">
                <div className={styles.measureHeader}>
                    <div>
                        <h2>지도 분석</h2>
                        <p>
                            {measurementMode === 'none'
                                ? '선택 물건지 주변과 지도 측정값을 함께 확인합니다.'
                                : '지도 위를 클릭해 거리나 면적을 확인합니다.'}
                        </p>
                    </div>
                    <strong>{measurementMode === 'none' ? `${radiusAnalysis.nearbyPoints.length.toLocaleString()}건` : <Ruler size={18} />}</strong>
                </div>
                <div className={styles.analysisTabs} role="tablist" aria-label="지도 분석 도구 선택">
                    <button
                        type="button"
                        role="tab"
                        aria-selected={measurementMode === 'none'}
                        className={measurementMode === 'none' ? styles.measureTabActive : styles.measureTab}
                        onClick={() => {
                            onMeasurementClear();
                            onUseSelectedRadius();
                        }}
                    >
                        반경분석
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={measurementMode === 'distance'}
                        className={measurementMode === 'distance' ? styles.measureTabActive : styles.measureTab}
                        onClick={() => onMeasurementModeChange('distance')}
                    >
                        거리재기
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={measurementMode === 'area'}
                        className={measurementMode === 'area' ? styles.measureTabActive : styles.measureTab}
                        onClick={() => onMeasurementModeChange('area')}
                    >
                        면적재기
                    </button>
                </div>

                {measurementMode === 'none' ? (
                    <>
                        <div className={styles.radiusActions}>
                            <button
                                type="button"
                                className={isRadiusPicking ? styles.radiusPickButtonActive : styles.radiusPickButton}
                                onClick={onStartRadiusPicking}
                            >
                                {isRadiusPicking ? '지도에서 기준점 클릭' : '직접 반경 그리기'}
                            </button>
                            {radiusBaseMode === 'manual' ? (
                                <button type="button" className={styles.radiusResetButton} onClick={onUseSelectedRadius}>
                                    선택 물건지 기준
                                </button>
                            ) : null}
                        </div>
                        {isRadiusPicking ? (
                            <div className={styles.radiusPickNotice}>지도에서 원하는 지점을 클릭하면 반경 기준점이 지정됩니다.</div>
                        ) : null}
                        <div className={styles.radiusTabs} role="tablist" aria-label="반경 선택">
                            {LOCATION_MAP_RADIUS_OPTIONS.map(option => (
                                <button
                                    key={option}
                                    type="button"
                                    role="tab"
                                    aria-selected={radiusMeters === option}
                                    className={radiusMeters === option ? styles.radiusTabActive : styles.radiusTab}
                                    onClick={() => onRadiusChange(option)}
                                >
                                    {formatLocationDistance(option)}
                                </button>
                            ))}
                        </div>
                        <div className={styles.radiusSummary}>
                            <div>
                                <span>가맹 운영점</span>
                                <strong>{radiusAnalysis.operationCount.toLocaleString()}</strong>
                            </div>
                            <div>
                                <span>출점 후보지</span>
                                <strong>{radiusAnalysis.candidateCount.toLocaleString()}</strong>
                            </div>
                            <div>
                                <span>운영중</span>
                                <strong>{radiusAnalysis.statusCounts.운영중.toLocaleString()}</strong>
                            </div>
                            <div>
                                <span>오픈준비</span>
                                <strong>{radiusAnalysis.statusCounts.오픈준비.toLocaleString()}</strong>
                            </div>
                            <div>
                                <span>검토중</span>
                                <strong>{radiusAnalysis.statusCounts.검토중.toLocaleString()}</strong>
                            </div>
                        </div>
                        {radiusAnalysis.nearbyPoints.length > 0 ? (
                            <div className={styles.nearbyList}>
                                {radiusAnalysis.nearbyPoints.slice(0, 12).map(({ point, distanceMeters }) => (
                                    <button
                                        key={point.location.id}
                                        type="button"
                                        className={styles.nearbyRow}
                                        onClick={() => onSelectPoint(point.location.id)}
                                    >
                                        <span>{formatLocationDistance(distanceMeters)}</span>
                                        <strong>{point.location.name}</strong>
                                        <small>
                                            {point.kind === 'operation' ? '가맹 운영점' : '출점 후보지'}
                                            {' · '}
                                            {point.location.status}
                                            {' · '}
                                            {point.location.region || point.location.address || '주소 미입력'}
                                        </small>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className={styles.emptyRadius}>선택 반경 안에 다른 물건지가 없습니다.</div>
                        )}
                    </>
                ) : (
                    <>
                        <div className={styles.measureResult}>
                            {measurementMode === 'distance' ? (
                                <>
                                    <span>{measurementPoints.length.toLocaleString()}점 선택</span>
                                    <strong>{formatLocationDistance(measurementDistanceMeters)}</strong>
                                </>
                            ) : (
                                <>
                                    <span>{measurementPoints.length < 3 ? '3점 이상 선택 필요' : `${measurementPoints.length.toLocaleString()}점 선택`}</span>
                                    <strong>{formatLocationArea(measurementAreaSquareMeters)}</strong>
                                    <small>둘레 {formatLocationDistance(measurementDistanceMeters)}</small>
                                </>
                            )}
                        </div>
                        <div className={styles.measureActions}>
                            <button type="button" onClick={onMeasurementUndo} disabled={measurementPoints.length === 0}>
                                <Undo2 size={14} />
                                되돌리기
                            </button>
                            <button type="button" onClick={onMeasurementClear} disabled={measurementPoints.length === 0}>
                                <Trash2 size={14} />
                                초기화
                            </button>
                        </div>
                    </>
                )}
            </section>

            <section className={styles.pointListSection} aria-label="지도 물건지 목록">
                <div className={styles.pointListHeader}>
                    <strong>지도 목록</strong>
                    <span>{points.length.toLocaleString()}건 전체 표시</span>
                </div>
                <div className={styles.pointList}>
                    {points.map((point, index) => (
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
            </section>
        </aside>
    );
}
