import { fail, ok } from '@/lib/api-response';
import { cleanString, canAccessSupervisorResource, isRecord, resolveSupervisionAuth } from '@/lib/franchise-supervision-api';
import { mergeInspectionItems } from '@/lib/franchise-supervision';
import {
    buildFallbackSupervisionReportAiSummary,
    buildSupervisionReportAiPrompt,
    extractSupervisionReportAiSummaryFromText,
    normalizeAiProviderEnvValue,
    validateSupervisionAiTranscript,
    type SupervisionReportAiPromptMessage,
    type SupervisionReportAiSummary
} from '@/lib/franchise-supervision-ai-summary';
import type { SupervisionInspectionItem } from '@/lib/franchise-supervision';
import { fetchVisit, readVisitLocationName } from '../reportRouteSupport';

export const dynamic = 'force-dynamic';

type NvidiaChatMessage = {
    readonly message?: {
        readonly content?: unknown;
    };
};

type SupervisionReportAiResult = {
    readonly summary: SupervisionReportAiSummary;
    readonly model: string;
    readonly fallbackUsed: boolean;
    readonly providerIssue?: string;
};

const DEFAULT_NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1';
const DEFAULT_NVIDIA_MODEL = 'nvidia/nemotron-3-ultra-550b-a55b';
const DEFAULT_NVIDIA_FALLBACK_MODEL = 'mistral-medium-3.5-128b';

function getNvidiaConfig(env: NodeJS.ProcessEnv) {
    return {
        apiKey: normalizeAiProviderEnvValue(env.NVIDIA_API_KEY),
        baseUrl: normalizeAiProviderEnvValue(env.NVIDIA_BASE_URL) || DEFAULT_NVIDIA_BASE_URL,
        model: normalizeAiProviderEnvValue(env.NVIDIA_MODEL) || DEFAULT_NVIDIA_MODEL,
        fallbackModel: normalizeAiProviderEnvValue(env.NVIDIA_FALLBACK_MODEL) || DEFAULT_NVIDIA_FALLBACK_MODEL
    };
}

function readNvidiaContent(payload: unknown): string {
    if (!isRecord(payload) || !Array.isArray(payload.choices)) return '';
    const firstChoice = payload.choices[0] as NvidiaChatMessage | undefined;
    const content = firstChoice?.message?.content;
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
        return content
            .map(part => isRecord(part) && typeof part.text === 'string' ? part.text : '')
            .filter(Boolean)
            .join('\n');
    }
    return '';
}

type NvidiaSummaryRequestResult = {
    readonly summary: SupervisionReportAiSummary | null;
    readonly issue?: string;
};

