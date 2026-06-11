#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import XLSX from 'xlsx';

const EVIDENCE_PATH = path.join(process.cwd(), '.omo/evidence/task-2-lead-ingress.json');
const FIXTURE_PATH = path.join(process.cwd(), '.omo/evidence/franchise-p0-lead-ingress-fixture.xlsx');

function parseArgs(argv) {
    const args = { baseUrl: 'http://localhost:3000', allowBlocked: false, cleanup: false };
    for (let index = 2; index < argv.length; index += 1) {
        const value = argv[index];
        if (value === '--base-url') args.baseUrl = argv[index += 1] || args.baseUrl;
        if (value === '--allow-blocked') args.allowBlocked = true;
        if (value === '--cleanup') args.cleanup = true;
    }
    return args;
}

function ensureEvidenceDir() {
    fs.mkdirSync(path.dirname(EVIDENCE_PATH), { recursive: true });
}

function writeEvidence(data) {
    ensureEvidenceDir();
    fs.writeFileSync(EVIDENCE_PATH, `${JSON.stringify(data, null, 2)}\n`);
}

function normalizePhone(value) {
    return String(value || '').replace(/\D/g, '');
}

function buildFixtureRows(runId) {
    const phoneSuffix = runId.replace(/\D/g, '').slice(-8).padStart(8, '0');
    return [{
        이름: `QA엑셀유입-${runId}`,
        연락처: `010-${phoneSuffix.slice(0, 4)}-${phoneSuffix.slice(4)}`,
        유입경로: 'QA 엑셀 업로드',
        상태: '문의접수',
        등급: 'HOT',
        희망지역: '서울 광진구',
        창업예산: '1억 5천만',
        관심브랜드: '내일사장 QA',
        메모: `P0 lead ingress runner ${runId}`
    }];
}

function writeFixture(rows) {
    ensureEvidenceDir();
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'franchise-leads');
    XLSX.writeFile(workbook, FIXTURE_PATH);
    const loaded = XLSX.readFile(FIXTURE_PATH);
    return XLSX.utils.sheet_to_json(loaded.Sheets['franchise-leads'], { defval: '' });
}

async function requestJson(url, init) {
    const response = await fetch(url, init);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(payload.message || payload.error || `${response.status} ${response.statusText}`);
    }
    return payload.data || payload;
}

function buildUrl(baseUrl, pathname, params) {
    const url = new URL(pathname, baseUrl);
    Object.entries(params).forEach(([key, value]) => {
        if (value) url.searchParams.set(key, value);
    });
    return url.toString();
}

async function run() {
    const args = parseArgs(process.argv);
    const requesterId = process.env.FRANCHISE_QA_REQUESTER_ID || process.env.QA_REQUESTER_ID || '';
    const companyName = process.env.FRANCHISE_QA_COMPANY_NAME || process.env.QA_COMPANY_NAME || '';
    const runId = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
    const startedAt = new Date().toISOString();

    if (!requesterId) {
        const evidence = {
            status: 'BLOCKED_QA_ENV',
            startedAt,
            reason: 'FRANCHISE_QA_REQUESTER_ID or QA_REQUESTER_ID is required for live Excel ingress QA.',
            metaStatus: 'BLOCKED_META_ENV',
            metaReason: 'Meta account/app/env is still HOLD and is not exercised by this Excel runner.',
            command: 'node scripts/franchise-p0-lead-ingress-qa.mjs --base-url <url>'
        };
        writeEvidence(evidence);
        console.log(JSON.stringify(evidence, null, 2));
        process.exit(args.allowBlocked ? 0 : 2);
    }

    const fixtureRows = buildFixtureRows(runId);
    const rows = writeFixture(fixtureRows);
    const expectedPhone = normalizePhone(fixtureRows[0].연락처);
    const meta = { requesterId, userId: requesterId, managerId: requesterId, companyName };

    const batch = await requestJson(buildUrl(args.baseUrl, '/api/franchise-leads/batch', {}), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows, meta })
    });

    const listParams = { requesterId, company: companyName, search: expectedPhone, limit: 'all' };
    const listed = await requestJson(buildUrl(args.baseUrl, '/api/franchise-leads', listParams));
    const rawLead = (listed.leads || []).find(lead => normalizePhone(lead.mobileNormalized || lead.mobile) === expectedPhone);
    if (!rawLead || rawLead.leadStage !== 'raw_intake') {
        throw new Error(`Expected raw_intake lead for ${expectedPhone}`);
    }

    const promoted = await requestJson(buildUrl(args.baseUrl, '/api/franchise-leads', {}), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: rawLead.id, requesterId, companyName, leadStage: 'candidate', status: '상담중' })
    });

    const reloaded = await requestJson(buildUrl(args.baseUrl, '/api/franchise-leads', { requesterId, id: rawLead.id }));
    if (reloaded.lead?.leadStage !== 'candidate') {
        throw new Error(`Expected candidate lead after promotion for ${rawLead.id}`);
    }

    if (args.cleanup) {
        await requestJson(buildUrl(args.baseUrl, '/api/franchise-leads', { id: rawLead.id, requesterId }), {
            method: 'DELETE'
        });
    }

    const evidence = {
        status: 'PASS',
        startedAt,
        completedAt: new Date().toISOString(),
        baseUrl: args.baseUrl,
        fixturePath: FIXTURE_PATH,
        createdOrUpdated: batch,
        leadId: rawLead.id,
        rawStage: rawLead.leadStage,
        promotedStage: promoted.lead?.leadStage || reloaded.lead?.leadStage,
        cleanup: args.cleanup,
        metaStatus: 'BLOCKED_META_ENV',
        metaReason: 'Meta account/app/env is still HOLD and is not exercised by this Excel runner.'
    };
    writeEvidence(evidence);
    console.log(JSON.stringify(evidence, null, 2));
}

run().catch(error => {
    const evidence = {
        status: 'FAIL',
        completedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error)
    };
    writeEvidence(evidence);
    console.error(JSON.stringify(evidence, null, 2));
    process.exit(1);
});
