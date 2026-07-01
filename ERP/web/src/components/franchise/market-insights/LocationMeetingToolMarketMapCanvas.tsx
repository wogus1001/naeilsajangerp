"use client";

import React from 'react';
import { Ruler } from 'lucide-react';
import {
    Circle,
    CustomOverlayMap,
    Map,
    MapMarker,
    MapTypeControl,
    MapTypeId,
    Polygon,
    Polyline,
    ZoomControl
} from 'react-kakao-maps-sdk';
import { type MeetingToolMarketMapMeasurementMode } from '@/lib/franchise-location-meeting-tool';
import {
    formatLocationArea,
    formatLocationDistance
} from '../location-map/mapUtils';
import styles from './LocationMeetingTool.module.css';
import type { MarketMapLayer } from './LocationMeetingToolMarketMapControls';

type MapPosition = {
    readonly lat: number;
    readonly lng: number;
};

type LocationMeetingToolMarketMapCanvasProps = {
    readonly activeLayer: MarketMapLayer;
    readonly center: MapPosition;
    readonly mapLevel: number;
    readonly measurementAreaSquareMeters: number;
    readonly measurementDistanceMeters: number;
    readonly measurementMode: MeetingToolMarketMapMeasurementMode;
    readonly measurementPath: readonly MapPosition[];
    readonly radiusMeters: number;
    readonly onAddMeasurementPoint: (_map: kakao.maps.Map, mouseEvent: kakao.maps.event.MouseEvent) => void;
};

export function LocationMeetingToolMarketMapCanvas({
    activeLayer,
    center,
    mapLevel,
    measurementAreaSquareMeters,
    measurementDistanceMeters,
    measurementMode,
    measurementPath,
    radiusMeters,
    onAddMeasurementPoint
}: LocationMeetingToolMarketMapCanvasProps) {
    return (
        <div className={styles.meetingToolMapCanvas}>
            <Map
                center={center}
                style={{ width: '100%', height: '100%' }}
                level={mapLevel}
                mapTypeId={activeLayer === 'hybrid' ? 'HYBRID' : 'ROADMAP'}
                draggable
                zoomable
                onClick={onAddMeasurementPoint}
            >
                <MapTypeControl position="TOPRIGHT" />
                <ZoomControl position="RIGHT" />
                {activeLayer === 'district' ? <MapTypeId type="USE_DISTRICT" /> : null}
                <Circle
                    center={center}
                    radius={radiusMeters}
                    strokeWeight={2}
                    strokeColor="#3182f6"
                    strokeOpacity={0.9}
                    strokeStyle="solid"
                    fillColor="#cfe7ff"
                    fillOpacity={0.28}
                />
                <MapMarker position={center} />
                {measurementPath.length >= 2 ? (
                    <Polyline
                        path={[...measurementPath]}
                        strokeWeight={3}
                        strokeColor="#e42939"
                        strokeOpacity={0.9}
                        strokeStyle="solid"
                    />
                ) : null}
                {measurementMode === 'area' && measurementPath.length >= 3 ? (
                    <Polygon
                        path={[...measurementPath]}
                        strokeWeight={2}
                        strokeColor="#2272eb"
                        strokeOpacity={0.9}
                        fillColor="#cfe7ff"
                        fillOpacity={0.25}
                    />
                ) : null}
                {measurementPath.map((point, index) => (
                    <CustomOverlayMap key={`${point.lat}-${point.lng}-${index}`} position={point} yAnchor={0.5}>
                        <span className={styles.meetingToolMeasureDot}>{index + 1}</span>
                    </CustomOverlayMap>
                ))}
                {measurementMode !== 'none' && measurementPath.length > 0 ? (
                    <CustomOverlayMap position={measurementPath[measurementPath.length - 1] || center} yAnchor={1.35}>
                        <span className={styles.meetingToolMeasureOverlay}>
                            <Ruler size={12} />
                            {measurementMode === 'distance'
                                ? formatLocationDistance(measurementDistanceMeters)
                                : formatLocationArea(measurementAreaSquareMeters)}
                        </span>
                    </CustomOverlayMap>
                ) : null}
            </Map>
        </div>
    );
}
