import { normalizeRegion } from './franchise-market-insights';
import type { LeadFitLevel } from './franchise-lead-workflow';

export type LeadLocationMatchLead = {
    readonly desiredRegion?: string | null;
    readonly interestedBrand?: string | null;
    readonly budgetFit?: LeadFitLevel | null;
    readonly regionFit?: LeadFitLevel | null;
    readonly brandFit?: LeadFitLevel | null;
};

export type LeadLocationMatchLocation = {
    readonly id: string;
    readonly name: string;
    readonly locationType?: string | null;
    readonly brand?: string | null;
    readonly status?: string | null;
    readonly region?: string | null;
    readonly address?: string | null;
    readonly memo?: string | null;
    readonly competitionScan?: {
        readonly totalCount?: number | null;
        readonly competitors?: readonly unknown[] | null;
    } | null;
};

export type LeadLocationMatch = {
    readonly location: LeadLocationMatchLocation;
    readonly score: number;
    readonly reasons: readonly string[];
    readonly risks: readonly string[];
};

function normalizeText(value?: string | null) {
    return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function getCompetitionCount(location: LeadLocationMatchLocation) {
    const total = Number(location.competitionScan?.totalCount || 0);
    if (Number.isFinite(total) && total > 0) return total;
    return location.competitionScan?.competitors?.length || 0;
}

function getFitBonus(label: string, fit?: LeadFitLevel | null) {
    if (fit === '적합') return { score: 8, reason: `${label} 적합` };
    if (fit === '보통') return { score: 3, reason: `${label} 보통` };
    if (fit === '부적합') return { score: -8, risk: `${label} 부적합` };
    return { score: 0 };
}

function getRegionScore(lead: LeadLocationMatchLead, location: LeadLocationMatchLocation) {
    const desiredRegion = normalizeRegion(lead.desiredRegion);
    const locationRegion = normalizeRegion(location.region || location.address || '');
    if (desiredRegion === '지역 미지정' || locationRegion === '지역 미지정') {
        return { score: 0, reasons: [], risks: ['지역 정보 부족'] };
    }
    if (desiredRegion === locationRegion) {
        return { score: 36, reasons: [`희망지역 ${desiredRegion} 일치`], risks: [] };
    }
    const desiredTokens = desiredRegion.split(' ').filter(Boolean);
    const locationText = normalizeText(`${locationRegion} ${location.address || ''}`);
    const hasSharedToken = desiredTokens.some(token => locationText.includes(normalizeText(token)));
    return hasSharedToken
        ? { score: 16, reasons: [`희망지역 ${desiredRegion} 일부 일치`], risks: [] }
        : { score: 0, reasons: [], risks: [`희망지역 ${desiredRegion}과 지역 차이`] };
}

function getBrandScore(lead: LeadLocationMatchLead, location: LeadLocationMatchLocation) {
    const leadBrand = normalizeText(lead.interestedBrand);
    const locationBrand = normalizeText(location.brand);
    if (!leadBrand || !locationBrand) return { score: 0, reasons: [], risks: [] };
    if (leadBrand === locationBrand) return { score: 20, reasons: ['관심브랜드 일치'], risks: [] };
    if (leadBrand.includes(locationBrand) || locationBrand.includes(leadBrand)) {
        return { score: 10, reasons: ['관심브랜드 유사'], risks: [] };
    }
    return { score: 0, reasons: [], risks: ['관심브랜드 다름'] };
}

function getStatusScore(location: LeadLocationMatchLocation) {
    if (location.status === '검토중' || location.status === '오픈준비') {
        return { score: 12, reasons: [`${location.status} 후보지`] };
    }
    if (location.locationType === '예정점') {
        return { score: 10, reasons: ['예정점 후보'] };
    }
    if (location.status === '운영중') {
        return { score: 4, reasons: ['운영 점포 참고 가능'] };
    }
    return { score: 0, reasons: [] };
}

function clampScore(value: number) {
    return Math.max(0, Math.min(100, Math.round(value)));
}

export function buildLeadLocationMatches(
    lead: LeadLocationMatchLead | null,
    locations: readonly LeadLocationMatchLocation[],
    limit = 5
): readonly LeadLocationMatch[] {
    if (!lead || locations.length === 0) return [];

    return locations
        .map(location => {
            const region = getRegionScore(lead, location);
            const brand = getBrandScore(lead, location);
            const status = getStatusScore(location);
            const fitItems = [
                getFitBonus('자금', lead.budgetFit),
                getFitBonus('지역', lead.regionFit),
                getFitBonus('브랜드', lead.brandFit)
            ];
            const competitionCount = getCompetitionCount(location);
            const competitionPenalty = Math.min(18, Math.round(competitionCount / 3));
            const fitScore = fitItems.reduce((total, item) => total + item.score, 0);
            const score = clampScore(region.score + brand.score + status.score + fitScore + 18 - competitionPenalty);
            const reasons = [
                ...region.reasons,
                ...brand.reasons,
                ...status.reasons,
                ...fitItems.flatMap(item => item.reason ? [item.reason] : [])
            ];
            const risks = [
                ...region.risks,
                ...brand.risks,
                ...fitItems.flatMap(item => item.risk ? [item.risk] : []),
                ...(competitionCount >= 30 ? [`경쟁업체 ${competitionCount.toLocaleString()}곳`] : [])
            ];

            return { location, score, reasons, risks };
        })
        .filter(match => match.score >= 20)
        .sort((a, b) => b.score - a.score || a.location.name.localeCompare(b.location.name, 'ko'))
        .slice(0, limit);
}
