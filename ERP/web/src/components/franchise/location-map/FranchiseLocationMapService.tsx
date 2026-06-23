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
                        center={controller.center}
                        isBusy={isBusy}
                        points={controller.points}
                        onKakaoReadyChange={setKakaoReady}
                        onSelectPoint={controller.setActiveLocationId}
                    />
                </div>
                <FranchiseLocationMapPanel
                    activePoint={controller.activePoint}
                    counts={controller.counts}
                    points={controller.points}
                    onSelectPoint={controller.setActiveLocationId}
                />
            </section>
        </main>
    );
}
