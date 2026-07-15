import { FranchiseSchedulePage } from '@/components/franchise/schedules/FranchiseSchedulePage';
import { redirect } from 'next/navigation';

type PageProps = {
    readonly searchParams?: Promise<{
        readonly approvalDocumentId?: string;
    }>;
};

export default async function FranchiseOperationsScheduleRoute({ searchParams }: PageProps) {
    const params = await searchParams;
    if (params?.approvalDocumentId) {
        redirect(`/approvals/documents/${encodeURIComponent(params.approvalDocumentId)}`);
    }
    return <FranchiseSchedulePage />;
}
