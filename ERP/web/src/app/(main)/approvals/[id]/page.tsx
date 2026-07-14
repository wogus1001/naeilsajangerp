import { redirect } from 'next/navigation';
import { approvalDocumentHref } from '@/components/approvals/approvalsNavigation';

type PageProps = { readonly params: Promise<{ readonly id: string }> };

export default async function Page({ params }: PageProps) {
    const { id } = await params;
    redirect(approvalDocumentHref(id));
}
