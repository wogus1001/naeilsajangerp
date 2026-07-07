export const LABOR_WEEKDAYS = [
    { key: 'mon', label: '월' },
    { key: 'tue', label: '화' },
    { key: 'wed', label: '수' },
    { key: 'thu', label: '목' },
    { key: 'fri', label: '금' },
    { key: 'sat', label: '토' },
    { key: 'sun', label: '일' }
] as const;
export const LABOR_ROLE_TYPES = ['store_manager', 'full_time', 'part_time'] as const;
export type LaborWeekday = typeof LABOR_WEEKDAYS[number]['key'];
export type LaborRoleType = typeof LABOR_ROLE_TYPES[number];
export type LaborSettings = {
    readonly effectiveYear: number;
    readonly minimumHourlyWage: number;
    readonly employeeInsuranceRate: number;
    readonly employerInsuranceRate: number;
    readonly withholdingRate: number;
    readonly overtimeMultiplier: number;
    readonly nightMultiplier: number;
    readonly holidayMultiplier: number;
};

export type LaborPlanInput = {
    readonly monthlySalesTarget: number;
    readonly targetLaborRatio: number;
    readonly operatingWeekdays: readonly LaborWeekday[];
    readonly openTime: string;
    readonly closeTime: string;
    readonly ownerWorks: boolean;
    readonly useBreakTime: boolean;
    readonly breakStartTime: string;
    readonly breakEndTime: string;
    readonly managerMonthlySalary: number;
    readonly staffMonthlySalary: number;
    readonly partTimeHourlyWage: number;
    readonly settings: LaborSettings;
};

export type LaborRoleRecommendation = {
    readonly roleType: LaborRoleType;
    readonly label: string;
    readonly headcount: number;
    readonly monthlyCost: number;
    readonly weeklyHours: number;
    readonly note: string;
};

export type LaborDaySchedule = {
    readonly weekday: LaborWeekday;
    readonly label: string;
    readonly shifts: readonly string[];
    readonly totalHours: number;
    readonly dailyCost: number;
};

export type LaborPlanResult = {
    readonly monthlySalesTarget: number;
    readonly targetLaborRatio: number;
    readonly laborBudget: number;
    readonly monthlyLaborCost: number;
    readonly laborRatio: number;
    readonly totalHeadcount: number;
    readonly ownerWorks: boolean;
    readonly useBreakTime: boolean;
    readonly breakStartTime: string;
    readonly breakEndTime: string;
    readonly roles: readonly LaborRoleRecommendation[];
    readonly weeklySchedule: readonly LaborDaySchedule[];
    readonly memo: string;
};

export type PayrollCalculation = {
    readonly grossPay: number;
    readonly insuranceDeduction: number;
    readonly incomeTax: number;
    readonly netPay: number;
};

export type PayrollWithNonTaxableCalculation = PayrollCalculation & {
    readonly nonTaxablePay: number;
    readonly taxablePay: number;
    readonly employerCost: number;
};

export type WeeklyPartTimeCostCalculation = {
    readonly hourlyWage: number;
    readonly weeklyHours: number;
    readonly weeklyWorkdays: number;
    readonly regularPay: number;
    readonly holidayHours: number;
    readonly holidayAllowance: number;
    readonly weeklyTotal: number;
    readonly monthlyEstimate: number;
};

export const DEFAULT_LABOR_SETTINGS: LaborSettings = {
    effectiveYear: 2026,
    minimumHourlyWage: 10030,
    employeeInsuranceRate: 9.4,
    employerInsuranceRate: 11,
    withholdingRate: 3.3,
    overtimeMultiplier: 1.5,
    nightMultiplier: 1.5,
    holidayMultiplier: 1.5
} as const;

const WEEKS_PER_MONTH = 4.345;
function positiveNumber(value: number, fallback: number): number {
    return Number.isFinite(value) && value > 0 ? value : fallback;
}

function rounded(value: number): number {
    return Math.round(value);
}
function parseHourMinute(value: string, fallback: number): number {
    const [hourText, minuteText] = value.split(':');
    const hour = Number(hourText);
    const minute = Number(minuteText || '0');
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return fallback;
    return hour + minute / 60;
}

export function calculateDailyOperatingHours(openTime: string, closeTime: string): number {
    const open = parseHourMinute(openTime, 10);
    const close = parseHourMinute(closeTime, 22);
    const rawHours = close > open ? close - open : close + 24 - open;
    return Math.max(1, Math.min(24, rawHours));
}

function calculateEffectiveDailyHours(input: LaborPlanInput): number {
    const dailyHours = calculateDailyOperatingHours(input.openTime, input.closeTime);
    if (!input.useBreakTime) return dailyHours;
    const breakHours = calculateDailyOperatingHours(input.breakStartTime, input.breakEndTime);
    return Math.max(1, dailyHours - Math.min(dailyHours - 1, breakHours));
}
function roleMonthlyCost(input: {
    readonly monthlySalary?: number;
    readonly hourlyWage?: number;
    readonly weeklyHours: number;
    readonly headcount: number;
    readonly employerInsuranceRate: number;
}): number {
    const baseCost = input.monthlySalary
        ? input.monthlySalary * input.headcount
        : positiveNumber(input.hourlyWage || 0, DEFAULT_LABOR_SETTINGS.minimumHourlyWage)
            * input.weeklyHours
            * WEEKS_PER_MONTH
            * input.headcount;
    return rounded(baseCost * (1 + input.employerInsuranceRate / 100));
}

