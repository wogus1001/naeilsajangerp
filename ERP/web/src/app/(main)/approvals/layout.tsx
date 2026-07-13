import { ApprovalsShell } from '@/components/approvals/ApprovalsShell';

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
    return <ApprovalsShell>{children}</ApprovalsShell>;
}
