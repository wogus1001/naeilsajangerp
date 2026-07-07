import { History, RotateCcw, Save } from 'lucide-react';
import { calculateMeetingToolSummary } from '@/lib/franchise-location-meeting-tool';
import {
    formatMeetingToolVersionDisplayTitle,
    type MeetingToolVersion
} from '@/lib/franchise-location-meeting-tool-versions';
import { formatLocationMoney } from '@/lib/franchise-location-master';
import styles from './LocationMeetingTool.module.css';

type LocationMeetingToolVersionPanelProps = {
    readonly versions: readonly MeetingToolVersion[];
    readonly versionTitle: string;
    readonly versionLoading: boolean;
    readonly versionSaving: boolean;
    readonly onVersionTitleChange: (value: string) => void;
    readonly onSaveVersion: () => void;
    readonly onLoadVersion: (version: MeetingToolVersion) => void;
};

function formatPercent(value: number | null): string {
    return value === null ? '-' : `${value.toLocaleString()}%`;
}

function formatVersionDate(value: string | null): string {
    if (!value) return '날짜 미기록';
    const time = new Date(value).getTime();
    if (!Number.isFinite(time)) return '날짜 미기록';
    return new Intl.DateTimeFormat('ko-KR', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    }).format(new Date(time));
}

export function LocationMeetingToolVersionPanel({
    versions,
    versionTitle,
    versionLoading,
    versionSaving,
    onVersionTitleChange,
    onSaveVersion,
    onLoadVersion
}: LocationMeetingToolVersionPanelProps) {
    return (
        <section className={styles.meetingToolVersionPanel}>
            <div className={styles.meetingToolVersionHeader}>
                <div>
                    <h4><History size={15} /> 리포트 버전 이력</h4>
                    <p>이 후보지의 검토안을 시점별로 저장하고 이전안을 다시 불러옵니다.</p>
                </div>
                <div className={styles.meetingToolVersionSave}>
                    <input
                        aria-label="리포트 버전명"
                        value={versionTitle}
                        onChange={(event) => onVersionTitleChange(event.target.value)}
                        placeholder="버전명 예: 임원 보고안"
                    />
                    <button type="button" className={styles.secondaryButton} onClick={onSaveVersion} disabled={versionSaving}>
                        <Save size={14} /> {versionSaving ? '저장 중' : '현재안 버전 저장'}
                    </button>
                </div>
            </div>
            <div className={styles.meetingToolVersionList}>
                {versionLoading ? (
                    <p className={styles.meetingToolVersionEmpty}>버전 이력을 불러오는 중입니다.</p>
                ) : versions.length > 0 ? (
                    versions.map(version => {
                        const summary = calculateMeetingToolSummary(version.meetingTool);
                        return (
                            <div key={version.id} className={styles.meetingToolVersionItem}>
                                <div>
                                    <strong>{formatMeetingToolVersionDisplayTitle(version.versionNumber, version.title)}</strong>
                                    <span>{formatVersionDate(version.createdAt)} · 목표매출 {formatLocationMoney(summary.targetSales)} · 수익률 {formatPercent(summary.profitRatio)}</span>
                                </div>
                                <button type="button" className={styles.secondaryButton} onClick={() => onLoadVersion(version)}>
                                    <RotateCcw size={14} /> 불러오기
                                </button>
                            </div>
                        );
                    })
                ) : (
                    <p className={styles.meetingToolVersionEmpty}>저장된 리포트 버전이 없습니다.</p>
                )}
            </div>
        </section>
    );
}
