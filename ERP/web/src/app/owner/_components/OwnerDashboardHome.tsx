"use client";

import Link from 'next/link';
import styles from '../owner.module.css';
import {
    formatOwnerDate,
    getOwnerTaskId,
    getRequestedOwnerTaskIds,
    OwnerPortalFrame,
    ownerStatusLabel,
    type OwnerDashboardData
} from './ownerPortalShared';

export function OwnerDashboardHome() {
    return (
        <OwnerPortalFrame activeKey="dashboard">
            {data => <OwnerDashboardContent data={data} />}
        </OwnerPortalFrame>
    );
}

function OwnerDashboardContent({ data }: { readonly data: OwnerDashboardData }) {
    const unreadNoticeCount = data.notices.filter(notice => !notice.readAt).length;
    const requestedTaskIds = getRequestedOwnerTaskIds(data.submissions);
    const pendingTaskCount = data.openingProject.tasks.filter(task => !requestedTaskIds.has(getOwnerTaskId(task))).length;
    const submittedCount = data.submissions.filter(submission => submission.status === 'submitted').length;
    const latestSubmissions = data.submissions.slice(0, 4);

    return (
        <>
            <section className={styles.hero}>
                <span className={styles.badge}>{data.location.status || '운영점'}</span>
                <h1>내 매장 업무 홈</h1>
                <p>공지 확인, 체크리스트 완료 요청, 매장 정보 제출, 시설 문의를 메뉴별로 처리합니다.</p>
            </section>
            <section className={styles.summaryGrid} aria-label="점주 업무 요약">
                <DashboardMetric label="미확인 공지" value={unreadNoticeCount} href="/owner/notices" />
                <DashboardMetric label="남은 체크리스트" value={pendingTaskCount} href="/owner/opening-tasks" />
                <DashboardMetric label="처리 대기 요청" value={submittedCount} href="/owner/submissions" />
                <DashboardMetric label="전체 제출" value={data.submissions.length} href="/owner/submissions" />
            </section>
            <section className={styles.panel} aria-label="최근 제출 이력">
                <div className={styles.panelHeader}>
                    <div>
                        <h2>최근 제출 이력</h2>
                        <p>본사로 전달된 요청의 최근 상태입니다.</p>
                    </div>
                    <Link className={styles.secondaryButton} href="/owner/submissions">전체 보기</Link>
                </div>
                <div className={styles.panelBody}>
                    {latestSubmissions.length === 0 ? <div className={styles.emptyState}>제출 이력이 없습니다.</div> : null}
                    <div className={styles.list}>
                        {latestSubmissions.map(submission => (
                            <article className={styles.listItem} key={submission.id}>
                                <strong>{submission.title}</strong>
                                <span className={styles.itemMeta}>
                                    {formatOwnerDate(submission.created_at)} · {ownerStatusLabel(submission.status)}
                                </span>
                                {submission.review_note ? <p>{submission.review_note}</p> : null}
                            </article>
                        ))}
                    </div>
                </div>
            </section>
        </>
    );
}

function DashboardMetric({ label, value, href }: { readonly label: string; readonly value: number; readonly href: string }) {
    return (
        <Link className={styles.metricCard} href={href}>
            <span>{label}</span>
            <strong>{value.toLocaleString()}</strong>
        </Link>
    );
}
