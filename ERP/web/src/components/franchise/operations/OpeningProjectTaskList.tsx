import {
    OPENING_PROJECT_TASK_STATUSES,
    type OpeningProjectTask,
    type OpeningProjectTaskStatus
} from '@/lib/franchise-opening-projects';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';

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
    return (
        <div className={styles.openingTaskList}>
            <div className={styles.openingTaskHeader}>
                <span>체크</span>
                <span>상태</span>
                <span>담당</span>
                <span>기한</span>
                <span>메모</span>
            </div>
            {tasks.map(task => (
                <div key={task.id} className={styles.openingTaskRow}>
                    <strong>{task.label}</strong>
                    <select
                        value={task.status}
                        disabled={disabled}
                        onChange={event => onChange(task.id, { status: event.target.value as OpeningProjectTaskStatus })}
                    >
                        {OPENING_PROJECT_TASK_STATUSES.map(status => (
                            <option key={status} value={status}>{status}</option>
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
    );
}
