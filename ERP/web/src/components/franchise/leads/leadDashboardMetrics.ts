import type { FranchiseLead } from './types';
import type { LeadDisclosureDashboardSummary } from './LeadDashboardTypes';

export function buildLeadDisclosureDashboardSummary(
    leads: readonly FranchiseLead[]
): LeadDisclosureDashboardSummary {
    return leads.reduce<LeadDisclosureDashboardSummary>((acc, lead) => {
        const summary = lead.disclosureSummary;
        if (!summary || summary.state === 'none') {
            return { ...acc, missing: acc.missing + 1, needsAction: acc.needsAction + 1 };
        }
        if (summary.state === 'failed') {
            return { ...acc, failed: acc.failed + 1, needsAction: acc.needsAction + 1 };
        }
        if (summary.state === 'pending') {
            return { ...acc, pending: acc.pending + 1, needsAction: acc.needsAction + 1 };
        }
        if (summary.remainingDays === 1) return { ...acc, d1: acc.d1 + 1, sentTotal: acc.sentTotal + 1 };
        if (summary.remainingDays === 3) return { ...acc, d3: acc.d3 + 1, sentTotal: acc.sentTotal + 1 };
        if (summary.remainingDays === 0) return { ...acc, eligible: acc.eligible + 1, sentTotal: acc.sentTotal + 1 };
        return { ...acc, sentTotal: acc.sentTotal + 1 };
    }, {
        missing: 0,
        failed: 0,
        pending: 0,
        d1: 0,
        d3: 0,
        eligible: 0,
        sentTotal: 0,
        needsAction: 0
    });
}
