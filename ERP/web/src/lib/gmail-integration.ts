import crypto from 'crypto';

export const GMAIL_SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send' as const;
export const GMAIL_OAUTH_SCOPES = ['openid', 'email', GMAIL_SEND_SCOPE] as const;

export class GmailIntegrationError extends Error {
    constructor(message: string, readonly statusCode = 500) {
        super(message);
        this.name = 'GmailIntegrationError';
    }
}

export type DisclosureEmailContent = {
    readonly subject: string;
    readonly textBody: string;
    readonly htmlBody: string;
};

function getEncryptionKey() {
    const raw = process.env.GMAIL_TOKEN_ENCRYPTION_KEY || '';
    if (!raw) throw new GmailIntegrationError('GMAIL_TOKEN_ENCRYPTION_KEY가 설정되지 않았습니다.', 424);
    return crypto.createHash('sha256').update(raw).digest();
}

export function isGmailConfigured(): boolean {
    return Boolean(
        process.env.GOOGLE_GMAIL_CLIENT_ID &&
        process.env.GOOGLE_GMAIL_CLIENT_SECRET &&
        process.env.GMAIL_TOKEN_ENCRYPTION_KEY
    );
}

export function encryptGmailToken(token: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
    const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
    return [iv, cipher.getAuthTag(), encrypted].map(part => part.toString('base64url')).join('.');
}

export function decryptGmailToken(value: string): string {
    const [ivRaw, tagRaw, encryptedRaw] = value.split('.');
    if (!ivRaw || !tagRaw || !encryptedRaw) {
        throw new GmailIntegrationError('암호화된 Gmail 토큰 형식이 올바르지 않습니다.', 500);
    }
    const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), Buffer.from(ivRaw, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagRaw, 'base64url'));
    return Buffer.concat([
        decipher.update(Buffer.from(encryptedRaw, 'base64url')),
        decipher.final()
    ]).toString('utf8');
}

export function createDisclosureConfirmationToken(): string {
    return crypto.randomBytes(32).toString('base64url');
}

export function hashDisclosureConfirmationToken(token: string): string {
    return crypto.createHash('sha256').update(token, 'utf8').digest('base64url');
}

export function createDisclosureOpenToken(): string {
    return crypto.randomBytes(32).toString('base64url');
}

export function hashDisclosureOpenToken(token: string): string {
    return crypto.createHash('sha256').update(token, 'utf8').digest('base64url');
}

function encodeHeader(value: string): string {
    const cleanValue = value.replace(/[\r\n]+/g, ' ').trim();
    return /^[\x20-\x7E]*$/.test(cleanValue)
        ? cleanValue
        : `=?UTF-8?B?${Buffer.from(cleanValue, 'utf8').toString('base64')}?=`;
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function buildDisclosureEmailContent(input: {
    readonly leadName: string;
    readonly documentTitle: string;
    readonly documentVersion: string;
    readonly documentUrl: string;
    readonly confirmationUrl: string;
    readonly openTrackingUrl?: string;
    readonly memo?: string;
}): DisclosureEmailContent {
    const title = input.documentTitle.trim();
    const version = input.documentVersion.trim();
    const displayTitle = `${title}${version ? ` (${version})` : ''}`;
    const subject = `[정보공개서] ${title}`;
    const memo = input.memo?.trim();
    const textBody = [
        '안녕하세요. 가맹 상담 담당자입니다.',
        '문의주신 가맹 검토에 필요한 정보공개서를 보내드립니다.',
        `문서명: ${displayTitle}`,
        `정보공개서 확인: ${input.documentUrl}`,
        `수령 확인: ${input.confirmationUrl}`,
        memo ? `전달 메모: ${memo}` : '',
        '가맹사업법에 따라 정보공개서 제공일로부터 14일이 지난 뒤 가맹계약을 진행할 수 있습니다.',
        '확인하시다가 궁금한 점이 있으면 편하게 회신해주세요. 감사합니다.'
    ].filter(Boolean).join('\n\n');
    const htmlBody = [
        '<div style="font-family:-apple-system,BlinkMacSystemFont,Apple SD Gothic Neo,Pretendard,Noto Sans KR,Segoe UI,sans-serif;color:#111827;line-height:1.7;font-size:15px;">',
        '<p style="margin:0 0 10px;">안녕하세요. 가맹 상담 담당자입니다.</p>',
        '<p style="margin:0 0 20px;">문의주신 가맹 검토에 필요한 정보공개서를 보내드립니다. 아래 버튼으로 문서를 확인해주세요.</p>',
        `<p style="margin:0 0 14px;"><strong>${escapeHtml(displayTitle)}</strong></p>`,
        `<p style="margin:0 0 24px;"><a href="${escapeHtml(input.documentUrl)}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:10px 14px;border-radius:8px;font-weight:700;line-height:1.45;">정보공개서 열기</a></p>`,
        '<p style="margin:0 0 10px;">문서를 확인하신 뒤에는 아래 버튼을 눌러 수령 확인을 남겨주세요. 확인 시각은 발송 이력에 안전하게 기록됩니다.</p>',
        `<p style="margin:0 0 20px;"><a href="${escapeHtml(input.confirmationUrl)}" style="display:inline-block;background:#f3f4f6;color:#111827;text-decoration:none;padding:9px 13px;border-radius:8px;font-weight:700;line-height:1.45;">수령 확인하기</a></p>`,
        memo ? `<p style="margin:0 0 18px;padding:12px 14px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;"><strong>전달 메모</strong><br />${escapeHtml(memo)}</p>` : '',
        '<p style="margin:0 0 12px;color:#4b5563;">가맹사업법에 따라 정보공개서 제공일로부터 14일이 지난 뒤 가맹계약을 진행할 수 있습니다.</p>',
        '<p style="margin:0;">확인하시다가 궁금한 점이 있으면 편하게 회신해주세요.<br />감사합니다.</p>',
        input.openTrackingUrl ? `<img src="${escapeHtml(input.openTrackingUrl)}" width="1" height="1" alt="" style="width:1px;height:1px;opacity:0;border:0;outline:none;text-decoration:none;" />` : '',
        '</div>'
    ].filter(Boolean).join('\n');
    return { subject, textBody, htmlBody };
}

export function buildGmailMimeMessage(input: {
    readonly fromEmail: string;
    readonly toEmail: string;
    readonly subject: string;
    readonly textBody: string;
    readonly htmlBody: string;
}): string {
    const boundary = `disclosure-${crypto.randomBytes(10).toString('hex')}`;
    const message = [
        `From: ${encodeHeader(input.fromEmail)}`,
        `To: ${encodeHeader(input.toEmail)}`,
        `Subject: ${encodeHeader(input.subject)}`,
        'MIME-Version: 1.0',
        `Content-Type: multipart/alternative; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        'Content-Type: text/plain; charset="UTF-8"',
        'Content-Transfer-Encoding: 8bit',
        '',
        input.textBody,
        '',
        `--${boundary}`,
        'Content-Type: text/html; charset="UTF-8"',
        'Content-Transfer-Encoding: 8bit',
        '',
        input.htmlBody,
        '',
        `--${boundary}--`
    ].join('\r\n');
    return Buffer.from(message, 'utf8').toString('base64url');
}
