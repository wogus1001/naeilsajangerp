import Link from 'next/link';
import { Calculator, FileText, Printer, Save } from 'lucide-react';
import styles from './LocationMeetingTool.module.css';

type LocationMeetingToolActionsProps = {
    readonly saving: boolean;
    readonly onSave: () => void;
    readonly onOpenPdf: () => void;
    readonly onPrint: () => void;
    readonly laborPlanningHref?: string;
};

export function LocationMeetingToolActions({
    saving,
    onSave,
    onOpenPdf,
    onPrint,
    laborPlanningHref
}: LocationMeetingToolActionsProps) {
    return (
        <footer className={styles.meetingToolActions}>
            {laborPlanningHref ? (
                <Link href={laborPlanningHref} className={styles.secondaryButton}>
                    <Calculator size={15} /> 인력 세팅
                </Link>
            ) : null}
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
