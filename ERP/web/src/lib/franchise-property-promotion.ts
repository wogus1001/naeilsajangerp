import { normalizeRegion } from './franchise-market-insights';
import type { FranchiseFileAttachment } from './franchise-file-attachments';
import type { FranchiseLocationDataEnvelope } from './franchise-location-master';
import {
    normalizeFranchiseFileAttachments,
    normalizeFranchiseFileNames
} from './franchise-file-attachments';
import {
    buildLocationMasterData,
    buildPropertyIntakeDetails,
    type FranchisePropertyIntakeDetails
} from './franchise-property-promotion-master-data';
import {
    FRANCHISE_PROPERTY_PROMOTION_HEAVY_KEYS,
    FRANCHISE_PROPERTY_PROMOTION_LABELS,
    FRANCHISE_PROPERTY_PROMOTION_MAPPED_KEYS
} from './franchise-property-promotion-memo';

export type FranchisePropertyPromotionRow = {
    readonly id: string;
    readonly company_id: string | null;
    readonly manager_id: string | null;
    readonly name: string | null;
    readonly status: string | null;
    readonly operation_type: string | null;
    readonly address: string | null;
    readonly created_at?: string | null;
    readonly updated_at?: string | null;
    readonly data: Record<string, unknown> | null;
};

export type FranchisePropertySourceLocation = {
    readonly id: string;
    readonly sourcePropertyId?: string | null;
    readonly source_property_id?: string | null;
};

