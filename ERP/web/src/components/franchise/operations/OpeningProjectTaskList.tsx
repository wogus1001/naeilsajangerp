import {
    OPENING_PROJECT_TASK_STATUSES,
    groupOpeningProjectTasks,
    normalizeOpeningProjectTaskStatus,
    type OpeningProjectTask,
    type OpeningProjectTaskStatus
} from '@/lib/franchise-opening-projects';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';

const OPENING_PROJECT_TASK_STATUS_LABELS = {
    대기: '대기',
    진행중: '진행중',
    확인요청: '확인요청',
    완료: '완료',
    막힘: '이슈'
} as const satisfies Record<OpeningProjectTaskStatus, string>;

type TaskPatch = {
    readonly status?: OpeningProjectTaskStatus;
    readonly owner?: string;
    readonly dueDate?: string;
    readonly memo?: string;
};

type OpeningProjectTaskListProps = {
    readonly tasks: readonly OpeningProjectTask[];
    readonly disabled: boolean;
    readonly onChange: (taskId: string, patch: TaskPatch) => void;
};

export function OpeningProjectTaskList({ tasks, disabled, onChange }: OpeningProjectTaskListProps) {
    const groups = groupOpeningProjectTasks(tasks);

    return (
        <div className={styles.openingTaskGroupList}>
            {groups.map(group => (
                <details key={group.id} className={styles.openingTaskGroup} open>
                    <summary className={styles.openingTaskGroupSummary}>
                        <span>
                            <strong>{group.label}</strong>
                            <small>{group.description}</small>
                        </span>
                        <b>{group.summary.done}/{group.summary.total}</b>
                    </summary>
                    <div className={styles.openingTaskList}>
                        {group.tasks.map(task => (
                            <div key={task.id} className={styles.openingTaskRow}>
                                <div className={styles.openingTaskInfo}>
                                    <strong>{task.label}</strong>
                                    <span>{task.description}</span>
                                    {task.required ? <em>필수</em> : null}
                                </div>
                                <select
                                    value={task.status}
                                    disabled={disabled}
                                    onChange={event => onChange(task.id, { status: normalizeOpeningProjectTaskStatus(event.target.value) })}
                                >
                                    {OPENING_PROJECT_TASK_STATUSES.map(status => (
                                        <option key={status} value={status}>{OPENING_PROJECT_TASK_STATUS_LABELS[status]}</option>
                                    ))}
                                </select>
                                <input
                                    value={task.owner}
                                    placeholder="담당"
                                    disabled={disabled}
                                    onChange={event => onChange(task.id, { owner: event.target.value })}
                                />
                                <input
                                    type="date"
                                    value={task.dueDate}
                                    disabled={disabled}
                                    onChange={event => onChange(task.id, { dueDate: event.target.value })}
                                />
                                <input
                                    value={task.memo}
                                    placeholder="메모"
                                    disabled={disabled}
                                    onChange={event => onChange(task.id, { memo: event.target.value })}
                                />
                            </div>
                        ))}
                    </div>
                </details>
            ))}
        </div>
    );
}
