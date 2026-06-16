"use client";

import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import type { LeadDashboardBaseProps } from './LeadDashboardTypes';

export function LeadDashboardTypeA({
    candidateCount,
    rawIntakeCount,
    activeConsultingCount,
    conversionRate,
    disclosureSummary,
    dueContactCount,
    overdueContactCount
}: LeadDashboardBaseProps) {
    const dDayAlertCount = disclosureSummary.d1 + disclosureSummary.d3;

    return (
        <>
            <section className={styles.kpiGrid}>
                <article className={styles.kpiCard}>
                    <span>발송 필요</span>
                    <strong>{disclosureSummary.needsAction.toLocaleString()}</strong>
                    <small>미발송/실패/대기 포함</small>
                </article>
                <article className={styles.kpiCard}>
                    <span>D-3 · D-1</span>
                    <strong>{dDayAlertCount.toLocaleString()}</strong>
                    <small>계약 가능일 임박</small>
                </article>
                <article className={styles.kpiCard}>
                    <span>계약 가능</span>
                    <strong>{disclosureSummary.eligible.toLocaleString()}</strong>
                    <small>14일 기준 충족</small>
                </article>
                <article className={styles.kpiCard}>
                    <span>연락 확인</span>
                    <strong>{(dueContactCount + overdueContactCount).toLocaleString()}</strong>
                    <small>오늘 연락 + 지연</small>
                </article>
            </section>

            <section className={styles.dashboardActionGrid}>
                <article className={styles.panelWide}>
                    <div className={styles.panelHeader}>
                        <div>
                            <h2>정보공개서 운영 알림</h2>
                            <p>발송, 수신 확인, 계약 가능일을 기준으로 우선 처리 대상을 봅니다.</p>
                        </div>
                    </div>
                    <div className={styles.dashboardActionList}>
                        <div>
                            <strong>미발송</strong>
                            <span>{disclosureSummary.missing.toLocaleString()}건</span>
                            <small>발송 기록이 없어 계약 단계로 이동할 수 없습니다.</small>
                        </div>
                        <div>
                            <strong>발송 실패</strong>
                            <span>{disclosureSummary.failed.toLocaleString()}건</span>
                            <small>Gmail 발송 오류를 확인하고 재발송이 필요합니다.</small>
                        </div>
                        <div>
                            <strong>계약 가능일 임박</strong>
                            <span>{dDayAlertCount.toLocaleString()}건</span>
                            <small>D-3, D-1 알림 대상으로 담당자 확인이 필요합니다.</small>
                        </div>
                        <div>
                            <strong>발송 완료</strong>
                            <span>{disclosureSummary.sentTotal.toLocaleString()}건</span>
                            <small>14일 대기 기간을 계산 중인 가맹 희망자입니다.</small>
                        </div>
                    </div>
                </article>

                <article className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <div>
                            <h2>모객 상태</h2>
                            <p>A 타입은 실무 처리 신호를 먼저 보여줍니다.</p>
                        </div>
                    </div>
                    <div className={styles.dashboardActionStack}>
                        <span>1차 유입 DB <strong>{rawIntakeCount.toLocaleString()}건</strong></span>
                        <span>가맹 희망자 <strong>{candidateCount.toLocaleString()}건</strong></span>
                        <span>상담 진행 <strong>{activeConsultingCount.toLocaleString()}건</strong></span>
                        <span>계약 전환율 <strong>{conversionRate}%</strong></span>
                    </div>
                </article>

                <article className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <div>
                            <h2>연락 알림</h2>
                            <p>연락 관리는 담당자가 놓치기 쉬운 일정을 먼저 봅니다.</p>
                        </div>
                    </div>
                    <div className={styles.dashboardActionStack}>
                        <span>오늘 연락 <strong>{dueContactCount.toLocaleString()}건</strong></span>
                        <span>연락 지연 <strong>{overdueContactCount.toLocaleString()}건</strong></span>
                        <span>알림톡 예정 <strong>인앱 우선</strong></span>
                    </div>
                </article>
            </section>
        </>
    );
}
