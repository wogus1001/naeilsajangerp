export type RealtySource = 'daangn' | 'naver_land';

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

type NaverRegionItem = {
    CortarNo?: string;
    CortarNm?: string;
    MapXCrdn?: string;
    MapYCrdn?: string;
    CortarType?: string;
};

type NaverArticle = {
    atclNo?: string;
    atclNm?: string;
    rletTpCd?: string;
    rletTpNm?: string;
    tradTpCd?: string;
    tradTpNm?: string;
    flrInfo?: string;
    prc?: number | string;
    rentPrc?: number | string;
    spc1?: number | string;
    spc2?: number | string;
    atclFetrDesc?: string;
    repImgUrl?: string;
    lat?: number | string;
    lng?: number | string;
    tagList?: string[];
    bildNm?: string;
    rltrNm?: string;
};

type NaverClusterItem = {
    lgeo?: string;
    count?: number | string;
    z?: number | string;
    lat?: number | string;
    lon?: number | string;
};

const DAANGN_REGION_URL = 'https://www.daangn.com/kr/api/v1/regions/keyword';
const DAANGN_REALTY_URL = 'https://www.daangn.com/kr/realty/';
const NAVER_LAND_BASE_URL = 'https://m.land.naver.com';
const DEFAULT_TIMEOUT_MS = 12000;
const DEFAULT_LIMIT = 500;
const MAX_LIMIT = 1000;

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

