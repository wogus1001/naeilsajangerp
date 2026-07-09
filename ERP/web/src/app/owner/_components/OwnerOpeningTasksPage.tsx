"use client";

import React from 'react';
import styles from '../owner.module.css';
import {
    getOwnerTaskId,
    getRequestedOwnerTaskIds,
    OwnerPortalFrame,
    readOwnerApiData,
    type OwnerSubmission,
    type OwnerTask
} from './ownerPortalShared';

export function OwnerOpeningTasksPage() {
    return (
        <OwnerPortalFrame activeKey="tasks">
            {(data, reload) => (
                <OwnerOpeningTasksContent
                    tasks={data.openingProject.tasks}
                    submissions={data.submissions}
                    reload={reload}
                />
            )}
        </OwnerPortalFrame>
    );
}

function OwnerOpeningTasksContent({
    tasks,
    submissions,
    reload
}: {
    readonly tasks: readonly OwnerTask[];
    readonly submissions: readonly OwnerSubmission[];
    readonly reload: () => Promise<void>;
}) {
    const [message, setMessage] = React.useState('');
    const [error, setError] = React.useState('');
    const requestedTaskIds = React.useMemo(() => getRequestedOwnerTaskIds(submissions), [submissions]);
    const requestedCount = tasks.filter(task => {
        const taskId = getOwnerTaskId(task);
        return Boolean(taskId) && requestedTaskIds.has(taskId);
    }).length;
    const pendingCount = Math.max(tasks.length - requestedCount, 0);
    const progressPercent = tasks.length > 0 ? Math.round((requestedCount / tasks.length) * 100) : 0;
    const isChecklistComplete = tasks.length > 0 && pendingCount === 0;

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
                {tasks.length === 0 ? <div className={styles.emptyState}>진행 중인 체크리스트가 없습니다.</div> : null}
                {tasks.length > 0 ? (
                    <>
                        <div className={styles.list}>
                            <article className={styles.listItem}>
                                <div className={styles.listItemHeader}>
                                    <div className={styles.checklistIssueTitle}>
                                        <strong>운영 체크리스트</strong>
                                        <span className={styles.itemMeta}>
                                            총 {tasks.length}개 항목 · {requestedCount}/{tasks.length} 완료 요청
                                        </span>
                                    </div>
                                    <span className={isChecklistComplete ? styles.badgeMuted : styles.badge}>
                                        {isChecklistComplete ? '완료' : '진행 중'}
                                    </span>
                                </div>
                                <p>본사가 발송한 운영 체크리스트입니다. 완료한 항목은 아래에서 요청해주세요.</p>
                                <div className={styles.checklistMeter}>
                                    <div className={styles.checklistMeterHeader}>
                                        <strong>{progressPercent}%</strong>
                                        <span>{pendingCount}개 남음</span>
                                    </div>
                                    <div className={styles.taskProgressTrack} aria-label={`체크리스트 완료 요청률 ${progressPercent}%`}>
                                        <span style={{ width: `${progressPercent}%` }} />
                                    </div>
                                </div>
                                <details className={styles.checklistDetails}>
                                    <summary>항목별 완료 요청 보기</summary>
                                    <div className={styles.taskList}>
                                        {tasks.map((task, index) => {
                                            const taskId = getOwnerTaskId(task);
                                            const isRequested = Boolean(taskId) && requestedTaskIds.has(taskId);
                                            return (
                                                <article className={isRequested ? styles.taskListItemDone : styles.taskListItem} key={task.id || `${task.title}-${index}`}>
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
                        </div>
                        <div className={styles.paginationBar}>
                            <span>총 1건</span>
                            <div className={styles.paginationControls}>
                                <button className={styles.paginationButton} type="button" disabled>
                                    이전
                                </button>
                                <strong>1 / 1</strong>
                                <button className={styles.paginationButton} type="button" disabled>
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
