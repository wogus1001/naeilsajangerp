export const DEFAULT_NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1';
export const DEFAULT_NVIDIA_MODEL = 'nvidia/nemotron-3-nano-30b-a3b';
export const DEFAULT_NVIDIA_FALLBACK_MODEL = 'meta/llama-3.1-8b-instruct';
export const DEFAULT_NVIDIA_REQUEST_TIMEOUT_MS = 12_000;
export const NVIDIA_MIN_REQUEST_TIMEOUT_MS = 5_000;
export const NVIDIA_MAX_REQUEST_TIMEOUT_MS = 25_000;
export const NVIDIA_PRIMARY_REQUEST_TIMEOUT_MS = 10_000;
export const NVIDIA_FALLBACK_REQUEST_TIMEOUT_MS = 8_000;

type NvidiaChatMessage = {
    readonly role: string;
    readonly content: string;
};

type BuildNvidiaChatCompletionBodyInput = {
    readonly model: string;
    readonly messages: readonly NvidiaChatMessage[];
    readonly forceJson: boolean;
};

const NVIDIA_MODEL_ALIASES: Record<string, string> = {
    'llama-3.1-8b-instruct': 'meta/llama-3.1-8b-instruct',
    'meta/llama-3.1-8b-instruct': DEFAULT_NVIDIA_FALLBACK_MODEL,
    'mistral-medium-3.5-128b': 'mistralai/mistral-medium-3.5-128b',
    'mistralai/mistral-medium-3.5-128b': 'mistralai/mistral-medium-3.5-128b',
    'nemotron-3-ultra-550b-a55b': 'nvidia/nemotron-3-ultra-550b-a55b',
    'nemotron-3-nano-30b-a3b': DEFAULT_NVIDIA_MODEL,
    'nvidia/nemotron-3-nano-30b-a3b': DEFAULT_NVIDIA_MODEL
};

export function normalizeNvidiaModelId(value: string, fallbackModel: string): string {
    const trimmed = value.trim();
    if (!trimmed) return fallbackModel;
    return NVIDIA_MODEL_ALIASES[trimmed] || trimmed;
}

export function normalizeNvidiaBooleanEnv(value: string): boolean {
    return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

export function describeNvidiaProviderIssueForUser(issue: string): string {
    const normalizedIssue = issue.trim();
    if (!normalizedIssue) return 'AI 정리가 일시적으로 원활하지 않습니다.';
    if (/상태 코드:\s*(?:429|500|502|503|504)/u.test(normalizedIssue)) {
        return 'AI 서버가 일시적으로 혼잡합니다.';
    }
    if (/초 안에 끝나지 않아|중단했습니다|timeout|timed out/i.test(normalizedIssue)) {
        return 'AI 응답이 지연되어 요청을 중단했습니다.';
    }
    if (/인증|권한|401|403/u.test(normalizedIssue)) {
        return 'AI 연동 설정을 확인해야 합니다.';
    }
    if (/JSON|보고서 형식|응답 형식/u.test(normalizedIssue)) {
        return 'AI 응답 형식이 맞지 않습니다.';
    }
    return 'AI 정리가 일시적으로 원활하지 않습니다.';
}

export function buildNvidiaChatCompletionBody({
    forceJson,
    messages,
    model
}: BuildNvidiaChatCompletionBodyInput): Record<string, unknown> {
    const requestBody: Record<string, unknown> = {
        model,
        messages,
        temperature: 0.2,
        top_p: 0.8,
        max_tokens: 1100,
        stream: false
    };

    if (model.includes('mistral-medium')) {
        requestBody.reasoning_effort = 'low';
    }
    if (model.includes('nemotron')) {
        requestBody.chat_template_kwargs = { enable_thinking: false };
    }
    if (forceJson) {
        requestBody.response_format = { type: 'json_object' };
    }

    return requestBody;
}
