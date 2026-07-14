export type DashboardUpcomingSchedule = {
    readonly id: string | number;
    readonly date: string;
    readonly time: string | null;
    readonly title: string;
    readonly location: string;
    readonly type: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value : null;
}

export function isMissingDashboardScheduleSourceType(error: unknown): boolean {
    if (!isRecord(error)) return false;
    const code = optionalString(error.code);
    const message = optionalString(error.message) || '';
    return ['PGRST204', '42703'].includes(code || '') && /source_type/i.test(message);
}

export function selectDashboardUpcomingSchedules(
    rows: unknown,
    requesterProfileId: string
): readonly DashboardUpcomingSchedule[] {
    if (!Array.isArray(rows)) return [];
    return rows.flatMap(row => {
        if (!isRecord(row)) return [];
        if (optionalString(row.source_type) === 'approval-document') return [];
        if (optionalString(row.scope) === 'personal' && optionalString(row.user_id) !== requesterProfileId) return [];

        const id = typeof row.id === 'string' || typeof row.id === 'number' ? row.id : null;
        const date = optionalString(row.date);
        const title = optionalString(row.title);
        if (id === null || !date || !title) return [];
        return [{
            id,
            date,
            time: optionalString(row.time),
            title,
            location: optionalString(row.location) || '',
            type: optionalString(row.type) || 'schedule'
        }];
    });
}
