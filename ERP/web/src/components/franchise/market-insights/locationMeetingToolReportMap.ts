import type { MeetingToolDraft } from '@/lib/franchise-location-meeting-tool';
import {
    formatLocationArea,
    formatLocationDistance,
    getLocationPathDistanceMeters,
    getLocationPolygonAreaSquareMeters
} from '../location-map/mapUtils';
import type { FranchiseLocation } from './locationMasterTypes';

const KAKAO_JAVASCRIPT_KEY = process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY || '26c1197bae99e17f8c1f3e688e22914d';

type MarketMapReportParams = {
    readonly location: FranchiseLocation;
    readonly draft: MeetingToolDraft;
    readonly mapPosition?: ReportMapPosition | null;
};

export type ReportMapPosition = {
    readonly lat: number;
    readonly lng: number;
};

function encodeScriptValue(value: unknown): string {
    return JSON.stringify(value ?? null).replace(/[<>&\u2028\u2029]/g, character => {
        switch (character) {
            case '<':
                return '\\u003C';
            case '>':
                return '\\u003E';
            case '&':
                return '\\u0026';
            case '\u2028':
                return '\\u2028';
            case '\u2029':
                return '\\u2029';
            default:
                return character;
        }
    });
}

function getMeasurementLabel(draft: MeetingToolDraft): string {
    if (draft.marketMap.measurementMode === 'distance') {
        return formatLocationDistance(getLocationPathDistanceMeters(draft.marketMap.measurementPoints));
    }
    if (draft.marketMap.measurementMode === 'area') {
        return formatLocationArea(getLocationPolygonAreaSquareMeters(draft.marketMap.measurementPoints));
    }
    return '';
}

export function buildMeetingToolReportMapSection(): string {
    return `
<section>
<h2>상권 지도</h2>
<div id="meeting-tool-print-map" class="print-map">
<div class="print-map-placeholder">지도를 불러오고 있습니다.</div>
</div>
</section>`;
}

