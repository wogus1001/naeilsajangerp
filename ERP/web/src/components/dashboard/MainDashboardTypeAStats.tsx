"use client";

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { FileCheck2, Link2, MapPinned, Users } from 'lucide-react';
import { buildMarketInsights } from '@/lib/franchise-market-insights';
import { readApiError, unwrapApiData } from '@/utils/apiResponse';

type DisclosureSummary = {
    readonly remainingDays?: number | null;
};

type DashboardLead = {
    readonly status?: string;
    readonly grade?: string;
    readonly source?: string;
    readonly desiredRegion?: string;
    readonly budgetMin?: number | null;
    readonly budgetMax?: number | null;
    readonly locationLinks?: unknown;
    readonly disclosureSummary?: DisclosureSummary;
};

type DashboardLocation = {
    readonly id: string;
    readonly name?: string;
    readonly region?: string;
    readonly address?: string;
    readonly status?: string;
    readonly locationType?: string;
};

type LeadListResponse = {
    readonly leads?: readonly DashboardLead[];
};

type LocationListResponse = {
    readonly locations?: readonly DashboardLocation[];
};

type KpiMetrics = {
    readonly leadTotal: number;
    readonly eligible: number;
    readonly candidateLocations: number;
    readonly matchingNeeded: number;
};

type MainDashboardTypeAStatsProps = {
    readonly requesterId: string;
    readonly companyName: string;
    readonly onNavigate: (href: string) => void;
};

const EMPTY_METRICS: KpiMetrics = {
    leadTotal: 0,
    eligible: 0,
    candidateLocations: 0,
    matchingNeeded: 0
};

export function MainDashboardTypeAStats({
    requesterId,
    companyName,
    onNavigate
}: MainDashboardTypeAStatsProps) {
    const [metrics, setMetrics] = React.useState<KpiMetrics>(EMPTY_METRICS);
    const [status, setStatus] = React.useState<'idle' | 'loading' | 'ready' | 'error'>('idle');

    React.useEffect(() => {
        if (!requesterId) return;

        const controller = new AbortController();
        void loadKpiMetrics({ requesterId, companyName, signal: controller.signal })
            .then(nextMetrics => {
                setMetrics(nextMetrics);
                setStatus('ready');
            })
            .catch(error => {
                if (error instanceof DOMException && error.name === 'AbortError') return;
                console.error('Failed to fetch franchise dashboard KPI metrics:', error);
                setMetrics(EMPTY_METRICS);
                setStatus('error');
            });
        setStatus('loading');

        return () => controller.abort();
    }, [companyName, requesterId]);

    const loading = status === 'idle' || status === 'loading';
    const cards = buildKpiCards(metrics, loading, onNavigate);

    return (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10" aria-label="가맹 운영 주요 건수">
            {cards.map(card => (
                <button
                    key={card.label}
                    type="button"
                    className="flex min-h-[129px] cursor-pointer items-center justify-between rounded-[20px] border-0 bg-white p-6 text-left shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_26px_rgba(0,0,0,0.06)]"
                    onClick={card.onClick}
                >
                    <span className="flex min-w-0 flex-col">
                        <span className="mb-2.5 text-[15px] font-bold text-[#495057]">{card.label}</span>
                        <span className="flex items-baseline gap-0.5">
                            <strong className="text-[32px] font-black leading-none text-[#212529]">{card.value}</strong>
                            <span className="ml-0.5 text-[15px] font-semibold text-[#adb5bd]">{card.unit}</span>
                        </span>
                        <span className="mt-2 text-xs font-semibold text-[#8b95a1]">{card.caption}</span>
                    </span>
                    <span className={`flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl ${card.iconClassName}`}>
                        <card.icon size={24} />
                    </span>
                </button>
            ))}
            {status === 'error' ? (
                <p className="lg:col-span-4 m-0 text-xs font-semibold text-[#f04452]">
                    주요 건수를 불러오지 못했습니다. 새로고침 후 다시 확인해주세요.
                </p>
            ) : null}
        </section>
    );
}

