"use client";

import { FranchiseWorkspaceHero } from '@/components/franchise/FranchiseWorkspaceHero';
import { SupervisionPanel } from '@/components/franchise/operations/SupervisionPanel';
import { useFranchiseOperationsController } from '@/components/franchise/operations/useFranchiseOperationsController';
import { useSearchParams } from 'next/navigation';
import styles from '../franchise-leads/page.module.css';

export default function FranchiseSupervisionPage() {
    const controller = useFranchiseOperationsController();
    const searchParams = useSearchParams();

    return (
        <div className={styles.pageShell}>
            <FranchiseWorkspaceHero
                title="슈퍼바이징"
                description="SV 배정, 방문 일정, 점검 보고서, 승인과 시정요청을 본사 운영 관점에서 관리합니다."
            />

            <section className={styles.operationWorkspace}>
                <SupervisionPanel
                    userId={controller.userId}
                    companyName={controller.companyName}
                    initialActionId={searchParams.get('actionId') || ''}
                    initialReportId={searchParams.get('reportId') || ''}
                    initialVisitId={searchParams.get('visitId') || ''}
                />
            </section>
        </div>
    );
}
