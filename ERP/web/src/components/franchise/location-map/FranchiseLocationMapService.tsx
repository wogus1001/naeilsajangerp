"use client";

import React from 'react';
import { AlertCircle } from 'lucide-react';
import { FranchiseLocationMapCanvas } from './FranchiseLocationMapCanvas';
import { FranchiseLocationMapFilters } from './FranchiseLocationMapFilters';
import { FranchiseLocationMapPanel } from './FranchiseLocationMapPanel';
import { useFranchiseLocationMapController } from './useFranchiseLocationMapController';
import styles from './FranchiseLocationMapService.module.css';

export function FranchiseLocationMapService() {
    const [kakaoReady, setKakaoReady] = React.useState(false);
    const controller = useFranchiseLocationMapController(kakaoReady);
    const isBusy = controller.isLoading || controller.isGeocoding;

    return (
        <main className={styles.pageShell}>
            <FranchiseLocationMapFilters
                companyName={controller.companyName}
                counts={controller.counts}
                filters={controller.filters}
                onModeChange={controller.setMode}
                onQueryChange={controller.setQuery}
                onSelectAllStatuses={controller.selectAllStatuses}
                onToggleStatus={controller.toggleStatus}
            />

            {controller.errorMessage ? (
                <div className={styles.errorBanner}>
                    <AlertCircle size={16} />
                    {controller.errorMessage}
                </div>
            ) : null}

            <section className={styles.mapWorkspace} aria-label="프랜차이즈 물건지 Kakao 지도">
                <div className={styles.mapCanvas}>
                    <FranchiseLocationMapCanvas
                        activeLocationId={controller.activeLocationId}
                        activePoint={controller.activePoint}
                        center={controller.center}
                        focusRequestId={controller.focusRequestId}
                        focusedPoint={controller.focusedPoint}
                        isBusy={isBusy}
                        isManualRadius={controller.radiusBaseMode === 'manual'}
                        isRadiusPicking={controller.isRadiusPicking}
                        measurementMode={controller.measurementMode}
                        measurementPoints={controller.measurementPoints}
                        points={controller.points}
                        radiusCenter={controller.radiusCenter}
                        radiusMeters={controller.radiusMeters}
                        onKakaoReadyChange={setKakaoReady}
                        onMeasurementPointAdd={controller.addMeasurementPoint}
                        onRadiusCenterPick={controller.pickRadiusCenter}
                        onSelectPoint={controller.selectPoint}
                    />
                </div>
                <FranchiseLocationMapPanel
                    activePoint={controller.activePoint}
                    counts={controller.counts}
                    measurementAreaSquareMeters={controller.measurementAreaSquareMeters}
                    measurementDistanceMeters={controller.measurementDistanceMeters}
                    measurementMode={controller.measurementMode}
                    measurementPoints={controller.measurementPoints}
                    points={controller.points}
                    radiusAnalysis={controller.radiusAnalysis}
                    radiusBaseMode={controller.radiusBaseMode}
                    radiusMeters={controller.radiusMeters}
                    isRadiusPicking={controller.isRadiusPicking}
                    onMeasurementClear={controller.clearMeasurement}
                    onMeasurementModeChange={controller.setMeasurementMode}
                    onMeasurementUndo={controller.undoMeasurementPoint}
                    onRadiusChange={controller.setRadiusMeters}
                    onStartRadiusPicking={controller.startRadiusPicking}
                    onUseSelectedRadius={controller.useSelectedRadius}
                    onSelectPoint={controller.selectPoint}
                />
            </section>
        </main>
    );
}
