"use client";

import React from 'react';
import styles from '../owner.module.css';
import { OwnerPortalFrame, readOwnerApiData, type OwnerTask } from './ownerPortalShared';

export function OwnerOpeningTasksPage() {
    return (
        <OwnerPortalFrame activeKey="tasks">
            {(data, reload) => <OwnerOpeningTasksContent tasks={data.openingProject.tasks} reload={reload} />}
        </OwnerPortalFrame>
    );
}

function OwnerOpeningTasksContent({ tasks, reload }: { readonly tasks: readonly OwnerTask[]; readonly reload: () => Promise<void> }) {
    const [message, setMessage] = React.useState('');
    const [error, setError] = React.useState('');

    const requestTaskCompletion = async (task: OwnerTask) => {
        const taskId = task.id || task.title || task.label || '';
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
                    <h1>오픈 체크리스트</h1>
                    <p>완료한 항목은 본사 승인 요청으로 전달됩니다.</p>
                </div>
                <span className={styles.badge}>{tasks.length}개 항목</span>
            </div>
            <div className={styles.panelBody}>
                {message ? <div className={styles.success}>{message}</div> : null}
                {error ? <div className={styles.error}>{error}</div> : null}
                {tasks.length === 0 ? <div className={styles.emptyState}>진행 중인 체크리스트가 없습니다.</div> : null}
                <div className={styles.taskGrid}>
                    {tasks.map((task, index) => (
                        <article className={styles.listItem} key={task.id || `${task.title}-${index}`}>
                            <div className={styles.listItemHeader}>
                                <strong>{task.title || task.label || `항목 ${index + 1}`}</strong>
                                <span className={styles.badgeMuted}>{task.status || '상태 미지정'}</span>
                            </div>
                            <p>{task.memo || '메모 없음'}</p>
                            <button className={styles.secondaryButton} type="button" onClick={() => void requestTaskCompletion(task)}>
                                완료 요청
                            </button>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}
