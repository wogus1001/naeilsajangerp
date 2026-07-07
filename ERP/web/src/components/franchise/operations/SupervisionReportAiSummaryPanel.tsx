'use client';

import React from 'react';
import { ChevronDown, Sparkles } from 'lucide-react';
import {
    buildSupervisionReportAiQualityWarnings,
    SUPERVISION_AI_SUMMARY_MAX_INPUT_LENGTH,
    type SupervisionReportAiItemSummary,
    type SupervisionReportAiSummary
} from '@/lib/franchise-supervision-ai-summary';
import type { SupervisionInspectionItem, SupervisionItemResult } from '@/lib/franchise-supervision';
import { summarizeSupervisionReportRequest } from './supervisionRequests';
import type { SupervisionScope } from './supervisionTypes';
import styles from './SupervisionPanel.module.css';

type EditableAiSummaryItem = SupervisionReportAiItemSummary & {
    readonly selected: boolean;
};

type EditableAiSummary = {
    readonly overallNote: string;
    readonly specialNote: string;
    readonly inspectionItems: readonly EditableAiSummaryItem[];
};

type SupervisionReportAiSummaryPanelProps = SupervisionScope & {
    readonly disabled: boolean;
    readonly inspectionItems: readonly SupervisionInspectionItem[];
    readonly selectedVisitId: string;
    readonly onApplySummary: (summary: SupervisionReportAiSummary) => void;
};

