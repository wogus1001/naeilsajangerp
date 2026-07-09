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
                    <p>운영 중 확인한 항목은 본사 승인 요청으로 전달됩니다.</p>
                </div>
                <span className={styles.badge}>{pendingCount}개 남음</span>
            </div>
            <div className={styles.panelBody}>
                {message ? <div className={styles.success}>{message}</div> : null}
                {error ? <div className={styles.error}>{error}</div> : null}
                <div className={styles.taskProgressPanel}>
                    <div>
                        <strong>{progressPercent}%</strong>
                        <span>{requestedCount}/{tasks.length} 완료 요청</span>
                    </div>
                    <div className={styles.taskProgressTrack} aria-label={`체크리스트 완료 요청률 ${progressPercent}%`}>
                        <span style={{ width: `${progressPercent}%` }} />
                    </div>
                    <p>완료한 항목은 본사 확인 후 처리됩니다. 사진이나 상세 설명이 필요한 항목은 시설 문의로 함께 남겨주세요.</p>
                </div>
                {tasks.length === 0 ? <div className={styles.emptyState}>진행 중인 체크리스트가 없습니다.</div> : null}
                <div className={styles.taskGrid}>
                    {tasks.map((task, index) => {
                        const taskId = getOwnerTaskId(task);
                        const isRequested = Boolean(taskId) && requestedTaskIds.has(taskId);
                        return (
                            <article className={isRequested ? styles.taskCardDone : styles.taskCard} key={task.id || `${task.title}-${index}`}>
                                <div className={styles.taskCardHeader}>
                                    <span>{String(index + 1).padStart(2, '0')}</span>
                                    <div>
                                        <strong>{task.title || task.label || `항목 ${index + 1}`}</strong>
                                        <small>{isRequested ? '본사 확인 대기 중' : '점검 후 완료 요청'}</small>
                                    </div>
                                </div>
                                <p>{task.memo || '별도 안내 문구가 없습니다.'}</p>
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
            </div>
        </section>
    );
}
