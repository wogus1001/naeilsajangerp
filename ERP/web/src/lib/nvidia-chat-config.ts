export const DEFAULT_NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1';
export const DEFAULT_NVIDIA_MODEL = 'mistralai/mistral-medium-3.5-128b';
export const DEFAULT_NVIDIA_FALLBACK_MODEL = 'nvidia/nemotron-3-nano-30b-a3b';
export const DEFAULT_NVIDIA_REQUEST_TIMEOUT_MS = 25_000;
export const NVIDIA_MIN_REQUEST_TIMEOUT_MS = 5_000;
export const NVIDIA_MAX_REQUEST_TIMEOUT_MS = 45_000;
export const NVIDIA_FALLBACK_REQUEST_TIMEOUT_MS = 15_000;

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
    'mistral-medium-3.5-128b': 'mistralai/mistral-medium-3.5-128b',
    'mistralai/mistral-medium-3.5-128b': DEFAULT_NVIDIA_MODEL,
    'nemotron-3-ultra-550b-a55b': 'nvidia/nemotron-3-ultra-550b-a55b',
    'nemotron-3-nano-30b-a3b': DEFAULT_NVIDIA_FALLBACK_MODEL,
    'nvidia/nemotron-3-nano-30b-a3b': DEFAULT_NVIDIA_FALLBACK_MODEL
};

export function normalizeNvidiaModelId(value: string, fallbackModel: string): string {
    const trimmed = value.trim();
    if (!trimmed) return fallbackModel;
    return NVIDIA_MODEL_ALIASES[trimmed] || trimmed;
}

export function normalizeNvidiaBooleanEnv(value: string): boolean {
    return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

export function buildNvidiaChatCompletionBody({
    forceJson,
    messages,
    model
}: BuildNvidiaChatCompletionBodyInput): Record<string, unknown> {
    const requestBody: Record<string, unknown> = {
        model,
        messages,
        temperature: 0.7,
        top_p: 1,
        max_tokens: 2000,
        stream: false
    };

    if (model.includes('mistral-medium')) {
        requestBody.reasoning_effort = 'high';
    }
    if (model.includes('nemotron')) {
        requestBody.chat_template_kwargs = { enable_thinking: false };
    }
    if (forceJson) {
        requestBody.response_format = { type: 'json_object' };
    }

    return requestBody;
}
