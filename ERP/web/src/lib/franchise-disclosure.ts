import { mergeRecommendedKeywords, normalizeBrandName } from '@/lib/franchise-brands';
import type { FranchiseBrand } from '@/lib/franchise-brands';

const OFFICIAL_BRAND_LIST_API_URL = 'https://apis.data.go.kr/1130000/FftcBrandRlsInfo2_Service/getBrandinfo';
const DEFAULT_DISCLOSURE_PAGE_SIZE = 1000;
const DEFAULT_DISCLOSURE_MAX_PAGES = 12;
const DEFAULT_DISCLOSURE_CACHE_TTL_MS = 1000 * 60 * 60 * 6;
const DEFAULT_DISCLOSURE_CONCURRENCY = 4;

type OfficialRowsCacheEntry = {
    expiresAt: number;
    promise: Promise<Record<string, unknown>[]>;
};

const officialRowsCache = new Map<string, OfficialRowsCacheEntry>();

function cleanString(value: unknown): string {
    return String(value || '').replace(/\s+/g, ' ').trim();
}

function getPublicDataServiceKey() {
    return process.env.FRANCHISE_DISCLOSURE_SERVICE_KEY ||
        process.env.DATA_GO_KR_SERVICE_KEY ||
        process.env.DATA_GO_KR_DECODING_KEY ||
        process.env.PUBLIC_DATA_API_KEY ||
        process.env.PUBLIC_DATA_SERVICE_KEY ||
        '';
}

function getDisclosureApiUrl() {
    return process.env.FRANCHISE_DISCLOSURE_API_URL || OFFICIAL_BRAND_LIST_API_URL;
}

function getDisclosureBaseYearCandidates() {
    const configured = cleanString(process.env.FRANCHISE_DISCLOSURE_BASE_YEAR || process.env.FRANCHISE_DISCLOSURE_YEAR);
    const currentYear = new Date().getFullYear();
    return Array.from(new Set([
        configured,
        String(currentYear - 2),
        String(currentYear - 1),
        String(currentYear - 3),
        '2024',
        '2023'
    ].filter(Boolean)));
}

function getDisclosurePageSize() {
    const configured = Number(process.env.FRANCHISE_DISCLOSURE_PAGE_SIZE);
    if (Number.isFinite(configured) && configured > 0) return Math.min(1000, configured);
    return DEFAULT_DISCLOSURE_PAGE_SIZE;
}

function getDisclosureMaxPages() {
    const configured = Number(process.env.FRANCHISE_DISCLOSURE_MAX_PAGES);
    if (Number.isFinite(configured) && configured > 0) return Math.min(50, configured);
    return DEFAULT_DISCLOSURE_MAX_PAGES;
}

function getDisclosureConcurrency() {
    const configured = Number(process.env.FRANCHISE_DISCLOSURE_CONCURRENCY);
    if (Number.isFinite(configured) && configured > 0) return Math.min(8, configured);
    return DEFAULT_DISCLOSURE_CONCURRENCY;
}

function getDisclosureCacheTtlMs() {
    const configuredSeconds = Number(process.env.FRANCHISE_DISCLOSURE_CACHE_TTL_SECONDS);
    if (Number.isFinite(configuredSeconds) && configuredSeconds > 0) return configuredSeconds * 1000;
    return DEFAULT_DISCLOSURE_CACHE_TTL_MS;
}

function normalizeServiceKey(serviceKey: string) {
    try {
        return serviceKey.includes('%') ? decodeURIComponent(serviceKey) : serviceKey;
    } catch {
        return serviceKey;
    }
}

function getField(row: Record<string, unknown>, keys: string[]) {
    const found = keys.find(key => row[key] !== undefined && row[key] !== null && cleanString(row[key]));
    return found ? cleanString(row[found]) : '';
}

function normalizeDisclosureRows(payload: any): Record<string, unknown>[] {
    const candidates = [
        payload?.response?.body?.items?.item,
        payload?.response?.body?.items,
        payload?.body?.items?.item,
        payload?.body?.items,
        payload?.items?.item,
        payload?.items,
        payload?.data,
        payload?.result,
        payload
    ];

    const target = candidates.find(item => Array.isArray(item) || (item && typeof item === 'object'));
    if (Array.isArray(target)) return target.filter(item => item && typeof item === 'object');
    if (target && typeof target === 'object') return [target];
    return [];
}

