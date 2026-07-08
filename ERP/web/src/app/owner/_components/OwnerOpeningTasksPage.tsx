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
                <span className={styles.badge}>{tasks.length}개 항목</span>
            </div>
            <div className={styles.panelBody}>
                {message ? <div className={styles.success}>{message}</div> : null}
                {error ? <div className={styles.error}>{error}</div> : null}
                {tasks.length === 0 ? <div className={styles.emptyState}>진행 중인 체크리스트가 없습니다.</div> : null}
                <div className={styles.taskGrid}>
                    {tasks.map((task, index) => {
                        const taskId = getOwnerTaskId(task);
                        const isRequested = Boolean(taskId) && requestedTaskIds.has(taskId);
                        return (
                            <article className={styles.listItem} key={task.id || `${task.title}-${index}`}>
                                <div className={styles.listItemHeader}>
                                    <strong>{task.title || task.label || `항목 ${index + 1}`}</strong>
                                    <span className={isRequested ? styles.badge : styles.badgeMuted}>
                                        {isRequested ? '요청됨' : '확인 필요'}
                                    </span>
                                </div>
                                <p>{task.memo || '메모 없음'}</p>
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
