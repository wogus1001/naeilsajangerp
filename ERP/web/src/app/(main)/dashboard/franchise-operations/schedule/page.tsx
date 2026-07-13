import { FranchiseSchedulePage } from '@/components/franchise/schedules/FranchiseSchedulePage';

type PageProps = {
    readonly searchParams?: Promise<{
        readonly approvalDocumentId?: string;
    }>;
};

export default async function FranchiseOperationsScheduleRoute({ searchParams }: PageProps) {
    const params = await searchParams;
    return <FranchiseSchedulePage approvalDocumentId={params?.approvalDocumentId || ''} />;
}