function mapDisclosureRow(row: Record<string, unknown>): FranchiseBrand | null {
    const brandName = normalizeBrandName(getField(row, [
        'brandName',
        'brandNm',
        'brdNm',
        'bizesNm',
        'jngBizNm',
        'frcsBrdNm',
        'mrhstBrandNm',
        'brand_nm',
        '상호',
        '브랜드',
        '브랜드명'
    ]));
    if (!brandName) return null;

    const industry = getField(row, ['industry', 'indutyNm', 'indutyName', 'indutyMlsfcNm', 'majrGdsNm', '업종', '업종명']);
    const businessType = getField(row, ['businessType', 'bizType', '업태', '업태명']);
    const categoryMajor = getField(row, ['categoryMajor', 'lclasNm', 'indutyLclasNm', 'largeCategory', '대분류']);
    const categoryMiddle = getField(row, ['categoryMiddle', 'mlsfcNm', 'indutyMlsfcNm', 'middleCategory', '중분류']);
    const categorySmall = getField(row, ['categorySmall', 'sclasNm', 'smallCategory', '소분류']);
    const disclosureBrandId = getField(row, ['disclosureBrandId', 'docId', 'brandId', 'brandMnno', 'brdNo', '정보공개서ID']);

    return {
        id: `disclosure-${disclosureBrandId || brandName}`,
        companyId: null,
        brandName,
        franchisorName: getField(row, ['franchisorName', 'corpNm', 'jnghdqrtrsRprsvNm', 'hdqrtrsNm', 'entrprsNm', '가맹본부', '상호명']),
        disclosureBrandId,
        industry,
        businessType,
        categoryMajor,
        categoryMiddle,
        categorySmall,
        recommendedKeywords: mergeRecommendedKeywords(null, {
            brandName,
            industry,
            businessType,
            categoryMajor,
            categoryMiddle,
            categorySmall
        }),
        source: 'disclosure-api',
        isSaved: false,
        data: { raw: row }
    };
}

function rowMatchesSearch(row: Record<string, unknown>, search: string) {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return true;

    return [
        'brandName',
        'brandNm',
        'corpNm',
        'jnghdqrtrsRprsvNm',
        'indutyLclasNm',
        'indutyMlsfcNm',
        'majrGdsNm'
    ].some(key => cleanString(row[key]).toLowerCase().includes(normalizedSearch));
}

