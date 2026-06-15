export type MarketInsightLead = {
    desiredRegion?: string;
    grade?: string;
    status?: string;
    source?: string;
    budgetMin?: number | null;
    budgetMax?: number | null;
};

export type LocationInsightProperty = {
    id: string;
    name?: string;
    region?: string;
    address?: string;
    status?: string;
    locationType?: string;
    operationType?: string;
    type?: string;
    coordinates?: {
        lat?: number | string;
        lng?: number | string;
    };
    lat?: number | string;
    lng?: number | string;
    externalCompetitorCount?: number;
};

export type MarketInsight = {
    region: string;
    leadCount: number;
    hotCount: number;
    contractCount: number;
    propertyCount: number;
    externalCompetitorCount: number;
    sourceCount: number;
    avgBudgetManwon: number | null;
    marketingScore: number;
    competitionScore: number;
    opportunityScore: number;
    action: string;
    tone: 'good' | 'warning' | 'neutral';
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

function getPropertyRegion(property: LocationInsightProperty) {
    return normalizeRegion(property.region || property.address || '');
}

function getLeadBudgetMidpointManwon(lead: MarketInsightLead) {
    const min = toBudgetManwonValue(lead.budgetMin);
    const max = toBudgetManwonValue(lead.budgetMax);
    if (min !== null && max !== null) return Math.round((min + max) / 2);
    return min ?? max;
}

export function buildMarketInsights(leads: MarketInsightLead[], properties: LocationInsightProperty[]): MarketInsight[] {
    const regions = new Map<string, {
        leadCount: number;
        hotCount: number;
        contractCount: number;
        propertyCount: number;
        externalCompetitorCount: number;
        budgetTotal: number;
        budgetCount: number;
        sources: Set<string>;
    }>();

    const getRegionBucket = (region: string) => {
        const key = region || '지역 미지정';
        if (!regions.has(key)) {
            regions.set(key, {
                leadCount: 0,
                hotCount: 0,
                contractCount: 0,
                propertyCount: 0,
                externalCompetitorCount: 0,
                budgetTotal: 0,
                budgetCount: 0,
                sources: new Set()
            });
        }
        return regions.get(key)!;
    };

    leads.forEach(lead => {
        const bucket = getRegionBucket(normalizeRegion(lead.desiredRegion));
        bucket.leadCount += 1;
        if (lead.grade === 'HOT') bucket.hotCount += 1;
        if (lead.status === '계약예정' || lead.status === '계약완료') bucket.contractCount += 1;
        if (lead.source) bucket.sources.add(lead.source);

        const budget = getLeadBudgetMidpointManwon(lead);
        if (budget !== null) {
            bucket.budgetTotal += budget;
            bucket.budgetCount += 1;
        }
    });

    properties.forEach(property => {
        const region = getPropertyRegion(property);
        if (region === '지역 미지정') return;
        const bucket = getRegionBucket(region);
        bucket.propertyCount += 1;
        bucket.externalCompetitorCount += Math.max(0, Number(property.externalCompetitorCount || 0));
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
            const competitionScore = clampScore(bucket.propertyCount * 16 + bucket.externalCompetitorCount * 5);
            const budgetSignal = avgBudgetManwon ? Math.min(18, avgBudgetManwon / 1200) : 0;
            const opportunityScore = clampScore(marketingScore - competitionScore * 0.45 + budgetSignal);

            let action = '테스트 캠페인 권장';
            let tone: MarketInsight['tone'] = 'neutral';
            if (bucket.leadCount === 0) {
                action = '리드 누적 필요';
            } else if (competitionScore >= 70 && marketingScore >= 60) {
                action = '경쟁 높음: 차별화 필요';
                tone = 'warning';
            } else if (competitionScore >= 70) {
                action = '광고비 보수적 운영';
                tone = 'warning';
            } else if (marketingScore >= 70 && competitionScore < 45) {
                action = '우선 출점/광고 확대';
                tone = 'good';
            } else if (marketingScore >= 50) {
                action = '상담 집중 지역';
                tone = 'good';
            }

            return {
                region,
                leadCount: bucket.leadCount,
                hotCount: bucket.hotCount,
                contractCount: bucket.contractCount,
                propertyCount: bucket.propertyCount,
                externalCompetitorCount: bucket.externalCompetitorCount,
                sourceCount: bucket.sources.size,
                avgBudgetManwon,
                marketingScore,
                competitionScore,
                opportunityScore,
                action,
                tone
            };
        })
        .sort((a, b) => b.opportunityScore - a.opportunityScore || b.leadCount - a.leadCount)
        .slice(0, 8);
}
