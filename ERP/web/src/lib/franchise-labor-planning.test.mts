import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    DEFAULT_LABOR_SETTINGS,
    calculateDailyOperatingHours,
    calculateDayWage,
    calculateLaborPlan,
    calculatePayroll,
    calculatePayrollWithNonTaxable,
    calculateWeeklyPartTimeCost,
    calculateWithholding33
} from './franchise-labor-planning.js';
import { buildLaborScheduleReportHtml } from '../components/franchise/operations/LaborPlanningReportPrint.js';
import { buildLaborScenarioResult, buildLaborScenarioSummaries } from './franchise-labor-scenario-summary.js';

const baseInput = {
    monthlySalesTarget: 60_000_000,
    targetLaborRatio: 19,
    operatingWeekdays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const,
    partTimeWeekdays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const,
    openTime: '10:00',
    closeTime: '22:00',
    ownerWorks: false,
    useBreakTime: true,
    breakStartTime: '15:00',
    breakEndTime: '17:00',
    managerMonthlySalary: 3_500_000,
    staffMonthlySalary: 2_700_000,
    partTimeHourlyWage: 11_000,
    settings: DEFAULT_LABOR_SETTINGS
} as const;

void test('Given monthly sales target When calculating labor plan Then labor ratio and role recommendation are returned', () => {
    const result = calculateLaborPlan(baseInput);

    assert.equal(result.monthlySalesTarget, 60_000_000);
    assert.equal(result.laborBudget, 11_400_000);
    assert.ok(result.monthlyLaborCost > 0);
    assert.ok(result.laborRatio > 0);
    assert.equal(result.roles.find(role => role.roleType === 'store_manager')?.headcount, 1);
    assert.equal(result.roles.find(role => role.roleType === 'full_time')?.headcount, 1);
    assert.equal(result.roles.find(role => role.roleType === 'part_time')?.headcount, 3);
    assert.equal(result.roles.some(role => role.label === '프리랜서'), false);
    assert.equal(result.useBreakTime, true);
});

void test('Given owner works condition When calculating labor plan Then paid manager headcount is reduced', () => {
    const result = calculateLaborPlan({ ...baseInput, ownerWorks: true });

    assert.equal(result.ownerWorks, true);
    assert.equal(result.roles.find(role => role.roleType === 'store_manager')?.headcount, 0);
    assert.ok(result.weeklySchedule.find(day => day.weekday === 'mon')?.shifts.some(shift => shift.startsWith('본인 ')));
});

void test('Given operating times crossing midnight When calculating hours Then next-day close is handled', () => {
    assert.equal(calculateDailyOperatingHours('18:00', '02:00'), 8);
});

void test('Given weekly schedule When calculating labor plan Then inactive weekdays are marked as closed', () => {
    const result = calculateLaborPlan({
        ...baseInput,
        operatingWeekdays: ['mon', 'tue', 'wed'] as const,
        partTimeWeekdays: ['mon', 'tue', 'wed'] as const
    });

    assert.equal(result.weeklySchedule.length, 7);
    assert.deepEqual(result.weeklySchedule.filter(day => day.dailyCost === 0).map(day => day.weekday), ['thu', 'fri', 'sat', 'sun']);
    assert.ok(result.weeklySchedule.find(day => day.weekday === 'mon')?.totalHours);
});

void test('Given selected part-time weekdays When calculating labor plan Then part-time shifts only appear on selected days', () => {
    const result = calculateLaborPlan({
        ...baseInput,
        partTimeWeekdays: ['fri', 'sat'] as const
    });
    const monday = result.weeklySchedule.find(day => day.weekday === 'mon');
    const friday = result.weeklySchedule.find(day => day.weekday === 'fri');

    assert.deepEqual(result.partTimeWeekdays, ['fri', 'sat']);
    assert.equal(monday?.shifts.some(shift => shift.startsWith('알바 ')), false);
    assert.equal(friday?.shifts.some(shift => shift.startsWith('알바 ')), true);
    assert.ok((monday?.dailyCost || 0) < (friday?.dailyCost || 0));

    const displayResult = buildLaborScenarioResult(result, 'standard');
    const displayMonday = displayResult.weeklySchedule.find(day => day.weekday === 'mon');
    const displayFriday = displayResult.weeklySchedule.find(day => day.weekday === 'fri');
    assert.equal(displayMonday?.shifts.some(shift => shift.startsWith('알바 ')), false);
    assert.equal(displayFriday?.shifts.some(shift => shift.startsWith('알바 ')), true);
    assert.ok((displayMonday?.dailyCost || 0) < (displayFriday?.dailyCost || 0));
});

