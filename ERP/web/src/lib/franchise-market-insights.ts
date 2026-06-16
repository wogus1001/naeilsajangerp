import { normalizeLeadLocationLinks } from './franchise-lead-location-links';

export type MarketInsightLead = {
    readonly desiredRegion?: string;
    readonly grade?: string;
    readonly status?: string;
    readonly source?: string;
    readonly budgetMin?: number | null;
    readonly budgetMax?: number | null;
    readonly locationLinks?: unknown;
};

export type LocationInsightProperty = {
    readonly id: string;
    readonly name?: string;
    readonly region?: string;
    readonly address?: string;
    readonly status?: string;
    readonly locationType?: string;
    readonly operationType?: string;
    readonly type?: string;
    readonly coordinates?: {
        readonly lat?: number | string;
        readonly lng?: number | string;
    };
    readonly lat?: number | string;
    readonly lng?: number | string;
    readonly externalCompetitorCount?: number;
};

export type MarketInsight = {
    readonly region: string;
    readonly leadCount: number;
    readonly hotCount: number;
    readonly contractCount: number;
    readonly propertyCount: number;
    readonly linkedLeadCount: number;
    readonly matchingNeededCount: number;
    readonly externalCompetitorCount: number;
    readonly sourceCount: number;
    readonly avgBudgetManwon: number | null;
    readonly marketingScore: number;
    readonly competitionScore: number;
    readonly opportunityScore: number;
    readonly action: string;
    readonly tone: 'good' | 'warning' | 'neutral';
};

const REGION_ALIAS_MAP: Record<string, string> = {
    서울특별시: '서울',
    서울시: '서울',
    부산광역시: '부산',
    대구광역시: '대구',
    인천광역시: '인천',
    광주광역시: '광주',
    대전광역시: '대전',
    울산광역시: '울산',
    세종특별자치시: '세종',
    경기도: '경기',
    강원특별자치도: '강원',
    강원도: '강원',
    충청북도: '충북',
    충청남도: '충남',
    전라북도: '전북',
    전북특별자치도: '전북',
    전라남도: '전남',
    경상북도: '경북',
    경상남도: '경남',
    제주특별자치도: '제주'
};

type RegionBucket = {
    leadCount: number;
    hotCount: number;
    contractCount: number;
    propertyCount: number;
    linkedLeadCount: number;
    matchingNeededCount: number;
    externalCompetitorCount: number;
    budgetTotal: number;
    budgetCount: number;
    sources: Set<string>;
    locationIds: Set<string>;
};

function clampScore(value: number) {
    return Math.max(0, Math.min(100, Math.round(value)));
}

export function normalizeRegion(value?: string | null) {
    const raw = String(value || '').replace(/\s+/g, ' ').trim();
    if (!raw) return '지역 미지정';

    const tokens = raw.split(' ').filter(Boolean);
    const normalizedTokens = tokens.map((token, index) => {
        if (index === 0) return REGION_ALIAS_MAP[token] || token;
        return token;
    });

    if (normalizedTokens.length >= 2) {
        return `${normalizedTokens[0]} ${normalizedTokens[1]}`;
    }
    return normalizedTokens[0] || '지역 미지정';
}

export function toBudgetManwonValue(value: number | null | undefined) {
    if (value === null || value === undefined) return null;
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return null;
    if (Math.abs(numericValue) > 0 && Math.abs(numericValue) < 1_000_000) {
        return Math.round(numericValue);
    }
    return Math.round(numericValue / 10_000);
}

function createBucket(): RegionBucket {
    return {
        leadCount: 0,
        hotCount: 0,
        contractCount: 0,
        propertyCount: 0,
        linkedLeadCount: 0,
        matchingNeededCount: 0,
        externalCompetitorCount: 0,
        budgetTotal: 0,
        budgetCount: 0,
        sources: new Set<string>(),
        locationIds: new Set<string>()
    };
}

function getPropertyRegion(property: LocationInsightProperty) {
    return normalizeRegion(property.region || property.address || '');
}

function getLeadBudgetMidpointManwon(lead: MarketInsightLead) {
    const min = toBudgetManwonValue(lead.budgetMin);
    const max = toBudgetManwonValue(lead.budgetMax);
    if (min !== null && max !== null) return Math.round((min + max) / 2);
    return min ?? max;
}

