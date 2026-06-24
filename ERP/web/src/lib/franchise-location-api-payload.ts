import { randomUUID } from 'crypto';

import { fail } from '@/lib/api-response';
import { mergeFranchiseLocationData } from '@/lib/franchise-location-master';

const LOCATION_TYPES = ['직영점', '가맹점', '예정점'];
const LOCATION_STATUSES = ['운영중', '오픈준비', '검토중', '휴점', '폐점'];
const CONTROL_FIELDS = new Set([
    'id',
    'requesterId',
    'userId',
    'companyName',
    'companyId',
    'managerId',
    'manager_id',
    'createdBy',
    'created_by',
    'name',
    'locationType',
    'location_type',
    'brand',
    'status',
    'region',
    'address',
    'latitude',
    'lat',
    'longitude',
    'lng',
    'openedAt',
    'opened_at',
    'sourcePropertyId',
    'source_property_id',
    'contractLeadId',
    'contract_lead_id',
    'sourceLocationId',
    'source_location_id',
    'sourceExternalListingId',
    'source_external_listing_id',
    'contractedAt',
    'contracted_at',
    'memo'
]);

export type LocationRequestBody = Record<string, unknown>;

export function isRecord(value: unknown): value is LocationRequestBody {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function getFirst(body: LocationRequestBody, keys: readonly string[]) {
    for (const key of keys) {
        if (Object.prototype.hasOwnProperty.call(body, key)) return body[key];
    }
    return undefined;
}

export function hasAny(body: LocationRequestBody, keys: readonly string[]): boolean {
    return keys.some(key => Object.prototype.hasOwnProperty.call(body, key));
}

export function cleanString(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    const normalized = String(value).trim();
    return normalized.length > 0 ? normalized : null;
}

function parseNullableNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(String(value).trim().replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
}

function parseNullableDate(value: unknown): string | null {
    const raw = cleanString(value);
    if (!raw) return null;
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? raw : parsed.toISOString().slice(0, 10);
}

function parseNullableDateTime(value: unknown): string | null {
    const raw = cleanString(value);
    if (!raw) return null;
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? raw : parsed.toISOString();
}

function normalizeLocationType(value: unknown) {
    const raw = cleanString(value) || '예정점';
    const matched = LOCATION_TYPES.find(type => type === raw || raw.includes(type.replace('점', '')));
    return matched || '예정점';
}

function normalizeLocationStatus(value: unknown) {
    const raw = cleanString(value) || '검토중';
    const matched = LOCATION_STATUSES.find(status => status === raw || raw.includes(status.replace('중', '')));
    return matched || '검토중';
}

function normalizeRegion(value: unknown) {
    const raw = cleanString(value);
    if (!raw) return '';
    return raw.replace(/\s+/g, ' ');
}

function buildDataPayload(body: LocationRequestBody, existingData: LocationRequestBody = {}) {
    const extras: LocationRequestBody = {};
    Object.entries(body).forEach(([key, value]) => {
        if (!CONTROL_FIELDS.has(key)) extras[key] = value;
    });

    return mergeFranchiseLocationData(existingData, {
        ...extras,
        ...(body.companyName !== undefined ? { companyName: body.companyName } : {}),
        ...(body.managerId !== undefined ? { managerId: body.managerId } : {})
    });
}

function buildContractLinkColumns(body: LocationRequestBody): LocationRequestBody {
    const columns: LocationRequestBody = {};
    if (hasAny(body, ['contractLeadId', 'contract_lead_id'])) {
        columns.contract_lead_id = cleanString(getFirst(body, ['contractLeadId', 'contract_lead_id']));
    }
    if (hasAny(body, ['sourceLocationId', 'source_location_id'])) {
        columns.source_location_id = cleanString(getFirst(body, ['sourceLocationId', 'source_location_id']));
    }
    if (hasAny(body, ['sourceExternalListingId', 'source_external_listing_id'])) {
        columns.source_external_listing_id = cleanString(getFirst(body, ['sourceExternalListingId', 'source_external_listing_id']));
    }
    if (hasAny(body, ['contractedAt', 'contracted_at'])) {
        columns.contracted_at = parseNullableDateTime(getFirst(body, ['contractedAt', 'contracted_at']));
    }
    return columns;
}

export function buildInsertPayload(
    body: LocationRequestBody,
    companyId: string,
    managerUuid: string | null,
    requesterId: string
) {
    const name = cleanString(getFirst(body, ['name', '위치명', '매장명']));
    if (!name) {
        return { error: fail(400, 'VALIDATION_ERROR', 'Location name is required') };
    }

    return {
        payload: {
            id: randomUUID(),
            company_id: companyId,
            manager_id: managerUuid,
            created_by: requesterId,
            name,
            location_type: normalizeLocationType(getFirst(body, ['locationType', 'location_type', '구분'])),
            brand: cleanString(getFirst(body, ['brand', '브랜드'])) || '',
            status: normalizeLocationStatus(getFirst(body, ['status', '상태'])),
            region: normalizeRegion(getFirst(body, ['region', '지역'])),
            address: cleanString(getFirst(body, ['address', '주소'])) || '',
            latitude: parseNullableNumber(getFirst(body, ['latitude', 'lat', '위도'])),
            longitude: parseNullableNumber(getFirst(body, ['longitude', 'lng', '경도'])),
            opened_at: parseNullableDate(getFirst(body, ['openedAt', 'opened_at', '오픈일'])),
            source_property_id: cleanString(getFirst(body, ['sourcePropertyId', 'source_property_id'])),
            ...buildContractLinkColumns(body),
            memo: cleanString(getFirst(body, ['memo', '메모'])) || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            data: buildDataPayload(body)
        }
    };
}

export function buildUpdatePayload(body: LocationRequestBody, existingData: LocationRequestBody = {}) {
    const updates: LocationRequestBody = {
        updated_at: new Date().toISOString(),
        data: buildDataPayload(body, existingData)
    };

    if (hasAny(body, ['name', '위치명', '매장명'])) updates.name = cleanString(getFirst(body, ['name', '위치명', '매장명'])) || '';
    if (hasAny(body, ['locationType', 'location_type', '구분'])) updates.location_type = normalizeLocationType(getFirst(body, ['locationType', 'location_type', '구분']));
    if (hasAny(body, ['brand', '브랜드'])) updates.brand = cleanString(getFirst(body, ['brand', '브랜드'])) || '';
    if (hasAny(body, ['status', '상태'])) updates.status = normalizeLocationStatus(getFirst(body, ['status', '상태']));
    if (hasAny(body, ['region', '지역'])) updates.region = normalizeRegion(getFirst(body, ['region', '지역']));
    if (hasAny(body, ['address', '주소'])) updates.address = cleanString(getFirst(body, ['address', '주소'])) || '';
    if (hasAny(body, ['latitude', 'lat', '위도'])) updates.latitude = parseNullableNumber(getFirst(body, ['latitude', 'lat', '위도']));
    if (hasAny(body, ['longitude', 'lng', '경도'])) updates.longitude = parseNullableNumber(getFirst(body, ['longitude', 'lng', '경도']));
    if (hasAny(body, ['openedAt', 'opened_at', '오픈일'])) updates.opened_at = parseNullableDate(getFirst(body, ['openedAt', 'opened_at', '오픈일']));
    if (hasAny(body, ['sourcePropertyId', 'source_property_id'])) updates.source_property_id = cleanString(getFirst(body, ['sourcePropertyId', 'source_property_id']));
    Object.assign(updates, buildContractLinkColumns(body));
    if (hasAny(body, ['memo', '메모'])) updates.memo = cleanString(getFirst(body, ['memo', '메모'])) || '';

    return updates;
}
