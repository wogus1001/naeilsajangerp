import { buildLicenseSearchText, getAddressSimilarityBadges } from './address-similarity';

export type LicenseBusinessRecord = {
    readonly id?: string;
    readonly license_number: string | null;
    readonly business_type: string | null;
    readonly business_name: string | null;
    readonly representative_name: string | null;
    readonly phone: string | null;
    readonly permission_date: string | null;
    readonly address: string | null;
};

export type LicenseBusinessView = {
    readonly id: string;
    readonly licenseNumber: string;
    readonly businessType: string;
    readonly businessName: string;
    readonly permissionDate: string;
    readonly address: string;
    readonly similarityBadges: readonly string[];
};

function valueOrEmpty(value: string | null | undefined): string {
    return value || '';
}

export function toLicenseBusinessView(
    row: LicenseBusinessRecord,
    sourceAddress: string | null | undefined
): LicenseBusinessView {
    const licenseNumber = valueOrEmpty(row.license_number);
    const businessName = valueOrEmpty(row.business_name);
    const address = valueOrEmpty(row.address);

    return {
        id: row.id || licenseNumber,
        licenseNumber,
        businessType: valueOrEmpty(row.business_type),
        businessName,
        permissionDate: valueOrEmpty(row.permission_date),
        address,
        similarityBadges: getAddressSimilarityBadges(sourceAddress, address)
    };
}

export function toLicenseBusinessImportRow(
    item: Record<string, unknown>,
    batchId: string
): Record<string, unknown> | null {
    const licenseNumber = typeof item.SALS_UNQ_SE_NO_LCPMT_NO === 'string'
        ? item.SALS_UNQ_SE_NO_LCPMT_NO.trim()
        : '';
    if (!licenseNumber) return null;

    const businessName = typeof item.BUES_NM === 'string' ? item.BUES_NM.trim() : '';
    const businessType = typeof item.TPBIZ_NM === 'string' ? item.TPBIZ_NM.trim() : '';
    const address = typeof item.ADDR === 'string' ? item.ADDR.trim() : '';

    return {
        import_batch_id: batchId,
        license_number: licenseNumber,
        business_type: businessType,
        business_name: businessName,
        representative_name: typeof item.RPRSV_NM === 'string' ? item.RPRSV_NM.trim() : '',
        phone: typeof item.TELNO === 'string' ? item.TELNO.trim() : '',
        permission_date: typeof item.PRMSN_YMD === 'string' ? item.PRMSN_YMD.trim() : '',
        address,
        normalized_search: buildLicenseSearchText({ licenseNumber, businessName, businessType, address }),
        active: true,
        raw: item
    };
}
