import type { FranchiseFileAttachment } from './franchise-file-attachments';
import {
    normalizeFranchiseFileAttachments,
    normalizeFranchiseFileNames
} from './franchise-file-attachments';

export const LOCATION_DEVELOPMENT_STAGES = ['개발중', '물건화 완료'] as const;
export const LOCATION_IMPORTANCE_LEVELS = ['높음', '보통', '낮음'] as const;
export const SITE_CONDITION_AVAILABILITY = ['미확인', '있음', '없음'] as const;

export type LocationDevelopmentStage = typeof LOCATION_DEVELOPMENT_STAGES[number];
export type LocationImportanceLevel = typeof LOCATION_IMPORTANCE_LEVELS[number];
export type SiteConditionAvailability = typeof SITE_CONDITION_AVAILABILITY[number];

export type SiteConditionItem = {
    readonly value: SiteConditionAvailability;
    readonly memo: string;
};

export type LocationSiteCondition = {
    readonly exclusiveAreaPyeong: number | null;
    readonly exclusiveAreaMemo: string;
    readonly restroom: SiteConditionItem;
    readonly elevator: SiteConditionItem;
    readonly demolition: SiteConditionItem;
    readonly parking: SiteConditionItem;
};

export type LocationLandlordInfo = {
    readonly name: string;
    readonly phone: string;
    readonly tendency: string;
};

export type LocationAcquisitionCost = {
    readonly deposit: number | null;
    readonly premium: number | null;
    readonly memo: string;
};

export type LocationLeaseCondition = {
    readonly monthlyRent: number | null;
    readonly maintenanceFee: number | null;
    readonly memo: string;
};

export type FranchiseLocationMasterData = {
    readonly developmentStage: LocationDevelopmentStage;
    readonly importance: LocationImportanceLevel;
    readonly fileNames: readonly string[];
    readonly fileAttachments: readonly FranchiseFileAttachment[];
    readonly siteCondition: LocationSiteCondition;
    readonly landlord: LocationLandlordInfo;
    readonly cost: LocationAcquisitionCost;
    readonly lease: LocationLeaseCondition;
};

export type FranchiseLocationDataEnvelope = Record<string, unknown> & FranchiseLocationMasterData;

const EMPTY_SITE_CONDITION_ITEM: SiteConditionItem = {
    value: '미확인',
    memo: ''
};

export const EMPTY_LOCATION_MASTER_DATA: FranchiseLocationMasterData = {
    developmentStage: '개발중',
    importance: '보통',
    fileNames: [],
    fileAttachments: [],
    siteCondition: {
        exclusiveAreaPyeong: null,
        exclusiveAreaMemo: '',
        restroom: EMPTY_SITE_CONDITION_ITEM,
        elevator: EMPTY_SITE_CONDITION_ITEM,
        demolition: EMPTY_SITE_CONDITION_ITEM,
        parking: EMPTY_SITE_CONDITION_ITEM
    },
    landlord: {
        name: '',
        phone: '',
        tendency: ''
    },
    cost: {
        deposit: null,
        premium: null,
        memo: ''
    },
    lease: {
        monthlyRent: null,
        maintenanceFee: null,
        memo: ''
    }
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cleanString(value: unknown): string {
    if (value === null || value === undefined) return '';
    return String(value).replace(/\s+/g, ' ').trim();
}

export function parseLocationMoney(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(String(value).replace(/,/g, '').trim());
    if (!Number.isFinite(parsed)) return null;
    return Math.max(0, Math.round(parsed));
}

export function parseLocationDecimal(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(String(value).replace(/,/g, '').trim());
    if (!Number.isFinite(parsed)) return null;
    return Math.max(0, Math.round(parsed * 10) / 10);
}

export function toLocationDevelopmentStage(value: unknown): LocationDevelopmentStage {
    const raw = cleanString(value);
    return LOCATION_DEVELOPMENT_STAGES.find(stage => stage === raw) || '개발중';
}

export function toLocationImportanceLevel(value: unknown): LocationImportanceLevel {
    const raw = cleanString(value);
    return LOCATION_IMPORTANCE_LEVELS.find(level => level === raw) || '보통';
}

export function toSiteConditionAvailability(value: unknown): SiteConditionAvailability {
    const raw = cleanString(value);
    return SITE_CONDITION_AVAILABILITY.find(option => option === raw) || '미확인';
}

function normalizeConditionItem(value: unknown): SiteConditionItem {
    const source = isRecord(value) ? value : {};
    return {
        value: toSiteConditionAvailability(source.value),
        memo: cleanString(source.memo)
    };
}

function normalizeSiteCondition(value: unknown): LocationSiteCondition {
    const source = isRecord(value) ? value : {};
    return {
        exclusiveAreaPyeong: parseLocationDecimal(source.exclusiveAreaPyeong),
        exclusiveAreaMemo: cleanString(source.exclusiveAreaMemo),
        restroom: normalizeConditionItem(source.restroom),
        elevator: normalizeConditionItem(source.elevator),
        demolition: normalizeConditionItem(source.demolition),
        parking: normalizeConditionItem(source.parking)
    };
}

function normalizeLandlord(value: unknown): LocationLandlordInfo {
    const source = isRecord(value) ? value : {};
    return {
        name: cleanString(source.name),
        phone: cleanString(source.phone),
        tendency: cleanString(source.tendency)
    };
}

function normalizeCost(value: unknown): LocationAcquisitionCost {
    const source = isRecord(value) ? value : {};
    return {
        deposit: parseLocationMoney(source.deposit),
        premium: parseLocationMoney(source.premium),
        memo: cleanString(source.memo)
    };
}

function normalizeLease(value: unknown): LocationLeaseCondition {
    const source = isRecord(value) ? value : {};
    return {
        monthlyRent: parseLocationMoney(source.monthlyRent),
        maintenanceFee: parseLocationMoney(source.maintenanceFee),
        memo: cleanString(source.memo)
    };
}

export function normalizeFranchiseLocationMasterData(value: unknown): FranchiseLocationMasterData {
    const source = isRecord(value) ? value : {};
    const fileAttachments = normalizeFranchiseFileAttachments(source.fileAttachments);
    return {
        developmentStage: toLocationDevelopmentStage(source.developmentStage),
        importance: toLocationImportanceLevel(source.importance),
        fileNames: normalizeFranchiseFileNames(source.fileNames, fileAttachments),
        fileAttachments,
        siteCondition: normalizeSiteCondition(source.siteCondition),
        landlord: normalizeLandlord(source.landlord),
        cost: normalizeCost(source.cost),
        lease: normalizeLease(source.lease)
    };
}

export function mergeFranchiseLocationData(
    existingData: Record<string, unknown>,
    nextData: Record<string, unknown>
): FranchiseLocationDataEnvelope {
    const merged = {
        ...existingData,
        ...nextData
    };
    return {
        ...merged,
        ...normalizeFranchiseLocationMasterData(merged)
    };
}

export function getAcquisitionCostTotal(cost: LocationAcquisitionCost): number {
    return (cost.deposit || 0) + (cost.premium || 0);
}

export function formatLocationMoney(value: number | null): string {
    if (value === null) return '-';
    return `${value.toLocaleString()}만원`;
}

export function buildNaverMapSearchUrl(address: string, name: string): string {
    const query = cleanString(address) || cleanString(name);
    return `https://map.naver.com/p/search/${encodeURIComponent(query)}`;
}
