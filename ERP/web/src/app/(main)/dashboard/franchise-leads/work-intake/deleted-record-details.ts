import type { DeletedWorkIntakeItem } from './types';

export function cleanText(value: unknown): string {
    if (value === null || value === undefined) return '';
    return String(value).replace(/\s+/g, ' ').trim();
}

export function formatDateTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatOptionalDateTime(value: unknown): string {
    const text = cleanText(value);
    return text ? formatDateTime(text) : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readSnapshotRow(record: DeletedWorkIntakeItem): Record<string, unknown> {
    const snapshot = record.snapshot;
    const row = snapshot.row;
    return isRecord(row) ? row : {};
}

function readSnapshotData(record: DeletedWorkIntakeItem): Record<string, unknown> {
    const row = readSnapshotRow(record);
    const data = row.data;
    return isRecord(data) ? data : {};
}

function firstText(...values: readonly unknown[]): string {
    for (const value of values) {
        const text = cleanText(value);
        if (text) return text;
    }
    return '';
}

function joinText(...values: readonly unknown[]): string {
    return values.map(cleanText).filter(Boolean).join(' / ');
}

function detailRow(label: string, value: unknown): readonly [string, string] | null {
    const text = cleanText(value);
    return text ? [label, text] : null;
}

export function buildDeletedRecordDetails(record: DeletedWorkIntakeItem): readonly (readonly [string, string])[] {
    const row = readSnapshotRow(record);
    const data = readSnapshotData(record);
    const commonDetails = [
        detailRow('원본 ID', record.sourceId),
        detailRow('원본 테이블', cleanText(record.snapshot.sourceTable)),
        detailRow('삭제 전 등록일', formatOptionalDateTime(firstText(row.created_at, data.createdAt)))
    ].filter((item): item is readonly [string, string] => Boolean(item));

    if (record.kind === 'properties') {
        const rentCondition = joinText(
            firstText(data.deposit) ? `보증금 ${firstText(data.deposit)}만원` : '',
            firstText(data.monthlyRent) ? `월세 ${firstText(data.monthlyRent)}만원` : '',
            firstText(data.maintenanceFee) ? `관리비 ${firstText(data.maintenanceFee)}만원` : '',
            firstText(data.premium) ? `권리금 ${firstText(data.premium)}만원` : ''
        );
        return [
            detailRow('물건명', firstText(row.name, data.propertyName, record.title)),
            detailRow('상태', firstText(row.status, data.currentStatus)),
            detailRow('주소', joinText(firstText(row.address, data.propertyAddress), data.detailAddress)),
            detailRow('지역', firstText(data.propertyRegion, data.region)),
            detailRow('희망 조건', joinText(data.desiredBrand, data.desiredBusinessType, data.desiredCategory)),
            detailRow('임대 조건', rentCondition),
            detailRow('상담 메모', data.consultationMemo),
            detailRow('리스크 메모', data.riskMemo),
            detailRow('다음 액션', data.nextAction),
            ...commonDetails
        ].filter((item): item is readonly [string, string] => Boolean(item));
    }

    return [
        detailRow('이름', firstText(row.name, data.name, record.title)),
        detailRow('연락처', firstText(row.mobile, data.mobile)),
        detailRow('이메일', data.email),
        detailRow('상태', row.status),
        detailRow('희망 지역', firstText(row.desired_region, data.desiredRegion)),
        detailRow('희망 조건', joinText(data.desiredCategory, row.interested_brand, data.desiredBrand, data.interestedBrand)),
        detailRow('예산', joinText(
            firstText(data.totalBudget) ? `총예산 ${firstText(data.totalBudget)}만원` : '',
            firstText(row.budget_min) ? `최소 ${firstText(row.budget_min)}` : '',
            firstText(row.budget_max) ? `최대 ${firstText(row.budget_max)}` : ''
        )),
        detailRow('보유 물건', joinText(data.ownedPropertyName, data.ownedPropertyAddress, data.ownedPropertyAddressDetail)),
        detailRow('메모', firstText(row.memo, data.memo, data.extraRequest, data.summaryNote)),
        ...commonDetails
    ].filter((item): item is readonly [string, string] => Boolean(item));
}
