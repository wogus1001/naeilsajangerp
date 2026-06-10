export type NaverLocalTopItem = {
    rank: number;
    title: string;
    category: string;
    address: string;
    roadAddress: string;
    telephone: string;
    link: string;
    mapx: string;
    mapy: string;
};

export type RiskMention = {
    keyword: string;
    blogTotal: number;
    newsTotal: number;
    error?: string;
    samples: Array<{
        source: 'blog' | 'news';
        title: string;
        link: string;
        description: string;
        date?: string;
    }>;
};

export type SerpResult = {
    rank: number;
    title: string;
    link: string;
    address: string;
    category: string;
    rating: number | null;
    reviewCount: number | null;
    blogReviewCount: number | null;
    raw?: Record<string, unknown>;
};

type NaverSearchResponse = {
    total?: number;
    items?: Array<Record<string, unknown>>;
};

type NaverTrendResponse = {
    results?: Array<{
        data?: Array<{
            period?: string;
            ratio?: number;
        }>;
    }>;
};

export function stripHtml(value: unknown) {
    return String(value || '')
        .replace(/<[^>]*>/g, '')
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ')
        .trim();
}

export function normalizeSearchText(value: unknown) {
    return stripHtml(value)
        .toLowerCase()
        .replace(/[\s()[\]{}·.,'"`~!@#$%^&*_+=|\\/:;?-]/g, '');
}

export function buildMonitoringQuery(region: string, keyword: string, brandName?: string) {
    return [region, keyword || brandName].map(value => String(value || '').trim()).filter(Boolean).join(' ');
}

function getNaverConfig() {
    return {
        clientId: process.env.NAVER_CLIENT_ID || '',
        clientSecret: process.env.NAVER_CLIENT_SECRET || ''
    };
}

export function getMarketMonitoringConfigState() {
    return {
        naverConfigured: Boolean(process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET),
        searchApiConfigured: Boolean(process.env.SEARCHAPI_API_KEY),
        serpApiConfigured: Boolean(process.env.SERPAPI_API_KEY),
        preferredSerpProvider: process.env.SERP_PROVIDER || ''
    };
}

function formatDate(date: Date) {
    return date.toISOString().slice(0, 10);
}

function toNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    const parsed = Number(String(value).replace(/[^\d.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
}

async function naverSearch(path: 'blog' | 'news' | 'local', query: string, display = 5) {
    const config = getNaverConfig();
    if (!config.clientId || !config.clientSecret) {
        throw new Error('Naver API credentials are not configured');
    }

    const params = new URLSearchParams({
        query,
        display: String(display),
        start: '1',
        sort: path === 'local' ? 'random' : 'sim'
    });

    const response = await fetch(`https://openapi.naver.com/v1/search/${path}.json?${params.toString()}`, {
        headers: {
            'X-Naver-Client-Id': config.clientId,
            'X-Naver-Client-Secret': config.clientSecret
        },
        cache: 'no-store'
    });

    if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Naver ${path} request failed: ${response.status} ${text}`);
    }

    return response.json() as Promise<NaverSearchResponse>;
}

async function naverTrend(query: string) {
    const config = getNaverConfig();
    if (!config.clientId || !config.clientSecret) {
        throw new Error('Naver API credentials are not configured');
    }

    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - 30);

    const response = await fetch('https://openapi.naver.com/v1/datalab/search', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Naver-Client-Id': config.clientId,
            'X-Naver-Client-Secret': config.clientSecret
        },
        body: JSON.stringify({
            startDate: formatDate(start),
            endDate: formatDate(end),
            timeUnit: 'date',
            keywordGroups: [
                {
                    groupName: query,
                    keywords: [query]
                }
            ]
        }),
        cache: 'no-store'
    });

    if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Naver DataLab request failed: ${response.status} ${text}`);
    }

    const payload = await response.json() as NaverTrendResponse;
    const data = payload.results?.[0]?.data || [];
    const first = data[0]?.ratio ?? null;
    const latest = data[data.length - 1]?.ratio ?? null;
    const previous = data[data.length - 2]?.ratio ?? first;

    return {
        latest,
        delta: latest !== null && previous !== null ? Number((latest - previous).toFixed(2)) : null,
        first,
        points: data.slice(-14)
    };
}

function mapNaverLocalItem(item: Record<string, unknown>, index: number): NaverLocalTopItem {
    return {
        rank: index + 1,
        title: stripHtml(item.title),
        category: stripHtml(item.category),
        address: stripHtml(item.address),
        roadAddress: stripHtml(item.roadAddress),
        telephone: stripHtml(item.telephone),
        link: stripHtml(item.link),
        mapx: String(item.mapx || ''),
        mapy: String(item.mapy || '')
    };
}

async function collectRiskMention(queryBase: string, keyword: string): Promise<RiskMention> {
    const query = `${queryBase} ${keyword}`.trim();
    const [blog, news] = await Promise.all([
        naverSearch('blog', query, 3),
        naverSearch('news', query, 3)
    ]);

    const samples = [
        ...(blog.items || []).map(item => ({
            source: 'blog' as const,
            title: stripHtml(item.title),
            link: stripHtml(item.link),
            description: stripHtml(item.description),
            date: stripHtml(item.postdate)
        })),
        ...(news.items || []).map(item => ({
            source: 'news' as const,
            title: stripHtml(item.title),
            link: stripHtml(item.link),
            description: stripHtml(item.description),
            date: stripHtml(item.pubDate)
        }))
    ].slice(0, 5);

    return {
        keyword,
        blogTotal: Number(blog.total || 0),
        newsTotal: Number(news.total || 0),
        samples
    };
}

export async function collectNaverOfficialSnapshot(input: {
    brandName: string;
    region: string;
    keyword: string;
    riskKeywords?: string[];
}) {
    const warnings: string[] = [];
    const query = buildMonitoringQuery(input.region, input.keyword, input.brandName);

    if (!getMarketMonitoringConfigState().naverConfigured) {
        return {
            enabled: false,
            query,
            blogTotal: 0,
            newsTotal: 0,
            trendLatest: null,
            trendDelta: null,
            localTop5: [] as NaverLocalTopItem[],
            riskMentions: [] as RiskMention[],
            warnings: ['NAVER_CLIENT_ID/NAVER_CLIENT_SECRET 미설정']
        };
    }

    const [blog, news, local] = await Promise.all([
        naverSearch('blog', query, 5),
        naverSearch('news', query, 5),
        naverSearch('local', query, 5)
    ]);

    let trendLatest: number | null = null;
    let trendDelta: number | null = null;
    let trendPoints: unknown[] = [];
    try {
        const trend = await naverTrend(query);
        trendLatest = trend.latest;
        trendDelta = trend.delta;
        trendPoints = trend.points;
    } catch (error) {
        warnings.push(error instanceof Error ? error.message : 'Naver DataLab 조회 실패');
    }

    const riskBase = input.brandName || query;
    const riskKeywords = (input.riskKeywords || [])
        .map(keyword => keyword.trim())
        .filter(Boolean)
        .slice(0, 8);
    const riskMentions = await Promise.all(
        riskKeywords.map(keyword => collectRiskMention(riskBase, keyword).catch((error): RiskMention => ({
            keyword,
            blogTotal: 0,
            newsTotal: 0,
            samples: [],
            error: error instanceof Error ? error.message : '위험 키워드 조회 실패'
        })))
    );

    return {
        enabled: true,
        query,
        blogTotal: Number(blog.total || 0),
        newsTotal: Number(news.total || 0),
        trendLatest,
        trendDelta,
        trendPoints,
        localTop5: (local.items || []).slice(0, 5).map(mapNaverLocalItem),
        riskMentions,
        warnings
    };
}

function pickSerpProvider(provider?: string | null) {
    const preferred = (provider || process.env.SERP_PROVIDER || '').toLowerCase();
    if ((preferred === 'searchapi' || preferred === 'searchapi.io') && process.env.SEARCHAPI_API_KEY) return 'searchapi';
    if ((preferred === 'serpapi' || preferred === 'serpapi.io') && process.env.SERPAPI_API_KEY) return 'serpapi';
    if (process.env.SEARCHAPI_API_KEY) return 'searchapi';
    if (process.env.SERPAPI_API_KEY) return 'serpapi';
    return '';
}

function findArrayCandidates(payload: Record<string, unknown>) {
    const keys = [
        'place_results',
        'places_results',
        'local_results',
        'organic_results',
        'results',
        'shopping_results',
        'web_results'
    ];
    const arrays: Array<Record<string, unknown>[]> = [];
    keys.forEach(key => {
        const value = payload[key];
        if (Array.isArray(value)) arrays.push(value.filter(item => item && typeof item === 'object') as Record<string, unknown>[]);
    });

    const knowledgeGraph = payload.knowledge_graph;
    const knowledgeGraphItems = knowledgeGraph && typeof knowledgeGraph === 'object'
        ? [knowledgeGraph as Record<string, unknown>]
        : [];

    return [...knowledgeGraphItems, ...arrays.flat()];
}

function normalizeSerpItem(item: Record<string, unknown>, index: number): SerpResult {
    const title = stripHtml(item.title || item.name || item.place_name || item.displayed_title);
    const address = stripHtml(item.address || item.road_address || item.location || item.displayed_address);
    const reviewCount = toNumber(item.review_count || item.reviews || item.visitor_reviews || item.visitor_review_count || item.user_review_count);
    const blogReviewCount = toNumber(item.blog_review_count || item.blog_reviews || item.blog_post_count || item.blog_reviews_count);

    return {
        rank: toNumber(item.position || item.rank) || index + 1,
        title,
        link: stripHtml(item.link || item.url || item.place_url || item.directions || item.reservation),
        address,
        category: stripHtml(item.category || item.type || item.subtitle || item.description),
        rating: toNumber(item.rating || item.score),
        reviewCount,
        blogReviewCount,
        raw: item
    };
}

export async function collectSerpSnapshot(input: {
    query: string;
    ownStoreName?: string | null;
    provider?: string | null;
}) {
    const provider = pickSerpProvider(input.provider);
    if (!provider) {
        return {
            enabled: false,
            provider: '',
            query: input.query,
            results: [] as SerpResult[],
            ownStoreRank: null as number | null,
            ownStoreVisible: false,
            warnings: ['SEARCHAPI_API_KEY 또는 SERPAPI_API_KEY 미설정']
        };
    }

    const params = new URLSearchParams({ engine: 'naver' });
    params.set(provider === 'searchapi' ? 'q' : 'query', input.query);
    if (provider === 'searchapi') params.set('api_key', process.env.SEARCHAPI_API_KEY || '');
    if (provider === 'serpapi') params.set('api_key', process.env.SERPAPI_API_KEY || '');

    const endpoint = provider === 'searchapi'
        ? `https://www.searchapi.io/api/v1/search?${params.toString()}`
        : `https://serpapi.com/search.json?${params.toString()}`;

    const response = await fetch(endpoint, { cache: 'no-store' });
    if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`${provider} request failed: ${response.status} ${text}`);
    }

    const payload = await response.json() as Record<string, unknown>;
    const results = findArrayCandidates(payload)
        .slice(0, 10)
        .map(normalizeSerpItem)
        .filter(result => result.title);
    const ownNeedle = normalizeSearchText(input.ownStoreName || '');
    const ownMatch = ownNeedle
        ? results.find(result => normalizeSearchText(`${result.title} ${result.address}`).includes(ownNeedle))
        : null;

    return {
        enabled: true,
        provider,
        query: input.query,
        results,
        ownStoreRank: ownMatch?.rank ?? null,
        ownStoreVisible: Boolean(ownMatch),
        warnings: [] as string[],
        rawKeys: Object.keys(payload).slice(0, 20)
    };
}
