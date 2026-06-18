import type { FranchiseLeadStatus } from '@/lib/franchise-leads';
import type { LeadWorkspaceTab } from './LeadWorkspaceTabs';
import type { LeadDbLayer, LeadViewMode } from './types';

export type LeadToolbarStatusFilter = '전체' | FranchiseLeadStatus;

type LeadWorkspaceTransitionInput = {
    readonly currentTab: LeadWorkspaceTab;
    readonly nextTab: LeadWorkspaceTab;
    readonly currentStatusFilter: LeadToolbarStatusFilter;
    readonly currentLeadDbLayer: LeadDbLayer;
    readonly currentViewMode: LeadViewMode;
};

type LeadWorkspaceTransitionResult = {
    readonly workspaceTab: LeadWorkspaceTab;
    readonly statusFilter: LeadToolbarStatusFilter;
    readonly leadDbLayer: LeadDbLayer;
    readonly viewMode: LeadViewMode;
};

export function resolveLeadWorkspaceTransition({
    currentTab,
    nextTab,
    currentStatusFilter,
    currentLeadDbLayer,
    currentViewMode
}: LeadWorkspaceTransitionInput): LeadWorkspaceTransitionResult {
    if (nextTab === 'contractOwners') {
        return {
            workspaceTab: nextTab,
            statusFilter: '계약완료',
            leadDbLayer: 'candidate',
            viewMode: 'table'
        };
    }

    if (nextTab === 'db' && currentTab !== 'db') {
        return {
            workspaceTab: nextTab,
            statusFilter: currentTab === 'contractOwners' ? '전체' : currentStatusFilter,
            leadDbLayer: 'raw_intake',
            viewMode: 'table'
        };
    }

    if (currentTab === 'contractOwners') {
        return {
            workspaceTab: nextTab,
            statusFilter: '전체',
            leadDbLayer: 'candidate',
            viewMode: 'table'
        };
    }

    return {
        workspaceTab: nextTab,
        statusFilter: currentStatusFilter,
        leadDbLayer: currentLeadDbLayer,
        viewMode: currentViewMode
    };
}
