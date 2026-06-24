import { CompanyTemplateContractCreatePage } from '../_components/CompanyTemplateContractCreatePage';
import PremiumRightsCreatePage from '../_components/PremiumRightsCreatePage';

type PageProps = {
    readonly searchParams: Promise<{
        readonly companyTemplateId?: string;
        readonly templateId?: string;
        readonly draftId?: string;
        readonly contractId?: string;
        readonly leadId?: string;
        readonly checklistStepKey?: string;
    }>;
};

export default async function Page({ searchParams }: PageProps) {
    const params = await searchParams;
    const companyTemplateId = params.companyTemplateId || params.templateId || '';
    const draftId = params.draftId || params.contractId || '';
    if (companyTemplateId) {
        return (
            <CompanyTemplateContractCreatePage
                templateId={companyTemplateId}
                draftId={draftId}
                leadId={params.leadId || ''}
                checklistStepKey={params.checklistStepKey || ''}
            />
        );
    }
    return <PremiumRightsCreatePage />;
}
