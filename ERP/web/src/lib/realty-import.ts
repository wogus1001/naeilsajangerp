export type RealtySource = 'daangn';

export type RealtyListing = {
    source: RealtySource;
    sourceListingId: string;
    sourceUrl: string;
    title: string;
    address: string;
    region: string;
    latitude: number | null;
    longitude: number | null;
    tradeType: string;
    propertyType: string;
    depositAmount: number | null;
    monthlyRent: number | null;
    salePrice: number | null;
    maintenanceFee: number | null;
    areaSqm: number | null;
    areaPyeong: string;
    floorInfo: string;
    imageUrls: string[];
    raw: Record<string, unknown>;
    collectedAt: string;
};

export type RealtyCollectorResult = {
    source: RealtySource;
    listings: RealtyListing[];
    warnings: string[];
    sourceUrl?: string;
};

type DaangnRegion = {
    id?: string;
    name?: string;
    name1?: string;
    name2?: string;
    name3?: string;
    depth1RegionName?: string;
    depth2RegionName?: string;
    depth3RegionName?: string;
};

type DaangnTrade = {
    type?: string;
    preferred?: boolean;
    manageCost?: number | null;
    deposit?: number | null;
    price?: number | null;
    monthlyPay?: number | null;
    yearlyPay?: number | null;
};

type DaangnPost = {
    id?: string;
    title?: string;
    webUrl?: string;
    href?: string;
    salesType?: string;
    salesTypeV2?: string;
    trades?: DaangnTrade[];
    area?: string | number;
    areaPyeong?: string;
    totalManageCost?: number | null;
    manageCost?: number | null;
    floor?: string | number | null;
    floorText?: string;
    address?: string;
    addressInfo?: string;
    buildingName?: string;
    region?: DaangnRegion;
    images?: string[];
};

const DAANGN_REGION_URL = 'https://www.daangn.com/kr/api/v1/regions/keyword';
const DAANGN_REALTY_URL = 'https://www.daangn.com/kr/realty/';
const DEFAULT_TIMEOUT_MS = 12000;
const DEFAULT_LIMIT = 1000;
const MAX_LIMIT = 3000;

function cleanString(value: unknown): string {
    return String(value ?? '').trim();
}

function parseNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const normalized = typeof value === 'string'
        ? value.replace(/,/g, '').replace(/[^\d.-]/g, '').trim()
        : value;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
}

function clampLimit(value: unknown) {
    const parsed = parseNumber(value);
    if (parsed === null) return DEFAULT_LIMIT;
    return Math.max(1, Math.min(MAX_LIMIT, Math.round(parsed)));
}

function absoluteDaangnUrl(value: unknown) {
    const url = cleanString(value);
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `https://www.daangn.com${url}`;
}

function extractSourceId(url: string, fallback: string) {
    const articleMatch = url.match(/articles\/(\d+)/);
    if (articleMatch?.[1]) return articleMatch[1];
    const normalized = cleanString(fallback);
    return normalized || url;
}

function pickRegionLabel(region: DaangnRegion | undefined, fallback: string) {
    const parts = [
        region?.name1 || region?.depth1RegionName,
        region?.name2 || region?.depth2RegionName,
        region?.name3 || region?.depth3RegionName || region?.name
    ].map(cleanString).filter(Boolean);
    if (parts.length > 0) return parts.join(' ');
    return fallback;
}

function pickDaangnRegion(regions: DaangnRegion[], query: string) {
    const normalizedQuery = cleanString(query);
    const exact = regions.find(region => [
        region.name,
        region.name1,
        region.name2,
        region.name3,
        region.depth1RegionName,
        region.depth2RegionName,
        region.depth3RegionName
    ].some(value => cleanString(value) === normalizedQuery));
    if (exact) return exact;

    const included = regions.find(region => [
        region.name,
        region.name1,
        region.name2,
        region.name3,
        region.depth1RegionName,
        region.depth2RegionName,
        region.depth3RegionName
    ].some(value => cleanString(value).includes(normalizedQuery) || normalizedQuery.includes(cleanString(value))));
    return included || regions[0] || null;
}

