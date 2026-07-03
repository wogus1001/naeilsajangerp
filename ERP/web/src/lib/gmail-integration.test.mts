import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    buildDisclosureEmailContent,
    buildGmailMimeMessage,
    createDisclosureConfirmationToken,
    decryptGmailToken,
    encryptGmailToken,
    hashDisclosureConfirmationToken
} from './gmail-integration.js';

process.env.GMAIL_TOKEN_ENCRYPTION_KEY = 'unit-test-gmail-token-key';

test('encryptGmailToken round-trips without storing the raw token', () => {
    const encrypted = encryptGmailToken('ya29.test-token');

    assert.notEqual(encrypted, 'ya29.test-token');
    assert.equal(decryptGmailToken(encrypted), 'ya29.test-token');
});

test('buildGmailMimeMessage creates a Gmail raw MIME payload', () => {
    const content = buildDisclosureEmailContent({
        leadName: '김테스트',
        documentTitle: '미카도 정보공개서',
        documentVersion: '2026',
        documentUrl: 'https://example.com/disclosure.pdf',
        confirmationUrl: 'https://example.com/api/franchise-lead-disclosures/confirm?token=abc',
        openTrackingUrl: 'https://example.com/api/franchise-lead-disclosures/open?token=open',
        memo: '검토 부탁드립니다.'
    });
    const raw = buildGmailMimeMessage({
        fromEmail: 'sender@example.com',
        toEmail: 'lead@example.com',
        subject: content.subject,
        textBody: content.textBody,
        htmlBody: content.htmlBody
    });
    const decoded = Buffer.from(raw, 'base64url').toString('utf8');

    assert.match(decoded, /From: sender@example\.com/);
    assert.match(decoded, /To: lead@example\.com/);
    assert.match(decoded, /Content-Type: multipart\/alternative/);
    assert.match(decoded, /https:\/\/example\.com\/disclosure\.pdf/);
    assert.match(decoded, /수령 확인/);
    assert.match(decoded, /franchise-lead-disclosures\/open\?token=open/);
    assert.match(decoded, /<p style="margin:0 0 24px;"><a[^>]+>정보공개서 열기/);
    assert.match(decoded, /문서 확인 후에는 가맹사업법상 숙고기간 산정을 위해 반드시 수령 확인하기 버튼을 눌러주세요/);
    assert.match(decoded, /가맹사업법에 따라 정보공개서 제공일로부터 14일이 지난 뒤 가맹계약을 진행할 수 있습니다\.[\s\S]*<p style="margin:0 0 20px;"><a[^>]+background:#2563eb[^>]+>수령 확인하기/);
    assert.doesNotMatch(decoded, /확인 시각은 발송 이력에 안전하게 기록됩니다/);
    assert.doesNotMatch(decoded, /김테스트님/);
    assert.match(decoded, /가맹 상담 담당자입니다/);
});

test('hashDisclosureConfirmationToken produces a stable non-raw token hash', () => {
    const token = createDisclosureConfirmationToken();
    const hash = hashDisclosureConfirmationToken(token);

    assert.equal(hash, hashDisclosureConfirmationToken(token));
    assert.notEqual(hash, token);
    assert.ok(token.length >= 32);
});
