import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const SCREEN_LABELS = {
    admin: ['대시보드', '모객 DB', '계약 완료', '출점 후보지', '물건지 지도', '가맹 운영'],
    manager: ['대시보드', '모객 DB', '계약 완료', '출점 후보지', '물건지 지도', '가맹 운영'],
    partner: ['대시보드', '계약 완료', '출점 후보지', '물건지 지도', '가맹 운영']
};
const SCREEN_IDS = {
    '대시보드': 'dashboard',
    '모객 DB': 'leadDb',
    '계약 완료': 'contractOwners',
    '출점 후보지': 'location',
    '물건지 지도': 'locationMap',
    '가맹 운영': 'operations'
};
const VIEWPORTS = [
    { id: 'desktop', width: 1440, height: 900 },
    { id: 'mobile', width: 390, height: 844 }
];
const COUNTER_KEYS = [
    'unexpectedApiRequests',
    'unexpectedNetworkRequests',
    'consoleErrors',
    'pageErrors',
    'horizontalOverflow',
    'staleTourTargets',
    'duplicateDialogs',
    'noOpActions'
];

function createCounters() {
    return Object.fromEntries(COUNTER_KEYS.map(key => [key, 0]));
}

function hasFailures(counters) {
    return COUNTER_KEYS.some(key => counters[key] > 0);
}

function classifyRequest(requestURL, baseOrigin) {
    const url = new URL(requestURL);
    if (url.origin !== baseOrigin) return 'unexpected-network';
    if (url.pathname.startsWith('/api/') && url.pathname !== '/api/demo/access') return 'unexpected-api';
    return 'allowed';
}

function redactRequestURL(requestURL) {
    const url = new URL(requestURL);
    return `${url.origin}${url.pathname}`;
}

if (process.argv.includes('--self-test')) {
    assert.equal(hasFailures(createCounters()), false);
    assert.equal(hasFailures({ ...createCounters(), unexpectedApiRequests: 1 }), true);
    assert.equal(hasFailures({ ...createCounters(), unexpectedNetworkRequests: 1 }), true);
    assert.equal(hasFailures({ ...createCounters(), staleTourTargets: 1 }), true);
    assert.equal(classifyRequest('https://demo.example.com/api/demo/access', 'https://demo.example.com'), 'allowed');
    assert.equal(classifyRequest('https://demo.example.com/api/franchise-leads', 'https://demo.example.com'), 'unexpected-api');
    assert.equal(classifyRequest('https://dapi.kakao.com/v2/maps/sdk.js', 'https://demo.example.com'), 'unexpected-network');
    process.stdout.write('demo-ui parity gate self-test passed\n');
    process.exit(0);
}

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:3130';
const accessId = process.env.DEMO_ACCESS_ID;
const accessPassword = process.env.DEMO_ACCESS_PASSWORD;
const evidenceDir = path.resolve(process.env.EVIDENCE_DIR || '../../.omo/evidence');
if (!accessId || !accessPassword) {
    throw new Error('DEMO_ACCESS_ID and DEMO_ACCESS_PASSWORD are required');
}

await mkdir(evidenceDir, { recursive: true });
const counters = createCounters();
const scenarios = [];
const popupCoverage = new Set();
const modalChecks = [];
const failures = [];
const browser = await chromium.launch({ headless: true });
let fatalError = null;

