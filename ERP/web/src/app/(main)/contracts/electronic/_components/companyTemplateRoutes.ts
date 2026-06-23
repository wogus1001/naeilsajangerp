export function companyTemplateCreateHref(
    templateId: string,
    context: { readonly checklistStepKey?: string; readonly leadId?: string } = {}
): string {
    const params = new URLSearchParams({ companyTemplateId: templateId });
    if (context.leadId) params.set('leadId', context.leadId);
    if (context.checklistStepKey) params.set('checklistStepKey', context.checklistStepKey);
    return `/contracts/electronic/create?${params.toString()}`;
}