async function requestNvidiaSummary(input: {
    readonly apiKey: string;
    readonly baseUrl: string;
    readonly model: string;
    readonly messages: readonly SupervisionReportAiPromptMessage[];
    readonly fetcher: typeof fetch;
    readonly forceJson: boolean;
}): Promise<NvidiaSummaryRequestResult> {
    const requestBody: Record<string, unknown> = {
        model: input.model,
        messages: input.messages,
        temperature: 0.2,
        top_p: 0.95,
        max_tokens: 1600
    };
    if (input.forceJson) requestBody.response_format = { type: 'json_object' };

    const response = await input.fetcher(`${input.baseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${input.apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    });

    const payload: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
        const issue = response.status === 401 || response.status === 403
            ? 'NVIDIA 인증에 실패했습니다. NVIDIA_API_KEY 값을 확인해 주세요.'
            : `NVIDIA 요청이 실패했습니다. 상태 코드: ${response.status}`;
        console.warn('Franchise supervision AI summary NVIDIA request failed:', {
            model: input.model,
            status: response.status,
            forceJson: input.forceJson,
            issue
        });
        return { summary: null, issue };
    }

    const summary = extractSupervisionReportAiSummaryFromText(readNvidiaContent(payload));
    if (!summary) {
        const issue = 'NVIDIA 응답을 JSON 보고서 형식으로 읽지 못했습니다.';
        console.warn('Franchise supervision AI summary parse failed:', {
            model: input.model,
            forceJson: input.forceJson,
            issue
        });
        return { summary: null, issue };
    }
    return { summary };
}

async function summarizeWithNvidia(input: {
    readonly env: NodeJS.ProcessEnv;
    readonly fetcher: typeof fetch;
    readonly messages: readonly SupervisionReportAiPromptMessage[];
    readonly transcript: string;
    readonly inspectionItems: readonly SupervisionInspectionItem[];
}): Promise<SupervisionReportAiResult> {
    const { apiKey, baseUrl, model, fallbackModel } = getNvidiaConfig(input.env);
    if (!apiKey) throw new Error('NVIDIA_API_KEY 환경변수 설정이 필요합니다.');
    const issues: string[] = [];

    const primaryJsonSummary = await requestNvidiaSummary({
        apiKey,
        baseUrl,
        model,
        messages: input.messages,
        fetcher: input.fetcher,
        forceJson: true
    });
    if (primaryJsonSummary.summary) return { summary: primaryJsonSummary.summary, model, fallbackUsed: false };
    if (primaryJsonSummary.issue) issues.push(primaryJsonSummary.issue);

    const primaryLooseSummary = await requestNvidiaSummary({
        apiKey,
        baseUrl,
        model,
        messages: input.messages,
        fetcher: input.fetcher,
        forceJson: false
    });
    if (primaryLooseSummary.summary) return { summary: primaryLooseSummary.summary, model, fallbackUsed: true };
    if (primaryLooseSummary.issue) issues.push(primaryLooseSummary.issue);

    if (fallbackModel && fallbackModel !== model) {
        const fallbackSummary = await requestNvidiaSummary({
            apiKey,
            baseUrl,
            model: fallbackModel,
            messages: input.messages,
            fetcher: input.fetcher,
            forceJson: true
        });
        if (fallbackSummary.summary) return { summary: fallbackSummary.summary, model: fallbackModel, fallbackUsed: true };
        if (fallbackSummary.issue) issues.push(fallbackSummary.issue);

        const fallbackLooseSummary = await requestNvidiaSummary({
            apiKey,
            baseUrl,
            model: fallbackModel,
            messages: input.messages,
            fetcher: input.fetcher,
            forceJson: false
        });
        if (fallbackLooseSummary.summary) return { summary: fallbackLooseSummary.summary, model: fallbackModel, fallbackUsed: true };
        if (fallbackLooseSummary.issue) issues.push(fallbackLooseSummary.issue);
    }

    return {
        summary: buildFallbackSupervisionReportAiSummary({
            transcript: input.transcript,
            inspectionItems: input.inspectionItems
        }),
        model: 'local-fallback',
        fallbackUsed: true,
        providerIssue: issues[0]
    };
}

export async function POST(request: Request) {
    try {
        const authResult = await resolveSupervisionAuth(request);
        if (!authResult.ok) return authResult.response;

        const parsed: unknown = await request.json().catch(() => null);
        if (!isRecord(parsed)) return fail(400, 'VALIDATION_ERROR', 'Invalid request body');

        const visitId = cleanString(parsed.visitId);
        if (!visitId) return fail(400, 'VALIDATION_ERROR', 'visitId is required');

        let transcript: string;
        try {
            transcript = validateSupervisionAiTranscript(cleanString(parsed.transcript));
        } catch (error) {
            return fail(400, 'VALIDATION_ERROR', error instanceof Error ? error.message : 'Invalid transcript');
        }

        const visit = await fetchVisit({ id: visitId, supabaseAdmin: authResult.auth.supabaseAdmin });
        if (!visit) return fail(404, 'NOT_FOUND', '방문 일정을 찾을 수 없습니다.');
        if (!canAccessSupervisorResource(authResult.auth.requester, visit)) {
            return fail(403, 'FORBIDDEN', '슈퍼바이징 접근 권한이 없습니다.');
        }

        const inspectionItems = mergeInspectionItems(parsed.inspectionItems);
        const result = await summarizeWithNvidia({
            env: process.env,
            fetcher: fetch,
            transcript,
            inspectionItems,
            messages: buildSupervisionReportAiPrompt({
                transcript,
                locationName: readVisitLocationName(visit),
                supervisorName: '담당자',
                visitDate: visit.visit_date,
                purpose: cleanString(visit.purpose) || '정기점검',
                inspectionItems
            })
        });

        return ok(result);
    } catch (error) {
        console.error('Franchise supervision report AI summary POST error:', error);
        return fail(500, 'INTERNAL_ERROR', error instanceof Error ? error.message : 'Failed to summarize supervision report note');
    }
}
