#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const EVIDENCE_PATH = path.join(process.cwd(), '.omo/evidence/task-8-role-matrix.json');

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

function requiredEnv() {
    return {
        adminId: process.env.FRANCHISE_QA_ADMIN_ID || '',
        companyAUserId: process.env.FRANCHISE_QA_COMPANY_A_USER_ID || '',
        companyBUserId: process.env.FRANCHISE_QA_COMPANY_B_USER_ID || '',
        noCompanyUserId: process.env.FRANCHISE_QA_NO_COMPANY_USER_ID || '',
        companyAName: process.env.FRANCHISE_QA_COMPANY_A_NAME || '',
        companyBName: process.env.FRANCHISE_QA_COMPANY_B_NAME || '',
        openingLocationId: process.env.FRANCHISE_QA_COMPANY_A_OPENING_LOCATION_ID || ''
    };
}

async function requestStatus(url, init) {
    const response = await fetch(url, init);
    const payload = await response.json().catch(() => ({}));
    return {
        status: response.status,
        ok: response.ok,
        code: payload.code,
        message: payload.message || payload.error || ''
    };
}

function buildUrl(baseUrl, pathname, params) {
    const url = new URL(pathname, baseUrl);
    Object.entries(params).forEach(([key, value]) => {
        if (value) url.searchParams.set(key, value);
    });
    return url.toString();
}

function assertStatus(checks, name, actual, expected) {
    checks.push({ name, expected, actual });
    if (!expected.includes(actual.status)) {
        throw new Error(`${name}: expected ${expected.join('/')} but got ${actual.status} ${actual.message}`);
    }
}

async function run() {
    const args = parseArgs(process.argv);
    const env = requiredEnv();
    const missing = Object.entries(env)
        .filter(([key, value]) => key !== 'openingLocationId' && !value)
        .map(([key]) => key);
    const startedAt = new Date().toISOString();

    if (missing.length > 0) {
        const evidence = {
            status: 'BLOCKED_REAL_ROLE_MATRIX',
            startedAt,
            missing,
            reason: 'Real admin/company A/company B/no-company QA account env is required.',
            optional: ['FRANCHISE_QA_COMPANY_A_OPENING_LOCATION_ID'],
            command: 'node scripts/franchise-role-matrix-qa.mjs --base-url <url>'
        };
        writeEvidence(evidence);
        console.log(JSON.stringify(evidence, null, 2));
        process.exit(args.allowBlocked ? 0 : 2);
    }

    const checks = [];
    assertStatus(checks, 'company A can read own franchise locations', await requestStatus(buildUrl(args.baseUrl, '/api/franchise-locations', {
        requesterId: env.companyAUserId,
        company: env.companyAName
    })), [200]);
    assertStatus(checks, 'company B cannot read company A franchise locations', await requestStatus(buildUrl(args.baseUrl, '/api/franchise-locations', {
        requesterId: env.companyBUserId,
        company: env.companyAName
    })), [403]);
    assertStatus(checks, 'admin can read company A franchise locations', await requestStatus(buildUrl(args.baseUrl, '/api/franchise-locations', {
        requesterId: env.adminId,
        company: env.companyAName
    })), [200]);
    assertStatus(checks, 'no-company requester can read own external realty scope', await requestStatus(buildUrl(args.baseUrl, '/api/realty/listings', {
        requesterId: env.noCompanyUserId,
        source: 'daangn',
        limit: '1'
    })), [200]);

    if (env.openingLocationId) {
        assertStatus(checks, 'no-company requester cannot create opening project', await requestStatus(buildUrl(args.baseUrl, '/api/franchise-opening-projects', {}), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                requesterId: env.noCompanyUserId,
                locationId: env.openingLocationId,
                status: '준비중'
            })
        }), [400, 403]);
    }

    const evidence = {
        status: 'PASS',
        startedAt,
        completedAt: new Date().toISOString(),
        baseUrl: args.baseUrl,
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