function getTotalCount(payload: any, fallback: number) {
    const value = payload?.response?.body?.totalCount || payload?.body?.totalCount || payload?.totalCount;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function assertSuccessfulPayload(payload: any) {
    const resultCode = cleanString(payload?.response?.header?.resultCode || payload?.resultCode);
    const resultMsg = cleanString(payload?.response?.header?.resultMsg || payload?.resultMsg);
    if (resultCode && !['00', '0', 'NORMAL_CODE'].includes(resultCode)) {
        throw new Error(resultMsg || `Disclosure API returned ${resultCode}`);
    }
}

async function fetchJson(url: URL) {
    const response = await fetch(url.toString(), {
        cache: 'no-store',
        headers: {
            Accept: 'application/json'
        }
    });
    const text = await response.text();
    if (!response.ok) {
        throw new Error(text || 'Disclosure API request failed');
    }

    try {
        return JSON.parse(text);
    } catch {
        throw new Error(text.includes('<') ? 'Disclosure API returned XML/error response' : 'Disclosure API returned non-JSON response');
    }
}

function buildOfficialBrandUrl(year: string, pageNo: number, pageSize: number, serviceKey: string) {
    const url = new URL(OFFICIAL_BRAND_LIST_API_URL);
    url.searchParams.set('serviceKey', normalizeServiceKey(serviceKey));
    url.searchParams.set('pageNo', String(pageNo));
    url.searchParams.set('numOfRows', String(pageSize));
    url.searchParams.set('resultType', 'json');
    url.searchParams.set('jngBizCrtraYr', year);
    return url;
}

async function fetchOfficialBrandPage(year: string, pageNo: number, pageSize: number, serviceKey: string) {
    const payload = await fetchJson(buildOfficialBrandUrl(year, pageNo, pageSize, serviceKey));
    assertSuccessfulPayload(payload);
    return {
        rows: normalizeDisclosureRows(payload),
        totalCount: getTotalCount(payload, 0)
    };
}

async function mapWithConcurrency<T, R>(items: T[], concurrency: number, worker: (item: T) => Promise<R>) {
    const results: R[] = [];
    for (let index = 0; index < items.length; index += concurrency) {
        const chunk = items.slice(index, index + concurrency);
        results.push(...await Promise.all(chunk.map(worker)));
    }
    return results;
}

async function loadOfficialRowsForYear(year: string, pageSize: number, maxPages: number, serviceKey: string) {
    const firstPage = await fetchOfficialBrandPage(year, 1, pageSize, serviceKey);
    const totalPages = Math.min(maxPages, Math.max(1, Math.ceil(firstPage.totalCount / pageSize)));
    const pageNumbers = Array.from({ length: Math.max(0, totalPages - 1) }, (_, index) => index + 2);
    const remainingPages = await mapWithConcurrency(
        pageNumbers,
        getDisclosureConcurrency(),
        (pageNo) => fetchOfficialBrandPage(year, pageNo, pageSize, serviceKey)
    );

    return [firstPage, ...remainingPages].flatMap(page => page.rows);
}

function getOfficialRowsForYear(year: string, pageSize: number, maxPages: number, serviceKey: string) {
    const cacheKey = `${year}:${pageSize}:${maxPages}`;
    const cached = officialRowsCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.promise;

    const promise = loadOfficialRowsForYear(year, pageSize, maxPages, serviceKey)
        .catch((error) => {
            officialRowsCache.delete(cacheKey);
            throw error;
        });
    officialRowsCache.set(cacheKey, {
        expiresAt: Date.now() + getDisclosureCacheTtlMs(),
        promise
    });
    return promise;
}

async function fetchOfficialBrandRows(search: string, limit: number, serviceKey: string) {
    const pageSize = getDisclosurePageSize();
    const maxPages = getDisclosureMaxPages();

    for (const year of getDisclosureBaseYearCandidates()) {
        const yearRows = await getOfficialRowsForYear(year, pageSize, maxPages, serviceKey);
        const matchedRows = yearRows.filter(row => rowMatchesSearch(row, search)).slice(0, limit);

        if (matchedRows.length > 0) return matchedRows;
    }

    return [];
}

async function fetchCustomDisclosureRows(search: string, limit: number, serviceKey: string, apiUrl: string) {
    const url = new URL(apiUrl);
    url.searchParams.set('serviceKey', normalizeServiceKey(serviceKey));
    url.searchParams.set('pageNo', '1');
    url.searchParams.set('numOfRows', String(limit));
    url.searchParams.set('type', 'json');
    url.searchParams.set('resultType', 'json');

    const normalizedSearch = cleanString(search);
    if (normalizedSearch) {
        url.searchParams.set('brandName', normalizedSearch);
        url.searchParams.set('brandNm', normalizedSearch);
    }

    const payload = await fetchJson(url);
    assertSuccessfulPayload(payload);
    return normalizeDisclosureRows(payload);
}

export function getDisclosureConfigState() {
    const apiUrl = getDisclosureApiUrl();
    const serviceKey = getPublicDataServiceKey();
    return {
        disclosureApiConfigured: Boolean(apiUrl && serviceKey),
        disclosureProvider: apiUrl === OFFICIAL_BRAND_LIST_API_URL ? 'data-go-kr-brand-list' : 'custom',
        disclosureBaseYears: getDisclosureBaseYearCandidates(),
        disclosurePageSize: getDisclosurePageSize(),
        disclosureMaxPages: getDisclosureMaxPages(),
        disclosureConcurrency: getDisclosureConcurrency(),
        disclosureCacheTtlSeconds: Math.round(getDisclosureCacheTtlMs() / 1000)
    };
}

export async function fetchDisclosureBrands(search: string, limit: number): Promise<FranchiseBrand[]> {
    const apiUrl = getDisclosureApiUrl();
    const serviceKey = getPublicDataServiceKey();
    if (!apiUrl || !serviceKey) {
        throw new Error('DATA_GO_KR_SERVICE_KEY or FRANCHISE_DISCLOSURE_SERVICE_KEY is required');
    }

    const rows = apiUrl === OFFICIAL_BRAND_LIST_API_URL
        ? await fetchOfficialBrandRows(search, limit, serviceKey)
        : await fetchCustomDisclosureRows(search, limit, serviceKey, apiUrl);

    return rows
        .map(mapDisclosureRow)
        .filter(Boolean)
        .slice(0, limit) as FranchiseBrand[];
}
