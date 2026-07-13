import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('Given a React change event When filters update Then the state updater does not retain the event target', () => {
    const source = readFileSync(new URL('./FranchiseSchedulePage.tsx', import.meta.url), 'utf8');

    assert.doesNotMatch(source, /setFilters\(current =>[^\n]*event\.currentTarget/);
});

test('Given an authenticated mutation When request headers are built Then the Headers instance is not spread into an object', () => {
    const source = readFileSync(new URL('./FranchiseSchedulePage.tsx', import.meta.url), 'utf8');

    assert.doesNotMatch(source, /\.\.\.\(await getApiAuthHeaders\(\)\)/);
    assert.match(source, /getApiAuthHeaders\(\{ 'Content-Type': 'application\/json' \}\)/);
});

test('Given a manual schedule form When assigning work Then company assignee IDs are selected without a manager field', () => {
    const pageSource = readFileSync(new URL('./FranchiseSchedulePage.tsx', import.meta.url), 'utf8');
    const dialogSource = readFileSync(new URL('./FranchiseScheduleDialogs.tsx', import.meta.url), 'utf8');

    assert.match(pageSource, /assigneeProfileId: form\.assigneeProfileId/);
    assert.doesNotMatch(pageSource, /managerName: form\.managerName/);
    assert.match(dialogSource, /<select value=\{value\.assigneeProfileId\}/);
    assert.doesNotMatch(dialogSource, /<label>관리자/);
});

test('Given schedule source filters When rendered Then the user-facing label uses type terminology', () => {
    const source = readFileSync(new URL('./FranchiseSchedulePage.tsx', import.meta.url), 'utf8');

    assert.match(source, /'전체 유형'/);
    assert.doesNotMatch(source, /'전체 원천'/);
});

test('Given the schedule page When loading remote data Then it delegates to the schedule data hook', () => {
    const source = readFileSync(new URL('./FranchiseSchedulePage.tsx', import.meta.url), 'utf8');

    assert.match(source, /useFranchiseScheduleData\(monthDate\)/);
    assert.doesNotMatch(source, /const loadAssignees = async/);
});

test('Given the monthly calendar When navigating Then it exposes the point-development calendar affordances', () => {
    const pageSource = readFileSync(new URL('./FranchiseSchedulePage.tsx', import.meta.url), 'utf8');
    const calendarSource = readFileSync(new URL('./FranchiseScheduleCalendar.tsx', import.meta.url), 'utf8');

    assert.match(pageSource, /className=\{styles\.calendarColumn\}/);
    assert.match(pageSource, />오늘<\/button>/);
    assert.match(calendarSource, /styles\.dayToday/);
    assert.match(calendarSource, /styles\.daySunday/);
    assert.match(calendarSource, /styles\.daySaturday/);
});

test('Given a schedule mutation result When notifying the user Then a centered alert modal is used', () => {
    const pageSource = readFileSync(new URL('./FranchiseSchedulePage.tsx', import.meta.url), 'utf8');

    assert.match(pageSource, /<AlertModal/);
    assert.doesNotMatch(pageSource, /styles\.alert/);
});

test('Given manual schedule controls When rendered Then shared and personal scopes are exposed', () => {
    const pageSource = readFileSync(new URL('./FranchiseSchedulePage.tsx', import.meta.url), 'utf8');
    const dialogSource = readFileSync(new URL('./FranchiseScheduleDialogs.tsx', import.meta.url), 'utf8');

    assert.match(pageSource, /공유 일정/);
    assert.match(pageSource, /개인 일정/);
    assert.match(dialogSource, /회사 구성원 모두 확인/);
    assert.match(dialogSource, /나만 확인/);
    assert.match(dialogSource, /setAttribute\('inert'/);
    assert.match(dialogSource, /event\.key === 'Escape'/);
    assert.match(dialogSource, /initialFocusRef\.current\?\.focus\(\)/);
});
