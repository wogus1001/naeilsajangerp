"use client";

import React from 'react';
import { FranchiseLocationMapWorkspace } from './FranchiseLocationMapWorkspace';
import { useFranchiseLocationMapController } from './useFranchiseLocationMapController';

export function FranchiseLocationMapService() {
    const [kakaoReady, setKakaoReady] = React.useState(false);
    const controller = useFranchiseLocationMapController(kakaoReady);

    return (
        <FranchiseLocationMapWorkspace
            activeLocationId={controller.activeLocationId}
            activePoint={controller.activePoint}
            center={controller.center}
            companyName={controller.companyName}
            comparisonRadiusPoints={controller.comparisonRadiusPoints}
            counts={controller.counts}
            errorMessage={controller.errorMessage}
            filters={controller.filters}
            focusRequestId={controller.focusRequestId}
            focusedPoint={controller.focusedPoint}
            isBusy={controller.isLoading || controller.isGeocoding}
            isManualRadius={controller.radiusBaseMode === 'manual'}
            isRadiusPicking={controller.isRadiusPicking}
            measurementAreaSquareMeters={controller.measurementAreaSquareMeters}
            measurementDistanceMeters={controller.measurementDistanceMeters}
            measurementMode={controller.measurementMode}
            measurementPoints={controller.measurementPoints}
            onKakaoReadyChange={setKakaoReady}
            onMeasurementClear={controller.clearMeasurement}
            onMeasurementModeChange={controller.setMeasurementMode}
            onMeasurementPointAdd={controller.addMeasurementPoint}
            onMeasurementUndo={controller.undoMeasurementPoint}
            onModeChange={controller.setMode}
            onQueryChange={controller.setQuery}
            onRadiusCenterPick={controller.pickRadiusCenter}
            onRadiusChange={controller.setRadiusMeters}
            onSelectAllStatuses={controller.selectAllStatuses}
            onSelectPoint={controller.selectPoint}
            onStartRadiusPicking={controller.startRadiusPicking}
            onToggleStatus={controller.toggleStatus}
            onUseSelectedRadius={controller.useSelectedRadius}
            points={controller.points}
            radiusAnalysis={controller.radiusAnalysis}
            radiusBaseMode={controller.radiusBaseMode}
            radiusCenter={controller.radiusCenter}
            radiusMeters={controller.radiusMeters}
        />
    );
}
