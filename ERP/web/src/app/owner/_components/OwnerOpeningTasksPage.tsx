"use client";

import React from 'react';
import styles from '../owner.module.css';
import {
    formatOwnerDate,
    getOwnerTaskId,
    getRequestedOwnerTaskIds,
    type OwnerChecklistIssue,
    OwnerPortalFrame,
    readOwnerApiData,
    type OwnerSubmission,
    type OwnerTask
} from './ownerPortalShared';

const OWNER_CHECKLIST_ISSUE_PAGE_SIZE = 5;

type OwnerChecklistIssueView = {
    readonly id: string;
    readonly issuedAt: string | null;
    readonly tasks: readonly OwnerTask[];
};

export function OwnerOpeningTasksPage() {
    return (
        <OwnerPortalFrame activeKey="tasks">
            {(data, reload) => (
                <OwnerOpeningTasksContent
                    issues={data.openingProject.issues}
                    tasks={data.openingProject.tasks}
                    submissions={data.submissions}
                    reload={reload}
                />
            )}
        </OwnerPortalFrame>
    );
}

function OwnerOpeningTasksContent({
    issues,
    tasks,
    submissions,
    reload
}: {
    readonly issues?: readonly OwnerChecklistIssue[];
    readonly tasks: readonly OwnerTask[];
    readonly submissions: readonly OwnerSubmission[];
    readonly reload: () => Promise<void>;
}) {
    const [message, setMessage] = React.useState('');
    const [error, setError] = React.useState('');
    const [issuePage, setIssuePage] = React.useState(1);
    const requestedTaskIds = React.useMemo(() => getRequestedOwnerTaskIds(submissions), [submissions]);
    const issueItems = React.useMemo(() => buildOwnerChecklistIssueViews(tasks, issues), [tasks, issues]);
    const totalTaskCount = React.useMemo(
        () => issueItems.reduce((sum, issue) => sum + issue.tasks.length, 0),
        [issueItems]
    );
    const requestedCount = React.useMemo(
        () => issueItems.reduce((sum, issue) => sum + countRequestedOwnerTasks(issue.tasks, requestedTaskIds), 0),
        [issueItems, requestedTaskIds]
    );
    const pendingCount = Math.max(totalTaskCount - requestedCount, 0);
    const pageCount = Math.max(1, Math.ceil(issueItems.length / OWNER_CHECKLIST_ISSUE_PAGE_SIZE));
    const currentIssuePage = Math.min(issuePage, pageCount);
    const visibleIssueItems = issueItems.slice(
        (currentIssuePage - 1) * OWNER_CHECKLIST_ISSUE_PAGE_SIZE,
        currentIssuePage * OWNER_CHECKLIST_ISSUE_PAGE_SIZE
    );

    React.useEffect(() => {
        setIssuePage(currentPage => Math.min(currentPage, pageCount));
    }, [pageCount]);

    const requestTaskCompletion = async (task: OwnerTask) => {
        const taskId = getOwnerTaskId(task);
        if (!taskId || requestedTaskIds.has(taskId)) return;
        setMessage('');
        setError('');
        try {
            await readOwnerApiData(await fetch('/api/owner/opening-tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ taskId, taskTitle: task.title || task.label || taskId, memo: task.memo || '' })
            }));
            setMessage('체크리스트 완료 요청을 본사에 전달했습니다.');
            await reload();
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : '완료 요청을 등록하지 못했습니다.');
        }
    };

    return (
        <section className={styles.panel}>
            <div className={styles.panelHeader}>
                <div>
                    <h1>운영 체크리스트</h1>
                    <p>운영 중 확인한 항목은 본사 진행 현황으로 전달됩니다.</p>
                </div>
                <span className={styles.badge}>{pendingCount}개 남음</span>
            </div>
            <div className={styles.panelBody}>
                {message ? <div className={styles.success}>{message}</div> : null}
                {error ? <div className={styles.error}>{error}</div> : null}
                {issueItems.length === 0 ? <div className={styles.emptyState}>진행 중인 체크리스트가 없습니다.</div> : null}
                {issueItems.length > 0 ? (
                    <>
                        <div className={styles.list}>
                            {visibleIssueItems.map(issue => {
                                const issueRequestedCount = countRequestedOwnerTasks(issue.tasks, requestedTaskIds);
                                const issuePendingCount = Math.max(issue.tasks.length - issueRequestedCount, 0);
                                const issueProgressPercent = issue.tasks.length > 0
                                    ? Math.round((issueRequestedCount / issue.tasks.length) * 100)
                                    : 0;
                                const isChecklistComplete = issue.tasks.length > 0 && issuePendingCount === 0;
                                return (
                                    <article className={styles.listItem} key={issue.id}>
                                        <div className={styles.listItemHeader}>
                                            <div className={styles.checklistIssueTitle}>
                                                <strong>{buildOwnerChecklistIssueTitle(issue.tasks)}</strong>
                                                <span className={styles.itemMeta}>
                                                    총 {issue.tasks.length}개 항목 · {issueRequestedCount}/{issue.tasks.length} 완료 요청
                                                </span>
                                                {issue.issuedAt ? <span className={styles.itemMeta}>발송 {formatOwnerDate(issue.issuedAt)}</span> : null}
                                            </div>
                                            <span className={isChecklistComplete ? styles.badgeMuted : styles.badge}>
                                                {isChecklistComplete ? '완료' : '진행 중'}
                                            </span>
                                        </div>
                                        <p>본사가 발송한 운영 체크리스트입니다. 완료한 항목은 아래에서 요청해주세요.</p>
                                        <div className={styles.checklistMeter}>
                                            <div className={styles.checklistMeterHeader}>
                                                <strong>{issueProgressPercent}%</strong>
                                                <span>{issuePendingCount}개 남음</span>
                                            </div>
                                            <div className={styles.taskProgressTrack} aria-label={`체크리스트 완료 요청률 ${issueProgressPercent}%`}>
                                                <span style={{ width: `${issueProgressPercent}%` }} />
                                            </div>
                                        </div>
                                        <details className={styles.checklistDetails}>
                                            <summary>체크리스트 확인하기</summary>
                                            <div className={styles.taskList}>
                                                {issue.tasks.map((task, index) => {
                                                    const taskId = getOwnerTaskId(task);
                                                    const isRequested = Boolean(taskId) && requestedTaskIds.has(taskId);
                                                    return (
                                                        <article className={isRequested ? styles.taskListItemDone : styles.taskListItem} key={task.id || `${issue.id}-${index}`}>
                                                            <div className={styles.taskListMain}>
                                                                <span className={styles.taskIndex}>{String(index + 1).padStart(2, '0')}</span>
                                                                <div>
                                                                    <strong>{task.title || task.label || `항목 ${index + 1}`}</strong>
                                                                    <small>{isRequested ? '본사 확인 대기 중' : '점검 후 완료 요청'}</small>
                                                                    <p>{task.memo || '별도 안내 문구가 없습니다.'}</p>
                                                                </div>
                                                            </div>
                                                            <button
                                                                className={styles.secondaryButton}
                                                                type="button"
                                                                disabled={isRequested}
                                                                onClick={() => void requestTaskCompletion(task)}
                                                            >
                                                                {isRequested ? '요청 완료' : '완료 요청'}
                                                            </button>
                                                        </article>
                                                    );
                                                })}
                                            </div>
                                        </details>
                                    </article>
                                );
                            })}
                        </div>
                        <div className={styles.paginationBar}>
                            <span>총 {issueItems.length}건</span>
                            <div className={styles.paginationControls}>
                                <button
                                    className={styles.paginationButton}
                                    type="button"
                                    disabled={currentIssuePage <= 1}
                                    onClick={() => setIssuePage(currentPage => Math.max(1, currentPage - 1))}
                                >
                                    이전
                                </button>
                                <strong>{currentIssuePage} / {pageCount}</strong>
                                <button
                                    className={styles.paginationButton}
                                    type="button"
                                    disabled={currentIssuePage >= pageCount}
                                    onClick={() => setIssuePage(currentPage => Math.min(pageCount, currentPage + 1))}
                                >
                                    다음
                                </button>
                            </div>
                        </div>
                    </>
                ) : null}
            </div>
        </section>
    );
}

function buildOwnerChecklistIssueViews(
    tasks: readonly OwnerTask[],
    issues: readonly OwnerChecklistIssue[] = []
): readonly OwnerChecklistIssueView[] {
    const validIssues = issues
        .filter(issue => issue.tasks.length > 0)
        .map(issue => ({
            id: issue.id,
            issuedAt: issue.issuedAt,
            tasks: issue.tasks
        }));
    if (validIssues.length > 0) return validIssues;
    if (tasks.length === 0) return [];
    return [{ id: 'owner-checklist-current', issuedAt: null, tasks }];
}

function countRequestedOwnerTasks(tasks: readonly OwnerTask[], requestedTaskIds: ReadonlySet<string>): number {
    return tasks.filter(task => {
        const taskId = getOwnerTaskId(task);
        return Boolean(taskId) && requestedTaskIds.has(taskId);
    }).length;
}

function buildOwnerChecklistIssueTitle(tasks: readonly OwnerTask[]): string {
    const firstTask = tasks[0];
    const firstTitle = firstTask?.title || firstTask?.label || '운영 체크리스트';
    return tasks.length > 1 ? `${firstTitle} 외 ${tasks.length - 1}개` : firstTitle;
}
