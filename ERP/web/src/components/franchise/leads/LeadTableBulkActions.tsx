'use client';

import { CalendarClock, Undo2 } from 'lucide-react';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import { useAppDialog } from '@/components/common/AppDialogProvider';
import type { LeadDbLayer } from './types';

type LeadTableBulkActionsProps = {
    readonly leadDbLayer: LeadDbLayer;
    readonly selectedCount: number;
    readonly bulkNextContactAt: string;
    readonly isBulkUpdating: boolean;
    readonly onBulkNextContactAtChange: (value: string) => void;
    readonly onApplyBulkNextContact: () => void;
    readonly onReturnSelectedToRawIntake: () => void;
    readonly onClearSelected: () => void;
};

export function LeadTableBulkActions({
    leadDbLayer,
    selectedCount,
    bulkNextContactAt,
    isBulkUpdating,
    onBulkNextContactAtChange,
    onApplyBulkNextContact,
    onReturnSelectedToRawIntake,
    onClearSelected
}: LeadTableBulkActionsProps) {
    const { showConfirm } = useAppDialog();

    if (selectedCount === 0) return null;

    const requestReturnToRawIntake = async () => {
        const confirmed = await showConfirm({
            title: '1차 유입 DB로 이동',
            message: `선택한 ${selectedCount.toLocaleString()}건을 1차 유입 DB로 이동할까요?`,
            confirmText: '이동'
        });
        if (confirmed) onReturnSelectedToRawIntake();
    };

    return (
        <div className={styles.bulkBar}>
            <div>
                <strong>{selectedCount.toLocaleString()}건 선택</strong>
                <span>
                    {leadDbLayer === 'candidate'
                        ? '연락일을 지정하거나 1차 유입 DB로 이동할 수 있습니다.'
                        : '선택한 가맹 희망자의 다음 연락일을 한 번에 지정합니다.'}
                </span>
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
            {leadDbLayer === 'candidate' && (
                <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => void requestReturnToRawIntake()}
                    disabled={isBulkUpdating}
                >
                    <Undo2 size={15} />
                    1차 유입 DB로 이동
                </button>
            )}
            <button type="button" className={styles.secondaryButton} onClick={onClearSelected} disabled={isBulkUpdating}>
                선택 해제
            </button>
        </div>
    );
}