function fetchJsonWithTimeout<T>(url: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    return fetch(url, {
        headers: {
            Accept: 'application/json,text/html;q=0.9,*/*;q=0.8',
            'User-Agent': 'Mozilla/5.0'
        },
        signal: controller.signal,
        cache: 'no-store'
    }).then(async response => {
        if (!response.ok) {
            const message = await response.text().catch(() => '');
            throw new Error(`request failed: ${response.status} ${message}`);
        }
        return response.json() as Promise<T>;
    }).finally(() => clearTimeout(timeout));
}

async function resolveDaangnRegions(region: string) {
    const url = new URL(DAANGN_REGION_URL);
    url.searchParams.set('keyword', region);

    const payload = await fetchJsonWithTimeout<{ locations?: DaangnRegion[] }>(url.toString());
    const locations = payload.locations || [];
    const normalizedRegion = cleanString(region);
    const districtToken = normalizedRegion.split(/\s+/).find(token => /[구군]$/.test(token)) || normalizedRegion;
    const isDistrictQuery = /[구군]$/.test(districtToken) && !/[동읍면리]$/.test(normalizedRegion);

    if (isDistrictQuery) {
        const districtMatches = locations.filter(location => {
            const district = cleanString(location.name2 || location.depth2RegionName);
            const dong = cleanString(location.name3 || location.depth3RegionName || location.name);
            return district === districtToken
                && dong
                && /[동읍면리]$/.test(dong)
                && !/제\d+동$/.test(dong);
        });
        const unique = new Map<string, DaangnRegion>();
        districtMatches.forEach(location => {
            const key = `${location.name2 || location.depth2RegionName}:${location.name3 || location.depth3RegionName || location.name}`;
            if (!unique.has(key)) unique.set(key, location);
        });
        if (unique.size > 0) return Array.from(unique.values());
    }

    const selected = pickDaangnRegion(locations, region);
    if (!selected?.id || !selected.name) {
        throw new Error(`당근 지역 후보를 찾지 못했습니다: ${region}`);
    }
    return [selected];
}

function mapDaangnListing(post: DaangnPost, fallbackRegion: string): RealtyListing | null {
    const salesType = cleanString(post.salesTypeV2 || post.salesType);
    if (salesType !== 'STORE') return null;

    const sourceUrl = cleanString(post.webUrl) || absoluteDaangnUrl(post.href || post.id);
    const sourceListingId = extractSourceId(sourceUrl, post.id || post.title || '');
    if (!sourceListingId) return null;

    const trade = (post.trades || []).find(item => item.preferred) || post.trades?.[0] || {};
    const address = cleanString(post.address || post.addressInfo);
    const region = pickRegionLabel(post.region, fallbackRegion);

    return {
        source: 'daangn',
        sourceListingId,
        sourceUrl,
        title: cleanString(post.title) || '당근 상가 매물',
        address,
        region,
        latitude: null,
        longitude: null,
        tradeType: cleanString(trade.type),
        propertyType: '상가',
        depositAmount: parseNumber(trade.deposit),
        monthlyRent: parseNumber(trade.monthlyPay),
        salePrice: parseNumber(trade.price),
        maintenanceFee: parseNumber(trade.manageCost ?? post.totalManageCost ?? post.manageCost),
        areaSqm: parseNumber(post.area),
        areaPyeong: cleanString(post.areaPyeong),
        floorInfo: cleanString(post.floorText || post.floor),
        imageUrls: Array.isArray(post.images) ? post.images.filter(Boolean).map(String).slice(0, 12) : [],
        raw: post as Record<string, unknown>,
        collectedAt: new Date().toISOString()
    };
}