try {
    for (const viewport of VIEWPORTS) {
        const context = await browser.newContext({ viewport });
        const page = await context.newPage();
        const baseOrigin = new URL(baseURL).origin;

        await page.route('**/*', async route => {
            const request = route.request();
            const classification = classifyRequest(request.url(), baseOrigin);
            if (classification === 'unexpected-api') {
                counters.unexpectedApiRequests += 1;
                failures.push(`unexpected API: ${request.method()} ${redactRequestURL(request.url())}`);
                await route.abort('blockedbyclient');
                return;
            }
            if (classification === 'unexpected-network') {
                counters.unexpectedNetworkRequests += 1;
                failures.push(`unexpected network: ${request.method()} ${redactRequestURL(request.url())}`);
                await route.abort('blockedbyclient');
                return;
            }
            await route.continue();
        });
        page.on('console', message => {
            if (message.type() === 'error') {
                counters.consoleErrors += 1;
                failures.push(`console: ${message.text()}`);
            }
        });
        page.on('pageerror', error => {
            counters.pageErrors += 1;
            failures.push(`pageerror: ${error.message}`);
        });

        const accessResponse = await context.request.post(`${baseURL}/api/demo/access`, {
            data: { id: accessId, password: accessPassword }
        });
        assert.equal(accessResponse.status(), 200, 'demo access request must succeed');
        await page.goto(`${baseURL}/demo/manager`, { waitUntil: 'domcontentloaded' });
        await page.getByRole('navigation', { name: '데모 메뉴', exact: true }).waitFor({ state: 'visible' });

        for (const [role, screens] of Object.entries(SCREEN_LABELS)) {
            await page.goto(`${baseURL}/demo/${role}`, { waitUntil: 'domcontentloaded' });
            for (const screen of screens) {
                if (screen !== '대시보드') {
                    await clickDemoNav(page, screen);
                }
                const activeSurface = page.locator(`[data-demo-surface="${SCREEN_IDS[screen]}"]:not([hidden])`);
                await activeSurface.waitFor({ state: 'visible' });
                await page.waitForTimeout(320);

                const tourDialog = page.locator('[data-demo-id="demo-tour-card"]');
                if (await tourDialog.isVisible()) {
                    await inspectEveryTourStep(page, role, screen, viewport.id, counters, failures);
                }

                const overflow = await page.evaluate(() => (
                    document.documentElement.scrollWidth - document.documentElement.clientWidth
                ));
                if (overflow > 1) {
                    counters.horizontalOverflow += 1;
                    failures.push(`horizontal overflow ${overflow}px: ${role}/${screen}/${viewport.id}`);
                }

                const activeModalCount = await page.locator(
                    '[role="dialog"][aria-modal="true"]:not([aria-hidden="true"]), [role="alertdialog"][aria-modal="true"]:not([aria-hidden="true"])'
                ).count();
                if (activeModalCount > 1) {
                    counters.duplicateDialogs += activeModalCount - 1;
                    failures.push(`multiple active modal dialogs (${activeModalCount}): ${role}/${screen}/${viewport.id}`);
                }

                const screenshotName = `demo-parity-${role}-${viewport.id}-${screen.replaceAll(' ', '-')}.png`;
                await page.screenshot({ path: path.join(evidenceDir, screenshotName), fullPage: false });
                scenarios.push({ role, viewport: viewport.id, screen, overflow });
            }
        }

        await runPopupCoverage(page, viewport.id, popupCoverage, modalChecks, counters, failures);

        await context.close();
    }
} catch (error) {
    fatalError = error;
    counters.noOpActions += 1;
    failures.push(`fatal QA error: ${error instanceof Error ? error.stack || error.message : String(error)}`);
} finally {
    await browser.close();
}

const result = {
    generatedAt: new Date().toISOString(),
    baseURL,
    counters,
    modalChecks,
    popupCoverage: [...popupCoverage].sort(),
    scenarios,
    failures
};
await writeFile(
    path.join(evidenceDir, 'task-13-demo-parity.json'),
    `${JSON.stringify(result, null, 2)}\n`,
    'utf8'
);
await writeFile(
    path.join(evidenceDir, 'task-12-overlay-focus.json'),
    `${JSON.stringify({
        generatedAt: result.generatedAt,
        baseURL,
        checks: modalChecks,
        duplicateDialogs: counters.duplicateDialogs,
        horizontalOverflow: counters.horizontalOverflow,
        failures: failures.filter(failure => failure.includes('modal') || failure.includes('popup'))
    }, null, 2)}\n`,
    'utf8'
);
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (hasFailures(counters) || fatalError) {
    process.exitCode = 1;
}

