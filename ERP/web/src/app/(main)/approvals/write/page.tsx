import { ApprovalWritePage } from '@/components/approvals/ApprovalWritePage';

type PageProps = { readonly searchParams: Promise<{ readonly documentId?: string }> };

export default async function Page({ searchParams }: PageProps) {
    return <ApprovalWritePage documentId={(await searchParams).documentId || ''} />;
}
