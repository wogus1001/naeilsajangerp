"use client";

import styles from '../owner.module.css';
import {
    formatOwnerDate,
    OwnerPortalFrame,
    ownerStatusLabel,
    ownerSubmissionTypeLabel
} from './ownerPortalShared';

export function OwnerSubmissionsPage() {
    return (
        <OwnerPortalFrame activeKey="submissions">
            {data => (
                <section className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <div>
                            <h1>제출 이력</h1>
                            <p>본사로 전달한 매장 정보, 체크리스트, 문의 상태입니다.</p>
                        </div>
                        <span className={styles.badge}>{data.submissions.length}건</span>
                    </div>
                    <div className={styles.panelBody}>
                        {data.submissions.length === 0 ? <div className={styles.emptyState}>제출 이력이 없습니다.</div> : null}
                        <div className={styles.list}>
                            {data.submissions.map(submission => (
                                <article className={styles.listItem} key={submission.id}>
                                    <div className={styles.listItemHeader}>
                                        <strong>{submission.title}</strong>
                                        <span className={styles.badgeMuted}>{ownerStatusLabel(submission.status)}</span>
                                    </div>
                                    <span className={styles.itemMeta}>
                                        {ownerSubmissionTypeLabel(submission.submission_type)} · {formatOwnerDate(submission.created_at)}
                                    </span>
                                    {submission.review_note ? <p>{submission.review_note}</p> : null}
                                </article>
                            ))}
                        </div>
                    </div>
                </section>
            )}
        </OwnerPortalFrame>
    );
}
