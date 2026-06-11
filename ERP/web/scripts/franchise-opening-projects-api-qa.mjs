#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const EVIDENCE_PATH = path.join(process.cwd(), '.omo/evidence/task-6-opening-api.json');

function parseArgs(argv) {
    const args = { baseUrl: 'http://localhost:3000', allowBlocked: false };
    for (let index = 2; index < argv.length; index += 1) {
        const value = argv[index];
        if (value === '--base-url') args.baseUrl = argv[index += 1] || args.baseUrl;
        if (value === '--allow-blocked') args.allowBlocked = true;
    }
    return args;
}

function writeEvidence(data) {
    fs.mkdirSync(path.dirname(EVIDENCE_PATH), { recursive: true });
    fs.writeFileSync(EVIDENCE_PATH, `${JSON.stringify(data, null, 2)}\n`);
}

function buildUrl(baseUrl, pathname, params = {}) {
    const url = new URL(pathname, baseUrl);
    Object.entries(params).forEach(([key, value]) => {
        if (value) url.searchParams.set(key, value);
    });
    return url.toString();
}

async function requestJson(url, init) {
    const response = await fetch(url, init);
    const payload = await response.json().catch(() => ({}));
    return {
        status: response.status,
        ok: response.ok,
        data: payload.data || payload,
        message: payload.message || payload.error || ''
    };
}

function assertStatus(checks, name, actual, expected) {
    checks.push({ name, expected, actual: { status: actual.status, message: actual.message } });
    if (!expected.includes(actual.status)) {
        throw new Error(`${name}: expected ${expected.join('/')} but got ${actual.status} ${actual.message}`);
    }
}

async function run() {
    const args = parseArgs(process.argv);
    const requesterId = process.env.FRANCHISE_QA_REQUESTER_ID || process.env.QA_REQUESTER_ID || '';
    const companyName = process.env.FRANCHISE_QA_COMPANY_NAME || process.env.QA_COMPANY_NAME || '';
    const locationId = process.env.FRANCHISE_QA_OPENING_LOCATION_ID || process.env.FRANCHISE_QA_COMPANY_A_OPENING_LOCATION_ID || '';
    const crossCompanyUserId = process.env.FRANCHISE_QA_COMPANY_B_USER_ID || '';
    const startedAt = new Date().toISOString();

    if (!requesterId || !locationId) {
        const evidence = {
            status: 'BLOCKED_OPENING_API_ENV',
            startedAt,
            missing: [
                ...(!requesterId ? ['FRANCHISE_QA_REQUESTER_ID or QA_REQUESTER_ID'] : []),
                ...(!locationId ? ['FRANCHISE_QA_OPENING_LOCATION_ID'] : [])
            ],
            reason: 'Opening project API QA needs a requester and an existing 오픈준비 franchise_locations id.',
            command: 'node scripts/franchise-opening-projects-api-qa.mjs --base-url <url>'
        };
        writeEvidence(evidence);
        console.log(JSON.stringify(evidence, null, 2));
        process.exit(args.allowBlocked ? 0 : 2);
    }

    const checks = [];
    assertStatus(checks, 'GET without requester is rejected', await requestJson(buildUrl(args.baseUrl, '/api/franchise-opening-projects')), [401]);

    const createBody = {
        requesterId,
        companyName,
        locationId,
        status: '진행중',
        targetOpenDate: '2026-06-30',
        memo: 'opening api qa',
        tasks: [{ id: 'contract', status: '완료', owner: 'QA', dueDate: '2026-06-12', memo: 'done' }]
    };
    const created = await requestJson(buildUrl(args.baseUrl, '/api/franchise-opening-projects'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createBody)
    });
    assertStatus(checks, 'POST scoped opening project succeeds', created, [200, 201]);
    const projectId = created.data.project?.id;
    if (!projectId) throw new Error('POST did not return project id');

    const listed = await requestJson(buildUrl(args.baseUrl, '/api/franchise-opening-projects', {
        requesterId,
        company: companyName,
        locationId
    }));
    assertStatus(checks, 'GET location scoped project succeeds', listed, [200]);
    if (!listed.data.projects?.some(project => project.id === projectId)) throw new Error('Created project missing from filtered list');

    if (crossCompanyUserId) {
        assertStatus(checks, 'cross-company GET project is rejected', await requestJson(buildUrl(args.baseUrl, '/api/franchise-opening-projects', {
            requesterId: crossCompanyUserId,
            id: projectId
        })), [403]);
    }

    const updated = await requestJson(buildUrl(args.baseUrl, '/api/franchise-opening-projects'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            id: projectId,
            requesterId,
            companyName,
            memo: 'opening api qa updated',
            tasks: [{ id: 'interior', status: '진행중', owner: 'QA2', dueDate: '2026-06-20' }]
        })
    });
    assertStatus(checks, 'PUT updates checklist state', updated, [200]);
    if (updated.data.project?.memo !== 'opening api qa updated') throw new Error('PUT memo was not persisted');

    assertStatus(checks, 'DELETE scoped project succeeds', await requestJson(buildUrl(args.baseUrl, '/api/franchise-opening-projects', {
        requesterId,
        id: projectId
    }), { method: 'DELETE' }), [200]);
    assertStatus(checks, 'GET deleted project returns 404', await requestJson(buildUrl(args.baseUrl, '/api/franchise-opening-projects', {
        requesterId,
        id: projectId
    })), [404]);

    const evidence = {
        status: 'PASS',
        startedAt,
        completedAt: new Date().toISOString(),
        baseUrl: args.baseUrl,
        projectId,
        checks
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
