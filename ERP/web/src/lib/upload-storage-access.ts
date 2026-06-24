import {
    canAccessCompanyResource,
    canAccessCompanyScope,
    type RequesterProfile
} from '@/lib/api-auth';
import { canAccessFranchiseLead } from '@/lib/franchise-lead-access';
import type { UploadStorageTarget } from '@/lib/upload-storage-policy';

type PropertyUploadAccessRow = {
    readonly company_id: string | null;
    readonly manager_id: string | null;
};

type FranchiseLeadUploadAccessRow = {
    readonly company_id: string | null;
    readonly created_by: string | null;
    readonly manager_id: string | null;
};

type MaybeSingleQuery = {
    readonly maybeSingle: <T>() => PromiseLike<{ readonly data: T | null }>;
};

type FilterQuery = {
    readonly eq: (column: string, value: string) => MaybeSingleQuery;
};

type SelectQuery = {
    readonly select: (columns: string) => FilterQuery;
};

export type UploadAccessSupabase = {
    readonly from: (table: string) => SelectQuery;
};

async function canUploadToPropertyTarget(
    supabaseAdmin: UploadAccessSupabase,
    requester: RequesterProfile,
    propertyId: string
): Promise<boolean> {
    const { data: property } = await supabaseAdmin
        .from('properties')
        .select('company_id, manager_id')
        .eq('id', propertyId)
        .maybeSingle<PropertyUploadAccessRow>();

    return Boolean(property && canAccessCompanyResource(requester, property));
}

async function canUploadToLeadTarget(
    supabaseAdmin: UploadAccessSupabase,
    requester: RequesterProfile,
    target: Extract<UploadStorageTarget, { readonly kind: 'leadDocument' }>
): Promise<boolean> {
    const { data: lead } = await supabaseAdmin
        .from('franchise_leads')
        .select('company_id, created_by, manager_id')
        .eq('id', target.leadId)
        .maybeSingle<FranchiseLeadUploadAccessRow>();

    if (!lead || lead.company_id !== target.companyId) return false;
    return canAccessFranchiseLead(requester, lead);
}

export async function canUploadToTarget(
    supabaseAdmin: UploadAccessSupabase,
    requester: RequesterProfile,
    target: UploadStorageTarget
): Promise<boolean> {
    switch (target.kind) {
        case 'propertyImage':
        case 'propertyDocument':
            return canUploadToPropertyTarget(supabaseAdmin, requester, target.propertyId);
        case 'leadDocument':
            return canUploadToLeadTarget(supabaseAdmin, requester, target);
        case 'disclosure':
            return canAccessCompanyScope(requester, target.companyId);
    }
}
