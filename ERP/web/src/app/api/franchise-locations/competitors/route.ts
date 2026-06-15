import { getRequesterProfile, canAccessCompanyResource } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import { normalizeSearchText, stripHtml } from '@/lib/franchise-market-monitoring';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const KAKAO_LOCAL_BASE_URL = 'https://dapi.kakao.com/v2/local';
const DEFAULT_RADIUS_METERS = 700;
const MIN_RADIUS_METERS = 100;
const MAX_RADIUS_METERS = 20_000;
const PAGE_SIZE = 15;
const MAX_PAGES = 3;
const DEFAULT_REVIEW_ENRICH_LIMIT = 8;
const MAX_REVIEW_ENRICH_LIMIT = 10;
const EXTERNAL_TIMEOUT_MS = 4500;
const NAVER_AD_TIMEOUT_MS = 15_000;
const NAVER_REVIEW_TIMEOUT_MS = 15_000;

type KakaoAddressDocument = {
    x?: string;
    y?: string;
};

type KakaoAddressResponse = {
    documents?: KakaoAddressDocument[];
};

type KakaoKeywordDocument = {
    id?: string;
    place_name?: string;
    category_name?: string;
    address_name?: string;
    road_address_name?: string;
    phone?: string;
    distance?: string;
    place_url?: string;
    x?: string;
    y?: string;
};

type KakaoKeywordResponse = {
    documents?: KakaoKeywordDocument[];
    meta?: {
        total_count?: number;
        pageable_count?: number;
        is_end?: boolean;
    };
};

type NaverAdItem = {
    position: number | null;
    title: string;
    source: string;
    link: string;
};

type NaverAdSnapshot = {
    provider: 'searchapi' | 'serpapi' | '';
    query: string;
    attemptedQueries?: string[];
    failedQueries?: string[];
    enabled: boolean;
    collectedAt: string;
    ads: NaverAdItem[];
    unavailableReason?: string;
};

type NaverReviewStats = {
    source: 'searchapi' | 'serpapi';
    query: string;
    attemptedQueries?: string[];
    failedQueries?: string[];
    title: string;
    rating: number | null;
    visitorReviews: number | null;
    blogReviews: number | null;
    placeUrl: string;
    rank: number | null;
    unavailableReason?: string;
};

type GoogleReviewSnippet = {
    authorName: string;
    rating: number | null;
    text: string;
    relativeTimeDescription: string;
};

type GoogleReviewStats = {
    source: 'google-places';
    placeId: string;
    name: string;
    rating: number | null;
    userRatingCount: number | null;
    placeUrl: string;
    reviews: GoogleReviewSnippet[];
    unavailableReason?: string;
};

type ReviewStats = {
    kakao: {
        source: 'kakao-local';
        placeUrl: string;
        unavailableReason: string;
    };
    naver?: NaverReviewStats;
    google?: GoogleReviewStats;
};

type AdStats = {
    naver?: {
        provider: 'searchapi' | 'serpapi' | '';
        query: string;
        hasAds: boolean;
        ads: NaverAdItem[];
        competitorAdRank: number | null;
        matchedTitle: string;
        unavailableReason?: string;
    };
};

type FranchiseLocationRow = {
    id: string;
    company_id: string | null;
    manager_id: string | null;
    name: string | null;
    location_type: string | null;
    brand: string | null;
    status: string | null;
    region: string | null;
    address: string | null;
    latitude: number | string | null;
    longitude: number | string | null;
    opened_at: string | null;
    source_property_id: string | null;
    memo: string | null;
    created_at: string | null;
    updated_at: string | null;
    data: Record<string, unknown> | null;
};

class KakaoApiError extends Error {
    status: number;

    constructor(status: number, message: string) {
        super(message);
        this.name = 'KakaoApiError';
        this.status = status;
    }
}

function cleanString(value: unknown): string {
    return String(value || '').trim();
}

function parseNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const normalized = typeof value === 'string'
        ? value.replace(/,/g, '').trim()
        : value;
    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) return parsed;
    if (typeof normalized === 'string') {
        const numericMatch = normalized.match(/-?\d+(?:\.\d+)?/);
        if (numericMatch) {
            const extracted = Number(numericMatch[0]);
            if (Number.isFinite(extracted)) return extracted;
        }
    }
    return Number.isFinite(parsed) ? parsed : null;
}

