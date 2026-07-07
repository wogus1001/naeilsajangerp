import { normalizeItemResult } from './franchise-supervision';
import {
    SUPERVISION_AI_ITEM_MEMO_MAX_LENGTH,
    SUPERVISION_AI_SUMMARY_MAX_FIELD_LENGTH,
    type SupervisionReportAiItemSummary,
    type SupervisionReportAiSummary
} from './franchise-supervision-ai-summary-types';
import {
    isRecord,
    readTextByKeys,
    readValueByKeys
} from './franchise-supervision-ai-summary-text';

const EMPTY_SUPERVISION_REPORT_AI_SUMMARY: SupervisionReportAiSummary = {
    overallNote: '',
    specialNote: '',
    inspectionItems: []
};

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
        memo: readTextByKeys(value, ['memo', 'note', 'notes', 'content', 'description', '내용', '메모'], SUPERVISION_AI_ITEM_MEMO_MAX_LENGTH),
        evidence: readTextByKeys(value, ['evidence', 'source', 'quote', 'basis', '근거', '원문근거'], SUPERVISION_AI_SUMMARY_MAX_FIELD_LENGTH)
    };
}

function hasSummaryContent(summary: SupervisionReportAiSummary): boolean {
    return Boolean(summary.overallNote || summary.specialNote || summary.inspectionItems.length > 0);
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
