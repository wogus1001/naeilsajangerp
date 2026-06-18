"use client";

import { FileSpreadsheet, FileText, Printer } from 'lucide-react';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';

type ExportActionsProps = {
    readonly disabled?: boolean;
    readonly allowEmptyExport?: boolean;
    readonly rowCount: number;
    readonly onExcelAction: () => void | Promise<void>;
    readonly onPdfAction: () => void | Promise<void>;
    readonly onPrintAction: () => void | Promise<void>;
};

export function ExportActions({
    disabled = false,
    allowEmptyExport = false,
    rowCount,
    onExcelAction,
    onPdfAction,
    onPrintAction
}: ExportActionsProps) {
    const isDisabled = disabled || (!allowEmptyExport && rowCount === 0);

    return (
        <div className={styles.exportActions} aria-label="데이터 추출">
            <button type="button" onClick={() => void onExcelAction()} disabled={isDisabled}>
                <FileSpreadsheet size={14} aria-hidden="true" />
                엑셀
            </button>
            <button type="button" onClick={() => void onPdfAction()} disabled={isDisabled}>
                <FileText size={14} aria-hidden="true" />
                PDF 저장
            </button>
            <button type="button" onClick={() => void onPrintAction()} disabled={isDisabled}>
                <Printer size={14} aria-hidden="true" />
                인쇄
            </button>
        </div>
    );
}