function clampRadius(value: unknown) {
    const parsed = parseNumber(value);
    if (parsed === null) return DEFAULT_RADIUS_METERS;
    return Math.max(MIN_RADIUS_METERS, Math.min(MAX_RADIUS_METERS, Math.round(parsed)));
}

function getKakaoRestApiKey() {
    return process.env.KAKAO_REST_API_KEY || process.env.KAKAO_LOCAL_REST_API_KEY || '';
}

function getGooglePlacesApiKey() {
    return process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';
}

function getReviewEnrichLimit(value: unknown) {
    const configured = parseNumber(value ?? process.env.FRANCHISE_COMPETITOR_REVIEW_LIMIT);
    if (configured === null) return DEFAULT_REVIEW_ENRICH_LIMIT;
    return Math.max(0, Math.min(MAX_REVIEW_ENRICH_LIMIT, Math.round(configured)));
}

function pickSerpProvider() {
    const preferred = cleanString(process.env.SERP_PROVIDER).toLowerCase();
    if ((preferred === 'searchapi' || preferred === 'searchapi.io') && process.env.SEARCHAPI_API_KEY) return 'searchapi' as const;
    if ((preferred === 'serpapi' || preferred === 'serpapi.io') && process.env.SERPAPI_API_KEY) return 'serpapi' as const;
    if (process.env.SEARCHAPI_API_KEY) return 'searchapi' as const;
    if (process.env.SERPAPI_API_KEY) return 'serpapi' as const;
    return '';
}

async function fetchJsonWithTimeout<T>(url: string, options: RequestInit = {}, timeoutMs = EXTERNAL_TIMEOUT_MS): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            cache: 'no-store'
        });

        if (!response.ok) {
            const text = await response.text().catch(() => '');
            throw new Error(`request failed: ${response.status} ${text}`);
        }

        return response.json() as Promise<T>;
    } finally {
        clearTimeout(timeout);
    }
}

async function callKakaoLocal<T>(path: string, params: Record<string, string | number>, apiKey: string): Promise<T> {
    const url = new URL(`${KAKAO_LOCAL_BASE_URL}${path}`);
    Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, String(value));
    });

    const response = await fetch(url.toString(), {
        headers: {
            Authorization: `KakaoAK ${apiKey}`
        },
        cache: 'no-store'
    });

    if (!response.ok) {
        const message = await response.text().catch(() => '');
        throw new KakaoApiError(response.status, message || 'Kakao Local API request failed');
    }

    return response.json() as Promise<T>;
}

async function resolveCoordinates(location: FranchiseLocationRow, apiKey: string) {
    const existingLat = parseNumber(location.latitude);
    const existingLng = parseNumber(location.longitude);
    if (existingLat !== null && existingLng !== null) {
        return { lat: existingLat, lng: existingLng, addressResolved: false };
    }

    const addressQuery = cleanString(location.address) || cleanString(location.region);
    if (!addressQuery) {
        throw new Error('주소 또는 좌표가 있는 위치만 경쟁업체를 스캔할 수 있습니다.');
    }

    const payload = await callKakaoLocal<KakaoAddressResponse>(
        '/search/address.json',
        { query: addressQuery },
        apiKey
    );
    const document = (payload.documents || []).find(item => item.x && item.y);
    const lat = parseNumber(document?.y);
    const lng = parseNumber(document?.x);

    if (lat === null || lng === null) {
        throw new Error('주소를 좌표로 변환하지 못했습니다. 위치 주소를 더 정확히 입력해주세요.');
    }

    return { lat, lng, addressResolved: true };
}

function buildScanQuery(location: FranchiseLocationRow, requestedQuery: unknown) {
    const data = location.data || {};
    return cleanString(requestedQuery) || cleanString(data.competitionKeyword) || cleanString(location.brand);
}

function normalizeAddress(value: unknown) {
    return cleanString(value).replace(/\s+/g, ' ');
}

