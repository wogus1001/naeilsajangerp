export type RealtyImportedListing = {
    readonly action: 'collected' | 'created' | 'updated';
    readonly propertyId?: string;
    readonly duplicateOfPropertyId?: string | null;
    readonly listing?: RealtyListingRecord;
};

export type RealtyListingRecord = {
    readonly id: string;
    readonly duplicateOfPropertyId?: string | null;
    readonly source: string;
    readonly sourceListingId?: string;
    readonly sourceUrl: string;
    readonly title: string;
    readonly address: string;
    readonly region: string;
    readonly tradeType: string;
    readonly propertyType: string;
    readonly depositAmount: number | null;
    readonly monthlyRent: number | null;
    readonly salePrice: number | null;
    readonly maintenanceFee: number | null;
    readonly areaSqm: number | null;
    readonly areaPyeong: string;
    readonly floorInfo: string;
    readonly imageUrls?: readonly string[];
    readonly status: string;
    readonly collectedAt?: string;
    readonly createdAt?: string;
    readonly updatedAt?: string;
    readonly raw?: Record<string, unknown>;
    readonly data?: {
        readonly favorite?: boolean;
    } & Record<string, unknown>;
};

export type RealtyImportResult = {
    readonly job?: {
        readonly id: string;
        readonly status: string;
        readonly source: string;
        readonly region: string;
        readonly totalCount: number;
        readonly createdCount: number;
        readonly updatedCount: number;
        readonly duplicateCount: number;
        readonly failedCount: number;
        readonly warnings?: readonly string[];
        readonly errors?: ReadonlyArray<string | { readonly message?: string; readonly source?: string; readonly listingId?: string }>;
        readonly data?: { readonly sourceUrls?: Record<string, string> };
    };
    readonly listings?: readonly RealtyImportedListing[];
};
