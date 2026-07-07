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
        readonly franchiseIntakeAlertPhones: readonly string[];
    };

type FranchiseIntakeKind = 'property' | 'matchingRequest';

type FranchiseIntakeSmsInput = {
    readonly kind: FranchiseIntakeKind;
    readonly companyName: string | null;
    readonly title: string | null;
    readonly contact: string | null;
    readonly region: string | null;
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

export function buildFranchiseIntakeSmsText(input: FranchiseIntakeSmsInput): string {
    const kindLabel = input.kind === 'property' ? '입점요청 등록' : '예비창업자 등록';
    const company = input.companyName?.trim() || '회사 미지정';
    const title = input.title?.trim() || '제목 미지정';
    const region = input.region?.trim() || '지역 미지정';
    const contact = normalizeSolapiPhone(input.contact);
    const contactLine = contact ? ` / 연락처: ${contact}` : '';
    return `[ERP] ${kindLabel}: ${company} / ${title} / ${region}${contactLine}. 진행현황에서 확인해주세요.`;
}

export function getSolapiNotificationConfig(env: SolapiEnvironment = process.env): SolapiNotificationConfig {
    if (env.SOLAPI_SMS_ENABLED !== 'true') {
        return { enabled: false, reason: 'disabled' };
    }

    const apiKey = env.SOLAPI_API_KEY?.trim() || '';
    const apiSecret = env.SOLAPI_API_SECRET?.trim() || '';
    const senderPhone = normalizeSolapiPhone(env.SOLAPI_SENDER_PHONE);
    const adminAlertPhones = parseAlertRecipients(env.SIGNUP_ADMIN_ALERT_PHONES);
    const franchiseIntakeAlertPhones = parseAlertRecipients(env.FRANCHISE_INTAKE_ALERT_PHONES);

    if (!apiKey || !apiSecret || senderPhone.length < MIN_PHONE_LENGTH) {
        return { enabled: false, reason: 'missing_config' };
    }

    return {
        enabled: true,
        apiKey,
        apiSecret,
        senderPhone,
        adminAlertPhones,
        franchiseIntakeAlertPhones
    };
}

export async function notifyFranchiseIntakeRegistration(input: FranchiseIntakeSmsInput): Promise<void> {
    const config = getSolapiNotificationConfig();
    if (!config.enabled) return;

    const recipients = config.franchiseIntakeAlertPhones.length > 0
        ? config.franchiseIntakeAlertPhones
        : config.adminAlertPhones;
    if (recipients.length === 0) return;

    const messageService = new SolapiMessageService(config.apiKey, config.apiSecret);
    const text = buildFranchiseIntakeSmsText(input);
    await Promise.all(recipients.map(to => messageService.send({
        to,
        from: config.senderPhone,
        text
    })));
}