function mapCompetitor(document: KakaoKeywordDocument) {
    return {
        id: cleanString(document.id) || `${cleanString(document.place_name)}-${cleanString(document.address_name)}`,
        name: cleanString(document.place_name) || '이름 없음',
        category: cleanString(document.category_name),
        address: cleanString(document.address_name),
        roadAddress: cleanString(document.road_address_name),
        phone: cleanString(document.phone),
        distance: parseNumber(document.distance),
        placeUrl: cleanString(document.place_url),
        lat: parseNumber(document.y),
        lng: parseNumber(document.x)
    };
}

type Competitor = ReturnType<typeof mapCompetitor>;

type EnrichedCompetitor = Competitor & {
    reviewStats?: ReviewStats;
    adStats?: AdStats;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function pickText(item: Record<string, unknown>, keys: string[]) {
    for (const key of keys) {
        const value = stripHtml(item[key]);
        if (value) return value;
    }
    return '';
}

function pickNumber(item: Record<string, unknown>, keys: string[]) {
    for (const key of keys) {
        const value = parseNumber(item[key]);
        if (value !== null) return value;
    }
    return null;
}

function pickDisplayName(value: unknown) {
    if (typeof value === 'string') return stripHtml(value);
    if (isRecord(value)) return stripHtml(value.text || value.name);
    return '';
}

function getReviewTotal(competitor: EnrichedCompetitor) {
    const naver = competitor.reviewStats?.naver;
    const google = competitor.reviewStats?.google;
    const naverTotal = (naver?.visitorReviews || 0) + (naver?.blogReviews || 0);
    if (naverTotal > 0) return naverTotal;
    return google?.userRatingCount || 0;
}

function getDistanceBucket(distance: number | null | undefined) {
    if (distance === null || distance === undefined) return Number.MAX_SAFE_INTEGER;
    return Math.floor(distance / 100);
}

function sortCompetitorsByDistanceAndReviews(competitors: EnrichedCompetitor[]) {
    return competitors
        .map((competitor, index) => ({ competitor, index }))
        .sort((a, b) => {
            const bucketDiff = getDistanceBucket(a.competitor.distance) - getDistanceBucket(b.competitor.distance);
            if (bucketDiff !== 0) return bucketDiff;

            const reviewDiff = getReviewTotal(b.competitor) - getReviewTotal(a.competitor);
            if (reviewDiff !== 0) return reviewDiff;

            const distanceDiff = (a.competitor.distance ?? Number.MAX_SAFE_INTEGER) - (b.competitor.distance ?? Number.MAX_SAFE_INTEGER);
            if (distanceDiff !== 0) return distanceDiff;

            return a.index - b.index;
        })
        .map(item => item.competitor);
}

function collectRecordArrays(payload: Record<string, unknown>, keys: string[]) {
    const records: Record<string, unknown>[] = [];
    keys.forEach(key => {
        const value = payload[key];
        if (Array.isArray(value)) {
            records.push(...value.filter(isRecord));
            return;
        }
        if (isRecord(value)) {
            ['items', 'results', 'places', 'ads'].forEach(nestedKey => {
                const nested = value[nestedKey];
                if (Array.isArray(nested)) records.push(...nested.filter(isRecord));
            });
        }
    });
    return records;
}

function getNaverPlaceCandidates(payload: Record<string, unknown>) {
    const candidates: Record<string, unknown>[] = [];
    if (isRecord(payload.knowledge_graph)) candidates.push(payload.knowledge_graph);
    candidates.push(...collectRecordArrays(payload, [
        'place_results',
        'places_results',
        'local_results',
        'organic_results',
        'results',
        'web_results'
    ]));
    return candidates;
}

function getNaverAds(payload: Record<string, unknown>): NaverAdItem[] {
    return collectRecordArrays(payload, [
        'ads',
        'ad_results',
        'paid_results',
        'power_link_results',
        'powerlink_results',
        'sponsored_results'
    ])
        .map((item, index) => ({
            position: pickNumber(item, ['position', 'rank']) || index + 1,
            title: pickText(item, ['title', 'name', 'displayed_title']),
            source: pickText(item, ['source', 'displayed_link', 'domain', 'description']),
            link: pickText(item, ['link', 'url'])
        }))
        .filter(item => item.title);
}

async function fetchNaverSerpPayload(query: string, timeoutMs = EXTERNAL_TIMEOUT_MS) {
    const provider = pickSerpProvider();
    if (!provider) return { provider, payload: null as Record<string, unknown> | null };

    const params = new URLSearchParams({ engine: 'naver' });
    params.set(provider === 'searchapi' ? 'q' : 'query', query);
    params.set('api_key', provider === 'searchapi' ? process.env.SEARCHAPI_API_KEY || '' : process.env.SERPAPI_API_KEY || '');

    const endpoint = provider === 'searchapi'
        ? `https://www.searchapi.io/api/v1/search?${params.toString()}`
        : `https://serpapi.com/search.json?${params.toString()}`;

    const payload = await fetchJsonWithTimeout<Record<string, unknown>>(endpoint, {}, timeoutMs);
    return { provider, payload };
}

function buildAreaSerpQuery(location: FranchiseLocationRow, query: string) {
    const area = cleanString(location.region) || normalizeRegionLike(cleanString(location.address));
    return [area, query].filter(Boolean).join(' ');
}

function buildNaverAdQueries(location: FranchiseLocationRow, query: string) {
    const area = cleanString(location.region) || normalizeRegionLike(cleanString(location.address));
    const district = getDistrictRegion(area);
    const areaQuery = buildAreaSerpQuery(location, query);
    const districtQuery = [district, query].filter(Boolean).join(' ');
    const brandQuery = [area, cleanString(location.brand)]
        .filter(Boolean)
        .join(' ');
    const districtBrandQuery = [district, cleanString(location.brand)]
        .filter(Boolean)
        .join(' ');
    return Array.from(new Set([
        districtQuery,
        areaQuery,
        query,
        districtBrandQuery,
        brandQuery
    ].map(cleanString).filter(Boolean)));
}

function normalizeRegionLike(address: string) {
    return address.split(/\s+/).slice(0, 2).join(' ');
}

function getDistrictRegion(region: string) {
    const parts = region.split(/\s+/).filter(Boolean);
    return parts.find(part => /구$|군$|시$/.test(part) && !/특별시$|광역시$/.test(part)) || '';
}

async function collectNaverAdSnapshot(queries: string[]): Promise<NaverAdSnapshot> {
    const provider = pickSerpProvider();
    const attemptedQueries = queries.length > 0 ? queries : [''];
    const primaryQuery = attemptedQueries[0] || '';
    if (!provider) {
        return {
            provider: '',
            query: primaryQuery,
            attemptedQueries,
            enabled: false,
            collectedAt: new Date().toISOString(),
            ads: [],
            unavailableReason: 'SEARCHAPI_API_KEY 또는 SERPAPI_API_KEY 미설정'
        };
    }

    try {
        let selectedQuery = primaryQuery;
        let selectedAds: NaverAdItem[] = [];
        let successfulQueries = 0;
        const failedQueries: string[] = [];

        for (const query of attemptedQueries) {
            try {
                const { payload } = await fetchNaverSerpPayload(query, NAVER_AD_TIMEOUT_MS);
                successfulQueries += 1;
                const ads = payload ? getNaverAds(payload).slice(0, 10) : [];
                selectedQuery = query;
                selectedAds = ads;
                if (ads.length > 0) break;
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Naver 광고 조회 실패';
                failedQueries.push(`${query}: ${message}`);
            }
        }

        if (successfulQueries === 0 && failedQueries.length > 0) {
            return {
                provider,
                query: selectedQuery,
                attemptedQueries,
                failedQueries,
                enabled: true,
                collectedAt: new Date().toISOString(),
                ads: [],
                unavailableReason: failedQueries[0]
            };
        }

        return {
            provider,
            query: selectedQuery,
            attemptedQueries,
            ...(failedQueries.length > 0 ? { failedQueries } : {}),
            enabled: true,
            collectedAt: new Date().toISOString(),
            ads: selectedAds
        };
    } catch (error) {
        return {
            provider,
            query: primaryQuery,
            attemptedQueries,
            enabled: true,
            collectedAt: new Date().toISOString(),
            ads: [],
            unavailableReason: error instanceof Error ? error.message : 'Naver SERP 광고 조회 실패'
        };
    }
}

function findMatchingAd(competitor: Competitor, adSnapshot: NaverAdSnapshot) {
    const competitorNeedle = normalizeSearchText(competitor.name);
    if (!competitorNeedle) return null;

    return adSnapshot.ads.find(ad => {
        const adTitle = normalizeSearchText(ad.title);
        return adTitle.includes(competitorNeedle) || competitorNeedle.includes(adTitle);
    }) || null;
}

function buildNaverReviewQueries(competitor: Competitor, location: FranchiseLocationRow) {
    const name = cleanString(competitor.name);
    const address = competitor.roadAddress || competitor.address || location.address || '';
    const region = cleanString(location.region) || normalizeRegionLike(cleanString(address));
    return Array.from(new Set([
        name,
        [name, region].filter(Boolean).join(' '),
        [name, address].filter(Boolean).join(' ')
    ].map(cleanString).filter(Boolean)));
}

function normalizeNaverPlaceUrl(value: string) {
    const url = cleanString(value);
    if (!url) return '';

    const entryMatch = url.match(/map\.naver\.com\/p\/entry\/place\/(\d+)/i);
    if (entryMatch?.[1]) return `https://map.naver.com/p/entry/place/${entryMatch[1]}`;

    const directionsPlaceMatch = url.match(/,(\d+),PLACE_POI/i);
    if (directionsPlaceMatch?.[1]) return `https://map.naver.com/p/entry/place/${directionsPlaceMatch[1]}`;

    return url;
}

function pickNaverPlaceUrl(item: Record<string, unknown>) {
    const directUrl = normalizeNaverPlaceUrl(pickText(item, ['link', 'url', 'place_url', 'entry_url']));
    if (directUrl) return directUrl;

    const streetViewUrl = normalizeNaverPlaceUrl(pickText(item, ['street_view']));
    if (streetViewUrl) return streetViewUrl;

    return normalizeNaverPlaceUrl(pickText(item, ['directions']));
}

async function collectNaverReviewStats(competitor: Competitor, location: FranchiseLocationRow): Promise<NaverReviewStats | undefined> {
    const provider = pickSerpProvider();
    if (!provider) {
        return undefined;
    }

    const queries = buildNaverReviewQueries(competitor, location);

    try {
        let matched: Record<string, unknown> | undefined;
        let selectedQuery = queries[0] || '';
        const failedQueries: string[] = [];
        const competitorNeedle = normalizeSearchText(competitor.name);

        for (const query of queries) {
            let payload: Record<string, unknown> | null = null;
            try {
                const response = await fetchNaverSerpPayload(query, NAVER_REVIEW_TIMEOUT_MS);
                payload = response.payload;
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Naver 리뷰 조회 실패';
                failedQueries.push(`${query}: ${message}`);
                continue;
            }

            if (!payload) continue;

            const candidates = getNaverPlaceCandidates(payload);
            const candidate = candidates.find(item => {
                const title = normalizeSearchText(pickText(item, ['title', 'name', 'place_name', 'displayed_title']));
                return title && (title.includes(competitorNeedle) || competitorNeedle.includes(title));
            }) || candidates[0];

            if (!candidate) continue;

            const hasReviewValues = (
                pickNumber(candidate, ['visitor_reviews', 'visitor_review_count', 'review_count', 'reviews', 'user_review_count']) !== null ||
                pickNumber(candidate, ['blog_reviews', 'blog_review_count', 'blog_reviews_count', 'blog_post_count']) !== null
            );

            if (!matched || hasReviewValues) {
                matched = candidate;
                selectedQuery = query;
            }

            if (hasReviewValues) {
                break;
            }
        }

        if (!matched) {
            return {
                source: provider,
                query: queries[0] || '',
                attemptedQueries: queries,
                ...(failedQueries.length > 0 ? { failedQueries } : {}),
                title: '',
                rating: null,
                visitorReviews: null,
                blogReviews: null,
                placeUrl: '',
                rank: null,
                unavailableReason: failedQueries.length > 0 ? failedQueries[0] : 'Naver 장소 결과 없음'
            };
        }

        return {
            source: provider,
            query: selectedQuery,
            attemptedQueries: queries,
            ...(failedQueries.length > 0 ? { failedQueries } : {}),
            title: pickText(matched, ['title', 'name', 'place_name', 'displayed_title']),
            rating: pickNumber(matched, ['rating', 'score']),
            visitorReviews: pickNumber(matched, ['visitor_reviews', 'visitor_review_count', 'review_count', 'reviews', 'user_review_count']),
            blogReviews: pickNumber(matched, ['blog_reviews', 'blog_review_count', 'blog_reviews_count', 'blog_post_count']),
            placeUrl: pickNaverPlaceUrl(matched),
            rank: pickNumber(matched, ['position', 'rank'])
        };
    } catch (error) {
        return {
            source: provider,
            query: queries[0] || '',
            attemptedQueries: queries,
            title: '',
            rating: null,
            visitorReviews: null,
            blogReviews: null,
            placeUrl: '',
            rank: null,
            unavailableReason: error instanceof Error ? error.message : 'Naver 리뷰 조회 실패'
        };
    }
}

async function collectGoogleReviewStats(competitor: Competitor, location: FranchiseLocationRow): Promise<GoogleReviewStats | undefined> {
    const apiKey = getGooglePlacesApiKey();
    if (!apiKey) return undefined;

    const query = [
        competitor.name,
        competitor.roadAddress || competitor.address || location.address || location.region
    ].filter(Boolean).join(' ');

    try {
        try {
            const searchPayload = await fetchJsonWithTimeout<{
                places?: Array<Record<string, unknown>>;
                error?: {
                    message?: string;
                    status?: string;
                };
            }>('https://places.googleapis.com/v1/places:searchText', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': apiKey,
                    'X-Goog-FieldMask': 'places.id,places.displayName,places.rating,places.userRatingCount,places.googleMapsUri'
                },
                body: JSON.stringify({
                    textQuery: query,
                    languageCode: 'ko'
                })
            });

            const place = (searchPayload.places || [])[0];
            const placeId = cleanString(place?.id);
            if (placeId) {
                return {
                    source: 'google-places',
                    placeId,
                    name: pickDisplayName(place.displayName),
                    rating: pickNumber(place, ['rating']),
                    userRatingCount: pickNumber(place, ['userRatingCount']),
                    placeUrl: pickText(place, ['googleMapsUri']),
                    reviews: []
                };
            }
        } catch (newApiError) {
            console.warn('Google Places API (New) request failed, falling back to legacy endpoint:', newApiError);
        }

        const searchParams = new URLSearchParams({
            query,
            key: apiKey,
            language: 'ko'
        });
        const searchPayload = await fetchJsonWithTimeout<{
            status?: string;
            error_message?: string;
            results?: Array<Record<string, unknown>>;
        }>(`https://maps.googleapis.com/maps/api/place/textsearch/json?${searchParams.toString()}`);

        if (searchPayload.status && !['OK', 'ZERO_RESULTS'].includes(searchPayload.status)) {
            throw new Error(searchPayload.error_message || `Google Places search failed: ${searchPayload.status}`);
        }

        const place = (searchPayload.results || [])[0];
        const placeId = cleanString(place?.place_id);
        if (!placeId) {
            return {
                source: 'google-places',
                placeId: '',
                name: '',
                rating: null,
                userRatingCount: null,
                placeUrl: '',
                reviews: [],
                unavailableReason: 'Google Places 결과 없음'
            };
        }

        return {
            source: 'google-places',
            placeId,
            name: cleanString(place.name),
            rating: pickNumber(place, ['rating']),
            userRatingCount: pickNumber(place, ['user_ratings_total']),
            placeUrl: `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(placeId)}`,
            reviews: []
        };
    } catch (error) {
        return {
            source: 'google-places',
            placeId: '',
            name: '',
            rating: null,
            userRatingCount: null,
            placeUrl: '',
            reviews: [],
            unavailableReason: error instanceof Error ? error.message : 'Google 리뷰 조회 실패'
        };
    }
}

