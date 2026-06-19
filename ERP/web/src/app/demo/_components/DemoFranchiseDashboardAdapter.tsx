'use client';

import React from 'react';
import pageStyles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import { FranchiseWorkspaceHero } from '@/components/franchise/FranchiseWorkspaceHero';
import { LeadDashboard } from '@/components/franchise/leads/LeadDashboard';
import type { ManagerDatum, SourceDatum, StageDatum } from '@/components/franchise/leads/LeadDashboardTypes';
import { LeadWorkspaceTabs, type LeadWorkspaceTab } from '@/components/franchise/leads/LeadWorkspaceTabs';
import type { LeadTrendSeriesData } from '@/components/franchise/leads/utils';
import { FRANCHISE_LEAD_STATUSES, type FranchiseLeadStatus } from '@/lib/franchise-leads';
import type { DemoActionHandler, DemoScreenId } from '../demoTypes';
import { DEMO_LEAD_MANAGERS, DEMO_SAMPLE_LEADS } from './DemoLeadSampleData';
import { DemoDashboardGuide } from './DemoDashboardGuide';
import guideStyles from './DemoDashboardGuide.module.css';

type DemoFranchiseDashboardAdapterProps = {
    readonly onScreenChange: (screen: DemoScreenId) => void;
    readonly onSimulate: DemoActionHandler;
};

const DEMO_TREND_SERIES_DATA = {
    daily: [
        { date: '06.06', count: 0 },
        { date: '06.07', count: 1 },
        { date: '06.08', count: 0 },
        { date: '06.09', count: 1 },
        { date: '06.10', count: 0 },
        { date: '06.11', count: 2 },
        { date: '06.12', count: 1 },
        { date: '06.13', count: 0 },
        { date: '06.14', count: 1 },
        { date: '06.15', count: 2 },
        { date: '06.16', count: 1 },
        { date: '06.17', count: 1 },
        { date: '06.18', count: 2 },
        { date: '06.19', count: 1 }
    ],
    weekly: [
        { date: '04.27주', count: 2 },
        { date: '05.04주', count: 3 },
        { date: '05.11주', count: 2 },
        { date: '05.18주', count: 4 },
        { date: '05.25주', count: 5 },
        { date: '06.01주', count: 3 },
        { date: '06.08주', count: 5 },
        { date: '06.15주', count: 4 }
    ],
    monthly: [
        { date: '26.01', count: 7 },
        { date: '26.02', count: 9 },
        { date: '26.03', count: 8 },
        { date: '26.04', count: 12 },
        { date: '26.05', count: 14 },
        { date: '26.06', count: 11 }
    ]
} satisfies LeadTrendSeriesData;

export function DemoFranchiseDashboardAdapter({ onScreenChange, onSimulate }: DemoFranchiseDashboardAdapterProps) {
    const [statusFilter, setStatusFilter] = React.useState<'전체' | FranchiseLeadStatus>('전체');
    const rawIntakeCount = DEMO_SAMPLE_LEADS.filter(lead => lead.leadStage === 'raw_intake').length;
    const candidateLeads = DEMO_SAMPLE_LEADS.filter(lead => lead.leadStage === 'candidate');
    const candidateCount = candidateLeads.length;
    const activeConsultingCount = candidateLeads.filter(lead => lead.status === '상담중' || lead.status === '가맹검토').length;
    const contractReadyCount = candidateLeads.filter(lead => lead.status === '계약예정' || lead.status === '계약완료').length;
    const conversionRate = candidateCount > 0 ? Math.round((contractReadyCount / candidateCount) * 1000) / 10 : 0;

    return (
        <div className={pageStyles.pageShell} data-demo-id="franchise-dashboard">
            <FranchiseWorkspaceHero
                title="대시보드"
                description="프랜차이즈 모객 DB, 출점 후보지, 가맹 운영의 핵심 흐름을 한 화면에서 확인합니다."
                actions={(
                    <button className={pageStyles.primaryButton} onClick={() => onScreenChange('leadDb')}>
                        모객 DB 보기
                    </button>
                )}
            />
            <div data-demo-id="dashboard-tabs">
                <LeadWorkspaceTabs activeTab="dashboard" onTabChange={tab => handleTabChange(tab, onScreenChange, onSimulate)} />
            </div>
            <div className={guideStyles.dashboardGuideLayout}>
                <div className={guideStyles.dashboardGuideMain}>
                    <LeadDashboard
                        candidateCount={candidateCount}
                        rawIntakeCount={rawIntakeCount}
                        activeConsultingCount={activeConsultingCount}
                        conversionRate={conversionRate}
                        statusFilter={statusFilter}
                        stageData={buildStageData()}
                        sourceChartData={buildSourceData()}
                        managerChartData={buildManagerData()}
                        trendSeriesData={DEMO_TREND_SERIES_DATA}
                        disclosureSummary={buildDisclosureSummary()}
                        dueContactCount={2}
                        overdueContactCount={1}
                        onStatusFilterChangeAction={setStatusFilter}
                    />
                </div>
                <DemoDashboardGuide onScreenChange={onScreenChange} />
            </div>
        </div>
    );
}

function handleTabChange(
    tab: LeadWorkspaceTab,
    onScreenChange: (screen: DemoScreenId) => void,
    onSimulate: DemoActionHandler
) {
    switch (tab) {
        case 'dashboard':
            return;
        case 'db':
            onScreenChange('leadDb');
            return;
        case 'contractOwners':
            onScreenChange('contractOwners');
            return;
    }
}

function buildStageData(): readonly StageDatum[] {
    return FRANCHISE_LEAD_STATUSES.map(status => ({
        status,
        count: DEMO_SAMPLE_LEADS.filter(lead => lead.status === status).length
    }));
}

function buildSourceData(): readonly SourceDatum[] {
    return Object.entries(countBy(DEMO_SAMPLE_LEADS.map(lead => lead.source || '미지정'))).map(([source, count]) => ({
        source,
        count
    }));
}

function buildManagerData(): readonly ManagerDatum[] {
    return Object.entries(countBy(DEMO_SAMPLE_LEADS.map(lead => findManagerLabel(lead.managerId)))).map(([manager, count]) => ({
        manager,
        count
    }));
}

function buildDisclosureSummary() {
    const summaries = DEMO_SAMPLE_LEADS.map(lead => lead.disclosureSummary);
    return {
        missing: summaries.filter(summary => !summary).length,
        failed: 0,
        pending: 0,
        d1: 0,
        d3: summaries.filter(summary => summary?.remainingDays !== null && summary?.remainingDays !== undefined && summary.remainingDays <= 3 && summary.remainingDays > 0).length,
        eligible: summaries.filter(summary => summary?.state === 'eligible').length,
        sentTotal: summaries.filter(Boolean).length,
        needsAction: summaries.filter(summary => !summary).length
    };
}

function countBy(values: readonly string[]): Record<string, number> {
    return values.reduce<Record<string, number>>((acc, value) => {
        acc[value] = (acc[value] || 0) + 1;
        return acc;
    }, {});
}

function findManagerLabel(managerId: string | null | undefined) {
    return DEMO_LEAD_MANAGERS.find(manager => manager.id === managerId)?.label || '담당자 미정';
}
