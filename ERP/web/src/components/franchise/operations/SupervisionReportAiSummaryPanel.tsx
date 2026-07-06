'use client';

import React from 'react';
import { ChevronDown, Sparkles } from 'lucide-react';
import { SUPERVISION_AI_SUMMARY_MAX_INPUT_LENGTH, type SupervisionReportAiSummary } from '@/lib/franchise-supervision-ai-summary';
import type { SupervisionInspectionItem } from '@/lib/franchise-supervision';
import { summarizeSupervisionReportRequest } from './supervisionRequests';
import type { SupervisionScope } from './supervisionTypes';
import styles from './SupervisionPanel.module.css';

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
    const [summary, setSummary] = React.useState<SupervisionReportAiSummary | null>(null);
    const [loading, setLoading] = React.useState(false);
    const [message, setMessage] = React.useState('');

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
        setMessage('');
        try {
            const result = await summarizeSupervisionReportRequest({
                userId,
                companyName,
                visitId: selectedVisitId,
                transcript: cleaned,
                inspectionItems
            });
            setSummary(result.summary);
            if (result.model === 'local-fallback') {
                setMessage(result.providerIssue
                    ? `${result.providerIssue} 입력 메모 기준으로 임시 초안을 만들었습니다.`
                    : 'NVIDIA 응답을 보고서 형식으로 읽지 못해 입력 메모 기준으로 임시 초안을 만들었습니다.');
            } else {
                setMessage(result.fallbackUsed
                    ? `AI 정리 결과를 불러왔습니다. 대체 요청으로 ${result.model}을 사용했습니다.`
                    : `AI 정리 결과를 불러왔습니다. 사용 모델: ${result.model}`);
            }
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'AI 점검 보고서 정리에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const applySummary = () => {
        if (!summary) return;
        onApplySummary(summary);
        setMessage('미리보기 결과를 점검 보고서에 적용했습니다. 저장 또는 제출을 눌러 반영하세요.');
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
                    NVIDIA NIM
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
                                <p>확인 후 적용하면 체크리스트 메모와 특이사항이 채워집니다.</p>
                            </div>
                            <div className={styles.aiSummaryPreviewGrid}>
                                <div>
                                    <span>요약</span>
                                    <p>{summary.overallNote || '추가 확인 필요'}</p>
                                </div>
                                <div>
                                    <span>특이사항</span>
                                    <p>{summary.specialNote || '추가 확인 필요'}</p>
                                </div>
                            </div>
                            <div className={styles.aiSummaryItemList}>
                                {summary.inspectionItems.length > 0 ? summary.inspectionItems.map(item => (
                                    <span key={`${item.id}-${item.label}`}>
                                        <b>{item.result}</b>
                                        {item.label || item.id}
                                    </span>
                                )) : <span>점검 항목 반영 내용 없음</span>}
                            </div>
                            <button type="button" className={styles.secondaryButton} onClick={applySummary}>
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
