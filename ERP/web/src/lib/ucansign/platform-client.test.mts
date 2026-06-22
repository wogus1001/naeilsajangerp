import assert from 'node:assert/strict';
import { test } from 'node:test';
import JSZip from 'jszip';
import {
    extractApiKeyAccessToken,
    extractUcansignDocumentId,
    extractUcansignFileUrl,
    extractUcansignTemplateName,
    normalizePlatformDocumentFile,
    platformTemplateSignProgressUrl
} from './platform-client.js';

test('Given UCanSign API key token response When extracting token Then access token is returned', () => {
    assert.equal(
        extractApiKeyAccessToken({
            code: 0,
            msg: 'success',
            result: { accessToken: 'access-token-1' }
        }),
        'access-token-1'
    );
});

test('Given malformed UCanSign token response When extracting token Then empty string is returned', () => {
    assert.equal(extractApiKeyAccessToken({ code: 1, msg: 'failed' }), '');
    assert.equal(extractApiKeyAccessToken({ result: { accessToken: '' } }), '');
});

test('Given UCanSign template detail response When extracting name Then known name fields are supported', () => {
    assert.equal(extractUcansignTemplateName({ result: { name: '샘플' } }), '샘플');
    assert.equal(extractUcansignTemplateName({ result: { documentName: '권리금 계약서' } }), '권리금 계약서');
    assert.equal(extractUcansignTemplateName({ templateName: '업로드 양식' }), '업로드 양식');
});

test('Given UCanSign send response When document id is nested Then document id is returned', () => {
    assert.equal(extractUcansignDocumentId({ result: { documentId: '2068871675408027649' } }), '2068871675408027649');
    assert.equal(extractUcansignDocumentId({ result: { document: { id: '2068871675408027650' } } }), '2068871675408027650');
    assert.equal(extractUcansignDocumentId({ data: { document: { documentId: 12345 } } }), '12345');
});

test('Given UCanSign template id When building sign progress url Then saved template flow is opened directly', () => {
    assert.equal(
        platformTemplateSignProgressUrl('2068854428568391681'),
        'https://app.ucansign.com/signCreating/progress/2068854428568391681'
    );
    assert.equal(
        platformTemplateSignProgressUrl('id with space'),
        'https://app.ucansign.com/signCreating/progress/id%20with%20space'
    );
});

test('Given UCanSign download response When file url is nested Then file url is returned', () => {
    assert.equal(
        extractUcansignFileUrl({ result: { file: 'https://download.example.com/contract.pdf' } }),
        'https://download.example.com/contract.pdf'
    );
    assert.equal(
        extractUcansignFileUrl({ data: { downloadUrl: 'https://download.example.com/full.pdf' } }),
        'https://download.example.com/full.pdf'
    );
});

test('Given UCanSign full-file zip When normalizing document file Then the main PDF is returned', async () => {
    const zip = new JSZip();
    zip.file('contract/contract.pdf', '%PDF-1.5\nmain-document'.repeat(30));
    zip.file('contract/audit.pdf', '%PDF-1.5\naudit');
    zip.file('contract/page.png', 'png');

    const zippedContent = await zip.generateAsync({ type: 'arraybuffer' });
    const normalized = await normalizePlatformDocumentFile({
        content: zippedContent,
        contentType: 'application/zip',
        fileName: 'ucansign.zip'
    }, '내일 계약서');

    assert.equal(normalized.contentType, 'application/pdf');
    assert.equal(normalized.fileName, '내일 계약서.pdf');
    assert.equal(Buffer.from(normalized.content).subarray(0, 5).toString('utf8'), '%PDF-');
});