export function SupervisionReportAiSummaryPanel({
    companyName,
    disabled,
    inspectionItems,
    selectedVisitId,
    userId,
    onApplySummary
}: SupervisionReportAiSummaryPanelProps) {
    const [open, setOpen] = React.useState(false);
    const [transcript, setTranscript] = React.useState('');
    const [summary, setSummary] = React.useState<EditableAiSummary | null>(null);
    const [loading, setLoading] = React.useState(false);
    const [message, setMessage] = React.useState('');

    const selectedSummary = React.useMemo<SupervisionReportAiSummary | null>(() => {
        if (!summary) return null;
        return {
            overallNote: summary.overallNote,
            specialNote: summary.specialNote,
            inspectionItems: summary.inspectionItems
                .filter(item => item.selected)
                .map(item => ({
                    id: item.id,
                    label: item.label,
                    result: item.result,
                    memo: item.memo,
                    evidence: item.evidence
                }))
        };
    }, [summary]);

    const qualityWarnings = React.useMemo(
        () => selectedSummary ? buildSupervisionReportAiQualityWarnings(selectedSummary) : [],
        [selectedSummary]
    );

    const summarize = async () => {
        const cleaned = transcript.trim();
        if (!cleaned) {
            setMessage('회의록 또는 현장 메모를 입력해 주세요.');
            return;
        }
        if (!selectedVisitId) {
            setMessage('방문 일정을 먼저 선택해 주세요.');
            return;
        }

        setLoading(true);
        setMessage('AI 정리 요청 중입니다. 보통 10~30초 안에 완료됩니다.');
        try {
            const result = await summarizeSupervisionReportRequest({
                userId,
                companyName,
                visitId: selectedVisitId,
                transcript: cleaned,
                inspectionItems
            });
            setSummary({
                overallNote: result.summary.overallNote,
                specialNote: result.summary.specialNote,
                inspectionItems: result.summary.inspectionItems.map(item => ({
                    ...item,
                    selected: true
                }))
            });
            if (result.model === 'local-fallback') {
                setMessage(result.providerIssue
                    ? `${result.providerIssue} 입력 메모 기준으로 임시 초안을 만들었습니다.`
                    : 'AI 응답을 보고서 형식으로 읽지 못해 입력 메모 기준으로 임시 초안을 만들었습니다.');
            } else {
                setMessage('AI 정리 결과를 불러왔습니다. 적용 전 내용을 확인해 주세요.');
            }
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'AI 점검 보고서 정리에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const applySummary = () => {
        if (!selectedSummary) return;
        onApplySummary(selectedSummary);
        setMessage('미리보기 결과를 점검 보고서에 적용했습니다. 저장 또는 제출을 눌러 반영하세요.');
    };

    const updateSummaryText = (field: 'overallNote' | 'specialNote', value: string) => {
        setSummary(prev => prev ? { ...prev, [field]: value } : prev);
    };

    const updateSummaryItem = (itemIndex: number, patch: Partial<EditableAiSummaryItem>) => {
        setSummary(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                inspectionItems: prev.inspectionItems.map((item, index) => (
                    index === itemIndex ? { ...item, ...patch } : item
                ))
            };
        });
    };

    const setAllItemsSelected = (selected: boolean) => {
        setSummary(prev => prev ? {
            ...prev,
            inspectionItems: prev.inspectionItems.map(item => ({ ...item, selected }))
        } : prev);
    };

    return (
        <section className={styles.aiSummaryPanel}>
            <button
                type="button"
                className={styles.aiSummaryHeader}
                onClick={() => setOpen(prev => !prev)}
                aria-expanded={open}
            >
                <span className={styles.aiSummaryTitle}>
                    <Sparkles size={16} />
                    AI 회의록 정리
                </span>
                <span className={styles.aiSummaryMeta}>
                    <ChevronDown size={16} className={open ? styles.aiSummaryChevronOpen : ''} />
                </span>
            </button>

            {open ? (
                <div className={styles.aiSummaryContent}>
                    <label className={styles.aiSummaryInput}>
                        <span>회의록/현장 메모</span>
                        <textarea
                            value={transcript}
                            maxLength={SUPERVISION_AI_SUMMARY_MAX_INPUT_LENGTH}
                            placeholder="현장 미팅 내용, 점검 메모, 점주 요청사항, 개선 필요사항 등을 붙여넣으세요."
                            onChange={event => setTranscript(event.currentTarget.value)}
                        />
                    </label>
                    <div className={styles.aiSummaryActions}>
                        <p>
                            원문은 저장하지 않고 AI 정리 결과만 점검 항목과 특이사항에 적용합니다.
                            저장 전 개인정보와 확정되지 않은 표현을 확인해 주세요.
                        </p>
                        <button type="button" className={styles.primaryButton} onClick={summarize} disabled={disabled || loading}>
                            {loading ? '정리 중...' : 'AI로 정리'}
                        </button>
                    </div>

                    {summary ? (
                        <div className={styles.aiSummaryPreview}>
                            <div className={styles.reportSectionHeading}>
                                <h4>정리 결과 미리보기</h4>
                                <p>항목별 적용 여부와 문구를 확인한 뒤 점검 보고서에 반영합니다.</p>
                            </div>
                            <div className={styles.aiSummaryPreviewGrid}>
                                <label>
                                    <span>요약</span>
                                    <textarea
                                        value={summary.overallNote}
                                        placeholder="점검 종합 요약"
                                        onChange={event => updateSummaryText('overallNote', event.currentTarget.value)}
                                    />
                                </label>
                                <label>
                                    <span>특이사항</span>
                                    <textarea
                                        value={summary.specialNote}
                                        placeholder="후속 조치, 본사 지원 요청, 사진 확인 일정"
                                        onChange={event => updateSummaryText('specialNote', event.currentTarget.value)}
                                    />
                                </label>
                            </div>
                            <div className={styles.aiSummaryBulkActions}>
                                <button type="button" className={styles.secondaryButton} onClick={() => setAllItemsSelected(true)}>
                                    전체 적용
                                </button>
                                <button type="button" className={styles.secondaryButton} onClick={() => setAllItemsSelected(false)}>
                                    전체 제외
                                </button>
                            </div>
                            <div className={styles.aiSummaryReviewList}>
                                {summary.inspectionItems.length > 0 ? summary.inspectionItems.map((item, itemIndex) => (
                                    <article key={`${item.id}-${item.label}-${itemIndex}`} className={styles.aiSummaryReviewItem}>
                                        <div className={styles.aiSummaryReviewHeader}>
                                            <label className={styles.aiSummaryApplyToggle}>
                                                <input
                                                    type="checkbox"
                                                    checked={item.selected}
                                                    onChange={event => updateSummaryItem(itemIndex, { selected: event.currentTarget.checked })}
                                                />
                                                적용
                                            </label>
                                            <strong>{item.label || item.id}</strong>
                                            <select
                                                value={item.result}
                                                onChange={event => updateSummaryItem(itemIndex, { result: event.currentTarget.value as SupervisionItemResult })}
                                            >
                                                <option value="양호">양호</option>
                                                <option value="주의">주의</option>
                                                <option value="개선필요">개선필요</option>
                                            </select>
                                        </div>
                                        <textarea
                                            value={item.memo}
                                            placeholder="보고서에 적용할 점검 기록"
                                            onChange={event => updateSummaryItem(itemIndex, { memo: event.currentTarget.value })}
                                        />
                                        <div className={styles.aiSummaryEvidence}>
                                            <span>원문 근거</span>
                                            <p>{item.evidence || 'AI가 별도 근거를 반환하지 않았습니다. 원문과 대조해 주세요.'}</p>
                                        </div>
                                    </article>
                                )) : <p className={styles.aiSummaryEmpty}>점검 항목 반영 내용 없음</p>}
                            </div>
                            {qualityWarnings.length > 0 ? (
                                <div className={styles.aiSummaryWarnings}>
                                    <strong>적용 전 확인 필요</strong>
                                    {qualityWarnings.map(warning => (
                                        <p key={warning.key}>
                                            <b>{warning.label}</b>
                                            {warning.message}
                                        </p>
                                    ))}
                                </div>
                            ) : null}
                            <button type="button" className={styles.secondaryButton} onClick={applySummary} disabled={!selectedSummary}>
                                점검 보고서에 적용
                            </button>
                        </div>
                    ) : null}

                    {message ? <p className={styles.aiSummaryMessage}>{message}</p> : null}
                </div>
            ) : null}
        </section>
    );
}
