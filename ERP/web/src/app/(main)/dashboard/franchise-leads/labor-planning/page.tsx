"use client";

import { useSearchParams } from 'next/navigation';
import { FranchiseWorkspaceHero } from '@/components/franchise/FranchiseWorkspaceHero';
import { LaborPlanningPanel } from '@/components/franchise/operations/LaborPlanningPanel';
import { useFranchiseOperationsController } from '@/components/franchise/operations/useFranchiseOperationsController';
import styles from '../page.module.css';

export default function FranchiseLaborPlanningPage() {
    const controller = useFranchiseOperationsController();
    const searchParams = useSearchParams();
    const initialLocationId = searchParams.get('locationId') || undefined;
    const salesParam = Number(searchParams.get('monthlySalesManwon') || 0);
    const initialMonthlySalesManwon = Number.isFinite(salesParam) && salesParam > 0 ? salesParam : undefined;

    return (
        <div className={styles.pageShell}>
            <FranchiseWorkspaceHero
                title="인력 세팅"
                description="출점 후보지와 운영점의 예상 매출을 기준으로 인력 구성, 인건비, 근무표를 계산합니다."
            />

            <section className={styles.operationWorkspace}>
                <LaborPlanningPanel
                    userId={controller.userId}
                    companyName={controller.companyName}
                    locations={controller.locations}
                    initialLocationId={initialLocationId}
                    initialMonthlySalesManwon={initialMonthlySalesManwon}
                />
            </section>
        </div>
    );
}