export type FranchisePropertyPromotionDraft = {
    readonly company_id: string;
    readonly manager_id: string | null;
    readonly name: string;
    readonly location_type: '예정점';
    readonly brand: string;
    readonly status: '검토중';
    readonly region: string;
    readonly address: string;
    readonly latitude: number | null;
    readonly longitude: number | null;
    readonly opened_at: null;
    readonly source_property_id: string;
    readonly memo: string;
    readonly data: FranchiseLocationDataEnvelope & {
        readonly sourceType: 'property-registration';
        readonly addressDetail: string;
        readonly sourcePropertySnapshot: Record<string, unknown>;
        readonly propertyIntakeDetails: FranchisePropertyIntakeDetails;
        readonly fileNames?: readonly string[];
        readonly fileAttachments?: readonly FranchiseFileAttachment[];
    };
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cleanString(value: unknown): string {
    if (value === null || value === undefined) return '';
    return String(value).trim();
}

function readDataString(data: Record<string, unknown>, keys: readonly string[]): string {
    for (const key of keys) {
        const value = cleanString(data[key]);
        if (value) return value;
    }
    return '';
}

function readNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const raw = cleanString(value);
    if (!raw) return null;
    const parsed = Number(raw.replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
}

function readCoordinate(data: Record<string, unknown>, directKeys: readonly string[], nestedKey: 'lat' | 'lng'): number | null {
    for (const key of directKeys) {
        const parsed = readNumber(data[key]);
        if (parsed !== null) return parsed;
    }

    const coordinates = data.coordinates;
    if (!isRecord(coordinates)) return null;
    return readNumber(coordinates[nestedKey]);
}

function formatMemoValue(value: unknown): string {
    if (Array.isArray(value)) return value.length > 0 ? `${value.length}건` : '';
    if (isRecord(value)) {
        const text = JSON.stringify(value);
        return text.length > 160 ? `${text.slice(0, 157)}...` : text;
    }
    return cleanString(value);
}

function buildMemo(property: FranchisePropertyPromotionRow): string {
    const lines: string[] = [];
    const data = property.data || {};
    const summaryRows: readonly [string, string][] = [
        ['업태', readDataString(data, ['categoryMajor', 'desiredBusinessType', 'businessType'])],
        ['업종', readDataString(data, ['categoryMiddle', 'desiredCategory', 'category', 'industry'])],
        ['우선순위', readDataString(data, ['matchPriority'])],
        ['상담 메모', readDataString(data, ['consultationMemo'])]
    ];

    for (const [label, value] of summaryRows) {
        if (value) lines.push(`- ${label}: ${value}`);
    }

    for (const [key, value] of Object.entries(data)) {
        if (
            FRANCHISE_PROPERTY_PROMOTION_MAPPED_KEYS.has(key) ||
            FRANCHISE_PROPERTY_PROMOTION_HEAVY_KEYS.has(key)
        ) continue;
        const formatted = formatMemoValue(value);
        if (!formatted) continue;
        lines.push(`- ${FRANCHISE_PROPERTY_PROMOTION_LABELS[key] || key}: ${formatted}`);
    }

    return lines.join('\n');
}

function buildAttachmentData(data: Record<string, unknown>): {
    readonly fileNames?: readonly string[];
    readonly fileAttachments?: readonly FranchiseFileAttachment[];
} {
    const fileAttachments = normalizeFranchiseFileAttachments(data.fileAttachments);
    const fileNames = normalizeFranchiseFileNames(data.fileNames, fileAttachments);
    if (fileAttachments.length === 0 && fileNames.length === 0) return {};
    return { fileNames, fileAttachments };
}

function buildSnapshot(
    property: FranchisePropertyPromotionRow,
    region: string,
    attachmentData: ReturnType<typeof buildAttachmentData>
): Record<string, unknown> {
    const data = property.data || {};
    return {
        id: property.id,
        name: property.name || '',
        address: property.address || '',
        region,
        status: property.status || '',
        operationType: property.operation_type || '',
        area: data.area || null,
        desiredBrand: data.desiredBrand || data.brand || null,
        categoryMajor: data.categoryMajor || data.desiredBusinessType || null,
        categoryMiddle: data.categoryMiddle || data.desiredCategory || null,
        desiredCategory: data.desiredCategory || null,
        detailAddress: data.detailAddress || null,
        privateArea: data.privateArea || null,
        supplyArea: data.supplyArea || null,
        deposit: data.deposit || null,
        premium: data.premium || null,
        monthlyRent: data.monthlyRent || null,
        maintenanceFee: data.maintenanceFee || data.maintenance || null,
        leaseAvailableDate: data.leaseAvailableDate || null,
        currentStatus: data.currentStatus || null,
        totalPrice: data.totalPrice || null,
        createdAt: property.created_at || null,
        updatedAt: property.updated_at || null,
        ...attachmentData
    };
}

export function findPromotedSourceLocation(
    propertyId: string,
    locations: readonly FranchisePropertySourceLocation[]
): FranchisePropertySourceLocation | null {
    return locations.find(location => (
        location.sourcePropertyId === propertyId || location.source_property_id === propertyId
    )) || null;
}

export function buildFranchisePropertyPromotionDraft(
    property: FranchisePropertyPromotionRow,
    targetCompanyId: string,
    selectedManagerId?: string | null
): FranchisePropertyPromotionDraft {
    const data = property.data || {};
    const promotionData: Record<string, unknown> = {
        ...data,
        currentStatus: data.currentStatus || property.status || '',
        operationType: data.operationType || property.operation_type || ''
    };
    const attachmentData = buildAttachmentData(data);
    const address = cleanString(property.address) || readDataString(data, ['propertyAddress', '물건 주소']);
    const explicitRegion = readDataString(data, ['region', '지역']);
    const splitRegion = [readDataString(data, ['sido', '시도']), readDataString(data, ['sigungu', '시군구'])]
        .filter(Boolean)
        .join(' ');
    const region = explicitRegion || splitRegion || normalizeRegion(address);
    const name = cleanString(property.name) || readDataString(data, ['propertyName', '물건명']) || '입점 요청 후보지';
    const locationMasterData = buildLocationMasterData(promotionData);
    const addressDetail = readDataString(data, ['detailAddress', 'addressDetail', '상세 주소']);

    return {
        company_id: targetCompanyId,
        manager_id: selectedManagerId || property.manager_id || null,
        name,
        location_type: '예정점',
        brand: readDataString(data, ['desiredBrand', 'franchiseBrand', 'brand', '브랜드']),
        status: '검토중',
        region,
        address,
        latitude: readCoordinate(data, ['latitude', 'lat', '위도'], 'lat'),
        longitude: readCoordinate(data, ['longitude', 'lng', '경도'], 'lng'),
        opened_at: null,
        source_property_id: property.id,
        memo: buildMemo(property),
        data: {
            sourceType: 'property-registration',
            addressDetail,
            sourcePropertySnapshot: buildSnapshot(property, region, attachmentData),
            ...locationMasterData,
            propertyIntakeDetails: buildPropertyIntakeDetails(promotionData),
            ...attachmentData
        }
    };
}
