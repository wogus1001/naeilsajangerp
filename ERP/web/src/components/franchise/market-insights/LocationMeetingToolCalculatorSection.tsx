import { Plus, Trash2 } from 'lucide-react';
import {
    MEETING_TOOL_TARGET_SCENARIOS,
    type MeetingToolCostKey,
    type MeetingToolDraft
} from '@/lib/franchise-location-meeting-tool';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import {
    formatMoneyInputValue,
    formatRatioInputValue
} from './locationMeetingToolDialogUtils';

type LocationMeetingToolCalculatorSectionProps = {
    readonly draft: MeetingToolDraft;
    readonly customCostLabel: string;
    readonly ratioInputValues: Readonly<Record<MeetingToolCostKey, string>>;
    readonly onTargetScenarioChange: (key: MeetingToolDraft['activeTargetKey']) => void;
    readonly onTargetSalesChange: (value: string) => void;
    readonly onCostAmountChange: (key: MeetingToolCostKey, value: string) => void;
    readonly onCostRatioChange: (key: MeetingToolCostKey, value: string) => void;
    readonly onCostRatioBlur: (key: MeetingToolCostKey) => void;
    readonly onCostMemoChange: (key: MeetingToolCostKey, memo: string) => void;
    readonly onRemoveCustomCostRow: (key: MeetingToolCostKey) => void;
    readonly onCustomCostLabelChange: (value: string) => void;
    readonly onAddCustomCost: () => void;
};

export function LocationMeetingToolCalculatorSection({
    draft,
    customCostLabel,
    ratioInputValues,
    onTargetScenarioChange,
    onTargetSalesChange,
    onCostAmountChange,
    onCostRatioChange,
    onCostRatioBlur,
    onCostMemoChange,
    onRemoveCustomCostRow,
    onCustomCostLabelChange,
    onAddCustomCost
}: LocationMeetingToolCalculatorSectionProps) {
    return (
        <>
            <div className={styles.meetingToolControlRow}>
                <div className={styles.meetingToolTargetGroup}>
                    <span className={styles.meetingToolTargetLabel}>목표매출 변화</span>
                    <div className={styles.meetingToolTargetSwitch} aria-label="목표매출 변화 차수">
                        {MEETING_TOOL_TARGET_SCENARIOS.map(scenario => (
                            <button
                                key={scenario.key}
                                type="button"
                                className={scenario.key === draft.activeTargetKey ? styles.meetingToolTargetButtonActive : styles.meetingToolTargetButton}
                                onClick={() => onTargetScenarioChange(scenario.key)}
                            >
                                {scenario.label}
                            </button>
                        ))}
                    </div>
                </div>
                <label className={styles.meetingToolTargetSalesLabel}>
                    목표매출(만원)
                    <input
                        type="text"
                        inputMode="decimal"
                        value={formatMoneyInputValue(draft.targetSales)}
                        onChange={(event) => onTargetSalesChange(event.target.value)}
                        placeholder="4500"
                    />
                </label>
            </div>
            <div className={styles.meetingToolRows}>
                <div className={styles.meetingToolRowHead}>
                    <span>항목</span>
                    <span>금액(만원)</span>
                    <span>비율</span>
                    <span>메모</span>
                </div>
                {draft.costRows.map(row => (
                    <div key={row.key} className={styles.meetingToolRow}>
                        <div className={styles.meetingToolRowLabel}>
                            <strong>{row.label}</strong>
                            {row.custom ? (
                                <button type="button" onClick={() => onRemoveCustomCostRow(row.key)} aria-label={`${row.label} 삭제`}>
                                    <Trash2 size={13} /> 삭제
                                </button>
                            ) : null}
                        </div>
                        <input
                            type="text"
                            inputMode="decimal"
                            value={formatMoneyInputValue(row.amount)}
                            onChange={(event) => onCostAmountChange(row.key, event.target.value)}
                            placeholder="만원"
                        />
                        <input
                            type="text"
                            inputMode="decimal"
                            value={ratioInputValues[row.key] ?? formatRatioInputValue(row.ratio)}
                            onChange={(event) => onCostRatioChange(row.key, event.target.value)}
                            onBlur={() => onCostRatioBlur(row.key)}
                            placeholder="%"
                        />
                        <input
                            value={row.memo}
                            onChange={(event) => onCostMemoChange(row.key, event.target.value)}
                            placeholder="메모"
                        />
                    </div>
                ))}
                <div className={styles.meetingToolCustomRow}>
                    <input
                        value={customCostLabel}
                        onChange={(event) => onCustomCostLabelChange(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                event.preventDefault();
                                onAddCustomCost();
                            }
                        }}
                        placeholder="추가 항목명 예: 배달수수료·광고비"
                    />
                    <button type="button" className={styles.secondaryButton} onClick={onAddCustomCost}>
                        <Plus size={14} /> 항목 추가
                    </button>
                </div>
            </div>
        </>
    );
}
