import type {
    SupervisionInspectionItem,
    SupervisionItemResult
} from './franchise-supervision';
import {
    SUPERVISION_AI_ITEM_MEMO_MAX_LENGTH,
    SUPERVISION_AI_SUMMARY_MAX_FIELD_LENGTH,
    type BuildFallbackSupervisionReportAiSummaryInput,
    type SupervisionReportAiItemSummary,
    type SupervisionReportAiSummary
} from './franchise-supervision-ai-summary-types';
import {
    cleanReportToneText,
    cleanSummaryText
} from './franchise-supervision-ai-summary-text';

const FALLBACK_SENTENCE_LIMIT = 2;

const FALLBACK_ITEM_KEYWORDS: Record<string, readonly string[]> = {
    'sales-traffic': ['매출', '객수', '손님', '고객', '주문', '점심', '저녁', '피크', '배달'],
    cleanliness: ['청결', '청소', '주방', '기름', '오염', '화장실', '테이블', '냉장고', '튀김기', '마감'],
    service: ['서비스', '응대', '직원', '인사', '주문 누락', '대기', '불친절', '친절'],
    quality: ['품질', '맛', '온도', '소스', '계량', '레시피', '조리', '메뉴'],
    'inventory-logistics': ['재고', '물류', '발주', '원재료', '식자재', '배송', '납품'],
    'hq-support': ['본사', '자료', '문구', '지원', '요청', '이벤트'],
    'training-notice': ['교육', '공지', '신메뉴', '매뉴얼', 'POS', '포스', '완료'],
    other: ['특이사항', '다음', '확인', '사진', '일정', '후속', '요청']
};

const FALLBACK_IMPROVEMENT_KEYWORDS = [
    '개선필요',
    '개선 필요',
    '문제',
    '미흡',
    '불량',
    '위반',
    '누락',
    '재교육',
    '못',
    '안됨',
    '안 됨',
    '부족',
    '오염',
    '기름때',
    '걱정'
] as const;

const FALLBACK_WARNING_KEYWORDS = [
    '주의',
    '확인',
    '재확인',
    '체크',
    '요청',
    '보완',
    '예정',
    '밀렸',
    '느림',
    '사진',
    '마감',
    '다시',
    '필요'
] as const;

function splitFallbackSentences(text: string): readonly string[] {
    return cleanSummaryText(text, SUPERVISION_AI_SUMMARY_MAX_FIELD_LENGTH)
        .split(/(?:\n+|(?<=[.!?。！？])\s+|(?<=다\.)\s*)/u)
        .map(sentence => sentence.trim())
        .filter(Boolean);
}

function includesAnyKeyword(text: string, keywords: readonly string[]): boolean {
    const lowerText = text.toLowerCase();
    return keywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
}

function labelKeywords(label: string): readonly string[] {
    return label
        .split(/[\/,·\s]+/u)
        .map(part => part.trim())
        .filter(Boolean);
}

function keywordsForItem(item: SupervisionInspectionItem): readonly string[] {
    return [
        ...(FALLBACK_ITEM_KEYWORDS[item.id] || []),
        item.label,
        ...labelKeywords(item.label)
    ].filter(Boolean);
}

function classifyFallbackResult(text: string): SupervisionItemResult {
    if (includesAnyKeyword(text, FALLBACK_IMPROVEMENT_KEYWORDS)) return '개선필요';
    if (includesAnyKeyword(text, FALLBACK_WARNING_KEYWORDS)) return '주의';
    return '양호';
}

function buildFallbackOverallNote(sentences: readonly string[]): string {
    const firstSentences = sentences.slice(0, 2).join('\n');
    return cleanReportToneText(
        firstSentences || 'AI 응답을 읽지 못해 입력한 현장 메모 기준으로 점검 초안을 만들었습니다.',
        SUPERVISION_AI_SUMMARY_MAX_FIELD_LENGTH
    );
}

function buildFallbackSpecialNote(sentences: readonly string[]): string {
    const followUpSentences = sentences.filter(sentence => includesAnyKeyword(sentence, [
        '다음',
        '후속',
        '확인',
        '사진',
        '교육',
        '요청',
        '보내',
        '완료',
        '금요일',
        '3일'
    ]));
    return cleanReportToneText(followUpSentences.slice(0, 3).join('\n'), SUPERVISION_AI_SUMMARY_MAX_FIELD_LENGTH);
}

export function buildFallbackSupervisionReportAiSummary({
    transcript,
    inspectionItems
}: BuildFallbackSupervisionReportAiSummaryInput): SupervisionReportAiSummary {
    const sentences = splitFallbackSentences(transcript);
    const summaries = inspectionItems
        .map(item => {
            const keywords = keywordsForItem(item);
            const matchedSentences = sentences
                .filter(sentence => includesAnyKeyword(sentence, keywords))
                .slice(0, FALLBACK_SENTENCE_LIMIT);
            const memo = cleanReportToneText(matchedSentences.join('\n'), SUPERVISION_AI_ITEM_MEMO_MAX_LENGTH);
            if (!memo) return null;
            return {
                id: item.id,
                label: item.label,
                result: classifyFallbackResult(memo),
                memo,
                evidence: matchedSentences.join('\n')
            };
        })
        .filter((item): item is SupervisionReportAiItemSummary => item !== null);

    if (summaries.length === 0) {
        const etcItem = inspectionItems.find(item => item.id === 'other') || inspectionItems[inspectionItems.length - 1];
        if (etcItem) {
            summaries.push({
                id: etcItem.id,
                label: etcItem.label,
                result: classifyFallbackResult(transcript),
                memo: cleanReportToneText(sentences.slice(0, FALLBACK_SENTENCE_LIMIT).join('\n'), SUPERVISION_AI_ITEM_MEMO_MAX_LENGTH),
                evidence: sentences.slice(0, FALLBACK_SENTENCE_LIMIT).join('\n')
            });
        }
    }

    return {
        overallNote: buildFallbackOverallNote(sentences),
        specialNote: buildFallbackSpecialNote(sentences),
        inspectionItems: summaries
    };
}
