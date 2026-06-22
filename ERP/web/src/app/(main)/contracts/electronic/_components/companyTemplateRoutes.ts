export function companyTemplateCreateHref(templateId: string): string {
    const params = new URLSearchParams({ companyTemplateId: templateId });
    return `/contracts/electronic/create?${params.toString()}`;
}
