#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
    args.set(process.argv[index], process.argv[index + 1] ?? '');
}

const port = Number(args.get('--port') || '3172');
const mode = args.get('--mode') || 'mocked';
const readyTimeoutMs = Number(args.get('--ready-timeout-ms') || '120000');
const baseUrl = `http://localhost:${port}`;
const evidenceDir = resolve(process.cwd(), '.omo/evidence/task-7-franchise-independent-schedule');

if (mode !== 'mocked') {
    console.error('Only --mode mocked is supported by this safe visual QA script.');
    process.exit(2);
}

async function loadPlaywright() {
    try {
        return await import('playwright');
    } catch (error) {
        console.error('Playwright is unavailable. Run `npm install` in ERP/web so the dev dependency `playwright` is installed.');
        console.error(error instanceof Error ? error.message : String(error));
        process.exit(2);
    }
}

function startServer() {
    const env = {
        ...process.env,
        NEXT_PUBLIC_SUPABASE_URL: 'https://franchise-schedule-qa.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'mock-anon-key'
    };
    return spawn('npm', ['run', 'dev', '--', '--port', String(port)], {
        cwd: process.cwd(),
        env,
        stdio: ['ignore', 'pipe', 'pipe']
    });
}

async function waitForServer() {
    const startedAt = Date.now();
    while (Date.now() - startedAt < readyTimeoutMs) {
        try {
            const response = await fetch(baseUrl);
            if (response.status < 500) return;
        } catch {
            await new Promise(resolveDone => setTimeout(resolveDone, 500));
        }
    }
    throw new Error(`Dev server was not ready within ${readyTimeoutMs}ms`);
}

async function stopServer(child) {
    if (!child.pid) return;
    child.kill('SIGTERM');
    await new Promise(resolveDone => {
        const timer = setTimeout(() => {
            if (child.pid) child.kill('SIGKILL');
            resolveDone();
        }, 3000);
        child.once('exit', () => {
            clearTimeout(timer);
            resolveDone();
        });
    });
    try {
        process.kill(child.pid, 0);
        throw new Error(`dev server pid ${child.pid} is still alive`);
    } catch (error) {
        if (error instanceof Error && error.message.includes('still alive')) throw error;
    }
}

function authFixture() {
    const expiresAt = Math.floor(Date.now() / 1000) + 86400;
    return {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_at: expiresAt,
        expires_in: 86400,
        token_type: 'bearer',
        user: { id: 'user-1', email: 'qa@example.test', role: 'authenticated' }
    };
}

function scheduleFixture() {
    return {
        schedules: [
            { id: 'manual-1', title: '점주 정기 미팅', date: '2026-07-15', status: '예정', sourceType: 'manual', assigneeName: '김SV', managerName: '운영팀', details: '오픈 후 1개월 운영 점검' },
            { id: 'approval-1', title: '방문 보고 결재', date: '2026-07-15', status: '진행중', sourceType: 'approval-document', assigneeName: '이SV', managerName: '박매니저', approvalDocumentId: 'doc-1' },
            { id: 'visit-1', title: '위생 점검 방문', date: '2026-07-15', status: '지연', sourceType: 'supervision-visit', assigneeName: '김SV', managerName: '박매니저', metadata: { actionUrl: '/dashboard/franchise-supervision?visitId=visit-1' } },
            { id: 'report-1', title: '점검 보고서 검토', date: '2026-07-15', status: '진행중', sourceType: 'supervision-report', assigneeName: '박매니저', managerName: '박매니저', metadata: { actionUrl: '/dashboard/franchise-supervision?reportId=report-1' } },
            { id: 'action-1', title: '냉장고 온도 시정조치', date: '2026-07-15', status: '완료', sourceType: 'supervision-corrective-action', assigneeName: '김SV', managerName: '박매니저', metadata: { actionUrl: '/dashboard/franchise-supervision?actionId=action-1' } },
            { id: 'opening-1', title: '강남점 오픈 준비', date: '2026-07-15', status: '진행중', sourceType: 'opening-project', assigneeName: '오픈 담당자', managerName: '운영팀', metadata: { actionUrl: '/dashboard/franchise-leads?leadId=lead-1&mode=contractChecklist' } },
            { id: 'request-1', title: '강남점 시설 문의', date: '2026-07-15', status: '지연', sourceType: 'owner-facility-request', assigneeName: '운영팀', managerName: '운영팀', metadata: { actionUrl: '/dashboard/franchise-operations/owner-portal?view=submissions&submissionId=submission-1' } },
            { id: 'checklist-1', title: '강남점 체크리스트 완료', date: '2026-07-15', status: '완료', sourceType: 'owner-checklist-completion', assigneeName: '운영팀', managerName: '운영팀', metadata: { actionUrl: '/dashboard/franchise-operations/owner-portal?view=checklists&checklistView=status' } }
        ]
    };
}