void test('Given labor plan result When building scenario summaries Then options are ordered by staffing level', () => {
    const scenarios = buildLaborScenarioSummaries(calculateLaborPlan(baseInput));
    const lean = scenarios.find(scenario => scenario.key === 'lean');
    const standard = scenarios.find(scenario => scenario.key === 'standard');
    const growth = scenarios.find(scenario => scenario.key === 'growth');

    assert.equal(scenarios.length, 3);
    assert.ok(lean && standard && growth);
    assert.ok(lean.monthlyLaborCost <= standard.monthlyLaborCost);
    assert.ok(growth.monthlyLaborCost >= standard.monthlyLaborCost);
    assert.ok(growth.totalHeadcount >= standard.totalHeadcount);
});

void test('Given selected labor scenario When deriving display result Then staffing numbers change', () => {
    const result = calculateLaborPlan(baseInput);
    const leanResult = buildLaborScenarioResult(result, 'lean');
    const growthResult = buildLaborScenarioResult(result, 'growth');

    assert.ok(leanResult.monthlyLaborCost < result.monthlyLaborCost);
    assert.ok(leanResult.totalHeadcount < result.totalHeadcount);
    assert.ok(growthResult.monthlyLaborCost > result.monthlyLaborCost);
    assert.ok(growthResult.totalHeadcount > result.totalHeadcount);
    assert.ok(growthResult.weeklySchedule[0]?.dailyCost > leanResult.weeklySchedule[0]?.dailyCost);
});

void test('Given payroll input When calculating deductions Then net pay is reduced by configured rates', () => {
    const payroll = calculatePayroll(3_000_000, 9.4, 3);

    assert.equal(payroll.grossPay, 3_000_000);
    assert.equal(payroll.insuranceDeduction, 282_000);
    assert.equal(payroll.incomeTax, 90_000);
    assert.equal(payroll.netPay, 2_628_000);
});

void test('Given non-taxable pay When calculating payroll Then deductions are based on taxable pay only', () => {
    const payroll = calculatePayrollWithNonTaxable({
        grossPay: 3_000_000,
        nonTaxablePay: 200_000,
        settings: DEFAULT_LABOR_SETTINGS
    });

    assert.equal(payroll.taxablePay, 2_800_000);
    assert.equal(payroll.insuranceDeduction, 263_200);
    assert.equal(payroll.incomeTax, 84_000);
    assert.equal(payroll.netPay, 2_652_800);
    assert.equal(payroll.employerCost, 3_330_000);
});

void test('Given gross pay When calculating 3.3 percent withholding Then tax and net pay are returned', () => {
    const result = calculateWithholding33(1_000_000);

    assert.equal(result.incomeTax, 33_000);
    assert.equal(result.netPay, 967_000);
});

void test('Given daily wage input When overtime and night hours exist Then premiums are included', () => {
    const dayWage = calculateDayWage({
        hourlyWage: 11_000,
        baseHours: 8,
        overtimeHours: 2,
        nightHours: 1,
        settings: DEFAULT_LABOR_SETTINGS
    });

    assert.equal(dayWage, 126_500);
});

void test('Given weekly hours below holiday threshold When calculating part-time cost Then holiday allowance is zero', () => {
    const result = calculateWeeklyPartTimeCost({
        hourlyWage: 11_000,
        weeklyHours: 14,
        weeklyWorkdays: 3,
        settings: DEFAULT_LABOR_SETTINGS
    });

    assert.equal(result.holidayHours, 0);
    assert.equal(result.holidayAllowance, 0);
    assert.equal(result.weeklyTotal, 154_000);
});

void test('Given weekly hours above holiday threshold When calculating part-time cost Then holiday allowance is included', () => {
    const result = calculateWeeklyPartTimeCost({
        hourlyWage: 11_000,
        weeklyHours: 18,
        weeklyWorkdays: 3,
        settings: DEFAULT_LABOR_SETTINGS
    });

    assert.equal(result.holidayHours, 6);
    assert.equal(result.holidayAllowance, 66_000);
    assert.equal(result.weeklyTotal, 264_000);
    assert.equal(result.monthlyEstimate, 1_147_080);
});

void test('Given labor plan result When building schedule report Then report includes store and weekly rows', () => {
    const result = calculateLaborPlan(baseInput);
    const html = buildLaborScheduleReportHtml({
        locationName: '테스트 운영점',
        planTitle: '점장 근무 포함 세팅안',
        result
    });

    assert.match(html, /인력 세팅 근무표 보고서/);
    assert.match(html, /테스트 운영점/);
    assert.match(html, /점장 근무 포함 세팅안/);
    assert.match(html, /주간 근무표/);
    assert.match(html, /월/);
    assert.match(html, /알바/);
});
