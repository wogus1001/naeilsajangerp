export function formatApprovalDate(value?: string | null): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('ko-KR', {
        dateStyle: 'medium',
        timeZone: 'Asia/Seoul'
    }).format(date);
}

export function isApprovalDelayed(value?: string | null): boolean {
    if (!value) return false;
    const dueAt = new Date(value).getTime();
    return Number.isFinite(dueAt) && dueAt < Date.now();
}
