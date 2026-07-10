import type {
    LaborPlanResult,
    LaborSettings,
    LaborWeekday
} from '@/lib/franchise-labor-planning';

export type LaborPlanForm = {
    readonly locationId: string;
    readonly title: string;
    readonly monthlySalesManwon: number;
    readonly targetLaborRatio: number;
    readonly operatingWeekdays: readonly LaborWeekday[];
    readonly partTimeWeekdays: readonly LaborWeekday[];
    readonly openTime: string;
    readonly closeTime: string;
    readonly ownerWorks: boolean;
    readonly useBreakTime: boolean;
    readonly breakStartTime: string;
    readonly breakEndTime: string;
    readonly managerMonthlySalaryManwon: number;
    readonly staffMonthlySalaryManwon: number;
    readonly partTimeHourlyWage: number;
    readonly memo: string;
};

export type LaborScope = {
    readonly userId: string;
    readonly companyName: string;
};

export type LaborSettingsPayload = {
    readonly schemaReady: boolean;
    readonly canManage: boolean;
    readonly companyId: string;
    readonly settings: LaborSettings;
};

export type LaborSavedPlan = {
    readonly id: string;
    readonly companyId: string;
    readonly locationId: string;
    readonly title: string;
    readonly monthlySalesTarget: number;
    readonly targetLaborRatio: number;
    readonly operatingWeekdays: readonly LaborWeekday[];
    readonly openTime: string;
    readonly closeTime: string;
    readonly summary: LaborPlanResult;
    readonly memo: string;
    readonly status: string;
    readonly createdAt: string | null;
};

export type LaborPlansPayload = {
    readonly schemaReady: boolean;
    readonly companyId: string;
    readonly plans: readonly LaborSavedPlan[];
};
