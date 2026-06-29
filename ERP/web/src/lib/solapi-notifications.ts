import { SolapiMessageService } from 'solapi';

type SolapiEnvironment = Readonly<Record<string, string | undefined>>;

type SolapiNotificationConfig =
    | { readonly enabled: false; readonly reason: 'disabled' | 'missing_config' }
    | {
        readonly enabled: true;
        readonly apiKey: string;
        readonly apiSecret: string;
        readonly senderPhone: string;
        readonly adminAlertPhones: readonly string[];
    };

type SignupRequestSmsInput = {
    readonly companyName: string;
    readonly name: string;
    readonly phone: string;
};

type SignupApprovalSmsInput = {
    readonly phone: string | null;
};

const MIN_PHONE_LENGTH = 9;

export function normalizeSolapiPhone(value: string | null | undefined): string {
    return String(value ?? '').replace(/\D/g, '');
}

export function parseAlertRecipients(value: string | null | undefined): readonly string[] {
    return String(value ?? '')
        .split(',')
        .map(normalizeSolapiPhone)
        .filter(phone => phone.length >= MIN_PHONE_LENGTH);
}

export function buildSignupRequestSmsText(input: SignupRequestSmsInput): string {
    return `[ERP] 신규 회원가입 요청: ${input.companyName} / ${input.name} / ${normalizeSolapiPhone(input.phone)}. 관리자 화면에서 승인 여부를 확인해주세요.`;
}

export function buildSignupApprovalSmsText(): string {
    return '[ERP] 회원가입이 승인되었습니다. 로그인 후 서비스를 이용해주세요.';
}

export function getSolapiNotificationConfig(env: SolapiEnvironment = process.env): SolapiNotificationConfig {
    if (env.SOLAPI_SMS_ENABLED !== 'true') {
        return { enabled: false, reason: 'disabled' };
    }

    const apiKey = env.SOLAPI_API_KEY?.trim() || '';
    const apiSecret = env.SOLAPI_API_SECRET?.trim() || '';
    const senderPhone = normalizeSolapiPhone(env.SOLAPI_SENDER_PHONE);
    const adminAlertPhones = parseAlertRecipients(env.SIGNUP_ADMIN_ALERT_PHONES);

    if (!apiKey || !apiSecret || senderPhone.length < MIN_PHONE_LENGTH) {
        return { enabled: false, reason: 'missing_config' };
    }

    return {
        enabled: true,
        apiKey,
        apiSecret,
        senderPhone,
        adminAlertPhones
    };
}

export async function notifyAdminsOfSignupRequest(input: SignupRequestSmsInput): Promise<void> {
    const config = getSolapiNotificationConfig();
    if (!config.enabled || config.adminAlertPhones.length === 0) return;

    const messageService = new SolapiMessageService(config.apiKey, config.apiSecret);
    const text = buildSignupRequestSmsText(input);
    await Promise.all(config.adminAlertPhones.map(to => messageService.send({
        to,
        from: config.senderPhone,
        text
    })));
}

export async function notifyUserOfSignupApproval(input: SignupApprovalSmsInput): Promise<void> {
    const to = normalizeSolapiPhone(input.phone);
    if (to.length < MIN_PHONE_LENGTH) return;

    const config = getSolapiNotificationConfig();
    if (!config.enabled) return;

    const messageService = new SolapiMessageService(config.apiKey, config.apiSecret);
    await messageService.send({
        to,
        from: config.senderPhone,
        text: buildSignupApprovalSmsText()
    });
}
