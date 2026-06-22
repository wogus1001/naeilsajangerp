export const UCANSIGN_PLATFORM_REQUIRED_ENV = ['UCANSIGN_API_KEY'] as const;

export const UCANSIGN_PREMIUM_RIGHTS_REQUIRED_ENV = [
    ...UCANSIGN_PLATFORM_REQUIRED_ENV,
    'UCANSIGN_PREMIUM_RIGHTS_TEMPLATE_ID'
] as const;

export const UCANSIGN_WEBHOOK_REQUIRED_ENV = ['UCANSIGN_WEBHOOK_SECRET'] as const;

type EnvSource = Record<string, string | undefined>;

export function missingUcansignPlatformEnv(env: EnvSource = process.env): readonly string[] {
    return UCANSIGN_PLATFORM_REQUIRED_ENV.filter(name => !env[name]);
}

export function missingUcansignPremiumRightsEnv(env: EnvSource = process.env): readonly string[] {
    return UCANSIGN_PREMIUM_RIGHTS_REQUIRED_ENV.filter(name => !env[name]);
}

export function missingUcansignSendEnv(env: EnvSource = process.env): readonly string[] {
    return missingUcansignPremiumRightsEnv(env);
}

export function missingUcansignWebhookEnv(env: EnvSource = process.env): readonly string[] {
    return UCANSIGN_WEBHOOK_REQUIRED_ENV.filter(name => !env[name]);
}

export function getPremiumRightsTemplateId(env: EnvSource = process.env): string {
    return env.UCANSIGN_PREMIUM_RIGHTS_TEMPLATE_ID || '';
}