async function runPopupCoverage(page, viewportId, coverage, modalCheckList, counters, failureList) {
    const check = async (name, callback) => {
        try {
            await callback();
            coverage.add(`${viewportId}:${name}`);
        } catch (error) {
            counters.noOpActions += 1;
            failureList.push(`popup coverage ${viewportId}/${name}: ${error instanceof Error ? error.message : String(error)}`);
            await closeActiveDialogs(page);
        }
    };
    const verifyModal = async (name, modal) => {
        await modal.waitFor({ state: 'visible' });
        const activeModals = page.locator(
            '[role="dialog"][aria-modal="true"]:not([aria-hidden="true"]), [role="alertdialog"][aria-modal="true"]:not([aria-hidden="true"])'
        );
        const activeCount = await activeModals.count();
        assert.equal(activeCount, 1, `${name} must have exactly one active modal`);
        const box = await modal.boundingBox();
        const viewport = page.viewportSize();
        assert.ok(box && viewport, `${name} must have a measurable viewport`);
        assert.ok(box.x >= -1 && box.x + box.width <= viewport.width + 1, `${name} must fit the viewport width`);

        const focusableCount = await modal.locator(
            'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
        ).count();
        if (focusableCount > 0) {
            await page.keyboard.press('Tab');
            const focusStayedInside = await modal.evaluate((element) => element.contains(document.activeElement));
            assert.equal(focusStayedInside, true, `${name} must retain keyboard focus`);
        }
        modalCheckList.push({ name, viewport: viewportId, activeCount, focusableCount, horizontalFit: true });
    };

    await page.goto(`${baseURL}/demo/manager`, { waitUntil: 'domcontentloaded' });
    await closeTour(page);
    await check('header-notification', async () => {
        const button = page.getByRole('button', { name: /알림 \d+건/ });
        await button.click();
        await page.getByRole('dialog', { name: '알림 목록', exact: true }).waitFor();
        await page.keyboard.press('Escape');
        await page.getByRole('dialog', { name: '알림 목록', exact: true }).waitFor({ state: 'hidden' });
    });
    await check('header-profile', async () => {
        await page.getByRole('button', { name: /김담당/ }).first().click();
        await page.getByRole('menu', { name: '사용자 메뉴', exact: true }).waitFor();
        await page.keyboard.press('Escape');
        await page.getByRole('menu', { name: '사용자 메뉴', exact: true }).waitFor({ state: 'hidden' });
    });
    await check('dashboard-notice', async () => {
        await page.getByRole('button', { name: '공지사항 작성', exact: true }).click();
        const dialog = page.getByRole('dialog', { name: '신규 공지사항 작성', exact: true });
        await verifyModal('dashboard-notice', dialog);
        await page.getByRole('button', { name: '공지사항 작성 닫기', exact: true }).click();
    });

    await clickDemoNav(page, '모객 DB');
    await closeTour(page);
    await check('lead-detail-form', async () => {
        await page.getByRole('button', { name: /김민준 .*등록/ }).click();
        const detailDialog = page.getByRole('dialog', { name: '김민준', exact: true });
        await verifyModal('lead-detail', detailDialog);
        await page.getByRole('button', { name: '기본정보 수정', exact: true }).click();
        const formDialog = page.getByRole('dialog', { name: '가맹 희망자 수정', exact: true });
        await verifyModal('lead-form', formDialog);
        await page.getByRole('button', { name: '가맹 희망자 수정 닫기', exact: true }).click();
        await page.getByRole('button', { name: '가맹 희망자 상세 패널 닫기', exact: true }).click();
    });
    await check('lead-quick-activity', async () => {
        await page.getByRole('button', { name: '박서연 상담 이력 추가', exact: true }).click();
        const dialog = page.getByRole('dialog', { name: '상담 이력 빠른 추가', exact: true });
        await verifyModal('lead-quick-activity', dialog);
        await dialog.getByRole('button', { name: '빠른 활동 기록 닫기', exact: true }).click();
    });
    await check('lead-confirm', async () => {
        await page.getByRole('button', { name: '박서연 삭제', exact: true }).click();
        const dialog = page.getByRole('alertdialog', { name: '가맹 희망자 삭제', exact: true });
        await verifyModal('lead-confirm', dialog);
        await dialog.getByRole('button', { name: '취소', exact: true }).click();
        await dialog.waitFor({ state: 'hidden' });
    });
    await check('lead-state-persistence', async () => {
        const priorityButton = page.getByRole('button', { name: /박서연 중요 표시(?: 해제)?/, exact: true });
        const beforeLabel = await priorityButton.getAttribute('aria-label');
        assert.ok(beforeLabel);
        await priorityButton.click();
        const expectedLabel = beforeLabel.endsWith('해제') ? '박서연 중요 표시' : '박서연 중요 표시 해제';
        await page.getByRole('button', { name: expectedLabel, exact: true }).waitFor();
        await clickDemoNav(page, '계약 완료');
        await closeTour(page);
        await clickDemoNav(page, '모객 DB');
        await closeTour(page);
        await page.getByRole('button', { name: expectedLabel, exact: true }).waitFor();
        await page.getByRole('button', { name: expectedLabel, exact: true }).click();
    });

    await clickDemoNav(page, '계약 완료');
    await closeTour(page);
    await check('contract-tabs', async () => {
        await page.getByRole('button', { name: '최하늘', exact: true }).click();
        const dialog = page.getByRole('dialog', { name: '최하늘', exact: true });
        await verifyModal('contract-detail', dialog);
        await dialog.getByRole('button', { name: '오픈 준비', exact: true }).click();
        await dialog.getByRole('button', { name: '구비서류', exact: true }).click();
        const linkedDocumentButton = dialog.getByRole('button', { name: /\d+건 연결/ }).first();
        await linkedDocumentButton.click();
        const documentDialog = page.locator('[aria-labelledby="lead-checklist-document-modal-title"]');
        await verifyModal('contract-document', documentDialog);
        await page.locator('#lead-checklist-document-modal-title').waitFor();
        if (viewportId === 'mobile') {
            await page.screenshot({
                path: path.join(evidenceDir, 'task-12-overlay-focus-mobile.png'),
                fullPage: false
            });
        }
        await page.keyboard.press('Escape');
        await documentDialog.waitFor({ state: 'hidden' });
        await dialog.getByRole('button', { name: '점주 문서함', exact: true }).click();
        await dialog.getByRole('button', { name: '가맹점 정보', exact: true }).click();
        await dialog.getByRole('button', { name: '구비서류 패널 닫기', exact: true }).click();
    });

    await clickDemoNav(page, '출점 후보지');
    await closeTour(page);
    await check('location-report-message', async () => {
        const row = page.locator('tr').filter({ hasText: '강남역 1층 코너' });
        await row.getByRole('button', { name: '리포트', exact: true }).click();
        const report = page.getByRole('dialog', { name: '출점 검토 리포트', exact: true });
        await verifyModal('location-report', report);

        const presetSelect = report.locator('label').filter({ hasText: '불러오기' }).locator('select');
        await presetSelect.selectOption({ label: '표준 검토안' });
        await report.getByRole('button', { name: '삭제', exact: true }).first().click();
        const presetConfirm = page.getByRole('alertdialog', { name: '분석표 프리셋 삭제', exact: true });
        await verifyModal('location-preset-confirm', presetConfirm);
        await page.keyboard.press('Escape');
        await presetConfirm.waitFor({ state: 'hidden' });
        assert.equal(
            await report.evaluate(element => element.contains(document.activeElement)),
            true,
            'preset confirmation must restore focus to the location report'
        );

        await report.getByRole('button', { name: 'PDF 저장', exact: true }).click();
        const popupAlert = page.getByRole('alertdialog', { name: '팝업 차단', exact: true });
        await verifyModal('location-popup-alert', popupAlert);
        await page.keyboard.press('Escape');
        await popupAlert.waitFor({ state: 'hidden' });
        assert.equal(
            await report.evaluate(element => element.contains(document.activeElement)),
            true,
            'popup alert must restore focus to the location report'
        );

        await report.getByRole('button', { name: '닫기', exact: true }).click();
        await row.getByRole('button', { name: '기록', exact: true }).click();
        const messageDialog = page.getByRole('dialog', { name: '물건 기록', exact: true });
        await verifyModal('location-message', messageDialog);
        await page.keyboard.press('Escape');
        await messageDialog.waitFor({ state: 'hidden' });
    });
    await check('location-confirm', async () => {
        const row = page.locator('tr').filter({ hasText: '강남역 1층 코너' });
        await row.getByRole('button', { name: '삭제', exact: true }).click();
        const dialog = page.getByRole('alertdialog', { name: '출점 후보지 삭제', exact: true });
        await verifyModal('location-confirm', dialog);
        await dialog.getByRole('button', { name: '취소', exact: true }).click();
        await dialog.waitFor({ state: 'hidden' });
    });

    await clickDemoNav(page, '가맹 운영');
    await closeTour(page);
    await check('operations-form', async () => {
        await page.getByRole('tab', { name: '가맹점 등록', exact: true }).click();
        await page.getByLabel('가맹점명', { exact: true }).fill('QA 샘플점');
        await page.getByRole('tab', { name: '가맹점 목록', exact: true }).click();
    });
    await check('operations-confirm', async () => {
        const operationsSurface = page.locator('[data-demo-surface="operations"]:not([hidden])');
        await operationsSurface.getByRole('button', { name: '삭제', exact: true }).first().click();
        const dialog = page.getByRole('alertdialog', { name: '가맹점 정보 삭제', exact: true });
        await verifyModal('operations-confirm', dialog);
        await dialog.getByRole('button', { name: '취소', exact: true }).click();
        await dialog.waitFor({ state: 'hidden' });
    });
}

