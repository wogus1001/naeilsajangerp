import {
    MEETING_TOOL_MARKET_REPORT_FIELDS,
    type MeetingToolMarketReport,
    type MeetingToolMarketReportKey
} from '@/lib/franchise-location-meeting-tool-market-report';
import styles from './LocationMeetingTool.module.css';

type LocationMeetingToolMarketReportSectionProps = {
    readonly marketReport: MeetingToolMarketReport;
    readonly onMarketReportChange: (key: MeetingToolMarketReportKey, value: string) => void;
};

export function LocationMeetingToolMarketReportSection({
    marketReport,
    onMarketReportChange
}: LocationMeetingToolMarketReportSectionProps) {
    return (
        <section className={styles.meetingToolMarketReport}>
            <div className={styles.meetingToolSectionHeader}>
                <div>
                    <h4>상권분석·목표매출 근거</h4>
                    <p>리포트 본문과 후보지별 버전 이력에 함께 남길 근거를 정리합니다.</p>
                </div>
            </div>

            <div className={styles.meetingToolMarketGrid}>
                {MEETING_TOOL_MARKET_REPORT_FIELDS.map(field => (
                    <label key={field.key}>
                        <span>{field.label}</span>
                        <textarea
                            value={marketReport[field.key]}
                            onChange={(event) => onMarketReportChange(field.key, event.target.value)}
                            placeholder={field.placeholder}
                        />
                    </label>
                ))}
            </div>
        </section>
    );
}
