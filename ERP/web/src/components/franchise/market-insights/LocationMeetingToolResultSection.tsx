import { MEETING_TOOL_DISCLAIMER } from '@/lib/franchise-location-meeting-tool';
import { formatLocationMoney } from '@/lib/franchise-location-master';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import { formatPercent } from './locationMeetingToolDialogUtils';
import type { ReactNode } from 'react';

type LocationMeetingToolResultSectionProps = {
    readonly totalCost: number | null;
    readonly preTaxProfit: number | null;
    readonly profitRatio: number | null;
    readonly reportMemo: string;
    readonly message: string;
    readonly children?: ReactNode;
    readonly onReportMemoChange: (memo: string) => void;
};

export function LocationMeetingToolResultSection({
    totalCost,
    preTaxProfit,
    profitRatio,
    reportMemo,
    message,
    children,
    onReportMemoChange
}: LocationMeetingToolResultSectionProps) {
    return (
        <>
            <section className={styles.meetingToolResultGrid}>
                <div>
                    <span>비용 합계</span>
                    <strong>{formatLocationMoney(totalCost)}</strong>
                </div>
                <div>
                    <span>세전수익</span>
                    <strong>{formatLocationMoney(preTaxProfit)}</strong>
                </div>
                <div>
                    <span>세전 수익률</span>
                    <strong>{formatPercent(profitRatio)}</strong>
                </div>
            </section>

            <label className={styles.meetingToolMemo}>
                보고 메모
                <textarea
                    value={reportMemo}
                    onChange={(event) => onReportMemoChange(event.target.value)}
                    placeholder="상권분석, 목표매출 근거, 리스크를 메모하세요."
                />
            </label>

            {children}

            <p className={styles.meetingToolDisclaimer}>{MEETING_TOOL_DISCLAIMER}</p>
            {message ? <p className={styles.meetingToolMessage}>{message}</p> : null}
        </>
    );
}
