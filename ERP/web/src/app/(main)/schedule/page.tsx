import { redirect } from 'next/navigation';
import { StoreDevelopmentSchedulePage } from './store-development-schedule-page';
import { buildLegacyScheduleRedirectPath } from './store-schedule-model';

type SchedulePageProps = {
    readonly searchParams?: Promise<Record<string, string | readonly string[] | undefined>>;
};

export default async function SchedulePage({ searchParams }: SchedulePageProps) {
    const params = await searchParams;
    const approvalDocumentId = params?.approvalDocumentId;
    const redirectPath = buildLegacyScheduleRedirectPath(approvalDocumentId);
    if (redirectPath) redirect(redirectPath);

    return <StoreDevelopmentSchedulePage />;
}
