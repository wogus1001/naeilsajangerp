export type PlatformOperationKind = 'schedule_sync' | 'file_cleanup' | 'alimtalk';

export type PlatformOperationStatus = 'pending' | 'processing' | 'failed' | 'completed' | 'blocked';

export type PlatformOperationItem = {
    readonly id: string;
    readonly kind: PlatformOperationKind;
    readonly companyId: string | null;
    readonly title: string;
    readonly detail: string;
    readonly status: PlatformOperationStatus;
    readonly attemptCount: number;
    readonly occurredAt: string;
    readonly canRetry: boolean;
};

export type PlatformOperationsSummary = {
    readonly needsAttention: number;
    readonly failed: number;
    readonly pending: number;
    readonly blocked: number;
};

export function summarizePlatformOperations(items: readonly PlatformOperationItem[]): PlatformOperationsSummary {
    return items.reduce<PlatformOperationsSummary>((summary, item) => ({
        needsAttention: summary.needsAttention + (item.status === 'failed' || item.status === 'blocked' ? 1 : 0),
        failed: summary.failed + (item.status === 'failed' ? 1 : 0),
        pending: summary.pending + (item.status === 'pending' || item.status === 'processing' ? 1 : 0),
        blocked: summary.blocked + (item.status === 'blocked' ? 1 : 0)
    }), { needsAttention: 0, failed: 0, pending: 0, blocked: 0 });
}

export function getPlatformOperationKindLabel(kind: PlatformOperationKind): string {
    if (kind === 'schedule_sync') return '일정 동기화';
    if (kind === 'file_cleanup') return '파일 정리';
    return '알림톡 발송';
}

export function getPlatformOperationStatusLabel(status: PlatformOperationStatus): string {
    if (status === 'pending') return '처리 대기';
    if (status === 'processing') return '처리 중';
    if (status === 'failed') return '실패';
    if (status === 'blocked') return '차단';
    return '완료';
}