export async function fetchDaangnStoreListings(region: string, limit?: unknown): Promise<RealtyCollectorResult> {
    const warnings: string[] = [];
    const normalizedLimit = clampLimit(limit);
    const selectedRegions = await resolveDaangnRegions(region);
    const listingsById = new Map<string, RealtyListing>();
    const sourceUrls: string[] = [];

    if (selectedRegions.length > 1) {
        warnings.push(`당근 지역 "${region}"을 ${selectedRegions.map(item => item.name).join(', ')} 단위로 확장해 수집했습니다.`);
    }

    for (const selectedRegion of selectedRegions) {
        const inParam = `${selectedRegion.name}-${selectedRegion.id}`;
        const url = new URL(DAANGN_REALTY_URL);
        url.searchParams.set('in', inParam);
        url.searchParams.set('salesType', 'store');
        url.searchParams.set('_data', 'routes/kr.realty._index');
        sourceUrls.push(url.toString());

        const payload = await fetchJsonWithTimeout<{
            realtyPosts?: { realtyPosts?: DaangnPost[] };
        }>(url.toString());

        const regionLabel = pickRegionLabel(selectedRegion, region);
        const posts = payload.realtyPosts?.realtyPosts || [];
        const mappedListings = posts
            .map(post => mapDaangnListing(post, regionLabel))
            .filter((listing): listing is RealtyListing => Boolean(listing));

        mappedListings.forEach(listing => {
            const key = `${listing.source}:${listing.sourceListingId}`;
            if (!listingsById.has(key)) listingsById.set(key, listing);
        });

        warnings.push(`당근 ${regionLabel} 원본 응답 ${posts.length.toLocaleString()}건 중 상가 ${mappedListings.length.toLocaleString()}건을 확인했습니다.`);
    }

    const allListings = Array.from(listingsById.values());
    const listings = allListings.slice(0, normalizedLimit);

    if (listings.length === 0) {
        warnings.push(`당근 ${region} 상가 매물 결과가 없습니다.`);
    } else if (allListings.length > normalizedLimit) {
        warnings.push(`당근 ${region} 상가 ${allListings.length.toLocaleString()}건 중 ${normalizedLimit.toLocaleString()}건만 저장했습니다.`);
    }

    return {
        source: 'daangn',
        listings,
        warnings,
        sourceUrl: sourceUrls[0]
    };
}

export function buildExternalPropertyPayload(params: {
    listing: RealtyListing;
    companyName?: string;
    managerId?: string;
    importJobId: string;
}) {
    const { listing, companyName, managerId, importJobId } = params;
    const displayAddress = listing.address || listing.region;
    const monthlyRent = listing.monthlyRent ?? 0;
    const deposit = listing.depositAmount ?? 0;
    const premium = 0;

    return {
        name: listing.title,
        companyName,
        managerId,
        status: 'hold',
        operationType: 'external',
        processStatus: '외부수집',
        address: displayAddress,
        coordinates: listing.latitude !== null && listing.longitude !== null
            ? { lat: listing.latitude, lng: listing.longitude }
            : null,
        type: '부동산',
        industryCategory: '부동산업',
        industrySector: '임대',
        industryDetail: '상가',
        deposit,
        monthlyRent,
        premium,
        maintenance: listing.maintenanceFee ?? 0,
        area: listing.areaPyeong || (listing.areaSqm ? String(listing.areaSqm) : ''),
        floor: listing.floorInfo,
        totalPrice: deposit + premium,
        isFavorite: false,
        externalSource: listing.source,
        externalListingId: listing.sourceListingId,
        externalSourceUrl: listing.sourceUrl,
        externalCollectedAt: listing.collectedAt,
        externalImportJobId: importJobId,
        externalPropertyType: listing.propertyType,
        externalTradeType: listing.tradeType,
        externalRaw: listing.raw,
        photos: listing.imageUrls
    };
}
