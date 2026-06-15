export const OPENING_PROJECT_STATUSES = ['준비중', '진행중', '지연', '완료', '보류'] as const;
export const OPENING_PROJECT_TASK_STATUSES = ['대기', '진행중', '완료', '막힘'] as const;

export type OpeningProjectStatus = typeof OPENING_PROJECT_STATUSES[number];
export type OpeningProjectTaskStatus = typeof OPENING_PROJECT_TASK_STATUSES[number];

export type OpeningProjectTaskDefinition = {
    readonly id: string;
    readonly label: string;
};

export type OpeningProjectTaskInput = {
    readonly id: string;
    readonly label?: string;
    readonly status?: string | null;
    readonly owner?: string | null;
    readonly dueDate?: string | null;
    readonly memo?: string | null;
};

export type OpeningProjectTaskPatch = {
    readonly status?: string | null;
    readonly owner?: string | null;
    readonly dueDate?: string | null;
    readonly memo?: string | null;
};

export type OpeningProjectTask = {
    readonly id: string;
    readonly label: string;
    readonly status: OpeningProjectTaskStatus;
    readonly owner: string;
    readonly dueDate: string;
    readonly memo: string;
};

export type OpeningProjectSummary = {
    readonly total: number;
    readonly done: number;
    readonly blocked: number;
    readonly overdue: number;
    readonly dueSoon: number;
    readonly progressPercent: number;
};

export const OPENING_PROJECT_TASK_DEFINITIONS = [
    { id: 'contract', label: '계약' },
    { id: 'interior', label: '인테리어' },
    { id: 'training', label: '교육' },
    { id: 'initial-stock', label: '초도물류' },
    { id: 'promotion', label: '홍보' },
    { id: 'open-date', label: '오픈일' }
] as const satisfies readonly OpeningProjectTaskDefinition[];

const DAY_MS = 24 * 60 * 60 * 1000;
const DUE_SOON_DAYS = 7;

function cleanString(value: unknown): string {
    return String(value ?? '').trim();
}

function toLocalDateStamp(value: Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
}

function parseDateStamp(value: string): number | null {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : toLocalDateStamp(parsed);
}

export function normalizeOpeningProjectStatus(value: unknown): OpeningProjectStatus {
    const raw = cleanString(value);
    if (raw.includes('완료')) return '완료';
    if (raw.includes('지연')) return '지연';
    if (raw.includes('보류')) return '보류';
    if (raw.includes('진행')) return '진행중';
    return '준비중';
}

export function normalizeOpeningProjectTaskStatus(value: unknown): OpeningProjectTaskStatus {
    const raw = cleanString(value);
    if (raw.includes('완료')) return '완료';
    if (raw.includes('막힘') || raw.includes('차단') || raw.includes('blocked')) return '막힘';
    if (raw.includes('진행')) return '진행중';
    return '대기';
}

export function buildDefaultOpeningProjectTasks(): readonly OpeningProjectTask[] {
    return OPENING_PROJECT_TASK_DEFINITIONS.map(definition => ({
        id: definition.id,
        label: definition.label,
        status: '대기',
        owner: '',
        dueDate: '',
        memo: ''
    }));
}

export function mergeOpeningProjectTasks(
    tasks: readonly OpeningProjectTaskInput[] | null | undefined
): readonly OpeningProjectTask[] {
    const tasksById = new Map((tasks || []).map(task => [task.id, task]));

    return OPENING_PROJECT_TASK_DEFINITIONS.map(definition => {
        const saved = tasksById.get(definition.id);
        return {
            id: definition.id,
            label: cleanString(saved?.label) || definition.label,
            status: normalizeOpeningProjectTaskStatus(saved?.status),
            owner: cleanString(saved?.owner),
            dueDate: cleanString(saved?.dueDate),
            memo: cleanString(saved?.memo)
        };
    });
}

export function updateOpeningProjectTask(
    tasks: readonly OpeningProjectTaskInput[],
    taskId: string,
    patch: OpeningProjectTaskPatch
): readonly OpeningProjectTask[] {
    return mergeOpeningProjectTasks(tasks).map(task => {
        if (task.id !== taskId) return task;
        return {
            ...task,
            status: patch.status === undefined ? task.status : normalizeOpeningProjectTaskStatus(patch.status),
            owner: patch.owner === undefined ? task.owner : cleanString(patch.owner),
            dueDate: patch.dueDate === undefined ? task.dueDate : cleanString(patch.dueDate),
            memo: patch.memo === undefined ? task.memo : cleanString(patch.memo)
        };
    });
}

export function summarizeOpeningProjectTasks(
    tasks: readonly OpeningProjectTaskInput[],
    now = new Date()
): OpeningProjectSummary {
    const normalizedTasks = mergeOpeningProjectTasks(tasks);
    const today = toLocalDateStamp(now);
    const dueSoonLimit = today + (DUE_SOON_DAYS * DAY_MS);

    return normalizedTasks.reduce<OpeningProjectSummary>((summary, task) => {
        const done = task.status === '완료';
        const blocked = task.status === '막힘';
        const dueDate = task.dueDate ? parseDateStamp(task.dueDate) : null;
        const overdue = !done && dueDate !== null && dueDate < today;
        const dueSoon = !done && !overdue && dueDate !== null && dueDate <= dueSoonLimit;
        const nextDone = summary.done + (done ? 1 : 0);

        return {
            total: summary.total + 1,
            done: nextDone,
            blocked: summary.blocked + (blocked ? 1 : 0),
            overdue: summary.overdue + (overdue ? 1 : 0),
            dueSoon: summary.dueSoon + (dueSoon ? 1 : 0),
            progressPercent: Math.round((nextDone / normalizedTasks.length) * 100)
        };
    }, { total: 0, done: 0, blocked: 0, overdue: 0, dueSoon: 0, progressPercent: 0 });
}
