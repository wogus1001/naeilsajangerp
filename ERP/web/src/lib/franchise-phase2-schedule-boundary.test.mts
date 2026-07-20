import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { isFranchiseOperationsScheduleSource } from './franchise-schedule-source-types';

const SOURCE_ROUTES = [
    '../app/api/franchise-supervision/visits/route.ts',
    '../app/api/franchise-supervision/reports/reportRouteSupport.ts',
    '../app/api/franchise-supervision/actions/route.ts',
    '../app/api/franchise-opening-projects/route.ts',
    '../app/api/owner/requests/route.ts',
    '../app/api/owner/opening-tasks/route.ts',
    '../app/api/franchise-owner-portal/submissions/route.ts'
] as const;

void test('Given franchise phase two source routes When auditing persistence Then no store-development schedule path remains', () => {
    for (const relativePath of SOURCE_ROUTES) {
        const source = readFileSync(new URL(relativePath, import.meta.url), 'utf8');
        assert.doesNotMatch(source, /\.from\(['"]schedules['"]\)/, relativePath);
        assert.doesNotMatch(source, /upsertWorkflowSchedule/, relativePath);
        assert.doesNotMatch(source, /\/api\/schedules/, relativePath);
    }
});

void test('Given franchise phase two source routes When auditing persistence Then each mutation boundary uses franchise schedule sync', () => {
    for (const relativePath of SOURCE_ROUTES) {
        const source = readFileSync(new URL(relativePath, import.meta.url), 'utf8');
        assert.match(
            source,
            /syncFranchiseOperationalSchedule|safelySyncOwnerSubmissionSchedule/,
            relativePath
        );
    }
});

void test('Given franchise source persistence succeeds When schedule sync and retry persistence both fail Then the failure is not swallowed', () => {
    for (const relativePath of SOURCE_ROUTES) {
        const source = readFileSync(new URL(relativePath, import.meta.url), 'utf8');
        assert.doesNotMatch(source, /Optional .* franchise schedule sync skipped/, relativePath);
        assert.doesNotMatch(source, /Optional supervision visit workflow sync skipped/, relativePath);
        assert.doesNotMatch(source, /corrective action sync deferred/, relativePath);
    }
    const reportRoute = readFileSync(new URL('../app/api/franchise-supervision/reports/route.ts', import.meta.url), 'utf8');
    assert.doesNotMatch(reportRoute, /corrective action sync deferred/);
});

void test('Given legacy franchise operation rows When classifying shared schedules Then every franchise source is excluded', () => {
    assert.equal(isFranchiseOperationsScheduleSource('supervision-visit'), true);
    assert.equal(isFranchiseOperationsScheduleSource('vendor-contract-renewal'), true);
    assert.equal(isFranchiseOperationsScheduleSource('manual-workflow'), false);
    assert.equal(isFranchiseOperationsScheduleSource('approval-document'), false);
});

void test('Given the shared schedule API When reading or mutating legacy franchise rows Then the franchise boundary runs first', () => {
    const source = readFileSync(new URL('../app/api/schedules/route.ts', import.meta.url), 'utf8');
    assert.match(source.replace(/\s+/g, ' '), /const storeDevelopmentRows = .*isFranchiseOperationsScheduleSource/);
    const mutationGuardIndex = source.indexOf('isFranchiseOperationsScheduleSource(existing.source_type)');
    const completionIndex = source.indexOf("textValue(body.action) === 'complete'");
    assert.notEqual(mutationGuardIndex, -1);
    assert.notEqual(completionIndex, -1);
    assert.ok(mutationGuardIndex < completionIndex);
});

void test('Given a notification list request When auditing schedule writes Then GET cannot reach scheduled generation', () => {
    const source = readFileSync(new URL('../app/api/franchise-notifications/route.ts', import.meta.url), 'utf8');
    const getStart = source.indexOf('export async function GET');
    const nextHandler = source.indexOf('export async function POST', getStart);
    const getHandler = source.slice(getStart, nextHandler === -1 ? undefined : nextHandler);
    assert.doesNotMatch(getHandler, /syncNotificationSourceSchedules/);
    assert.doesNotMatch(getHandler, /runScheduledNotificationGeneration/);
});

void test('Given the notification cron When dispatching generation Then it uses the authenticated command route', () => {
    const cronRoute = readFileSync(new URL('../app/api/franchise-notifications/cron/route.ts', import.meta.url), 'utf8');
    const vercelConfig = readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8');
    assert.match(cronRoute, /POST as generateScheduledNotifications/);
    assert.match(cronRoute, /authorization/);
    assert.match(vercelConfig, /\/api\/franchise-notifications\/cron/);
    assert.match(vercelConfig.replace(/\s+/g, ' '), /"path": "\/api\/franchise-notifications\/cron", "schedule": "0 15 \* \* \*"/);
    assert.doesNotMatch(vercelConfig, /franchise-notifications\?cron=1/);
});