function buildRoleRecommendations(input: LaborPlanInput): readonly LaborRoleRecommendation[] {
    const sales = positiveNumber(input.monthlySalesTarget, 30_000_000);
    const dailyHours = calculateEffectiveDailyHours(input);
    const weeklyDays = Math.max(1, input.operatingWeekdays.length || 6);
    const managerSalary = positiveNumber(input.managerMonthlySalary, 3_000_000);
    const staffSalary = positiveNumber(input.staffMonthlySalary, 2_600_000);
    const partTimeWage = Math.max(
        positiveNumber(input.partTimeHourlyWage, input.settings.minimumHourlyWage),
        input.settings.minimumHourlyWage
    );

    const baseManagerHeadcount = sales >= 90_000_000 ? 2 : 1;
    const managerHeadcount = input.ownerWorks ? Math.max(0, baseManagerHeadcount - 1) : baseManagerHeadcount;
    const fullTimeHeadcount = sales >= 100_000_000 ? 2 : sales >= 55_000_000 ? 1 : 0;
    const partTimeHeadcount = sales >= 100_000_000 ? 4 : sales >= 55_000_000 ? 3 : 2;
    const managerWeeklyHours = Math.min(52, weeklyDays * Math.min(dailyHours, 9));
    const fullTimeWeeklyHours = fullTimeHeadcount > 0 ? Math.min(45, weeklyDays * 7.5) : 0;
    const partTimeWeeklyHours = Math.min(22, weeklyDays * Math.min(4.5, dailyHours / 2));

    return [
        {
            roleType: 'store_manager',
            label: '점장',
            headcount: managerHeadcount,
            weeklyHours: managerWeeklyHours,
            monthlyCost: roleMonthlyCost({ monthlySalary: managerSalary, headcount: managerHeadcount, weeklyHours: managerWeeklyHours, employerInsuranceRate: input.settings.employerInsuranceRate }),
            note: input.ownerWorks ? '점주/본인 상주로 유급 점장 채용을 줄인 기준' : '매장 책임자와 피크 시간대 운영 관리 기준'
        },
        {
            roleType: 'full_time',
            label: '직원',
            headcount: fullTimeHeadcount,
            weeklyHours: fullTimeWeeklyHours,
            monthlyCost: roleMonthlyCost({ monthlySalary: staffSalary, headcount: fullTimeHeadcount, weeklyHours: fullTimeWeeklyHours, employerInsuranceRate: input.settings.employerInsuranceRate }),
            note: fullTimeHeadcount > 0 ? '상시 운영과 마감 안정화 기준' : '초기 매출 구간은 점장+파트타임 중심'
        },
        {
            roleType: 'part_time',
            label: '알바',
            headcount: partTimeHeadcount,
            weeklyHours: partTimeWeeklyHours,
            monthlyCost: roleMonthlyCost({ hourlyWage: partTimeWage, headcount: partTimeHeadcount, weeklyHours: partTimeWeeklyHours, employerInsuranceRate: 0 }),
            note: '점심/저녁 피크와 주말 보강 기준'
        }
    ];
}

function buildWeeklySchedule(input: LaborPlanInput, roles: readonly LaborRoleRecommendation[]): readonly LaborDaySchedule[] {
    const dailyHours = calculateDailyOperatingHours(input.openTime, input.closeTime);
    const activeDays = new Set(input.operatingWeekdays.length > 0 ? input.operatingWeekdays : LABOR_WEEKDAYS.map(day => day.key));
    const partTimer = roles.find(role => role.roleType === 'part_time');
    const dailyBaseCost = roles.reduce((sum, role) => sum + role.monthlyCost, 0) / Math.max(1, activeDays.size * WEEKS_PER_MONTH);

    return LABOR_WEEKDAYS.map(day => {
        if (!activeDays.has(day.key)) {
            return { weekday: day.key, label: day.label, shifts: ['휴무'], totalHours: 0, dailyCost: 0 };
        }
        const shifts = [
            input.ownerWorks ? `본인 ${input.openTime}-${input.closeTime}` : `점장 ${input.openTime}-${input.closeTime}`,
            input.useBreakTime ? `브레이크 ${input.breakStartTime}-${input.breakEndTime}` : '',
            dailyHours > 9 ? `직원 ${input.openTime}-${addHours(input.openTime, 8)}` : '',
            partTimer && partTimer.headcount > 0 ? `알바 ${addHours(input.closeTime, -5)}-${input.closeTime}` : ''
        ].filter(Boolean);
        return {
            weekday: day.key,
            label: day.label,
            shifts,
            totalHours: rounded(roles.reduce((sum, role) => sum + role.weeklyHours * role.headcount / Math.max(1, activeDays.size), 0)),
            dailyCost: rounded(dailyBaseCost)
        };
    });
}

