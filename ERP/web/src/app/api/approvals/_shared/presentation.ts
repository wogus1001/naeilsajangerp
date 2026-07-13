import type { ApprovalContext } from './access';
import { documentView, type ApprovalDocumentRow } from './documents';
import { throwDatabaseError } from './errors';

type ProfileRow = { readonly id: string; readonly name: string | null; readonly email: string | null };
type MembershipRow = { readonly profile_id: string; readonly unit_id: string; readonly is_primary: boolean };
type UnitRow = { readonly id: string; readonly name: string };
type TemplateRow = { readonly id: string; readonly name: string };

export async function approvalDocumentViews(
    context: ApprovalContext,
    documents: readonly ApprovalDocumentRow[]
) {
    if (documents.length === 0) return [];
    const authorIds = [...new Set(documents.flatMap(document => document.author_profile_id ? [document.author_profile_id] : []))];
    const templateIds = [...new Set(documents.flatMap(document => document.template_id ? [document.template_id] : []))];
    const [profiles, memberships, templates] = await Promise.all([
        authorIds.length
            ? context.supabase.from('profiles').select('id, name, email').in('id', authorIds).returns<ProfileRow[]>()
            : Promise.resolve({ data: [] as ProfileRow[], error: null }),
        authorIds.length
            ? context.supabase.from('organization_memberships').select('profile_id, unit_id, is_primary')
                .eq('company_id', context.companyId).eq('active', true).in('profile_id', authorIds)
                .order('is_primary', { ascending: false }).returns<MembershipRow[]>()
            : Promise.resolve({ data: [] as MembershipRow[], error: null }),
        templateIds.length
            ? context.supabase.from('approval_templates').select('id, name').eq('company_id', context.companyId)
                .in('id', templateIds).returns<TemplateRow[]>()
            : Promise.resolve({ data: [] as TemplateRow[], error: null })
    ]);
    throwDatabaseError(profiles.error);
    throwDatabaseError(memberships.error);
    throwDatabaseError(templates.error);
    const unitIds = [...new Set((memberships.data || []).map(membership => membership.unit_id))];
    const units = unitIds.length
        ? await context.supabase.from('organization_units').select('id, name').eq('company_id', context.companyId)
            .in('id', unitIds).returns<UnitRow[]>()
        : { data: [] as UnitRow[], error: null };
    throwDatabaseError(units.error);
    const profileMap = new Map((profiles.data || []).map(profile => [profile.id, profile]));
    const templateMap = new Map((templates.data || []).map(template => [template.id, template.name]));
    const unitMap = new Map((units.data || []).map(unit => [unit.id, unit.name]));
    const membershipMap = new Map<string, MembershipRow>();
    for (const membership of memberships.data || []) {
        if (!membershipMap.has(membership.profile_id) || membership.is_primary) membershipMap.set(membership.profile_id, membership);
    }
    return documents.map(document => {
        const profile = document.author_profile_id ? profileMap.get(document.author_profile_id) : null;
        const membership = document.author_profile_id ? membershipMap.get(document.author_profile_id) : null;
        return {
            ...documentView(document),
            authorName: profile?.name?.trim() || profile?.email?.trim() || '',
            departmentName: membership ? unitMap.get(membership.unit_id) || '' : '',
            templateName: document.template_id ? templateMap.get(document.template_id) || '' : ''
        };
    });
}