export function buildMeetingToolReportMapScript({ location, draft, mapPosition }: MarketMapReportParams): string {
    const latitude = mapPosition?.lat ?? location.latitude;
    const longitude = mapPosition?.lng ?? location.longitude;
    return `
<script>
(function () {
    var kakaoAppKey = ${encodeScriptValue(KAKAO_JAVASCRIPT_KEY)};
    var mapAddress = ${encodeScriptValue(location.address || location.region || '')};
    var mapLat = ${encodeScriptValue(latitude)};
    var mapLng = ${encodeScriptValue(longitude)};
    var mapRadius = ${encodeScriptValue(draft.marketMap.radiusMeters)};
    var mapMeasurementMode = ${encodeScriptValue(draft.marketMap.measurementMode)};
    var mapMeasurementPoints = ${encodeScriptValue(draft.marketMap.measurementPoints)};
    var mapMeasurementLabel = ${encodeScriptValue(getMeasurementLabel(draft))};

    function resolvePosition() {
        return new Promise(function (resolve) {
            if (typeof mapLat === 'number' && Number.isFinite(mapLat) && typeof mapLng === 'number' && Number.isFinite(mapLng)) {
                resolve({ lat: mapLat, lng: mapLng });
                return;
            }
            if (!mapAddress || !window.kakao || !window.kakao.maps || !window.kakao.maps.services) {
                resolve(null);
                return;
            }
            var geocoder = new window.kakao.maps.services.Geocoder();
            geocoder.addressSearch(mapAddress, function (results, status) {
                var firstResult = results && results[0];
                if (status === window.kakao.maps.services.Status.OK && firstResult) {
                    resolve({ lat: Number(firstResult.y), lng: Number(firstResult.x) });
                    return;
                }
                resolve(null);
            });
        });
    }

    function renderMap() {
        var container = document.getElementById('meeting-tool-print-map');
        if (!container || !kakaoAppKey) return Promise.resolve();

        return new Promise(function (resolve) {
            var done = false;
            var finish = function () {
                if (done) return;
                done = true;
                resolve();
            };
            window.setTimeout(finish, 2500);

            function draw() {
                resolvePosition().then(function (position) {
                    if (!position) {
                        container.innerHTML = '<div class="print-map-placeholder">지도에 표시할 주소나 좌표가 없습니다.</div>';
                        finish();
                        return;
                    }
                    var center = new window.kakao.maps.LatLng(position.lat, position.lng);
                    var map = new window.kakao.maps.Map(container, {
                        center: center,
                        level: mapRadius <= 300 ? 4 : mapRadius <= 500 ? 5 : 6
                    });
                    new window.kakao.maps.Marker({ map: map, position: center });
                    new window.kakao.maps.Circle({
                        map: map,
                        center: center,
                        radius: mapRadius,
                        strokeWeight: 2,
                        strokeColor: '#3182f6',
                        strokeOpacity: 0.9,
                        strokeStyle: 'solid',
                        fillColor: '#cfe7ff',
                        fillOpacity: 0.28
                    });
                    drawMeasurement(map);
                    window.kakao.maps.event.addListener(map, 'tilesloaded', finish);
                    window.setTimeout(function () {
                        map.relayout();
                        map.setCenter(center);
                    }, 250);
                    window.setTimeout(function () {
                        map.relayout();
                        map.setCenter(center);
                        finish();
                    }, 1800);
                });
            }

            function toLatLng(point) {
                return new window.kakao.maps.LatLng(point.lat, point.lng);
            }

            function drawMeasurement(map) {
                if (mapMeasurementMode === 'none' || !Array.isArray(mapMeasurementPoints) || mapMeasurementPoints.length === 0) return;
                var validPoints = mapMeasurementPoints.filter(function (point) {
                    return point
                        && typeof point.lat === 'number'
                        && Number.isFinite(point.lat)
                        && typeof point.lng === 'number'
                        && Number.isFinite(point.lng);
                });
                var path = validPoints.map(toLatLng);
                if (path.length >= 2) {
                    new window.kakao.maps.Polyline({
                        map: map,
                        path: path,
                        strokeWeight: 3,
                        strokeColor: '#e42939',
                        strokeOpacity: 0.9,
                        strokeStyle: 'solid'
                    });
                }
                if (mapMeasurementMode === 'area' && path.length >= 3) {
                    new window.kakao.maps.Polygon({
                        map: map,
                        path: path,
                        strokeWeight: 2,
                        strokeColor: '#2272eb',
                        strokeOpacity: 0.9,
                        fillColor: '#cfe7ff',
                        fillOpacity: 0.25
                    });
                }
                validPoints.forEach(function (point, index) {
                    new window.kakao.maps.CustomOverlay({
                        map: map,
                        position: toLatLng(point),
                        yAnchor: 0.5,
                        content: '<span class="print-map-dot">' + (index + 1) + '</span>'
                    });
                });
                var lastPoint = validPoints[validPoints.length - 1];
                if (lastPoint && mapMeasurementLabel) {
                    new window.kakao.maps.CustomOverlay({
                        map: map,
                        position: toLatLng(lastPoint),
                        yAnchor: 1.35,
                        content: '<span class="print-map-measure">' + mapMeasurementLabel + '</span>'
                    });
                }
            }

            if (window.kakao && window.kakao.maps && window.kakao.maps.load) {
                window.kakao.maps.load(draw);
                return;
            }

            var script = document.createElement('script');
            script.src = 'https://dapi.kakao.com/v2/maps/sdk.js?autoload=false&appkey=' + encodeURIComponent(kakaoAppKey) + '&libraries=services';
            script.onload = function () {
                if (window.kakao && window.kakao.maps && window.kakao.maps.load) {
                    window.kakao.maps.load(draw);
                    return;
                }
                finish();
            };
            script.onerror = finish;
            document.head.appendChild(script);
        });
    }

    function printReport() {
        window.focus();
        renderMap().then(function () {
            window.print();
        });
    }

    if (document.readyState === 'complete') {
        printReport();
    } else {
        window.addEventListener('load', printReport, { once: true });
    }
})();
</script>`;
}
