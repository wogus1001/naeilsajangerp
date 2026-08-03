'use client';

import { AlertCircle } from 'lucide-react';
import { FranchiseLocationMapCanvas } from './FranchiseLocationMapCanvas';
import { FranchiseLocationMapFilters } from './FranchiseLocationMapFilters';
import { FranchiseLocationMapPanel } from './FranchiseLocationMapPanel';
import type { FranchiseLocationMapWorkspaceProps } from './types';
import styles from './FranchiseLocationMapService.module.css';

export function FranchiseLocationMapWorkspace({
    activeLocationId,
    activePoint,
    center,
    companyName,
    comparisonRadiusPoints,
    counts,
    errorMessage,
    filters,
    focusRequestId,
    focusedPoint,
    isBusy,
    isManualRadius,
    isRadiusPicking,
    measurementAreaSquareMeters,
    measurementDistanceMeters,
    measurementMode,
    measurementPoints,
    mapRuntime = 'live',
    onKakaoReadyChange,
    onMeasurementClear,
    onMeasurementModeChange,
    onMeasurementPointAdd,
    onMeasurementUndo,
    onModeChange,
    onQueryChange,
    onRadiusCenterPick,
    onRadiusChange,
    onSelectAllStatuses,
    onSelectPoint,
    onStartRadiusPicking,
    onToggleStatus,
    onUseSelectedRadius,
    points,
    radiusAnalysis,
    radiusBaseMode,
    radiusCenter,
    radiusMeters
}: FranchiseLocationMapWorkspaceProps) {
    return (
        <main className={styles.pageShell}>
            <FranchiseLocationMapFilters
                companyName={companyName}
                counts={counts}
                filters={filters}
                onModeChange={onModeChange}
                onQueryChange={onQueryChange}
                onSelectAllStatuses={onSelectAllStatuses}
                onToggleStatus={onToggleStatus}
            />

            {errorMessage ? (
                <div className={styles.errorBanner}>
                    <AlertCircle size={16} />
                    {errorMessage}
                </div>
            ) : null}

            <section className={styles.mapWorkspace} aria-label="프랜차이즈 물건지 Kakao 지도">
                <div className={styles.mapCanvas}>
                    <FranchiseLocationMapCanvas
                        activeLocationId={activeLocationId}
                        activePoint={activePoint}
                        center={center}
                        comparisonRadiusPoints={comparisonRadiusPoints}
                        focusRequestId={focusRequestId}
                        focusedPoint={focusedPoint}
                        isBusy={isBusy}
                        isManualRadius={isManualRadius}
                        isRadiusPicking={isRadiusPicking}
                        measurementMode={measurementMode}
                        measurementPoints={measurementPoints}
                        runtime={mapRuntime}
                        points={points}
                        radiusCenter={radiusCenter}
                        radiusMeters={radiusMeters}
                        onKakaoReadyChange={onKakaoReadyChange}
                        onMeasurementPointAdd={onMeasurementPointAdd}
                        onRadiusCenterPick={onRadiusCenterPick}
                        onSelectPoint={onSelectPoint}
                    />
                </div>
                <FranchiseLocationMapPanel
                    activePoint={activePoint}
                    counts={counts}
                    measurementAreaSquareMeters={measurementAreaSquareMeters}
                    measurementDistanceMeters={measurementDistanceMeters}
                    measurementMode={measurementMode}
                    measurementPoints={measurementPoints}
                    points={points}
                    radiusAnalysis={radiusAnalysis}
                    radiusBaseMode={radiusBaseMode}
                    radiusMeters={radiusMeters}
                    isRadiusPicking={isRadiusPicking}
                    onMeasurementClear={onMeasurementClear}
                    onMeasurementModeChange={onMeasurementModeChange}
                    onMeasurementUndo={onMeasurementUndo}
                    onRadiusChange={onRadiusChange}
                    onStartRadiusPicking={onStartRadiusPicking}
                    onUseSelectedRadius={onUseSelectedRadius}
                    onSelectPoint={onSelectPoint}
                />
            </section>
        </main>
    );
}
