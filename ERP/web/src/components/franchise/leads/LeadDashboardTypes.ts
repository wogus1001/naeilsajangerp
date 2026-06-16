import type { FranchiseLeadStatus } from '@/lib/franchise-leads';
import type { LeadTrendSeriesData } from './utils';

export type StageDatum = {
    readonly status: FranchiseLeadStatus;
    readonly count: number;
};

export type SourceDatum = {
    readonly source: string;
    readonly count: number;
};

export type ManagerDatum = {
    readonly manager: string;
    readonly count: number;
};

export type LeadDisclosureDashboardSummary = {
    readonly missing: number;
    readonly failed: number;
    readonly pending: number;
    readonly d1: number;
    readonly d3: number;
    readonly eligible: number;
    readonly sentTotal: number;
    readonly needsAction: number;
};

export type LeadDashboardBaseProps = {
    readonly candidateCount: number;
    readonly rawIntakeCount: number;
    readonly activeConsultingCount: number;
    readonly conversionRate: number;
    readonly disclosureSummary: LeadDisclosureDashboardSummary;
    readonly dueContactCount: number;
    readonly overdueContactCount: number;
};

export type LeadDashboardTypeBProps = LeadDashboardBaseProps & {
    readonly statusFilter: '전체' | FranchiseLeadStatus;
    readonly stageData: readonly StageDatum[];
    readonly sourceChartData: readonly SourceDatum[];
    readonly managerChartData: readonly ManagerDatum[];
    readonly trendSeriesData: LeadTrendSeriesData;
    readonly onStatusFilterChangeAction: (status: '전체' | FranchiseLeadStatus) => void;
};
