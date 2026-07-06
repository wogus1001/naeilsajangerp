import {
    normalizeItemResult,
    type SupervisionInspectionItem,
    type SupervisionItemResult
} from './franchise-supervision';

export const SUPERVISION_AI_SUMMARY_MAX_INPUT_LENGTH = 12_000;

const SUPERVISION_AI_SUMMARY_MAX_FIELD_LENGTH = 2_000;
const SUPERVISION_AI_ITEM_MEMO_MAX_LENGTH = 1_000;
const FALLBACK_SENTENCE_LIMIT = 2;

const FALLBACK_ITEM_KEYWORDS: Record<string, readonly string[]> = {
    'sales-traffic': ['매출', '객수', '손님', '고객', '주문', '점심', '저녁', '피크', '배달'],
    cleanliness: ['청결', '청소', '주방', '기름', '오염', '화장실', '테이블', '냉장고', '튀김기', '마감'],
    service: ['서비스', '응대', '직원', '인사', '주문 누락', '대기', '불친절', '친절'],
    quality: ['품질', '맛', '온도', '소스', '계량', '레시피', '조리', '메뉴'],
    'inventory-logistics': ['재고', '물류', '발주', '원재료', '식자재', '배송', '납품'],
    'hq-support': ['본사', '자료', '문구', '지원', '요청', '이벤트'],
    'training-notice': ['교육', '공지', '신메뉴', '매뉴얼', 'POS', '포스', '완료'],
    etc: ['특이사항', '다음', '확인', '사진', '일정', '후속', '요청']
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

export type SupervisionReportAiItemSummary = {
    readonly id: string;
    readonly label: string;
    readonly result: SupervisionItemResult;
    readonly memo: string;
};

export type SupervisionReportAiSummary = {
    readonly overallNote: string;
    readonly specialNote: string;
    readonly inspectionItems: readonly SupervisionReportAiItemSummary[];
};

export type SupervisionReportAiPromptMessage = {
    readonly role: 'system' | 'user';
    readonly content: string;
};

export type ApplySupervisionReportAiSummaryInput = {
    readonly inspectionItems: readonly SupervisionInspectionItem[];
    readonly specialNote: string;
    readonly summary: SupervisionReportAiSummary;
};

export type ApplySupervisionReportAiSummaryResult = {
    readonly inspectionItems: readonly SupervisionInspectionItem[];
    readonly specialNote: string;
};

export type BuildFallbackSupervisionReportAiSummaryInput = {
    readonly transcript: string;
    readonly inspectionItems: readonly SupervisionInspectionItem[];
};

type SupervisionReportAiPromptInput = {
    readonly transcript: string;
    readonly locationName: string;
    readonly supervisorName: string;
    readonly visitDate: string | null;
    readonly purpose: string;
    readonly inspectionItems: readonly SupervisionInspectionItem[];
};

const EMPTY_SUPERVISION_REPORT_AI_SUMMARY: SupervisionReportAiSummary = {
    overallNote: '',
    specialNote: '',
    inspectionItems: []
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cleanSummaryText(value: unknown, maxLength = SUPERVISION_AI_SUMMARY_MAX_FIELD_LENGTH): string {
    if (typeof value !== 'string') return '';
    return value
        .replace(/\r\n?/g, '\n')
        .split('\n')
        .map(line => line.trim())
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
        .slice(0, maxLength);
}

function readTextByKeys(value: Record<string, unknown>, keys: readonly string[], maxLength = SUPERVISION_AI_SUMMARY_MAX_FIELD_LENGTH): string {
    for (const key of keys) {
        const text = cleanSummaryText(value[key], maxLength);
        if (text) return text;
    }
    return '';
}

function readValueByKeys(value: Record<string, unknown>, keys: readonly string[]): unknown {
    for (const key of keys) {
        if (value[key] !== undefined) return value[key];
    }
    return undefined;
}

function stripJsonFence(text: string): string {
    const trimmed = text.trim();
    const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    return (fenced?.[1] || trimmed).trim();
}

function extractJsonObjectText(text: string): string {
    const cleaned = stripJsonFence(text)
        .replace(/^<\/think>\s*/i, '')
        .trim();
    if (cleaned.startsWith('{') && cleaned.endsWith('}')) return cleaned;

    let start = -1;
    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let index = 0; index < cleaned.length; index += 1) {
        const char = cleaned[index];
        if (inString) {
            if (escaped) {
                escaped = false;
                continue;
            }
            if (char === '\\') {
                escaped = true;
                continue;
            }
            if (char === '"') inString = false;
            continue;
        }

        if (char === '"') {
            inString = true;
            continue;
        }
        if (char === '{') {
            if (depth === 0) start = index;
            depth += 1;
            continue;
        }
        if (char === '}') {
            depth -= 1;
            if (depth === 0 && start >= 0) return cleaned.slice(start, index + 1);
        }
    }

    return cleaned;
}

function normalizeAiItem(value: unknown): SupervisionReportAiItemSummary | null {
    if (!isRecord(value)) return null;
    const id = readTextByKeys(value, ['id', 'itemId', 'item_id', 'key', '항목ID'], 120);
    const label = readTextByKeys(value, ['label', 'name', 'title', 'item', '항목', '점검항목'], 120);
    if (!id && !label) return null;
    return {
        id,
        label,
        result: normalizeItemResult(readValueByKeys(value, ['result', 'status', 'grade', '결과', '상태'])),
        memo: readTextByKeys(value, ['memo', 'note', 'notes', 'content', 'description', '내용', '메모'], SUPERVISION_AI_ITEM_MEMO_MAX_LENGTH)
    };
}

function hasSummaryContent(summary: SupervisionReportAiSummary): boolean {
    return Boolean(summary.overallNote || summary.specialNote || summary.inspectionItems.length > 0);
}

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
    return cleanSummaryText(
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
    return cleanSummaryText(followUpSentences.slice(0, 3).join('\n'), SUPERVISION_AI_SUMMARY_MAX_FIELD_LENGTH);
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
            const memo = cleanSummaryText(matchedSentences.join('\n'), SUPERVISION_AI_ITEM_MEMO_MAX_LENGTH);
            if (!memo) return null;
            return {
                id: item.id,
                label: item.label,
                result: classifyFallbackResult(memo),
                memo
            };
        })
        .filter((item): item is SupervisionReportAiItemSummary => item !== null);

    if (summaries.length === 0) {
        const etcItem = inspectionItems.find(item => item.id === 'etc') || inspectionItems[inspectionItems.length - 1];
        if (etcItem) {
            summaries.push({
                id: etcItem.id,
                label: etcItem.label,
                result: classifyFallbackResult(transcript),
                memo: cleanSummaryText(sentences.slice(0, FALLBACK_SENTENCE_LIMIT).join('\n'), SUPERVISION_AI_ITEM_MEMO_MAX_LENGTH)
            });
        }
    }

    return {
        overallNote: buildFallbackOverallNote(sentences),
        specialNote: buildFallbackSpecialNote(sentences),
        inspectionItems: summaries
    };
}

