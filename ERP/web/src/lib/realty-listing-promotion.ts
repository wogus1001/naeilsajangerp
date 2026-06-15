import { buildExternalPropertyPayload, type RealtyListing, type RealtySource } from './realty-import';

export type ExternalListingPromotionRow = {
    readonly id: string;
    readonly company_id: string | null;
    readonly requester_id: string | null;
    readonly import_job_id: string | null;
    readonly property_id: string | null;
    readonly duplicate_of_property_id: string | null;
    readonly source: RealtySource;
    readonly source_listing_id: string;
    readonly source_url: string;
    readonly title: string;
    readonly address: string;
    readonly region: string;
    readonly latitude: number | null;
    readonly longitude: number | null;
    readonly trade_type: string;
    readonly property_type: string;
    readonly deposit_amount: number | null;
    readonly monthly_rent: number | null;
    readonly sale_price: number | null;
    readonly maintenance_fee: number | null;
    readonly area_sqm: number | null;
    readonly area_pyeong: string;
    readonly floor_info: string;
    readonly image_urls: readonly string[];
    readonly status: string;
    readonly collected_at: string;
    readonly raw: Readonly<Record<string, unknown>>;
    readonly data: Readonly<Record<string, unknown>>;
};

export type ManualPromotedPropertyPayload = {
    readonly id: string;
    readonly company_id: string;
    readonly manager_id: string;
    readonly name: string;
    readonly status: string;
    readonly operation_type: string;
    readonly address: string;
    readonly is_favorite: boolean;
    readonly created_at: string;
    readonly updated_at: string;
    readonly data: Readonly<Record<string, unknown>>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(record: Readonly<Record<string, unknown>>, key: string): string {
    const value = record[key];
    if (typeof value === 'string') return value.trim();
    if (value === null || value === undefined) return '';
    return String(value).trim();
}

function readNullableString(record: Readonly<Record<string, unknown>>, key: string): string | null {
    const value = readString(record, key);
    return value || null;
}

function readNullableNumber(record: Readonly<Record<string, unknown>>, key: string): number | null {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value !== 'string') return null;
    const parsed = Number(value.replace(/,/g, '').replace(/[^\d.-]/g, '').trim());
    return Number.isFinite(parsed) ? parsed : null;
}

function readStringArray(record: Readonly<Record<string, unknown>>, key: string): readonly string[] {
    const value = record[key];
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function readRecord(record: Readonly<Record<string, unknown>>, key: string): Readonly<Record<string, unknown>> {
    const value = record[key];
    return isRecord(value) ? value : {};
}

function readSource(record: Readonly<Record<string, unknown>>): RealtySource | null {
    return record.source === 'daangn' ? 'daangn' : null;
}

export function parseExternalListingPromotionRow(value: unknown): ExternalListingPromotionRow | null {
    if (!isRecord(value)) return null;

    const source = readSource(value);
    const id = readString(value, 'id');
    const sourceListingId = readString(value, 'source_listing_id');
    if (!source || !id || !sourceListingId) return null;

    return {
        id,
        company_id: readNullableString(value, 'company_id'),
        requester_id: readNullableString(value, 'requester_id'),
        import_job_id: readNullableString(value, 'import_job_id'),
        property_id: readNullableString(value, 'property_id'),
        duplicate_of_property_id: readNullableString(value, 'duplicate_of_property_id'),
        source,
        source_listing_id: sourceListingId,
        source_url: readString(value, 'source_url'),
        title: readString(value, 'title') || '외부 상가 매물',
        address: readString(value, 'address'),
        region: readString(value, 'region'),
        latitude: readNullableNumber(value, 'latitude'),
        longitude: readNullableNumber(value, 'longitude'),
        trade_type: readString(value, 'trade_type'),
        property_type: readString(value, 'property_type') || '상가',
        deposit_amount: readNullableNumber(value, 'deposit_amount'),
        monthly_rent: readNullableNumber(value, 'monthly_rent'),
        sale_price: readNullableNumber(value, 'sale_price'),
        maintenance_fee: readNullableNumber(value, 'maintenance_fee'),
        area_sqm: readNullableNumber(value, 'area_sqm'),
        area_pyeong: readString(value, 'area_pyeong'),
        floor_info: readString(value, 'floor_info'),
        image_urls: readStringArray(value, 'image_urls'),
        status: readString(value, 'status') || 'imported',
        collected_at: readString(value, 'collected_at') || new Date().toISOString(),
        raw: readRecord(value, 'raw'),
        data: readRecord(value, 'data')
    };
}

export function externalListingRowToRealtyListing(row: ExternalListingPromotionRow): RealtyListing {
    return {
        source: row.source,
        sourceListingId: row.source_listing_id,
        sourceUrl: row.source_url,
        title: row.title,
        address: row.address,
        region: row.region,
        latitude: row.latitude,
        longitude: row.longitude,
        tradeType: row.trade_type,
        propertyType: row.property_type,
        depositAmount: row.deposit_amount,
        monthlyRent: row.monthly_rent,
        salePrice: row.sale_price,
        maintenanceFee: row.maintenance_fee,
        areaSqm: row.area_sqm,
        areaPyeong: row.area_pyeong,
        floorInfo: row.floor_info,
        imageUrls: [...row.image_urls],
        raw: { ...row.raw },
        collectedAt: row.collected_at
    };
}

export function buildPromotedListingData(params: {
    readonly currentData: unknown;
    readonly propertyId: string;
    readonly promotedAt: string;
}): Readonly<Record<string, unknown>> {
    const currentData = isRecord(params.currentData) ? params.currentData : {};
    return {
        ...currentData,
        promotionMode: 'manual',
        promotedAt: params.promotedAt,
        promotedToPropertyId: params.propertyId
    };
}

export function buildManualPromotedPropertyPayload(params: {
    readonly row: ExternalListingPromotionRow;
    readonly propertyId: string;
    readonly companyId: string;
    readonly managerId: string;
    readonly companyName?: string;
    readonly promotedAt: string;
}): ManualPromotedPropertyPayload {
    const payload = buildExternalPropertyPayload({
        listing: externalListingRowToRealtyListing(params.row),
        companyName: params.companyName,
        managerId: params.managerId,
        importJobId: params.row.import_job_id || `manual-${params.row.id}`
    });
    const { name, status, operationType, address, isFavorite, ...data } = payload;

    return {
        id: params.propertyId,
        company_id: params.companyId,
        manager_id: params.managerId,
        name,
        status,
        operation_type: operationType,
        address,
        is_favorite: Boolean(isFavorite),
        created_at: params.promotedAt,
        updated_at: params.promotedAt,
        data: {
            ...data,
            externalImportMode: 'manual-promoted',
            externalReviewStatus: 'pending',
            externalListingRecordId: params.row.id,
            externalDuplicateOfPropertyId: params.row.duplicate_of_property_id
        }
    };
}