async function enrichCompetitors(
    competitors: Competitor[],
    location: FranchiseLocationRow,
    adSnapshot: NaverAdSnapshot,
    reviewLimit: number
): Promise<EnrichedCompetitor[]> {
    const targets = competitors.slice(0, reviewLimit);
    const enrichedTargets = await Promise.all(targets.map(async competitor => {
        const [naverReview, googleReview] = await Promise.all([
            collectNaverReviewStats(competitor, location),
            collectGoogleReviewStats(competitor, location)
        ]);
        const matchedAd = findMatchingAd(competitor, adSnapshot);

        return {
            ...competitor,
            reviewStats: {
                kakao: {
                    source: 'kakao-local' as const,
                    placeUrl: competitor.placeUrl,
                    unavailableReason: 'Kakao Local API는 리뷰 수/본문을 제공하지 않아 장소 링크만 저장합니다.'
                },
                ...(naverReview ? { naver: naverReview } : {}),
                ...(googleReview ? { google: googleReview } : {})
            },
            adStats: {
                naver: {
                    provider: adSnapshot.provider,
                    query: adSnapshot.query,
                    hasAds: adSnapshot.ads.length > 0,
                    ads: adSnapshot.ads.slice(0, 5),
                    competitorAdRank: matchedAd?.position ?? null,
                    matchedTitle: matchedAd?.title || '',
                    ...(adSnapshot.unavailableReason ? { unavailableReason: adSnapshot.unavailableReason } : {})
                }
            }
        };
    }));

    const enrichedById = new Map(enrichedTargets.map(item => [item.id, item]));
    return competitors.map(competitor => enrichedById.get(competitor.id) || {
        ...competitor,
        reviewStats: {
            kakao: {
                source: 'kakao-local',
                placeUrl: competitor.placeUrl,
                unavailableReason: 'Kakao Local API는 리뷰 수/본문을 제공하지 않아 장소 링크만 저장합니다.'
            }
        },
        adStats: {
            naver: {
                provider: adSnapshot.provider,
                query: adSnapshot.query,
                hasAds: adSnapshot.ads.length > 0,
                ads: adSnapshot.ads.slice(0, 5),
                competitorAdRank: null,
                matchedTitle: '',
                unavailableReason: reviewLimit > 0
                    ? '리뷰 상세 수집 제한 밖의 업체입니다.'
                    : '리뷰 상세 수집이 비활성화되어 있습니다.'
            }
        }
    });
}

