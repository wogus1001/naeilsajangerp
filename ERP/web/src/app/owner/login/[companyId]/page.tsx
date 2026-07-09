import { OwnerLoginClient } from '../../_components/OwnerLoginClient';

type OwnerCompanyLoginPageProps = {
    readonly params: Promise<{
        readonly companyId: string;
    }>;
};

export default async function OwnerCompanyLoginPage({ params }: OwnerCompanyLoginPageProps) {
    const { companyId } = await params;
    return <OwnerLoginClient initialCompanyId={companyId} />;
}