function addHours(time: string, hours: number): string {
    const total = Math.round((parseHourMinute(time, 10) + hours + 24) % 24);
    return `${String(total).padStart(2, '0')}:00`;
}

export function calculateLaborPlan(input: LaborPlanInput): LaborPlanResult {
    const roles = buildRoleRecommendations(input);
    const monthlyLaborCost = roles.reduce((sum, role) => sum + role.monthlyCost, 0);
    const monthlySalesTarget = positiveNumber(input.monthlySalesTarget, 30_000_000);
    const targetLaborRatio = positiveNumber(input.targetLaborRatio, 20);
    const laborBudget = rounded(monthlySalesTarget * targetLaborRatio / 100);

    return {
        monthlySalesTarget,
        targetLaborRatio,
        laborBudget,
        monthlyLaborCost,
        laborRatio: monthlySalesTarget > 0 ? Number((monthlyLaborCost / monthlySalesTarget * 100).toFixed(1)) : 0,
        totalHeadcount: roles.reduce((sum, role) => sum + role.headcount, 0),
        ownerWorks: input.ownerWorks,
        useBreakTime: input.useBreakTime,
        breakStartTime: input.breakStartTime,
        breakEndTime: input.breakEndTime,
        roles,
        weeklySchedule: buildWeeklySchedule(input, roles),
        memo: '운영 예산 산정용 참고값입니다. 실제 급여, 보험, 세무, 노무 판단은 회사 기준과 전문가 검토를 함께 확인해주세요.'
    };
}

export function calculatePayroll(grossPay: number, insuranceRate: number, incomeTax: number): PayrollCalculation {
    const gross = positiveNumber(grossPay, 0);
    const insuranceDeduction = rounded(gross * Math.max(0, insuranceRate) / 100);
    const tax = rounded(gross * Math.max(0, incomeTax) / 100);
    return { grossPay: gross, insuranceDeduction, incomeTax: tax, netPay: Math.max(0, gross - insuranceDeduction - tax) };
}

export function calculatePayrollWithNonTaxable(input: {
    readonly grossPay: number;
    readonly nonTaxablePay: number;
    readonly settings: LaborSettings;
}): PayrollWithNonTaxableCalculation {
    const grossPay = positiveNumber(input.grossPay, 0);
    const nonTaxablePay = Math.min(grossPay, Math.max(0, input.nonTaxablePay));
    const taxablePay = Math.max(0, grossPay - nonTaxablePay);
    const payroll = calculatePayroll(taxablePay, input.settings.employeeInsuranceRate, 3);
    return {
        grossPay,
        nonTaxablePay,
        taxablePay,
        insuranceDeduction: payroll.insuranceDeduction,
        incomeTax: payroll.incomeTax,
        netPay: Math.max(0, grossPay - payroll.insuranceDeduction - payroll.incomeTax),
        employerCost: rounded(grossPay * (1 + Math.max(0, input.settings.employerInsuranceRate) / 100))
    };
}

export function calculateWithholding33(grossPay: number, withholdingRate = DEFAULT_LABOR_SETTINGS.withholdingRate): PayrollCalculation {
    return calculatePayroll(grossPay, 0, withholdingRate);
}

export function calculateDayWage(input: {
    readonly hourlyWage: number;
    readonly baseHours: number;
    readonly overtimeHours: number;
    readonly nightHours: number;
    readonly settings: LaborSettings;
}): number {
    const hourlyWage = Math.max(positiveNumber(input.hourlyWage, input.settings.minimumHourlyWage), input.settings.minimumHourlyWage);
    const base = hourlyWage * Math.max(0, input.baseHours);
    const overtime = hourlyWage * Math.max(0, input.overtimeHours) * input.settings.overtimeMultiplier;
    const night = hourlyWage * Math.max(0, input.nightHours) * (input.settings.nightMultiplier - 1);
    return rounded(base + overtime + night);
}

export function calculateWeeklyPartTimeCost(input: {
    readonly hourlyWage: number;
    readonly weeklyHours: number;
    readonly weeklyWorkdays: number;
    readonly settings: LaborSettings;
}): WeeklyPartTimeCostCalculation {
    const hourlyWage = Math.max(positiveNumber(input.hourlyWage, input.settings.minimumHourlyWage), input.settings.minimumHourlyWage);
    const weeklyHours = Math.max(0, input.weeklyHours);
    const weeklyWorkdays = Math.max(1, Math.round(input.weeklyWorkdays));
    const regularPay = rounded(hourlyWage * weeklyHours);
    const holidayHours = weeklyHours >= 15 ? Math.min(8, weeklyHours / weeklyWorkdays) : 0;
    const holidayAllowance = rounded(hourlyWage * holidayHours);
    const weeklyTotal = regularPay + holidayAllowance;
    return {
        hourlyWage,
        weeklyHours,
        weeklyWorkdays,
        regularPay,
        holidayHours: Number(holidayHours.toFixed(1)),
        holidayAllowance,
        weeklyTotal,
        monthlyEstimate: rounded(weeklyTotal * WEEKS_PER_MONTH)
    };
}
