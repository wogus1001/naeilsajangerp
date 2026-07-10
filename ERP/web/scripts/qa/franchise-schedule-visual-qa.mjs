import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(scriptDir, '../..');
const port = Number(process.env.FRANCHISE_SCHEDULE_QA_PORT || '3317');
const baseUrl = `http://127.0.0.1:${port}`;
const evidenceDir = resolve(webRoot, '.omo/evidence/franchise-independent-schedule');

const sampleSchedules = [
    {
        id: 'manual-1',
        title: '가맹 운영 주간 회의',
        date: '2026-07-10',
        status: '예정',
        details: '신규 운영점 오픈 체크',
        sourceType: '',
        sourceId: '',
        createdAt: '2026-07-10T00:00:00.000Z',
        metadata: {}
    },
    {
        id: 'approval-1',
        title: 'SV 점검보고 승인',
        date: '2026-07-11',
        status: '진행중',
        details: '관리자 승인 대기',
        sourceType: 'approval-document',
        sourceId: 'approval-doc-1',
        createdAt: '2026-07-10T01:00:00.000Z',
        metadata: { kind: 'approval' }
    },
    {
        id: 'overdue-1',
        title: '업체 계약 갱신 확인',
        date: '2026-07-08',
        status: '지연',
        details: 'D-7 갱신 확인',
        sourceType: 'manual-workflow',
        sourceId: 'vendor-renewal-1',
        createdAt: '2026-07-08T00:00:00.000Z',
        metadata: {}
    }
];

function wait(ms) {
    return new Promise(resolveWait => setTimeout(resolveWait, ms));
}

async function waitForServer() {
    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline) {
        try {
            const response = await fetch(baseUrl);
            if (response.status < 500) return;
        } catch {
            await wait(1000);
        }
    }
    throw new Error('dev server did not become ready');
}

async function run() {
    await mkdir(evidenceDir, { recursive: true });
    const server = spawn('npm', ['run', 'dev', '--', '--port', String(port)], {
        cwd: webRoot,
        env: {
            ...process.env,
            NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'qa-anon-key',
            NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://test.supabase.co'
        },
        stdio: ['ignore', 'pipe', 'pipe']
    });
    server.stdout.on('data', chunk => process.stdout.write(chunk));
    server.stderr.on('data', chunk => process.stderr.write(chunk));

    let browser;
    try {
        await waitForServer();
        browser = await chromium.launch({ headless: true });
        for (const viewport of [
            { name: 'desktop', width: 1440, height: 960 },
            { name: 'mobile', width: 390, height: 900 }
        ]) {
            const page = await browser.newPage({ viewport });
            const errors = [];
            page.on('console', message => {
                if (message.type() === 'error') errors.push(message.text());
            });
            page.on('pageerror', error => errors.push(error.message));
            await page.addInitScript(() => {
                const session = {
                    access_token: 'qa-token',
                    expires_at: Math.floor(Date.now() / 1000) + 3600,
                    expires_in: 3600,
                    refresh_token: 'qa-refresh-token',
                    token_type: 'bearer',
                    user: { id: 'profile-qa' }
                };
                const user = {
                    companyId: 'company-qa',
                    companyName: 'QA 본사',
                    id: 'profile-qa',
                    name: 'QA 관리자',
                    role: 'admin',
                    uid: 'profile-qa'
                };
                window.localStorage.setItem('user', JSON.stringify(user));
                window.localStorage.setItem('sb-test-auth-token', JSON.stringify(session));
                const originalGetItem = window.Storage.prototype.getItem;
                window.Storage.prototype.getItem = function getItem(key) {
                    if (typeof key === 'string' && key.startsWith('sb-') && key.endsWith('-auth-token')) {
                        return JSON.stringify(session);
                    }
                    return originalGetItem.call(this, key);
                };
            });
            await page.route('**/api/auth/me', route => route.fulfill({
                contentType: 'application/json',
                body: JSON.stringify({
                    user: {
                        companyId: 'company-qa',
                        companyName: 'QA 본사',
                        id: 'profile-qa',
                        name: 'QA 관리자',
                        role: 'admin',
                        uid: 'profile-qa'
                    }
                })
            }));
            await page.route('**/api/system/settings', route => route.fulfill({
                contentType: 'application/json',
                body: JSON.stringify({})
            }));
            await page.route('**/api/company-menu-features**', route => route.fulfill({
                contentType: 'application/json',
                body: JSON.stringify({
                    data: {
                        flags: {
                            dashboard: true,
                            franchiseLeads: true,
                            franchiseWorkIntake: true,
                            franchiseMatchingRequest: true,
                            franchisePropertyRegistration: true,
                            marketInsights: true,
                            franchiseLocations: true,
                            franchiseOperations: true,
                            properties: true,
                            propertyRegister: true,
                            propertyMap: true,
                            schedule: true,
                            customers: true,
                            customerRegister: true,
                            businessCards: true,
                            businessCardRegister: true,
                            contracts: true,
                            electronicPremiumContracts: true,
                            vendorContracts: true,
                            vendorManagement: true,
                            contractCreate: true,
                            contractBuilder: true,
                            companyStaff: true
                        }
                    }
                })
            }));
            await page.route('**/api/admin/company-access**', route => route.fulfill({
                contentType: 'application/json',
                body: JSON.stringify({
                    data: {
                        companies: [{ id: 'company-qa', name: 'QA 본사' }],
                        currentCompanyId: 'company-qa'
                    }
                })
            }));
            await page.route('**/api/franchise-notifications**', route => route.fulfill({
                contentType: 'application/json',
                body: JSON.stringify({
                    data: {
                        notifications: [],
                        unreadCount: 0
                    }
                })
            }));
            await page.route('**/api/franchise-schedules**', async route => {
                if (route.request().method() === 'GET') {
                    await route.fulfill({
                        contentType: 'application/json',
                        body: JSON.stringify({ data: sampleSchedules })
                    });
                    return;
                }
                await route.fulfill({
                    contentType: 'application/json',
                    body: JSON.stringify({ data: { ...sampleSchedules[0], id: 'manual-created' } })
                });
            });
            await page.goto(`${baseUrl}/dashboard/franchise-operations/schedule`, { waitUntil: 'networkidle' });
            await page.getByTestId('franchise-schedule-page').waitFor({ timeout: 20_000 });
            await page.getByRole('button', { name: '오늘 처리' }).click();
            await page.screenshot({
                fullPage: true,
                path: resolve(evidenceDir, `${viewport.name}.png`)
            });
            if (errors.length > 0) {
                throw new Error(`${viewport.name} console errors: ${errors.join(' | ')}`);
            }
            await page.close();
        }
        console.log(`OK franchise schedule visual QA saved screenshots in ${evidenceDir}`);
    } finally {
        if (browser) await browser.close();
        server.kill('SIGTERM');
    }
}

run().catch(error => {
    console.error(error);
    process.exit(1);
});