async function loadKpiMetrics({
    requesterId,
    companyName,
    signal
}: {
    readonly requesterId: string;
    readonly companyName: string;
    readonly signal: AbortSignal;
}): Promise<KpiMetrics> {
    const leadParams = new URLSearchParams({ requesterId, limit: 'all', summary: 'true' });
    const locationParams = new URLSearchParams({ requesterId });
    if (companyName.trim()) {
        leadParams.set('company', companyName);
        locationParams.set('company', companyName);
    }

    const [leadResponse, locationResponse] = await Promise.all([
        fetch(`/api/franchise-leads?${leadParams.toString()}`, { cache: 'no-store', signal }),
        fetch(`/api/franchise-locations?${locationParams.toString()}`, { cache: 'no-store', signal })
    ]);
    const [leadPayload, locationPayload]: readonly unknown[] = await Promise.all([
        leadResponse.json(),
        locationResponse.json()
    ]);
    if (!leadResponse.ok) throw new Error(readApiError(leadPayload));
    if (!locationResponse.ok) throw new Error(readApiError(locationPayload));

    const leads = unwrapApiData<LeadListResponse>(leadPayload).leads || [];
    const locations = unwrapApiData<LocationListResponse>(locationPayload).locations || [];
    return buildKpiMetrics(leads, locations);
}

function buildKpiMetrics(leads: readonly DashboardLead[], locations: readonly DashboardLocation[]): KpiMetrics {
    const insights = buildMarketInsights(leads, locations);
    return {
        leadTotal: leads.length,
        eligible: leads.filter(isEligibleLead).length,
        candidateLocations: locations.filter(isCandidateLocation).length,
        matchingNeeded: insights.reduce((total, insight) => total + insight.matchingNeededCount, 0)
    };
}

function isEligibleLead(lead: DashboardLead) {
    return lead.disclosureSummary?.remainingDays === 0;
}

function isCandidateLocation(location: DashboardLocation) {
    return location.locationType === '예정점' || location.status === '검토중' || location.status === '오픈준비';
}

function buildKpiCards(metrics: KpiMetrics, loading: boolean, onNavigate: (href: string) => void) {
    const displayValue = (value: number) => loading ? '-' : value.toLocaleString();
    return [
        {
            label: '모객 DB',
            value: displayValue(metrics.leadTotal),
            unit: '명',
            caption: '전체 가맹 희망자',
            icon: Users,
            iconClassName: 'bg-[#f8f7ff] text-[#6d5dfc]',
            onClick: () => onNavigate('/dashboard/franchise-leads')
        },
        {
            label: '계약 가능',
            value: displayValue(metrics.eligible),
            unit: '명',
            caption: '14일 기준 충족',
            icon: FileCheck2,
            iconClassName: 'bg-[#fff9db] text-[#f59f00]',
            onClick: () => onNavigate('/dashboard/franchise-leads?sort=disclosure_eligible')
        },
        {
            label: '출점 후보지',
            value: displayValue(metrics.candidateLocations),
            unit: '건',
            caption: '검토중·오픈준비',
            icon: MapPinned,
            iconClassName: 'bg-[#e6fcf5] text-[#0ca678]',
            onClick: () => onNavigate('/dashboard/franchise-leads/market-insights?view=location-list')
        },
        {
            label: '연결 필요',
            value: displayValue(metrics.matchingNeeded),
            unit: '건',
            caption: '후보지 매칭 전',
            icon: Link2,
            iconClassName: 'bg-[#fff4e6] text-[#fe9800]',
            onClick: () => onNavigate('/dashboard/franchise-leads/market-insights?view=region-insight')
        }
    ] as const satisfies readonly {
        readonly label: string;
        readonly value: string;
        readonly unit: string;
        readonly caption: string;
        readonly icon: LucideIcon;
        readonly iconClassName: string;
        readonly onClick: () => void;
    }[];
}
