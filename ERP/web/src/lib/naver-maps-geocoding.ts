export type NaverMapsCredentials = {
    readonly clientId: string;
    readonly clientSecret: string;
};

export type NaverGeocodePosition = {
    readonly address: string;
    readonly lat: number;
    readonly lng: number;
};

type NaverGeocodeAddress = {
    readonly roadAddress?: unknown;
    readonly jibunAddress?: unknown;
    readonly x?: unknown;
    readonly y?: unknown;
};

type NaverGeocodeResponse = {
    readonly addresses?: unknown;
};

const NAVER_GEOCODE_ENDPOINT = 'https://maps.apigw.ntruss.com/map-geocode/v2/geocode';
const NAVER_GEOCODE_TIMEOUT_MS = 8_000;
const NAVER_GEOCODE_CACHE_TTL_MS = 5 * 60 * 1_000;
const NAVER_GEOCODE_CACHE_LIMIT = 100;
const geocodeCache = new Map<string, { readonly expiresAt: number; readonly position: NaverGeocodePosition | null }>();
const pendingGeocodes = new Map<string, Promise<NaverGeocodePosition | null>>();

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function isGeocodeAddress(value: unknown): value is NaverGeocodeAddress {
    return isRecord(value);
}

export function readNaverMapsCredentials(): NaverMapsCredentials | null {
    const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID?.trim() || '';
    const clientSecret = process.env.NAVER_MAP_CLIENT_SECRET?.trim() || '';
    return clientId && clientSecret ? { clientId, clientSecret } : null;
}

export function parseNaverGeocodeResponse(payload: unknown): NaverGeocodePosition | null {
    if (!isRecord(payload)) return null;
    const response: NaverGeocodeResponse = payload;
    if (!Array.isArray(response.addresses)) return null;
    const first = response.addresses.find(isGeocodeAddress);
    if (!first) return null;

    const rawLat = readString(first.y);
    const rawLng = readString(first.x);
    if (!rawLat || !rawLng) return null;
    const lat = Number(rawLat);
    const lng = Number(rawLng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    return {
        address: readString(first.roadAddress) || readString(first.jibunAddress),
        lat,
        lng
    };
}

export async function geocodeNaverAddress(
    address: string,
    credentials: NaverMapsCredentials
): Promise<NaverGeocodePosition | null> {
    const cacheKey = `${credentials.clientId}:${address}`;
    const cached = geocodeCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.position;
    if (cached) geocodeCache.delete(cacheKey);

    const pending = pendingGeocodes.get(cacheKey);
    if (pending) return pending;

    const request = requestNaverGeocode(address, credentials).then(position => {
        if (geocodeCache.size >= NAVER_GEOCODE_CACHE_LIMIT) {
            const oldestKey = geocodeCache.keys().next().value;
            if (typeof oldestKey === 'string') geocodeCache.delete(oldestKey);
        }
        geocodeCache.set(cacheKey, {
            expiresAt: Date.now() + NAVER_GEOCODE_CACHE_TTL_MS,
            position
        });
        return position;
    }).finally(() => {
        if (pendingGeocodes.get(cacheKey) === request) pendingGeocodes.delete(cacheKey);
    });
    pendingGeocodes.set(cacheKey, request);
    return request;
}

async function requestNaverGeocode(
    address: string,
    credentials: NaverMapsCredentials
): Promise<NaverGeocodePosition | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), NAVER_GEOCODE_TIMEOUT_MS);

    try {
        const url = new URL(NAVER_GEOCODE_ENDPOINT);
        url.searchParams.set('query', address);
        const response = await fetch(url, {
            headers: {
                Accept: 'application/json',
                'x-ncp-apigw-api-key': credentials.clientSecret,
                'x-ncp-apigw-api-key-id': credentials.clientId
            },
            signal: controller.signal
        });
        if (!response.ok) {
            throw new NaverMapsProviderError(response.status);
        }
        return parseNaverGeocodeResponse(await response.json());
    } finally {
        clearTimeout(timeoutId);
    }
}

export class NaverMapsProviderError extends Error {
    readonly status: number;

    constructor(status: number) {
        super(`Naver Maps provider request failed with status ${status}`);
        this.name = 'NaverMapsProviderError';
        this.status = status;
    }
}
