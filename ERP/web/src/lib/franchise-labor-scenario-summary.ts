import type { LaborDaySchedule, LaborPlanResult, LaborRoleRecommendation, LaborRoleType } from './franchise-labor-planning';

export type LaborScenarioKey = 'lean' | 'standard' | 'growth';
export type LaborScenarioTone = 'safe' | 'watch' | 'over';

type LaborScenarioDefinition = {
    readonly key: LaborScenarioKey;
    readonly label: string;
    readonly description: string;
};

export type LaborScenarioRole = {
    readonly roleType: LaborRoleType;
    readonly label: string;
    readonly headcount: number;
    readonly monthlyCost: number;
};

const WEEKS_PER_MONTH = 4.345;

const SCENARIO_DEFINITIONS: readonly LaborScenarioDefinition[] = [
    { key: 'lean', label: '보수형', description: '초기 비용을 낮추고 피크 시간 보강만 최소 운영' },
    { key: 'standard', label: '표준형', description: '현재 입력 조건 기준의 기본 추천 구성' },
    { key: 'growth', label: '공격형', description: '오픈 초반 안정성과 피크 대응 여유를 더 둔 구성' }
] as const;

export type LaborScenarioSummary = {
    readonly key: LaborScenarioKey;
    readonly label: string;
    readonly description: string;
    readonly monthlyLaborCost: number;
    readonly laborRatio: number;
    readonly totalHeadcount: number;
    readonly roleSummary: readonly LaborScenarioRole[];
    readonly riskLabel: string;
    readonly riskTone: LaborScenarioTone;
};

function unitCost(role: LaborRoleRecommendation): number {
    return role.headcount > 0 ? role.monthlyCost / role.headcount : 0;
}

function adjustRole(role: LaborRoleRecommendation, headcount: number): LaborScenarioRole {
    return {
        roleType: role.roleType,
        label: role.label,
        headcount,
        monthlyCost: Math.round(unitCost(role) * headcount)
    };
}

function adjustRecommendation(role: LaborRoleRecommendation, headcount: number): LaborRoleRecommendation {
    const nextCost = Math.round(unitCost(role) * headcount);
    const noteSuffix = headcount > role.headcount ? ' · 피크 보강' : headcount < role.headcount ? ' · 최소 운영' : '';
    return {
        ...role,
        headcount,
        monthlyCost: nextCost,
        note: `${role.note}${noteSuffix}`
    };
}

function scenarioHeadcount(role: LaborRoleRecommendation, key: LaborScenarioKey, monthlySalesTarget: number): number {
    if (key === 'standard') return role.headcount;
    if (key === 'lean') {
        if (role.roleType === 'full_time' && role.headcount > 1) return role.headcount - 1;
        if (role.roleType === 'part_time' && role.headcount > 1) return role.headcount - 1;
        return role.headcount;
    }
    if (role.roleType === 'part_time') return role.headcount + 1;
    if (role.roleType === 'full_time' && monthlySalesTarget >= 90_000_000 && role.headcount > 0) return role.headcount + 1;
    return role.headcount;
}

function scenarioRisk(laborRatio: number, targetLaborRatio: number): { readonly label: string; readonly tone: LaborScenarioTone } {
    if (laborRatio <= targetLaborRatio) return { label: '목표 이내', tone: 'safe' };
    if (laborRatio <= targetLaborRatio + 3) return { label: '주의', tone: 'watch' };
    return { label: '초과', tone: 'over' };
}

export function buildLaborScenarioSummaries(result: LaborPlanResult): readonly LaborScenarioSummary[] {
    return SCENARIO_DEFINITIONS.map(definition => {
        const roleSummary = result.roles.map(role => adjustRole(
            role,
            scenarioHeadcount(role, definition.key, result.monthlySalesTarget)
        ));
        const monthlyLaborCost = roleSummary.reduce((sum, role) => sum + role.monthlyCost, 0);
        const laborRatio = result.monthlySalesTarget > 0
            ? Number((monthlyLaborCost / result.monthlySalesTarget * 100).toFixed(1))
            : 0;
        const risk = scenarioRisk(laborRatio, result.targetLaborRatio);
        return {
            ...definition,
            description: definition.key === 'standard' && result.ownerWorks
                ? '본인 근무를 반영한 현재 추천 구성'
                : definition.description,
            monthlyLaborCost,
            laborRatio,
            totalHeadcount: roleSummary.reduce((sum, role) => sum + role.headcount, 0),
            roleSummary,
            riskLabel: risk.label,
            riskTone: risk.tone
        };
    });
}

function filterScenarioShifts(day: LaborDaySchedule, roles: readonly LaborRoleRecommendation[]): readonly string[] {
    const hasFullTimer = roles.some(role => role.roleType === 'full_time' && role.headcount > 0);
    const hasPartTimer = roles.some(role => role.roleType === 'part_time' && role.headcount > 0);
    const shifts = day.shifts.filter(shift => {
        if (shift.startsWith('직원 ')) return hasFullTimer;
        if (shift.startsWith('알바 ')) return hasPartTimer;
        return true;
    });
    return shifts.length > 0 ? shifts : ['휴무'];
}

function buildScenarioSchedule(
    result: LaborPlanResult,
    roles: readonly LaborRoleRecommendation[],
    monthlyLaborCost: number
): readonly LaborDaySchedule[] {
    const activeDays = result.weeklySchedule.filter(day => day.totalHours > 0);
    const dailyCost = Math.round(monthlyLaborCost / Math.max(1, activeDays.length * WEEKS_PER_MONTH));
    return result.weeklySchedule.map(day => {
        if (day.totalHours <= 0) return day;
        return {
            ...day,
            shifts: filterScenarioShifts(day, roles),
            totalHours: Math.round(roles.reduce((sum, role) => sum + role.weeklyHours * role.headcount / Math.max(1, activeDays.length), 0)),
            dailyCost
        };
    });
}

export function buildLaborScenarioResult(result: LaborPlanResult, scenarioKey: LaborScenarioKey): LaborPlanResult {
    const roles = result.roles.map(role => adjustRecommendation(
        role,
        scenarioHeadcount(role, scenarioKey, result.monthlySalesTarget)
    ));
    const monthlyLaborCost = roles.reduce((sum, role) => sum + role.monthlyCost, 0);
    const laborRatio = result.monthlySalesTarget > 0
        ? Number((monthlyLaborCost / result.monthlySalesTarget * 100).toFixed(1))
        : 0;

    return {
        ...result,
        monthlyLaborCost,
        laborRatio,
        totalHeadcount: roles.reduce((sum, role) => sum + role.headcount, 0),
        roles,
        weeklySchedule: buildScenarioSchedule(result, roles, monthlyLaborCost)
    };
}
