"use client";

import React from 'react';
import { Trash2, Undo2 } from 'lucide-react';
import {
    MEETING_TOOL_MARKET_MAP_RADIUS_OPTIONS,
    type MeetingToolMarketMap,
    type MeetingToolMarketMapMeasurementMode,
    type MeetingToolMarketMapRadiusMeters
} from '@/lib/franchise-location-meeting-tool';
import {
    formatLocationArea,
    formatLocationDistance
} from '../location-map/mapUtils';
import styles from './LocationMeetingTool.module.css';

export type MarketMapLayer = 'roadmap' | 'hybrid' | 'district';

const MARKET_MAP_LAYER_OPTIONS: readonly { readonly label: string; readonly value: MarketMapLayer }[] = [
    { label: '일반', value: 'roadmap' },
    { label: '스카이뷰', value: 'hybrid' },
    { label: '지적편집도', value: 'district' }
] as const;

const MARKET_MAP_MEASUREMENT_OPTIONS: readonly { readonly label: string; readonly value: MeetingToolMarketMapMeasurementMode }[] = [
    { label: '선택', value: 'none' },
    { label: '거리재기', value: 'distance' },
    { label: '면적재기', value: 'area' }
] as const;

type LocationMeetingToolMarketMapControlsProps = {
    readonly activeLayer: MarketMapLayer;
    readonly marketMap: MeetingToolMarketMap;
    readonly onLayerChange: (layer: MarketMapLayer) => void;
    readonly onMeasurementModeChange: (mode: MeetingToolMarketMapMeasurementMode) => void;
    readonly onRadiusChange: (radiusMeters: MeetingToolMarketMapRadiusMeters) => void;
};

type LocationMeetingToolMarketMapMeasurePanelProps = {
    readonly marketMap: MeetingToolMarketMap;
    readonly measurementAreaSquareMeters: number;
    readonly measurementDistanceMeters: number;
    readonly onClearMeasurement: () => void;
    readonly onUndoMeasurementPoint: () => void;
};

function formatRadius(radiusMeters: number): string {
    return radiusMeters >= 1000 ? `${radiusMeters / 1000}km` : `${radiusMeters}m`;
}

export function LocationMeetingToolMarketMapControls({
    activeLayer,
    marketMap,
    onLayerChange,
    onMeasurementModeChange,
    onRadiusChange
}: LocationMeetingToolMarketMapControlsProps) {
    const measurementMode = marketMap.measurementMode;

    return (
        <div className={styles.meetingToolMapControls}>
            <div className={styles.meetingToolRadiusSwitch} aria-label="상권 반경 선택">
                {MEETING_TOOL_MARKET_MAP_RADIUS_OPTIONS.map(radiusMeters => (
                    <button
                        key={radiusMeters}
                        type="button"
                        className={radiusMeters === marketMap.radiusMeters ? styles.meetingToolRadiusButtonActive : styles.meetingToolRadiusButton}
                        onClick={() => onRadiusChange(radiusMeters)}
                    >
                        {formatRadius(radiusMeters)}
                    </button>
                ))}
            </div>
            <div className={styles.meetingToolRadiusSwitch} aria-label="지도 표시 방식 선택">
                {MARKET_MAP_LAYER_OPTIONS.map(option => (
                    <button
                        key={option.value}
                        type="button"
                        className={option.value === activeLayer ? styles.meetingToolRadiusButtonActive : styles.meetingToolRadiusButton}
                        onClick={() => onLayerChange(option.value)}
                    >
                        {option.label}
                    </button>
                ))}
            </div>
            <div className={styles.meetingToolRadiusSwitch} aria-label="지도 측정 도구 선택">
                {MARKET_MAP_MEASUREMENT_OPTIONS.map(option => (
                    <button
                        key={option.value}
                        type="button"
                        className={option.value === measurementMode ? styles.meetingToolRadiusButtonActive : styles.meetingToolRadiusButton}
                        onClick={() => onMeasurementModeChange(option.value)}
                    >
                        {option.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

export function LocationMeetingToolMarketMapMeasurePanel({
    marketMap,
    measurementAreaSquareMeters,
    measurementDistanceMeters,
    onClearMeasurement,
    onUndoMeasurementPoint
}: LocationMeetingToolMarketMapMeasurePanelProps) {
    const measurementMode = marketMap.measurementMode;
    const measurementPoints = marketMap.measurementPoints;
    if (measurementMode === 'none') return null;

    return (
        <div className={styles.meetingToolMeasurePanel}>
            <div>
                <span>{measurementMode === 'distance' ? '거리재기' : '면적재기'}</span>
                <strong>
                    {measurementMode === 'distance'
                        ? formatLocationDistance(measurementDistanceMeters)
                        : formatLocationArea(measurementAreaSquareMeters)}
                </strong>
                {measurementMode === 'area' ? <small>둘레 {formatLocationDistance(measurementDistanceMeters)}</small> : null}
            </div>
            <div className={styles.meetingToolMeasureActions}>
                <button type="button" onClick={onUndoMeasurementPoint} disabled={measurementPoints.length === 0}>
                    <Undo2 size={13} /> 되돌리기
                </button>
                <button type="button" onClick={onClearMeasurement} disabled={measurementPoints.length === 0}>
                    <Trash2 size={13} /> 초기화
                </button>
            </div>
            <p>
                {measurementMode === 'distance'
                    ? '지도 위 지점을 순서대로 클릭하면 총거리를 계산합니다.'
                    : '지도 위 3개 이상 지점을 클릭하면 면적과 둘레를 계산합니다.'}
            </p>
        </div>
    );
}
