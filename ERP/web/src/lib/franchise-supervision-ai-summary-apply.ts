import type {
    ApplySupervisionReportAiSummaryInput,
    ApplySupervisionReportAiSummaryResult,
    SupervisionReportAiQualityWarning,
    SupervisionReportAiSummary
} from './franchise-supervision-ai-summary-types';

const REPORT_TONE_ISSUE_PATTERN = /(합니다|했습니다|해요|하셨습니다|같습니다|라고 합니다|라고 하셨|드리기로|얘기함|다녀왔고)/;
const FOLLOW_UP_HINT_PATTERN = /(필요|예정|확인|요청|재교육|전달|개선|보완|사진|기한|담당|완료|진행)/;

export function applySupervisionReportAiSummary({
    inspectionItems,
    specialNote,
    summary
}: ApplySupervisionReportAiSummaryInput): ApplySupervisionReportAiSummaryResult {
    const summariesById = new Map(summary.inspectionItems.filter(item => item.id).map(item => [item.id, item]));
    const summariesByLabel = new Map(summary.inspectionItems.filter(item => item.label).map(item => [item.label, item]));
    return {
        inspectionItems: inspectionItems.map(item => {
            const next = summariesById.get(item.id) || summariesByLabel.get(item.label);
            if (!next) return item;
            return {
                ...item,
                result: next.result,
                memo: next.memo || item.memo
            };
        }),
        specialNote: summary.specialNote || summary.overallNote || specialNote
    };
}

export function buildSupervisionReportAiQualityWarnings(summary: SupervisionReportAiSummary): readonly SupervisionReportAiQualityWarning[] {
    const warnings: SupervisionReportAiQualityWarning[] = [];
    if (!summary.overallNote.trim()) {
        warnings.push({
            key: 'overall-note-empty',
            label: '요약 확인',
            message: '종합 요약이 비어 있습니다. 적용 전에 방문 핵심 이슈를 보완해 주세요.'
        });
    }

    for (const item of summary.inspectionItems) {
        const label = item.label || item.id || '점검 항목';
        if (REPORT_TONE_ISSUE_PATTERN.test(item.memo)) {
            warnings.push({
                key: `tone-${item.id || label}`,
                label,
                message: '대화체나 존댓말 표현이 남아 있습니다. 보고서 문체로 다듬어 주세요.'
            });
        }
        if (item.result !== '양호' && item.memo.trim().length < 35) {
            warnings.push({
                key: `short-${item.id || label}`,
                label,
                message: '주의/개선필요 항목의 기록이 짧습니다. 현상, 영향, 후속 조치를 보완해 주세요.'
            });
        }
        if (item.result !== '양호' && !FOLLOW_UP_HINT_PATTERN.test(item.memo)) {
            warnings.push({
                key: `follow-up-${item.id || label}`,
                label,
                message: '후속 조치가 명확하지 않습니다. 확인 일정이나 담당 조치를 추가해 주세요.'
            });
        }
        if (item.result !== '양호' && !item.evidence.trim()) {
            warnings.push({
                key: `evidence-${item.id || label}`,
                label,
                message: '원문 근거가 비어 있습니다. 적용 전 판단 근거를 확인해 주세요.'
            });
        }
    }

    return warnings;
}
