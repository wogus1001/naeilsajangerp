import type { CompanyDashboardMode, CompanyMenuFeatureKey } from '@/lib/company-menu-features';

export type AdminCompanySummary = {
    readonly id: string;
    readonly name: string;
    readonly businessNumber: string;
    readonly status: string;
    readonly createdAt: string;
    readonly userCount: number;
    readonly activeUserCount: number;
    readonly pendingUserCount: number;
    readonly managerNames: readonly string[];
    readonly logoUrl: string | null;
    readonly logoFileName: string | null;
    readonly logoFileSize: number | null;
    readonly logoUpdatedAt: string | null;
};

export type AdminCompanyFeature = {
    readonly key: CompanyMenuFeatureKey;
    readonly category: string;
    readonly title: string;
    readonly description: string;
    readonly enabled: boolean;
};

export type AdminCompanyAccessData = {
    readonly companies: readonly AdminCompanySummary[];
    readonly selectedCompany: AdminCompanySummary | null;
    readonly dashboardMode: CompanyDashboardMode;
    readonly features: readonly AdminCompanyFeature[];
};

export type AdminCompanyAccessApiResponse = {
    readonly success?: boolean;
    readonly data?: AdminCompanyAccessData;
    readonly error?: string;
    readonly message?: string;
};