async function installMocks(page, scenario) {
    await page.addInitScript(payload => {
        localStorage.setItem('user', JSON.stringify(payload.user));
        localStorage.setItem('sb-franchise-schedule-qa-auth-token', JSON.stringify(payload.session));
        localStorage.setItem('sb-franchise-schedule-qa-auth-token-user', JSON.stringify({ user: payload.session.user }));
    }, {
        user: { id: 'user-1', uid: 'user-1', role: 'manager', status: 'active', companyId: 'company-1', companyName: 'QA 가맹본부' },
        session: authFixture()
    });
    await page.route('**/auth/v1/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: authFixture().user }) }));
    await page.route('**/api/auth/me', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: { id: 'user-1', uid: 'user-1', role: 'manager', status: 'active', companyId: 'company-1', companyName: 'QA 가맹본부' } })
    }));
    await page.route('**/api/system/settings', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ features: { electronicContracts: true }, announcement: null, maintenance: null }) }));
    await page.route('**/api/franchise-notifications**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ notifications: [] }) }));
    await page.route('**/api/franchise-supervision**', route => {
        const pathname = new URL(route.request().url()).pathname;
        if (pathname !== '/api/franchise-supervision') return route.continue();
        return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: {
                schemaReady: true,
                canManage: true,
                companyId: 'company-1',
                locations: [],
                supervisors: [],
                assignments: [],
                visits: [],
                reports: [],
                reportTemplates: [],
                reportEvents: [],
                correctiveActions: [{
                    id: 'action-1',
                    companyId: 'company-1',
                    reportId: null,
                    locationId: 'location-1',
                    locationName: '강남점',
                    assigneeProfileId: 'user-1',
                    assigneeName: '김SV',
                    status: '완료',
                    title: '냉장고 온도 시정조치',
                    memo: '온도계를 교체했습니다.',
                    dueDate: '2026-07-15',
                    completedAt: '2026-07-15T03:00:00.000Z'
                }],
                correctiveActionEvents: [],
                operationQueue: [],
                summary: {
                    todayVisitCount: 0,
                    weekVisitCount: 0,
                    missingReportCount: 0,
                    pendingApprovalCount: 0,
                    activeCorrectiveActionCount: 0
                }
            } })
        });
    });
    await page.route('**/api/franchise-locations**', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { locations: [{
            id: 'location-1',
            companyId: 'company-1',
            name: '강남점',
            status: '운영중'
        }] } })
    }));
    await page.route('**/api/franchise-owner-portal/**', route => {
        const pathname = new URL(route.request().url()).pathname;
        if (pathname.endsWith('/submissions')) {
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ data: { submissions: [{
                    id: 'submission-1',
                    location_id: 'location-1',
                    submission_type: 'facility_request',
                    title: '냉장고 고장',
                    body: '냉장고 온도를 확인해주세요.',
                    payload: {},
                    status: 'submitted',
                    review_note: null,
                    created_at: '2026-07-15T01:00:00.000Z',
                    files: []
                }] } })
            });
        }
        const key = pathname.endsWith('/accounts') ? 'accounts' : pathname.endsWith('/notices') ? 'notices' : 'checklists';
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { [key]: [] } }) });
    });
    await page.route('**/api/company-menu-features**', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { flags: { franchiseOperations: true, schedule: false } } })
    }));
    await page.route('**/api/franchise-schedules**', route => {
        if (scenario === 'sql') {
            return route.fulfill({ status: 424, contentType: 'application/json', body: JSON.stringify({ error: 'SQL_REQUIRED' }) });
        }
        if (scenario === 'forbidden') {
            return route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ error: 'FORBIDDEN' }) });
        }
        if (route.request().method() === 'GET' && new URL(route.request().url()).searchParams.get('view') === 'assignees') {
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ data: { assignees: [{ id: 'user-1', name: '김SV' }], requesterProfileId: 'user-1' } })
            });
        }
        if (route.request().method() === 'GET') {
            return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(scheduleFixture()) });
        }
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    });
}

async function waitForRoot(page) {
    await page.goto(`${baseUrl}/dashboard/franchise-operations/schedule`, { waitUntil: 'domcontentloaded' });
    if (page.url().includes('/login')) throw new Error('Redirected to /login during mocked visual QA');
    try {
        await page.getByTestId('franchise-schedule-root').waitFor({ timeout: readyTimeoutMs });
    } catch (error) {
        if (page.url().includes('/login')) throw new Error('Redirected to /login during mocked visual QA');
        const bodyText = (await page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 500);
        throw new Error(`Schedule root did not render at ${page.url()}. Body: ${bodyText}`, { cause: error });
    }
}

async function waitForScheduleData(page) {
    await page.waitForFunction(() => Array.from(document.querySelectorAll('select option'))
        .some(option => option instanceof HTMLOptionElement && option.value === 'supervision-visit'), undefined, { timeout: readyTimeoutMs });
}

async function assertNoOverflow(page) {
    const overflow = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
    if (overflow !== 0) throw new Error(`Horizontal overflow detected: ${overflow}px`);
}

