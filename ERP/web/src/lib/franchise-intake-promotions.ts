export type FranchiseIntakePromotionRecord = {
    readonly promotedLeadId: string;
    readonly targetCompanyId: string;
    readonly targetManagerId: string;
    readonly promotedAt: string;
    readonly promotedBy: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, key: string): string {
    const value = record[key];
    return typeof value === 'string' ? value.trim() : '';
}

function parsePromotionRecord(value: unknown): FranchiseIntakePromotionRecord | null {
    if (!isRecord(value)) return null;
    const promotedLeadId = readString(value, 'promotedLeadId');
    const targetCompanyId = readString(value, 'targetCompanyId');
    const promotedAt = readString(value, 'promotedAt');
    if (!promotedLeadId || !targetCompanyId || !promotedAt) return null;
    return {
        promotedLeadId,
        targetCompanyId,
        targetManagerId: readString(value, 'targetManagerId'),
        promotedAt,
        promotedBy: readString(value, 'promotedBy')
    };
}

export function readFranchiseIntakePromotionRecords(
    data: Record<string, unknown>,
    key: string
): readonly FranchiseIntakePromotionRecord[] {
    const raw = data[key];
    if (!Array.isArray(raw)) return [];
    return raw.flatMap(item => {
        const parsed = parsePromotionRecord(item);
        return parsed ? [parsed] : [];
    });
}

export function findFranchiseIntakePromotionRecord(
    data: Record<string, unknown>,
    key: string,
    targetCompanyId: string | null
): FranchiseIntakePromotionRecord | null {
    const records = readFranchiseIntakePromotionRecords(data, key);
    if (!targetCompanyId) return records[0] || null;
    return records.find(record => record.targetCompanyId === targetCompanyId) || null;
}

export function upsertFranchiseIntakePromotionRecord(
    data: Record<string, unknown>,
    key: string,
    nextRecord: FranchiseIntakePromotionRecord
): readonly FranchiseIntakePromotionRecord[] {
    const records = readFranchiseIntakePromotionRecords(data, key)
        .filter(record => record.targetCompanyId !== nextRecord.targetCompanyId);
    return [nextRecord, ...records];
}