async function closeActiveDialogs(page) {
    for (let index = 0; index < 4; index += 1) {
        const activeDialog = page.locator(
            '[role="dialog"][aria-modal="true"]:not([aria-hidden="true"]), [role="alertdialog"][aria-modal="true"]:not([aria-hidden="true"])'
        ).last();
        if (!(await activeDialog.isVisible().catch(() => false))) return;
        await page.keyboard.press('Escape');
        await page.waitForTimeout(50);
    }
}

async function closeTour(page) {
    const tourDialog = page.locator('[data-demo-id="demo-tour-card"]');
    const closeButton = page.getByRole('button', { name: '데모 설명 닫기', exact: true });
    if (await closeButton.isVisible()) {
        await page.waitForTimeout(150);
        await closeButton.click();
        await tourDialog.waitFor({ state: 'hidden' });
    }
}

async function inspectEveryTourStep(page, role, screen, viewportId, counters, failures) {
    const tourDialog = page.locator('[data-demo-id="demo-tour-card"]');
    for (let stepIndex = 0; stepIndex < 12 && await tourDialog.count() > 0; stepIndex += 1) {
        if (!(await tourDialog.isVisible())) {
            await closeActiveDialogs(page);
            await tourDialog.waitFor({ state: 'visible', timeout: 1_500 }).catch(() => undefined);
        }
        await page.locator('[class*="spotlight"]').first()
            .waitFor({ state: 'visible', timeout: 1_000 })
            .catch(() => undefined);
        const spotlightCount = await page.locator('[class*="spotlight"]').count();
        const progressText = await tourDialog.getByText(/^\d+ \/ \d+$/).textContent().catch(() => '');
        if (spotlightCount === 0) {
            counters.staleTourTargets += 1;
            failures.push(`stale tour target: ${role}/${screen}/${viewportId}/${progressText || stepIndex + 1}`);
        }

        const [current, total] = String(progressText).split('/').map(value => Number(value.trim()));
        if (!Number.isFinite(current) || !Number.isFinite(total) || current >= total) {
            await closeTour(page);
            return;
        }
        await tourDialog.getByRole('button', { name: '다음', exact: true }).click();
        await page.waitForTimeout(80);
    }
    await closeTour(page);
    await closeActiveDialogs(page);
}

async function clickDemoNav(page, label) {
    const navigation = page.getByRole('navigation', { name: '데모 메뉴', exact: true });
    const target = navigation.locator('a, button').filter({ hasText: label }).first();
    if (!(await target.isVisible())) {
        const headerMenuButton = page.getByRole('button', { name: '메뉴 열기', exact: true });
        const sidebarMenuButton = page.getByRole('button', { name: '데모 메뉴 열기', exact: true });
        if (await headerMenuButton.isVisible()) {
            await headerMenuButton.click();
        } else if (await sidebarMenuButton.isVisible()) {
            await sidebarMenuButton.click();
        }
    }
    await target.click();
    await page.waitForTimeout(80);
}