function fetchNaverJsonWithTimeout<T>(url: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    return fetch(url, {
        headers: {
            Accept: 'application/json,text/plain,*/*',
            Referer: 'https://m.land.naver.com/',
            'User-Agent': 'Mozilla/5.0',
            'X-Requested-With': 'XMLHttpRequest'
        },
        signal: controller.signal,
        cache: 'no-store'
    }).then(async response => {
        const text = await response.text();
        if (!response.ok) {
            throw new Error(`request failed: ${response.status} ${text}`);
        }
        try {
            return JSON.parse(text) as T;
        } catch {
            throw new Error(`invalid json response: ${text.slice(0, 120)}`);
        }
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

async function fetchNaverRegionList(cortarNo: string) {
    const url = new URL(`${NAVER_LAND_BASE_URL}/map/getRegionList`);
    url.searchParams.set('cortarNo', cortarNo);
    const payload = await fetchJsonWithTimeout<{
        result?: { list?: NaverRegionItem[]; dvsnInfo?: NaverRegionItem; cityInfo?: NaverRegionItem };
    }>(url.toString());
    return payload.result || {};
}

function findNaverRegionItem(items: NaverRegionItem[], query: string) {
    const normalizedQuery = cleanString(query).replace(/\s+/g, '');
    return items.find(item => {
        const name = cleanString(item.CortarNm).replace(/\s+/g, '');
        return name && (normalizedQuery.includes(name) || name.includes(normalizedQuery));
    }) || items[0] || null;
}

async function resolveNaverRegion(region: string) {
    const tokens = cleanString(region).split(/\s+/).filter(Boolean);
    const root = await fetchNaverRegionList('0000000000');
    const city = findNaverRegionItem(root.list || [], tokens[0] || region);
    if (!city?.CortarNo) throw new Error(`네이버 시/도 지역 후보를 찾지 못했습니다: ${region}`);

    const division = await fetchNaverRegionList(city.CortarNo);
    const divisionItem = findNaverRegionItem(division.list || [], tokens.find(token => token.endsWith('구') || token.endsWith('시') || token.endsWith('군')) || region);
    const selectedDivision = divisionItem || division.dvsnInfo || city;

    if (!selectedDivision?.CortarNo) return city;

    const section = await fetchNaverRegionList(selectedDivision.CortarNo).catch(() => null);
    const sectionToken = tokens.find(token => token.endsWith('동') || token.endsWith('가') || token.endsWith('읍') || token.endsWith('면'));
    if (sectionToken && section?.list?.length) {
        const sectionItem = findNaverRegionItem(section.list, sectionToken);
        if (sectionItem?.CortarNo) return sectionItem;
    }

    return selectedDivision;
}

function buildBounds(lat: number, lon: number) {
    const delta = 0.03;
    return {
        btm: lat - delta,
        lft: lon - delta,
        top: lat + delta,
        rgt: lon + delta
    };
}

function buildWideBounds(lat: number, lon: number) {
    return {
        btm: lat - 0.118,
        lft: lon - 0.111,
        top: lat + 0.118,
        rgt: lon + 0.111
    };
}

function mapNaverListing(article: NaverArticle, fallbackRegion: string): RealtyListing | null {
    const sourceListingId = cleanString(article.atclNo);
    if (!sourceListingId) return null;
    const sourceUrl = `https://m.land.naver.com/article/info/${encodeURIComponent(sourceListingId)}`;
    const latitude = parseNumber(article.lat);
    const longitude = parseNumber(article.lng);
    const image = cleanString(article.repImgUrl);

    return {
        source: 'naver_land',
        sourceListingId,
        sourceUrl,
        title: cleanString(article.atclNm || article.atclFetrDesc) || '네이버 상가 매물',
        address: '',
        region: fallbackRegion,
        latitude,
        longitude,
        tradeType: cleanString(article.tradTpNm || article.tradTpCd),
        propertyType: cleanString(article.rletTpNm || article.rletTpCd) || '상가',
        depositAmount: cleanString(article.tradTpCd) === 'B2' ? parseNumber(article.prc) : null,
        monthlyRent: parseNumber(article.rentPrc),
        salePrice: cleanString(article.tradTpCd) === 'A1' ? parseNumber(article.prc) : null,
        maintenanceFee: null,
        areaSqm: parseNumber(article.spc2 || article.spc1),
        areaPyeong: '',
        floorInfo: cleanString(article.flrInfo),
        imageUrls: image ? [`https://landthumb-phinf.pstatic.net${image}`] : [],
        raw: article as Record<string, unknown>,
        collectedAt: new Date().toISOString()
    };
}

export async function fetchNaverStoreListings(region: string, limit?: unknown): Promise<RealtyCollectorResult> {
    const warnings: string[] = [];
    const normalizedLimit = clampLimit(limit);
    const selectedRegion = await resolveNaverRegion(region);
    const lat = parseNumber(selectedRegion.MapYCrdn);
    const lon = parseNumber(selectedRegion.MapXCrdn);

    if (lat === null || lon === null || !selectedRegion.CortarNo) {
        return {
            source: 'naver_land',
            listings: [],
            warnings: [`네이버 지역 좌표를 찾지 못했습니다: ${region}`]
        };
    }

    const wideBounds = buildWideBounds(lat, lon);
    const clusterUrl = new URL(`${NAVER_LAND_BASE_URL}/cluster/clusterList`);
    clusterUrl.searchParams.set('view', 'atcl');
    clusterUrl.searchParams.set('cortarNo', selectedRegion.CortarNo);
    clusterUrl.searchParams.set('rletTpCd', 'SG');
    clusterUrl.searchParams.set('tradTpCd', 'A1:B1:B2');
    clusterUrl.searchParams.set('z', '12');
    clusterUrl.searchParams.set('lat', String(lat));
    clusterUrl.searchParams.set('lon', String(lon));
    clusterUrl.searchParams.set('btm', String(wideBounds.btm));
    clusterUrl.searchParams.set('lft', String(wideBounds.lft));
    clusterUrl.searchParams.set('top', String(wideBounds.top));
    clusterUrl.searchParams.set('rgt', String(wideBounds.rgt));

    let articles: NaverArticle[] = [];
    let sourceUrl = clusterUrl.toString();

    try {
        const clusterPayload = await fetchNaverJsonWithTimeout<{
            data?: { ARTICLE?: NaverClusterItem[] };
        } | null>(clusterUrl.toString());
        const clusters = Array.isArray(clusterPayload?.data?.ARTICLE)
            ? clusterPayload.data.ARTICLE
            : [];

        for (const cluster of clusters.slice(0, 12)) {
            if (articles.length >= normalizedLimit) break;
            const itemId = cleanString(cluster.lgeo);
            const totalCount = parseNumber(cluster.count) || 20;
            const clusterLat = parseNumber(cluster.lat) ?? lat;
            const clusterLon = parseNumber(cluster.lon) ?? lon;
            const clusterZoom = parseNumber(cluster.z) || 15;
            if (!itemId) continue;

            const pageCount = Math.max(1, Math.min(5, Math.ceil(totalCount / 20)));
            for (let page = 1; page <= pageCount; page++) {
                if (articles.length >= normalizedLimit) break;
                const articleUrl = new URL(`${NAVER_LAND_BASE_URL}/cluster/ajax/articleList`);
                articleUrl.searchParams.set('itemId', itemId);
                articleUrl.searchParams.set('mapKey', '');
                articleUrl.searchParams.set('lgeo', itemId);
                articleUrl.searchParams.set('showR0', '');
                articleUrl.searchParams.set('rletTpCd', 'SG');
                articleUrl.searchParams.set('tradTpCd', 'A1:B1:B2');
                articleUrl.searchParams.set('z', String(clusterZoom));
                articleUrl.searchParams.set('lat', String(clusterLat));
                articleUrl.searchParams.set('lon', String(clusterLon));
                articleUrl.searchParams.set('totCnt', String(totalCount));
                articleUrl.searchParams.set('cortarNo', selectedRegion.CortarNo);
                articleUrl.searchParams.set('page', String(page));
                sourceUrl = articleUrl.toString();

                const articlePayload = await fetchNaverJsonWithTimeout<{
                    body?: NaverArticle[];
                    code?: string;
                } | NaverArticle[] | null>(articleUrl.toString());
                const pageArticles = Array.isArray(articlePayload)
                    ? articlePayload
                    : Array.isArray(articlePayload?.body)
                        ? articlePayload.body
                        : [];
                articles.push(...pageArticles);
            }
        }
    } catch (error) {
        warnings.push(`네이버부동산 서버 수집 제한으로 목록을 가져오지 못했습니다: ${error instanceof Error ? error.message : 'unknown error'}`);
    }

    if (articles.length === 0) {
        warnings.push('네이버부동산은 공식 API가 아니라 서버 호출에서 빈 응답/제한이 발생할 수 있습니다. 현재 상가 수집은 당근 상가 소스를 기본으로 사용해주세요.');
    }

    return {
        source: 'naver_land',
        listings: articles
            .map(article => mapNaverListing(article, cleanString(selectedRegion.CortarNm) || region))
            .filter((listing): listing is RealtyListing => Boolean(listing))
            .slice(0, normalizedLimit),
        warnings,
        sourceUrl
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
