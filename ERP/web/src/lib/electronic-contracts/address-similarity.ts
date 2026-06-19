export type AddressSimilarityBadge = '도로명 유사' | '지번 유사';

type ParsedAddress = {
    readonly sido: string;
    readonly sigungu: string;
    readonly roadName: string;
    readonly lotDong: string;
};

const ROAD_PATTERN = /([가-힣0-9]+(?:대로|로|길))/;

function normalizeAddress(value: string | null | undefined): string {
    return (value || '')
        .replace(/\([^)]*\)/g, ' ')
        .replace(/[,\s]+/g, ' ')
        .trim();
}

function parseAddress(value: string | null | undefined): ParsedAddress {
    const normalized = normalizeAddress(value);
    const parts = normalized.split(' ').filter(Boolean);
    const roadMatch = normalized.match(ROAD_PATTERN);
    const lotDong = parts.find(part => /(?:동|읍|면)$/.test(part)) || '';

    return {
        sido: parts[0] || '',
        sigungu: parts[1] || '',
        roadName: roadMatch?.[1] || '',
        lotDong
    };
}

export function getAddressSimilarityBadges(
    sourceAddress: string | null | undefined,
    candidateAddress: string | null | undefined
): readonly AddressSimilarityBadge[] {
    const source = parseAddress(sourceAddress);
    const candidate = parseAddress(candidateAddress);
    const badges: AddressSimilarityBadge[] = [];
    const sameDistrict = Boolean(source.sigungu && candidate.sigungu && source.sigungu === candidate.sigungu);

    if (sameDistrict && source.roadName && source.roadName === candidate.roadName) {
        badges.push('도로명 유사');
    }

    if (sameDistrict && source.lotDong && source.lotDong === candidate.lotDong) {
        badges.push('지번 유사');
    }

    return badges;
}

export function buildLicenseSearchText(values: {
    readonly licenseNumber?: string | null;
    readonly businessName?: string | null;
    readonly businessType?: string | null;
    readonly address?: string | null;
}): string {
    return [
        values.licenseNumber,
        values.businessName,
        values.businessType,
        values.address
    ]
        .map(value => normalizeAddress(value))
        .filter(Boolean)
        .join(' ');
}
