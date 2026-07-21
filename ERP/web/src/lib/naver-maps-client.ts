import type { NaverGeocodePosition } from '@/lib/naver-maps-geocoding';

type ApiEnvelope = {
    readonly data?: unknown;
    readonly success?: unknown;
};

const NAVER_MAPS_SCRIPT_ID = 'naver-maps-sdk';
let sdkLoader: Promise<void> | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseNaverGeocodeApiResponse(payload: unknown): NaverGeocodePosition | null {
    if (!isRecord(payload)) return null;
    const envelope: ApiEnvelope = payload;
    if (envelope.success !== true || !isRecord(envelope.data)) return null;

    const address = envelope.data.address;
    const lat = envelope.data.lat;
    const lng = envelope.data.lng;
    if (typeof address !== 'string' || typeof lat !== 'number' || typeof lng !== 'number') return null;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { address, lat, lng };
}

export function buildNaverMapSearchUrl(address: string): string {
    return `https://map.naver.com/p/search/${encodeURIComponent(address)}`;
}

function isNaverMapsReady(): boolean {
    return typeof naver !== 'undefined' && typeof naver.maps?.Map === 'function';
}

export function loadNaverMapsSdk(clientId: string): Promise<void> {
    if (isNaverMapsReady()) return Promise.resolve();
    if (sdkLoader) return sdkLoader;

    const loader = new Promise<void>((resolve, reject) => {
        const existingScript = document.getElementById(NAVER_MAPS_SCRIPT_ID);
        const script = existingScript instanceof HTMLScriptElement
            ? existingScript
            : document.createElement('script');

        const handleLoad = () => {
            cleanup();
            if (isNaverMapsReady()) resolve();
            else {
                script.remove();
                reject(new Error('네이버 지도 SDK를 초기화하지 못했습니다.'));
            }
        };
        const handleError = () => {
            cleanup();
            script.remove();
            reject(new Error('네이버 지도 SDK를 불러오지 못했습니다.'));
        };
        const cleanup = () => {
            script.removeEventListener('load', handleLoad);
            script.removeEventListener('error', handleError);
        };

        script.addEventListener('load', handleLoad);
        script.addEventListener('error', handleError);
        if (!existingScript) {
            script.id = NAVER_MAPS_SCRIPT_ID;
            script.async = true;
            script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(clientId)}`;
            document.head.appendChild(script);
        }
    }).catch(error => {
        sdkLoader = null;
        throw error;
    });
    sdkLoader = loader;
    return loader;
}
