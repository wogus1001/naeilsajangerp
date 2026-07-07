import {
    SUPERVISION_AI_SUMMARY_MAX_INPUT_LENGTH,
    SUPERVISION_AI_SUMMARY_MAX_FIELD_LENGTH
} from './franchise-supervision-ai-summary-types';

const PHONE_PATTERN = /(?:\+?82[-.\s]?)?0?1[016789][-\s.]?\d{3,4}[-\s.]?\d{4}/g;
const RESIDENT_REGISTRATION_PATTERN = /\b\d{6}[-\s]?[1-4]\d{6}\b/g;

export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function cleanSummaryText(value: unknown, maxLength = SUPERVISION_AI_SUMMARY_MAX_FIELD_LENGTH): string {
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

export function normalizeAiProviderEnvValue(value: unknown): string {
    if (typeof value !== 'string') return '';
    return value
        .trim()
        .replace(/^["']+/, '')
        .replace(/["']+$/, '')
        .trim();
}

function toReportTone(text: string): string {
    return text
        .replace(/점주님/g, '점주')
        .replace(/사장님/g, '점주')
        .replace(/손님/g, '고객')
        .replace(/점주이/g, '점주가')
        .replace(/고객한테/g, '고객에게')
        .replace(/오늘\s+(.+?)\s+다녀왔고\.?/g, '$1 점검 진행.')
        .replace(/오늘\s+(.+?)\s+방문했고\.?/g, '$1 방문 점검 진행.')
        .replace(/점주(?:와|랑)\s*(.+?)\s*정도\s*얘기함\.?/g, '점주 면담 $1 진행.')
        .replace(/(.+?)\s*정도\s*얘기함\.?/g, '$1 면담 진행.')
        .replace(/(.+?)와\s*얘기함\.?/g, '$1와 면담 진행.')
        .replace(/(.+?)랑\s*얘기함\.?/g, '$1와 면담 진행.')
        .replace(/얘기함\.?/g, '면담 진행.')
        .replace(/체크리스트 다시 주고/g, '체크리스트 재전달')
        .replace(/자료 다시 보내드리기로 함\.?/g, '자료 재전달 예정.')
        .replace(/보내드리기로 함\.?/g, '전달 예정.')
        .replace(/받아보면/g, '수령 후')
        .replace(/확인하면 될 것/g, '확인 예정')
        .replace(/(.+?)라고 하셨습니다\.?/g, '$1라고 언급함.')
        .replace(/(.+?)다고 하셨습니다\.?/g, '$1다고 언급함.')
        .replace(/(.+?)라고 했습니다\.?/g, '$1라고 언급함.')
        .replace(/(.+?)다고 했습니다\.?/g, '$1다고 언급함.')
        .replace(/(.+?)라고 합니다\.?/g, '$1라고 확인됨.')
        .replace(/(.+?)다고 합니다\.?/g, '$1다고 확인됨.')
        .replace(/(.+?)라고 하셨어서/g, '$1라고 언급하여')
        .replace(/(.+?)다고 하셨어서/g, '$1다고 언급하여')
        .replace(/(.+?)라고 하셔서/g, '$1라고 언급하여')
        .replace(/(.+?)다고 하셔서/g, '$1라고 언급하여')
        .replace(/하셨어서/g, '하여')
        .replace(/하셔서/g, '하여')
        .replace(/하셨어요\.?/g, '함.')
        .replace(/하셨어/g, '함')
        .replace(/되었습니다\.?/g, '됨.')
        .replace(/됩니다\.?/g, '됨.')
        .replace(/했습니다\.?/g, '함.')
        .replace(/하였습니다\.?/g, '함.')
        .replace(/합니다\.?/g, '함.')
        .replace(/았습니다\.?/g, '았음.')
        .replace(/었습니다\.?/g, '었음.')
        .replace(/입니다\.?/g, '임.')
        .replace(/였습니다\.?/g, '였음.')
        .replace(/이었습니다\.?/g, '이었음.')
        .replace(/같습니다\.?/g, '것으로 판단됨.')
        .replace(/했어요\.?/g, '함.')
        .replace(/해요\.?/g, '함.')
        .replace(/주세요\.?/g, '필요.')
        .replace(/요\./g, '.')
        .replace(/수령 후 될 것 것으로 판단됨\.?/g, '수령 후 확인 예정.')
        .replace(/자료 다시 보내드리기로 함\.?/g, '자료 재전달 예정.')
        .replace(/보내드리기로 함\.?/g, '전달 예정.')
        .replace(/\s+\./g, '.')
        .replace(/\.{2,}/g, '.')
        .trim();
}

export function cleanReportToneText(value: unknown, maxLength = SUPERVISION_AI_SUMMARY_MAX_FIELD_LENGTH): string {
    return toReportTone(cleanSummaryText(value, maxLength));
}

export function readTextByKeys(value: Record<string, unknown>, keys: readonly string[], maxLength = SUPERVISION_AI_SUMMARY_MAX_FIELD_LENGTH): string {
    for (const key of keys) {
        const text = cleanReportToneText(value[key], maxLength);
        if (text) return text;
    }
    return '';
}

export function readValueByKeys(value: Record<string, unknown>, keys: readonly string[]): unknown {
    for (const key of keys) {
        if (value[key] !== undefined) return value[key];
    }
    return undefined;
}

export function maskSupervisionAiTranscriptSensitiveData(value: string): string {
    return value
        .replace(PHONE_PATTERN, '[전화번호 마스킹]')
        .replace(RESIDENT_REGISTRATION_PATTERN, '[주민등록번호 마스킹]');
}

export function validateSupervisionAiTranscript(transcript: string): string {
    const cleaned = transcript.trim();
    if (!cleaned) throw new Error('회의록 또는 현장 메모를 입력해 주세요.');
    if (cleaned.length > SUPERVISION_AI_SUMMARY_MAX_INPUT_LENGTH) {
        throw new Error(`회의록은 ${SUPERVISION_AI_SUMMARY_MAX_INPUT_LENGTH.toLocaleString('ko-KR')}자 이하로 입력해 주세요.`);
    }
    return cleaned;
}
