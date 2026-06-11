"use client";

import { CalendarClock } from 'lucide-react';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';

type LeadTableBulkActionsProps = {
    readonly selectedCount: number;
    readonly bulkNextContactAt: string;
    readonly isBulkUpdating: boolean;
    readonly onBulkNextContactAtChange: (value: string) => void;
    readonly onApplyBulkNextContact: () => void;
    readonly onClearSelected: () => void;
};

export function LeadTableBulkActions({
    selectedCount,
    bulkNextContactAt,
    isBulkUpdating,
    onBulkNextContactAtChange,
    onApplyBulkNextContact,
    onClearSelected
}: LeadTableBulkActionsProps) {
    if (selectedCount === 0) return null;

    return (
        <div className={styles.bulkBar}>
            <div>
                <strong>{selectedCount.toLocaleString()}건 선택</strong>
                <span>선택한 가맹 희망자의 다음 연락일을 한 번에 지정합니다.</span>
            </div>
            <input
                type="datetime-local"
                value={bulkNextContactAt}
                onChange={(event) => onBulkNextContactAtChange(event.target.value)}
            />
            <button type="button" className={styles.primaryButton} onClick={onApplyBulkNextContact} disabled={isBulkUpdating}>
                <CalendarClock size={15} />
                {isBulkUpdating ? '적용 중' : '연락일 적용'}
            </button>
            <button type="button" className={styles.secondaryButton} onClick={onClearSelected} disabled={isBulkUpdating}>
                선택 해제
            </button>
        </div>
    );
}
