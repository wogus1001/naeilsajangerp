import { FileText, Printer, Save } from 'lucide-react';
import styles from './LocationMeetingTool.module.css';

type LocationMeetingToolActionsProps = {
    readonly saving: boolean;
    readonly onSave: () => void;
    readonly onOpenPdf: () => void;
    readonly onPrint: () => void;
};

export function LocationMeetingToolActions({
    saving,
    onSave,
    onOpenPdf,
    onPrint
}: LocationMeetingToolActionsProps) {
    return (
        <footer className={styles.meetingToolActions}>
            <button type="button" className={styles.secondaryButton} onClick={onOpenPdf}>
                <FileText size={15} /> PDF 저장
            </button>
            <button type="button" className={styles.secondaryButton} onClick={onPrint}>
                <Printer size={15} /> 인쇄
            </button>
            <button type="button" className={styles.primaryButton} onClick={onSave} disabled={saving}>
                <Save size={15} /> {saving ? '저장 중' : '저장'}
            </button>
        </footer>
    );
}