function transformLocation(row: FranchiseLocationRow) {
    const data = row.data || {};
    return {
        ...data,
        id: row.id,
        companyId: row.company_id,
        managerId: row.manager_id,
        name: row.name || '',
        locationType: row.location_type || '예정점',
        brand: row.brand || '',
        status: row.status || '검토중',
        region: row.region || '',
        address: row.address || '',
        latitude: row.latitude,
        longitude: row.longitude,
        openedAt: row.opened_at,
        sourcePropertyId: row.source_property_id,
        memo: row.memo || '',
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

export async function POST(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const body = await request.json().catch(() => ({}));
        const locationId = cleanString(body.locationId || body.id);
        const apiKey = getKakaoRestApiKey();

        if (!locationId) {
            return fail(400, 'VALIDATION_ERROR', 'locationId is required');
        }
        if (!apiKey) {
            return fail(400, 'VALIDATION_ERROR', 'KAKAO_REST_API_KEY is required for competitor scan');
        }

        const requesterProfile = await getRequesterProfile(
            supabaseAdmin,
            request,
            body.requesterId || body.userId || null
        );
        if (!requesterProfile) {
            return fail(401, 'AUTH_REQUIRED', 'requesterId is required');
        }

        const { data: location, error: locationError } = await supabaseAdmin
            .from('franchise_locations')
            .select('*')
            .eq('id', locationId)
            .single();

        if (locationError || !location) {
            return fail(404, 'NOT_FOUND', 'Franchise location not found');
        }
        if (!canAccessCompanyResource(requesterProfile, location)) {
            return fail(403, 'FORBIDDEN', 'Forbidden: cross-company access denied');
        }

        const target = location as FranchiseLocationRow;
        const radius = clampRadius(body.radius);
        const query = buildScanQuery(target, body.query);
        if (!query) {
            return fail(400, 'VALIDATION_ERROR', '경쟁스캔 키워드 또는 브랜드를 먼저 입력해주세요.');
        }

        const coordinates = await resolveCoordinates(target, apiKey);
        const competitors: Competitor[] = [];
        const seen = new Set<string>();
        const currentAddress = normalizeAddress(target.address);
        let totalCount = 0;
        let pageableCount = 0;
        let isEnd = false;

        for (let page = 1; page <= MAX_PAGES && !isEnd; page += 1) {
            const payload = await callKakaoLocal<KakaoKeywordResponse>(
                '/search/keyword.json',
                {
                    query,
                    x: coordinates.lng,
                    y: coordinates.lat,
                    radius,
                    sort: 'distance',
                    page,
                    size: PAGE_SIZE
                },
                apiKey
            );

            if (page === 1) {
                totalCount = Number(payload.meta?.total_count || 0);
                pageableCount = Number(payload.meta?.pageable_count || 0);
            }
            isEnd = Boolean(payload.meta?.is_end);

            (payload.documents || []).forEach(document => {
                const competitor = mapCompetitor(document);
                const competitorAddress = normalizeAddress(competitor.roadAddress || competitor.address);
                if (currentAddress && competitorAddress && currentAddress === competitorAddress) return;
                const key = competitor.id || `${competitor.name}-${competitorAddress}`;
                if (seen.has(key)) return;
                seen.add(key);
                competitors.push(competitor);
            });
        }

        const reviewLimit = getReviewEnrichLimit(body.reviewLimit);
        const adSnapshot = await collectNaverAdSnapshot(buildNaverAdQueries(target, query));
        const enrichedCompetitors = sortCompetitorsByDistanceAndReviews(
            await enrichCompetitors(competitors, target, adSnapshot, reviewLimit)
        );

        const scan = {
            provider: 'kakao-local',
            query,
            radius,
            rankingPolicy: {
                base: 'distance-review',
                distanceBucketMeters: 100,
                reviewSource: 'naver-first-google-fallback'
            },
            scannedAt: new Date().toISOString(),
            totalCount: Math.max(totalCount, competitors.length),
            pageableCount,
            collectedCount: enrichedCompetitors.length,
            competitors: enrichedCompetitors,
            coordinates: {
                lat: coordinates.lat,
                lng: coordinates.lng
            },
            addressResolved: coordinates.addressResolved,
            reviewEnrichment: {
                enabled: reviewLimit > 0,
                limit: reviewLimit,
                naverConfigured: Boolean(pickSerpProvider()),
                googleConfigured: Boolean(getGooglePlacesApiKey()),
                kakaoReviewCountAvailable: false,
                collectedAt: new Date().toISOString()
            },
            naverAdSnapshot: adSnapshot
        };
        const nextData = {
            ...(target.data || {}),
            competitionScan: scan
        };

        const { data: updated, error: updateError } = await supabaseAdmin
            .from('franchise_locations')
            .update({
                latitude: coordinates.lat,
                longitude: coordinates.lng,
                data: nextData,
                updated_at: new Date().toISOString()
            })
            .eq('id', target.id)
            .select()
            .single();

        if (updateError) throw updateError;

        return ok({ location: transformLocation(updated as FranchiseLocationRow), scan });
    } catch (error) {
        if (error instanceof KakaoApiError) {
            console.error('Kakao competitor scan API error:', error.status, error.message);
            return fail(502, 'INTERNAL_ERROR', 'Kakao Local API 호출에 실패했습니다.');
        }

        console.error('Franchise location competitor scan error:', error);
        return fail(
            error instanceof Error && error.message.includes('좌표') ? 400 : 500,
            error instanceof Error && error.message.includes('좌표') ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR',
            error instanceof Error ? error.message : 'Failed to scan competitors'
        );
    }
}
