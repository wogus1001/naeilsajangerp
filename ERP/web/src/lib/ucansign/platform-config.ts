export const UCANSIGN_SEND_REQUIRED_ENV = [
    'UCANSIGN_CLIENT_ID',
    'UCANSIGN_CLIENT_SECRET',
    'UCANSIGN_TOKEN_ENCRYPTION_KEY',
    'UCANSIGN_PREMIUM_RIGHTS_TEMPLATE_ID'
] as const;

export const UCANSIGN_WEBHOOK_REQUIRED_ENV = ['UCANSIGN_WEBHOOK_SECRET'] as const;

type EnvSource = Record<string, string | undefined>;

export function missingUcansignSendEnv(env: EnvSource = process.env): readonly string[] {
    return UCANSIGN_SEND_REQUIRED_ENV.filter(name => !env[name]);
}

export function missingUcansignWebhookEnv(env: EnvSource = process.env): readonly string[] {
    return UCANSIGN_WEBHOOK_REQUIRED_ENV.filter(name => !env[name]);
}

export function getPremiumRightsTemplateId(env: EnvSource = process.env): string {
    return env.UCANSIGN_PREMIUM_RIGHTS_TEMPLATE_ID || '';
}
