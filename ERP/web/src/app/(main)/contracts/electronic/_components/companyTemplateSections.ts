import type { CompanyTemplateSummary } from './companyTemplatesClient';

export type CompanyTemplateSections = {
    readonly readyTemplates: readonly CompanyTemplateSummary[];
    readonly connectionRequiredTemplates: readonly CompanyTemplateSummary[];
    readonly archivedTemplates: readonly CompanyTemplateSummary[];
};

function canSendWithTemplate(template: CompanyTemplateSummary): boolean {
    return template.status === 'active' && Boolean(template.latestVersion?.ucansignTemplateId);
}

export function getCompanyTemplateSections(templates: readonly CompanyTemplateSummary[]): CompanyTemplateSections {
    return {
        readyTemplates: templates.filter(canSendWithTemplate),
        connectionRequiredTemplates: templates.filter(template => template.status !== 'archived' && !canSendWithTemplate(template)),
        archivedTemplates: templates.filter(template => template.status === 'archived')
    };
}
