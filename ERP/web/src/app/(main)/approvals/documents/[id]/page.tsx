import { ApprovalDetailPage } from '@/components/approvals/ApprovalDetailPage';

type PageProps = { readonly params: Promise<{ readonly id: string }> };

export default async function Page({ params }: PageProps) {
    const { id } = await params;
    return <ApprovalDetailPage documentId={id} />;
}
