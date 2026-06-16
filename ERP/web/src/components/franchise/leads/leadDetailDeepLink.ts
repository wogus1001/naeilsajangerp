import type { LeadWorkspaceTab } from './LeadWorkspaceTabs';
import type { FranchiseLead, LeadDbLayer, LeadViewMode } from './types';

export type LeadDetailDeepLinkTarget = {
    readonly leadId: string;
    readonly workspaceTab: LeadWorkspaceTab;
    readonly leadDbLayer: LeadDbLayer;
    readonly viewMode: LeadViewMode;
};

export function parseLeadDetailDeepLinkId(search: string): string {
    const params = new URLSearchParams(search);
    return (params.get('leadId') || '').trim();
}

export function resolveLeadDetailDeepLinkTarget(lead: FranchiseLead): LeadDetailDeepLinkTarget {
    return {
        leadId: lead.id,
        workspaceTab: 'db',
        leadDbLayer: lead.leadStage === 'raw_intake' ? 'raw_intake' : 'candidate',
        viewMode: 'table'
    };
}

export function mergeDeepLinkedLead(leads: readonly FranchiseLead[], lead: FranchiseLead): FranchiseLead[] {
    if (leads.some(item => item.id === lead.id)) {
        return leads.map(item => item.id === lead.id ? lead : item);
    }
    return [lead, ...leads];
}