function splitLeadRegions(value: string | null | undefined): readonly string[] {
    const regions = String(value || '')
        .split(/[,/|]+/)
        .map(item => normalizeRegion(item))
        .filter(region => region !== '지역 미지정');
    return regions.length > 0 ? Array.from(new Set(regions)) : ['지역 미지정'];
}

function isSitePlanningLocation(property: LocationInsightProperty): boolean {
    return property.locationType === '예정점' || property.status === '검토중' || property.status === '오픈준비';
}

function hasLinkedRegionLocation(lead: MarketInsightLead, locationIds: ReadonlySet<string>): boolean {
    return normalizeLeadLocationLinks(lead.locationLinks).some(link => (
        link.targetType === 'franchise_location' && locationIds.has(link.targetId)
    ));
}

export function buildMarketInsights(
    leads: readonly MarketInsightLead[],
    properties: readonly LocationInsightProperty[]
): MarketInsight[] {
    const regions = new Map<string, RegionBucket>();
    const getRegionBucket = (region: string) => {
        const key = region || '지역 미지정';
        const existing = regions.get(key);
        if (existing) return existing;
        const nextBucket = createBucket();
        regions.set(key, nextBucket);
        return nextBucket;
    };

    properties.filter(isSitePlanningLocation).forEach(property => {
        const region = getPropertyRegion(property);
        if (region === '지역 미지정') return;
        const bucket = getRegionBucket(region);
        bucket.propertyCount += 1;
        bucket.locationIds.add(property.id);
        bucket.externalCompetitorCount += Math.max(0, Number(property.externalCompetitorCount || 0));
    });

    leads.forEach(lead => {
        const leadRegions = splitLeadRegions(lead.desiredRegion);
        leadRegions.forEach(region => {
            const bucket = getRegionBucket(region);
            const isLinked = hasLinkedRegionLocation(lead, bucket.locationIds);

            bucket.leadCount += 1;
            if (lead.grade === 'HOT') bucket.hotCount += 1;
            if (lead.status === '계약예정' || lead.status === '계약완료') bucket.contractCount += 1;
            if (lead.source) bucket.sources.add(lead.source);
            if (isLinked) bucket.linkedLeadCount += 1;
            if (!isLinked) bucket.matchingNeededCount += 1;

            const budget = getLeadBudgetMidpointManwon(lead);
            if (budget !== null) {
                bucket.budgetTotal += budget;
                bucket.budgetCount += 1;
            }
        });
    });

    return Array.from(regions.entries())
        .map(([region, bucket]) => {
            const avgBudgetManwon = bucket.budgetCount > 0
                ? Math.round(bucket.budgetTotal / bucket.budgetCount)
                : null;
            const marketingScore = clampScore(
                bucket.leadCount * 10 +
                bucket.hotCount * 14 +
                bucket.contractCount * 18 +
                bucket.sources.size * 5
            );
            const competitionScore = clampScore(bucket.propertyCount * 16);
            const budgetSignal = avgBudgetManwon ? Math.min(18, avgBudgetManwon / 1200) : 0;
            const opportunityScore = clampScore(
                bucket.matchingNeededCount * 16 +
                bucket.leadCount * 8 +
                bucket.propertyCount * 6 +
                budgetSignal
            );
            const tone: MarketInsight['tone'] = bucket.matchingNeededCount > 0 ? 'warning' : 'good';

            return {
                region,
                leadCount: bucket.leadCount,
                hotCount: bucket.hotCount,
                contractCount: bucket.contractCount,
                propertyCount: bucket.propertyCount,
                linkedLeadCount: bucket.linkedLeadCount,
                matchingNeededCount: bucket.matchingNeededCount,
                externalCompetitorCount: bucket.externalCompetitorCount,
                sourceCount: bucket.sources.size,
                avgBudgetManwon,
                marketingScore,
                competitionScore,
                opportunityScore,
                action: bucket.matchingNeededCount > 0 ? '후보지 매칭 필요' : '후보지 연결 완료',
                tone
            };
        })
        .sort((a, b) => (
            b.matchingNeededCount - a.matchingNeededCount ||
            b.leadCount - a.leadCount ||
            b.propertyCount - a.propertyCount
        ));
}