export function normalizeSupervisionReportAiSummary(value: unknown): SupervisionReportAiSummary {
    if (!isRecord(value)) return EMPTY_SUPERVISION_REPORT_AI_SUMMARY;
    const rawInspectionItems = readValueByKeys(value, [
        'inspectionItems',
        'inspection_items',
        'items',
        'checklist',
        'checklistItems',
        'checklist_items',
        '점검항목',
        '체크리스트'
    ]);
    const inspectionItems = Array.isArray(rawInspectionItems)
        ? rawInspectionItems.map(normalizeAiItem).filter(item => item !== null)
        : [];
    return {
        overallNote: readTextByKeys(value, ['overallNote', 'overall_note', 'overallSummary', 'summary', '요약', '종합요약']),
        specialNote: readTextByKeys(value, ['specialNote', 'special_note', 'specialNotes', 'actionItems', 'followUp', '특이사항', '후속조치']),
        inspectionItems
    };
}

export function extractSupervisionReportAiSummaryFromText(text: string): SupervisionReportAiSummary | null {
    const jsonText = extractJsonObjectText(text);
    if (!jsonText) return null;

    try {
        const summary = normalizeSupervisionReportAiSummary(JSON.parse(jsonText));
        return hasSummaryContent(summary) ? summary : null;
    } catch {
        return null;
    }
}

export function validateSupervisionAiTranscript(transcript: string): string {
    const cleaned = transcript.trim();
    if (!cleaned) throw new Error('회의록 또는 현장 메모를 입력해 주세요.');
    if (cleaned.length > SUPERVISION_AI_SUMMARY_MAX_INPUT_LENGTH) {
        throw new Error(`회의록은 ${SUPERVISION_AI_SUMMARY_MAX_INPUT_LENGTH.toLocaleString('ko-KR')}자 이하로 입력해 주세요.`);
    }
    return cleaned;
}

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

export function buildSupervisionReportAiPrompt({
    transcript,
    locationName,
    supervisorName,
    visitDate,
    purpose,
    inspectionItems
}: SupervisionReportAiPromptInput): readonly SupervisionReportAiPromptMessage[] {
    const itemSchema = inspectionItems
        .map(item => `- ${item.id}: ${item.label}`)
        .join('\n');

    return [
        {
            role: 'system',
            content: [
                '너는 프랜차이즈 운영점 SV 점검 보고서를 정리하는 한국어 업무 어시스턴트다.',
                '반드시 JSON 객체만 출력한다. 마크다운, 설명문, 코드블록은 출력하지 않는다.',
                '회의록에 나온 사실만 사용하고 모르는 내용은 빈 문자열로 둔다.',
                '각 점검 항목 result는 "양호", "주의", "개선필요" 중 하나만 사용한다.',
                '법률 판단, 매출 보장, 계약 확정처럼 오해될 문구는 쓰지 않는다.'
            ].join('\n')
        },
        {
            role: 'user',
            content: [
                '아래 현장 메모를 SV 점검 보고서 입력값으로 구조화해 주세요.',
                '',
                '[방문 정보]',
                `운영점: ${locationName || '운영점'}`,
                `SV: ${supervisorName || '담당자'}`,
                `방문일: ${visitDate || '-'}`,
                `방문 목적: ${purpose || '정기점검'}`,
                '',
                '[점검 항목 ID]',
                itemSchema,
                '',
                '출력 JSON schema:',
                '{',
                '  "overallNote": "이번 점검의 한 줄 요약",',
                '  "specialNote": "특이사항 또는 본사 지원 필요사항",',
                '  "inspectionItems": [',
                '    { "id": "점검 항목 ID", "label": "점검 항목명", "result": "양호|주의|개선필요", "memo": "항목별 현장 기록" }',
                '  ]',
                '}',
                '',
                '[현장 메모]',
                transcript
            ].join('\n')
        }
    ];
}