async function runScenario(browser, scenario) {
    const context = await browser.newContext({ viewport: scenario === 'mobile' ? { width: 390, height: 844 } : { width: 1440, height: 1000 } });
    const page = await context.newPage();
    const consoleErrors = [];
    page.on('console', message => {
        const text = message.text();
        const isExpectedStatus = (scenario === 'sql' && text.includes('status of 424')) ||
            (scenario === 'forbidden' && text.includes('status of 403'));
        if (message.type() === 'error' && !isExpectedStatus) consoleErrors.push(text);
    });
    page.on('pageerror', error => consoleErrors.push(error.message));
    await installMocks(page, scenario);
    await waitForRoot(page);
    if (scenario === 'desktop' || scenario === 'mobile') await waitForScheduleData(page);
    await assertNoOverflow(page);
    if (scenario === 'desktop') {
        for (const label of ['SV 방문', '보고서', '시정조치', '오픈 준비', '점주 시설 문의', '점주 체크리스트']) {
            const optionCount = await page.locator('option').filter({ hasText: label }).count();
            if (optionCount === 0) throw new Error(`Missing schedule source filter option: ${label}`);
        }
        const sourceLinks = await page.getByRole('link', { name: '업무 열기' }).count();
        if (sourceLinks !== 6) throw new Error(`Expected 6 source detail links, received ${sourceLinks}`);
        const ownerDetailPath = '/dashboard/franchise-operations/owner-portal?view=submissions&submissionId=submission-1';
        await page.locator(`a[href="${ownerDetailPath}"]`).click();
        await page.waitForURL(url => `${url.pathname}${url.search}` === ownerDetailPath, { timeout: 10000 });
        await page.locator('article[aria-current="true"] details[open]').waitFor({ timeout: 10000 });
        await page.goBack({ waitUntil: 'domcontentloaded' });
        await page.getByTestId('franchise-schedule-root').waitFor({ timeout: readyTimeoutMs });
        await waitForScheduleData(page);
        const checklistDetailPath = '/dashboard/franchise-operations/owner-portal?view=checklists&checklistView=status';
        await page.locator(`a[href="${checklistDetailPath}"]`).click();
        await page.waitForURL(url => `${url.pathname}${url.search}` === checklistDetailPath, { timeout: 10000 });
        const checklistStatusTab = page.getByRole('tab', { name: /발송 현황/ });
        await checklistStatusTab.waitFor({ timeout: 10000 });
        if (await checklistStatusTab.getAttribute('aria-selected') !== 'true') {
            throw new Error('Checklist completion deep link did not open the status tab');
        }
        await page.goBack({ waitUntil: 'domcontentloaded' });
        await page.getByTestId('franchise-schedule-root').waitFor({ timeout: readyTimeoutMs });
        await waitForScheduleData(page);
        const actionDetailPath = '/dashboard/franchise-supervision?actionId=action-1';
        await page.locator(`a[href="${actionDetailPath}"]`).click();
        await page.waitForURL(url => `${url.pathname}${url.search}` === actionDetailPath, { timeout: 10000 });
        const focusedAction = page.locator('tr[aria-current="true"]');
        await focusedAction.waitFor({ timeout: 10000 });
        if (!(await focusedAction.innerText()).includes('냉장고 온도 시정조치')) {
            throw new Error('Corrective action deep link did not focus the expected row');
        }
        await page.goBack({ waitUntil: 'domcontentloaded' });
        await page.getByTestId('franchise-schedule-root').waitFor({ timeout: readyTimeoutMs });
        await waitForScheduleData(page);
        await page.getByRole('button', { name: /수동 일정 등록/ }).click();
        await page.getByLabel('제목').fill('QA 수동 일정');
        await page.getByLabel('담당자').selectOption('user-1');
        await page.getByRole('button', { name: '저장' }).click();
        await page.getByRole('alertdialog', { name: '처리 완료' }).waitFor({ timeout: 10000 });
    }
    if (scenario === 'sql') await page.getByText('프랜차이즈 일정 SQL 등록 필요').waitFor({ timeout: 10000 });
    if (scenario === 'forbidden') await page.getByText('가맹 운영 일정 접근 권한이 없습니다.').waitFor({ timeout: 10000 });
    await page.screenshot({ path: resolve(evidenceDir, `${scenario}.png`), fullPage: true });
    await context.close();
    if (consoleErrors.length > 0) throw new Error(`Console errors in ${scenario}: ${consoleErrors.join(' | ')}`);
}

const child = startServer();
child.stdout.on('data', chunk => process.stdout.write(`[dev] ${chunk}`));
child.stderr.on('data', chunk => process.stderr.write(`[dev] ${chunk}`));

try {
    await mkdir(evidenceDir, { recursive: true });
    const { chromium } = await loadPlaywright();
    await waitForServer();
    const browser = await chromium.launch();
    try {
        await runScenario(browser, 'desktop');
        await runScenario(browser, 'mobile');
        await runScenario(browser, 'sql');
        await runScenario(browser, 'forbidden');
    } finally {
        await browser.close();
    }
    console.log(`MOCKED_VISUAL_ONLY PASS ${evidenceDir}`);
} finally {
    await stopServer(child);
}
