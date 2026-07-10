"use client";

import React from 'react';
import { Download } from 'lucide-react';
import { formatFranchiseFileSize } from '@/lib/franchise-file-attachments';
import styles from '../owner.module.css';
import { formatOwnerDate, OwnerPortalFrame, readOwnerApiData, type OwnerNotice } from './ownerPortalShared';

const OWNER_NOTICE_PAGE_SIZE = 5;

export function OwnerNoticesPage() {
    return (
        <OwnerPortalFrame activeKey="notices">
            {(data, reload) => <OwnerNoticesContent notices={data.notices} reload={reload} />}
        </OwnerPortalFrame>
    );
}

function OwnerNoticesContent({ notices, reload }: { readonly notices: readonly OwnerNotice[]; readonly reload: () => Promise<void> }) {
    const [message, setMessage] = React.useState('');
    const [error, setError] = React.useState('');
    const [noticePage, setNoticePage] = React.useState(1);
    const noticePageCount = Math.max(1, Math.ceil(notices.length / OWNER_NOTICE_PAGE_SIZE));
    const safeNoticePage = Math.min(noticePage, noticePageCount);
    const pagedNotices = notices.slice((safeNoticePage - 1) * OWNER_NOTICE_PAGE_SIZE, safeNoticePage * OWNER_NOTICE_PAGE_SIZE);

    React.useEffect(() => {
        setNoticePage(currentPage => Math.min(currentPage, Math.max(1, Math.ceil(notices.length / OWNER_NOTICE_PAGE_SIZE))));
    }, [notices.length]);

    const markNoticeRead = async (noticeId: string) => {
        setMessage('');
        setError('');
        try {
            await readOwnerApiData(await fetch('/api/owner/notices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ noticeId })
            }));
            setMessage('공지 읽음 처리가 완료됐습니다.');
            await reload();
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : '공지 읽음 처리를 하지 못했습니다.');
        }
    };

    return (
        <section className={styles.panel}>
            <div className={styles.panelHeader}>
                <div>
                    <h1>공지/공문</h1>
                    <p>내 매장 대상 공지를 확인하고 읽음 처리합니다.</p>
                </div>
                <span className={styles.badge}>{notices.filter(notice => !notice.readAt).length}건 미확인</span>
            </div>
            <div className={styles.panelBody}>
                {message ? <div className={styles.success}>{message}</div> : null}
                {error ? <div className={styles.error}>{error}</div> : null}
                {notices.length === 0 ? <div className={styles.emptyState}>등록된 공지가 없습니다.</div> : null}
                <div className={styles.list}>
                    {pagedNotices.map(notice => (
                        <article className={styles.listItem} key={notice.id}>
                            <div className={styles.listItemHeader}>
                                <strong>{notice.title}</strong>
                                <span className={notice.readAt ? styles.badgeMuted : styles.badge}>{notice.readAt ? '읽음' : '미확인'}</span>
                            </div>
                            <span className={styles.itemMeta}>{formatOwnerDate(notice.createdAt)}</span>
                            <p>{notice.body}</p>
                            {notice.attachments && notice.attachments.some(attachment => attachment.downloadUrl) ? (
                                <div className={styles.attachmentList}>
                                    {notice.attachments.flatMap(attachment => {
                                        if (!attachment.downloadUrl) return [];
                                        return [(
                                            <a
                                                className={styles.attachmentLink}
                                                href={attachment.downloadUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                download={attachment.name}
                                                key={`${attachment.storagePath}-${attachment.name}`}
                                            >
                                                <Download size={14} />
                                                <span>{attachment.name}</span>
                                                <small>{formatFranchiseFileSize(attachment.size)}</small>
                                            </a>
                                        )];
                                    })}
                                </div>
                            ) : null}
                            {!notice.readAt ? (
                                <button className={styles.secondaryButton} type="button" onClick={() => void markNoticeRead(notice.id)}>
                                    읽음 처리
                                </button>
                            ) : null}
                        </article>
                    ))}
                </div>
                {notices.length > 0 ? (
                    <div className={styles.paginationBar}>
                        <span>총 {notices.length}건</span>
                        <div className={styles.paginationControls}>
                            <button className={styles.paginationButton} type="button" disabled={safeNoticePage <= 1} onClick={() => setNoticePage(page => Math.max(1, page - 1))}>
                                이전
                            </button>
                            <strong>{safeNoticePage} / {noticePageCount}</strong>
                            <button className={styles.paginationButton} type="button" disabled={safeNoticePage >= noticePageCount} onClick={() => setNoticePage(page => Math.min(noticePageCount, page + 1))}>
                                다음
                            </button>
                        </div>
                    </div>
                ) : null}
            </div>
        </section>
    );
}
