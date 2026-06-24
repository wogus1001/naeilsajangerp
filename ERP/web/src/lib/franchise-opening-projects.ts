import { OPENING_PROJECT_TASK_GROUPS } from './franchise-opening-project-task-definitions';

export const OPENING_PROJECT_STATUSES = ['준비중', '진행중', '지연', '완료', '보류'] as const;
export const OPENING_PROJECT_TASK_STATUSES = ['대기', '진행중', '확인요청', '완료', '막힘'] as const;

export type OpeningProjectStatus = typeof OPENING_PROJECT_STATUSES[number];
export type OpeningProjectTaskStatus = typeof OPENING_PROJECT_TASK_STATUSES[number];
export type OpeningProjectTaskGroupId = typeof OPENING_PROJECT_TASK_GROUPS[number]['id'];

export type OpeningProjectTaskDefinition = {
    readonly id: string;
    readonly groupId: OpeningProjectTaskGroupId;
    readonly label: string;
    readonly description: string;
    readonly required: boolean;
};

export type OpeningProjectTaskInput = {
    readonly id: string;
    readonly groupId?: string | null;
    readonly label?: string;
    readonly description?: string | null;
    readonly required?: boolean | null;
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
    readonly groupId: OpeningProjectTaskGroupId;
    readonly label: string;
    readonly description: string;
    readonly required: boolean;
    readonly status: OpeningProjectTaskStatus;
    readonly owner: string;
    readonly dueDate: string;
    readonly memo: string;
};

export type OpeningProjectSummary = {
    readonly total: number;
    readonly done: number;
    readonly blocked: number;
    readonly reviewRequested: number;
    readonly dueToday: number;
    readonly overdue: number;
    readonly dueSoon: number;
    readonly progressPercent: number;
};

export type OpeningProjectTaskGroup = {
    readonly id: OpeningProjectTaskGroupId;
    readonly label: string;
    readonly description: string;
    readonly tasks: readonly OpeningProjectTask[];
    readonly summary: OpeningProjectSummary;
};

export const OPENING_PROJECT_TASK_DEFINITIONS: readonly OpeningProjectTaskDefinition[] = OPENING_PROJECT_TASK_GROUPS.flatMap(group =>
    group.tasks.map(task => ({
        ...task,
        groupId: group.id
    }))
);

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
    if (raw.includes('막힘') || raw.includes('이슈') || raw.includes('차단') || raw.includes('blocked')) return '막힘';
    if (raw.includes('확인') || raw.includes('요청')) return '확인요청';
    if (raw.includes('진행')) return '진행중';
    return '대기';
}

export function buildDefaultOpeningProjectTasks(): readonly OpeningProjectTask[] {
    return OPENING_PROJECT_TASK_DEFINITIONS.map(definition => ({
        id: definition.id,
        groupId: definition.groupId,
        label: definition.label,
        description: definition.description,
        required: definition.required,
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
            groupId: definition.groupId,
            label: definition.label,
            description: definition.description,
            required: definition.required,
            status: normalizeOpeningProjectTaskStatus(saved?.status),
            owner: cleanString(saved?.owner),
            dueDate: cleanString(saved?.dueDate),
            memo: cleanString(saved?.memo)
        };
    });
}

function createEmptySummary(): OpeningProjectSummary {
    return {
        total: 0,
        done: 0,
        blocked: 0,
        reviewRequested: 0,
        dueToday: 0,
        overdue: 0,
        dueSoon: 0,
        progressPercent: 0
    };
}

function summarizeNormalizedOpeningProjectTasks(
    normalizedTasks: readonly OpeningProjectTask[],
    now = new Date()
): OpeningProjectSummary {
    const today = toLocalDateStamp(now);
    const dueSoonLimit = today + (DUE_SOON_DAYS * DAY_MS);

    return normalizedTasks.reduce<OpeningProjectSummary>((summary, task) => {
        const done = task.status === '완료';
        const blocked = task.status === '막힘';
        const reviewRequested = task.status === '확인요청';
        const dueDate = task.dueDate ? parseDateStamp(task.dueDate) : null;
        const overdue = !done && dueDate !== null && dueDate < today;
        const dueToday = !done && dueDate !== null && dueDate === today;
        const dueSoon = !done && !overdue && !dueToday && dueDate !== null && dueDate <= dueSoonLimit;
        const nextDone = summary.done + (done ? 1 : 0);

        return {
            total: summary.total + 1,
            done: nextDone,
            blocked: summary.blocked + (blocked ? 1 : 0),
            reviewRequested: summary.reviewRequested + (reviewRequested ? 1 : 0),
            dueToday: summary.dueToday + (dueToday ? 1 : 0),
            overdue: summary.overdue + (overdue ? 1 : 0),
            dueSoon: summary.dueSoon + (dueSoon ? 1 : 0),
            progressPercent: Math.round((nextDone / normalizedTasks.length) * 100)
        };
    }, createEmptySummary());
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
    return summarizeNormalizedOpeningProjectTasks(mergeOpeningProjectTasks(tasks), now);
}

export function groupOpeningProjectTasks(
    tasks: readonly OpeningProjectTaskInput[],
    now = new Date()
): readonly OpeningProjectTaskGroup[] {
    const normalizedTasks = mergeOpeningProjectTasks(tasks);
    return OPENING_PROJECT_TASK_GROUPS.map(group => {
        const groupTasks = normalizedTasks.filter(task => task.groupId === group.id);
        return {
            id: group.id,
            label: group.label,
            description: group.description,
            tasks: groupTasks,
            summary: summarizeNormalizedOpeningProjectTasks(groupTasks, now)
        };
    });
}
