import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
    buildKpiCards,
    MainDashboardTypeAStats,
    type KpiMetrics
} from './MainDashboardTypeAStats.js';

const controlledMetrics = {
    leadTotal: 18,
    eligible: 4,
    candidateLocations: 9,
    matchingNeeded: 6
} satisfies KpiMetrics;

test('Given controlled KPI metrics When rendering the stats surface Then live fetch is not called and all operational cards keep their routes', () => {
    const statsSource = readFileSync(new URL('./MainDashboardTypeAStats.tsx', import.meta.url), 'utf8');
    const originalFetch = globalThis.fetch;
    let fetchCalls = 0;
    globalThis.fetch = (async (...args: Parameters<typeof fetch>) => {
        fetchCalls += 1;
        return originalFetch(...args);
    }) as typeof fetch;

    try {
        const markup = renderToStaticMarkup(React.createElement(MainDashboardTypeAStats, {
            requesterId: 'demo-requester',
            companyName: '데모 회사',
            metrics: controlledMetrics,
            onNavigate: () => undefined
        }));
        const cards = buildKpiCards(controlledMetrics, false, () => undefined);

        assert.equal(fetchCalls, 0);
        assert.ok(statsSource.indexOf('if (metrics !== undefined)') < statsSource.indexOf('function LiveMainDashboardTypeAStats'));
        assert.doesNotMatch(markup, /<strong>-<\/strong>/);
        assert.match(markup, /모객 DB/);
        assert.match(markup, /18/);
        assert.match(markup, /계약 가능/);
        assert.match(markup, /4/);
        assert.match(markup, /출점 후보지/);
        assert.match(markup, /9/);
        assert.match(markup, /연결 필요/);
        assert.match(markup, /6/);
        assert.deepEqual(cards.map(card => card.href), [
            '/dashboard/franchise-leads',
            '/dashboard/franchise-leads?sort=disclosure_eligible',
            '/dashboard/franchise-leads/market-insights?view=location-list',
            '/dashboard/franchise-leads/market-insights?view=region-insight'
        ]);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test('Given the production dashboard When the notice dialog is extracted Then the page delegates to the shared prop-driven component', () => {
    const pageSource = readFileSync(new URL('../../app/(main)/dashboard/page.tsx', import.meta.url), 'utf8');
    const dialogSource = readFileSync(new URL('./DashboardNoticeDialog.tsx', import.meta.url), 'utf8');

    assert.match(pageSource, /<DashboardNoticeDialog/);
    assert.match(pageSource, /onSubmit=\{handleCreateNotice\}/);
    assert.doesNotMatch(pageSource, /backgroundColor:\s*'rgba\(0,0,0,0\.5\)'/);
    assert.match(dialogSource, /readonly isOpen: boolean/);
    assert.match(dialogSource, /readonly draft: DashboardNoticeDraft/);
    assert.match(dialogSource, /readonly onDraftChange:/);
    assert.match(dialogSource, /role="dialog"/);
});
