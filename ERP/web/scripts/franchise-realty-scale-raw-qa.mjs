#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const EVIDENCE_PATH = path.join(process.cwd(), '.omo/evidence/task-9-realty-scale-raw.json');

function parseArgs(argv) {
    const args = {
        baseUrl: 'http://localhost:3000',
        region: '광진구 화양동',
        savedLimit: 2000,
        collectLimit: 3000,
        liveCollect: false,
        allowBlocked: false
    };
    for (let index = 2; index < argv.length; index += 1) {
        const value = argv[index];
        if (value === '--base-url') args.baseUrl = argv[index += 1] || args.baseUrl;
        if (value === '--region') args.region = argv[index += 1] || args.region;
        if (value === '--saved-limit') args.savedLimit = Number(argv[index += 1] || args.savedLimit);
        if (value === '--collect-limit') args.collectLimit = Number(argv[index += 1] || args.collectLimit);
        if (value === '--live-collect') args.liveCollect = true;
        if (value === '--allow-blocked') args.allowBlocked = true;
    }
    return args;
}

function writeEvidence(data) {
    fs.mkdirSync(path.dirname(EVIDENCE_PATH), { recursive: true });
    fs.writeFileSync(EVIDENCE_PATH, `${JSON.stringify(data, null, 2)}\n`);
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
        if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
    });
    return url.toString();
}

function hasObjectContent(value) {
    return value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0;
}

function summarizeRawSamples(listings) {
    return listings.slice(0, 10).map(listing => ({
        id: listing.id,
        sourceListingId: listing.sourceListingId,
        title: listing.title,
        hasRaw: hasObjectContent(listing.raw),
        hasData: hasObjectContent(listing.data),
        rawKeys: hasObjectContent(listing.raw) ? Object.keys(listing.raw).slice(0, 8) : [],
        dataKeys: hasObjectContent(listing.data) ? Object.keys(listing.data).slice(0, 8) : []
    }));
}

async function run() {
    const args = parseArgs(process.argv);
    const requesterId = process.env.FRANCHISE_QA_REQUESTER_ID || process.env.QA_REQUESTER_ID || '';
    const companyName = process.env.FRANCHISE_QA_COMPANY_NAME || process.env.QA_COMPANY_NAME || '';
    const startedAt = new Date().toISOString();

    if (!requesterId) {
        const evidence = {
            status: 'BLOCKED_QA_ENV',
            startedAt,
            reason: 'FRANCHISE_QA_REQUESTER_ID or QA_REQUESTER_ID is required for external realty QA.',
            command: 'node scripts/franchise-realty-scale-raw-qa.mjs --base-url <url> [--live-collect]'
        };
        writeEvidence(evidence);
        console.log(JSON.stringify(evidence, null, 2));
        process.exit(args.allowBlocked ? 0 : 2);
    }

    const collectResult = args.liveCollect
        ? await requestJson(buildUrl(args.baseUrl, '/api/realty/import-jobs', {}), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                requesterId,
                companyName,
                region: args.region,
                sources: ['daangn'],
                limit: args.collectLimit,
                registerToProperties: false
            })
        })
        : null;

    const savedResult = await requestJson(buildUrl(args.baseUrl, '/api/realty/listings', {
        requesterId,
        company: companyName,
        source: 'daangn',
        region: args.region,
        limit: args.savedLimit
    }));
    const savedListings = savedResult.listings || [];
    if (savedListings.length > args.savedLimit) {
        throw new Error(`Saved listings exceeded limit: ${savedListings.length} > ${args.savedLimit}`);
    }

    const samples = summarizeRawSamples(savedListings);
    const rawSampleCount = samples.filter(sample => sample.hasRaw).length;
    const dataSampleCount = samples.filter(sample => sample.hasData).length;
    const collectListings = collectResult?.listings || [];
    const propertyCreateActions = collectListings.filter(item => item.action === 'created').length;

    if (args.liveCollect && propertyCreateActions !== 0) {
        throw new Error(`registerToProperties=false created ${propertyCreateActions} properties`);
    }

    const evidence = {
        status: 'PASS',
        startedAt,
        completedAt: new Date().toISOString(),
        baseUrl: args.baseUrl,
        region: args.region,
        liveCollect: args.liveCollect,
        collectLimit: args.collectLimit,
        savedLimit: args.savedLimit,
        collectJob: collectResult?.job || null,
        returnedCollectListings: collectListings.length,
        propertyCreateActions,
        savedListings: savedListings.length,
        rawSampleCount,
        dataSampleCount,
        samples
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
