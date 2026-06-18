import type { Dispatch, ReactNode, SetStateAction } from 'react';
import type { FranchiseLeadStatus } from '@/lib/franchise-leads';
import type { LeadWorkQueueKey } from '@/lib/franchise-lead-workflow';
import type { PAGE_SIZE_OPTIONS } from './constants';
import type { LeadTableColumnKey, LeadTableFilters, LeadTableSortKey } from './leadTableTypes';
import type {
    FranchiseLead,
    LeadDbLayer,
    LeadViewMode
} from './types';

type PipelineColumn = {
    readonly status: FranchiseLeadStatus;
    readonly leads: readonly FranchiseLead[];
};

type TaskQueueOption = {
    readonly key: LeadWorkQueueKey;
    readonly label: string;
    readonly count: number;
};

export type LeadDbWorkspaceProps = {
    readonly isLoading: boolean;
    readonly workspaceVariant?: 'default' | 'contractOwners';
    readonly leadDbLayer: LeadDbLayer;
    readonly viewMode: LeadViewMode;
    readonly rawIntakeCount: number;
    readonly candidateCount: number;
    readonly listPolicyText: string;
    readonly contractChecklistRefreshKey?: number;
    readonly pageSize: typeof PAGE_SIZE_OPTIONS[number];
    readonly visibleLayerLeadCount: number;
    readonly exportLeads: readonly FranchiseLead[];
    readonly paginatedLeads: readonly FranchiseLead[];
    readonly selectedLeadIds: readonly string[];
    readonly allVisibleSelected: boolean;
    readonly bulkNextContactAt: string;
    readonly isBulkUpdating: boolean;
    readonly convertingLeadId: string;
    readonly tableFilters: LeadTableFilters;
    readonly tableSort: LeadTableSortKey;
    readonly visibleTableColumns: readonly LeadTableColumnKey[];
    readonly pipelineColumns: readonly PipelineColumn[];
    readonly taskQueueOptions: readonly TaskQueueOption[];
    readonly taskQueueFilter: LeadWorkQueueKey;
    readonly taskLeads: readonly FranchiseLead[];
    readonly safeCurrentPage: number;
    readonly totalPages: number;
    readonly renderManagerOptions: (selectedManagerId?: string) => ReactNode;
    readonly getManagerName: (managerId?: string) => string;
    readonly onLoadExportLeadsAction?: () => Promise<readonly FranchiseLead[]>;
    readonly onLeadDbLayerChangeAction: (layer: LeadDbLayer) => void;
    readonly onViewModeChangeAction: (mode: LeadViewMode) => void;
    readonly onPageSizeChangeAction: (pageSize: typeof PAGE_SIZE_OPTIONS[number]) => void;
    readonly onTableFiltersChangeAction: Dispatch<SetStateAction<LeadTableFilters>>;
    readonly onTableSortChangeAction: (sort: LeadTableSortKey) => void;
    readonly onVisibleTableColumnsChangeAction: Dispatch<SetStateAction<readonly LeadTableColumnKey[]>>;
    readonly onBulkNextContactAtChangeAction: (value: string) => void;
    readonly onApplyBulkNextContactAction: () => void;
    readonly onClearSelectedAction: () => void;
    readonly onToggleSelectAllVisibleAction: (checked: boolean) => void;
    readonly onToggleSelectLeadAction: (leadId: string, checked: boolean) => void;
    readonly onSelectLeadAction: (leadId: string) => void;
    readonly onStatusChangeAction: (lead: FranchiseLead, status: FranchiseLeadStatus) => void;
    readonly onManagerChangeAction: (lead: FranchiseLead, managerId: string) => void;
    readonly onTogglePriorityAction: (lead: FranchiseLead) => void;
    readonly onPromoteLeadToCandidateAction: (lead: FranchiseLead) => void;
    readonly onConvertLeadAction: (lead: FranchiseLead) => void;
    readonly onOpenQuickActivityModalAction: (lead: FranchiseLead) => void;
    readonly onOpenEditModalAction: (lead: FranchiseLead) => void;
    readonly onRequestDeleteAction: (lead: FranchiseLead) => void;
    readonly onPreviousPageAction: () => void;
    readonly onNextPageAction: () => void;
    readonly onTaskQueueFilterChangeAction: (filter: LeadWorkQueueKey) => void;
    readonly onCompleteTodayTaskAction: (lead: FranchiseLead) => void;
};
