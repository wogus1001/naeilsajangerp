import { isCompanyMenuFeatureKey } from '@/lib/company-menu-features';
import type {
    AdminCompanyAccessApiResponse,
    AdminCompanyAccessData,
    AdminCompanyFeature,
    AdminCompanySummary
} from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, key: string): string | null {
    const value = record[key];
    return typeof value === 'string' ? value : null;
}

function readNumber(record: Record<string, unknown>, key: string): number | null {
    const value = record[key];
    return typeof value === 'number' ? value : null;
}

function parseStringArray(value: unknown): readonly string[] | null {
    if (!Array.isArray(value)) return null;
    const names: string[] = [];
    for (const item of value) {
        if (typeof item !== 'string') return null;
        names.push(item);
    }
    return names;
}

function parseCompany(value: unknown): AdminCompanySummary | null {
    if (!isRecord(value)) return null;

    const id = readString(value, 'id');
    const name = readString(value, 'name');
    const businessNumber = readString(value, 'businessNumber');
    const status = readString(value, 'status');
    const createdAt = readString(value, 'createdAt');
    const userCount = readNumber(value, 'userCount');
    const activeUserCount = readNumber(value, 'activeUserCount');
    const pendingUserCount = readNumber(value, 'pendingUserCount');
    const managerNames = parseStringArray(value.managerNames);

    if (!id || !name || !businessNumber || !status || createdAt === null) return null;
    if (userCount === null || activeUserCount === null || pendingUserCount === null || !managerNames) return null;

    return { id, name, businessNumber, status, createdAt, userCount, activeUserCount, pendingUserCount, managerNames };
}

function parseFeature(value: unknown): AdminCompanyFeature | null {
    if (!isRecord(value)) return null;

    const key = readString(value, 'key');
    const category = readString(value, 'category');
    const title = readString(value, 'title');
    const description = readString(value, 'description');
    const enabled = value.enabled;

    if (!key || !isCompanyMenuFeatureKey(key) || !category || !title || !description || typeof enabled !== 'boolean') {
        return null;
    }

    return { key, category, title, description, enabled };
}

function parseCompanyArray(value: unknown): readonly AdminCompanySummary[] | null {
    if (!Array.isArray(value)) return null;
    const companies: AdminCompanySummary[] = [];
    for (const item of value) {
        const company = parseCompany(item);
        if (!company) return null;
        companies.push(company);
    }
    return companies;
}

function parseFeatureArray(value: unknown): readonly AdminCompanyFeature[] | null {
    if (!Array.isArray(value)) return null;
    const features: AdminCompanyFeature[] = [];
    for (const item of value) {
        const feature = parseFeature(item);
        if (!feature) return null;
        features.push(feature);
    }
    return features;
}

function parseAccessData(value: unknown): AdminCompanyAccessData | null {
    if (!isRecord(value)) return null;

    const companies = parseCompanyArray(value.companies);
    const selectedCompany = value.selectedCompany === null ? null : parseCompany(value.selectedCompany);
    const features = parseFeatureArray(value.features);

    if (!companies || selectedCompany === null && value.selectedCompany !== null || !features) return null;
    return { companies, selectedCompany, features };
}

export function parseCompanyAccessResponse(value: unknown): AdminCompanyAccessApiResponse | null {
    if (!isRecord(value)) return null;

    const success = typeof value.success === 'boolean' ? value.success : undefined;
    const error = readString(value, 'error') || undefined;
    const message = readString(value, 'message') || undefined;
    const data = parseAccessData(value.data);

    if (!data && !error && !message) return null;
    return { success, data: data || undefined, error, message };
}
