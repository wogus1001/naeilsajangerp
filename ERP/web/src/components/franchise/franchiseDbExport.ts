import { LEAD_TABLE_COLUMNS } from '@/components/franchise/leads/leadTableConfig';
import type { LeadTableColumnKey } from '@/components/franchise/leads/leadTableTypes';
import type { FranchiseLead as LeadExportItem } from '@/components/franchise/leads/types';
import {
    formatBudget,
    formatDateTime,
    formatFullDateTime
} from '@/components/franchise/leads/utils';
import type { FranchiseLocation as CandidateLocation } from '@/components/franchise/market-insights/locationMasterTypes';
import type { FranchiseLocation as OperationLocation } from '@/components/franchise/operations/types';
import { formatScanDate } from '@/components/franchise/operations/format';
import {
    formatLocationMoney,
    getAcquisitionCostTotal,
    normalizeFranchiseLocationMasterData
} from '@/lib/franchise-location-master';
import { normalizeRegion } from '@/lib/franchise-market-insights';
import type { TableExportColumn, TableExportRow } from '@/utils/tableExport';

type ManagerNameReader = (managerId?: string) => string;
type LeadExportColumn = TableExportColumn & {
    readonly key: LeadTableColumnKey;
};

const EXCLUDED_LEAD_EXPORT_COLUMNS = new Set<LeadTableColumnKey>(['actions']);

const LOCATION_EXPORT_COLUMNS = [
    { key: 'importance', label: '중요도' },
    { key: 'developmentStage', label: '개발상태' },
    { key: 'name', label: '후보지명' },
    { key: 'address', label: '주소' },
    { key: 'area', label: '전용면적' },
    { key: 'acquisitionCost', label: '입점비용' },
    { key: 'deposit', label: '보증금' },
    { key: 'premium', label: '권리금' },
    { key: 'monthlyRent', label: '월세' },
    { key: 'maintenanceFee', label: '관리비' },
    { key: 'facility', label: '시설조건' },
    { key: 'landlord', label: '임대인 성향' },
    { key: 'memo', label: '종합메모' },
    { key: 'manager', label: '담당자' },
    { key: 'createdAt', label: '등록일' }
] as const satisfies readonly TableExportColumn[];

const OPERATION_EXPORT_COLUMNS = [
    { key: 'name', label: '점포명' },
    { key: 'brand', label: '브랜드' },
    { key: 'status', label: '상태' },
    { key: 'locationType', label: '구분' },
    { key: 'region', label: '지역' },
    { key: 'address', label: '주소' },
    { key: 'openedAt', label: '오픈일' },
    { key: 'competitionKeyword', label: '경쟁키워드' },
    { key: 'competitionCount', label: '경쟁 수' },
    { key: 'lastScanAt', label: '마지막 스캔' },
    { key: 'memo', label: '메모' }
] as const satisfies readonly TableExportColumn[];

function formatDate(value?: string | null): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function cleanText(value: string | null | undefined): string {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    return text || '-';
}

function formatDisclosure(lead: LeadExportItem): string {
    const summary = lead.disclosureSummary;
    if (!summary) return '미발송';
    const parts = [summary.label];
    if (summary.latestDocumentTitle) parts.push(summary.latestDocumentTitle);
    if (summary.latestSentAt) parts.push(`${formatFullDateTime(summary.latestSentAt)} 발송`);
    if (summary.confirmedAt) parts.push(`${formatFullDateTime(summary.confirmedAt)} 수신 확인`);
    if (summary.openedAt && !summary.confirmedAt) parts.push(`${formatFullDateTime(summary.openedAt)} 열람 추정`);
    if (summary.contractEligibleAt) parts.push(`계약 가능 ${formatDate(summary.contractEligibleAt)}`);
    return parts.join(' · ');
}

function getLeadCellValue(lead: LeadExportItem, columnKey: LeadTableColumnKey, getManagerName: ManagerNameReader): string {
    switch (columnKey) {
        case 'priority':
            return lead.grade === 'HOT' ? '중요' : '';
        case 'name':
            return lead.name || '-';
        case 'mobile':
            return lead.mobile || '-';
        case 'status':
            return lead.status || '-';
        case 'disclosure':
            return formatDisclosure(lead);
        case 'manager':
            return lead.managerId ? getManagerName(lead.managerId) : '담당자 선택';
        case 'source':
            return lead.source || '-';
        case 'desiredRegion':
            return lead.desiredRegion || '-';
        case 'budget':
            return formatBudget(lead.budgetMin, lead.budgetMax);
        case 'interestedBrand':
            return lead.interestedBrand || '-';
        case 'nextContactAt':
            return formatDateTime(lead.nextContactAt);
        case 'memo':
            return cleanText(lead.memo);
        case 'links':
            return [
                lead.linkedCustomerId ? `고객:${lead.linkedCustomerName || lead.linkedCustomerId}` : '',
                lead.linkedBusinessCardId ? `명함:${lead.linkedBusinessCardName || lead.linkedBusinessCardId}` : ''
            ].filter(Boolean).join(' / ') || '-';
        case 'actions':
            return '';
    }
}

export function buildLeadExportColumns(visibleColumns: readonly LeadTableColumnKey[]): readonly LeadExportColumn[] {
    const visibleSet = new Set(visibleColumns);
    return LEAD_TABLE_COLUMNS
        .filter(column => visibleSet.has(column.key) && !EXCLUDED_LEAD_EXPORT_COLUMNS.has(column.key))
        .map(column => ({ key: column.key, label: column.label }));
}

export function buildLeadExportRows(
    leads: readonly LeadExportItem[],
    columns: readonly LeadExportColumn[],
    getManagerName: ManagerNameReader
): readonly TableExportRow[] {
    return leads.map(lead => columns.reduce<Record<string, string>>((row, column) => {
        row[column.key] = getLeadCellValue(lead, column.key, getManagerName);
        return row;
    }, {}));
}

function getLocationRegion(location: Pick<CandidateLocation, 'region' | 'address'>): string {
    return location.region || normalizeRegion(location.address);
}

function getFacilitySummary(location: CandidateLocation): string {
    const data = normalizeFranchiseLocationMasterData(location);
    return [
        `화장실 ${data.siteCondition.restroom.value}`,
        `엘리베이터 ${data.siteCondition.elevator.value}`,
        `철거 ${data.siteCondition.demolition.value}`,
        `주차 ${data.siteCondition.parking.value}`
    ].join(' · ');
}

function getLocationCellValue(location: CandidateLocation, key: string, managerName: string): string {
    const data = normalizeFranchiseLocationMasterData(location);
    const acquisitionCost = getAcquisitionCostTotal(data.cost);
    switch (key) {
        case 'importance':
            return data.importance;
        case 'developmentStage':
            return data.developmentStage;
        case 'name':
            return `${location.name || '-'} / ${location.locationType} · ${location.status} · ${location.brand || '브랜드 미지정'}`;
        case 'address':
            return [location.address || getLocationRegion(location), location.addressDetail || ''].filter(Boolean).join(' ');
        case 'area':
            return data.siteCondition.exclusiveAreaPyeong === null ? '-' : `${data.siteCondition.exclusiveAreaPyeong}평`;
        case 'acquisitionCost':
            return formatLocationMoney(acquisitionCost);
        case 'deposit':
            return formatLocationMoney(data.cost.deposit);
        case 'premium':
            return formatLocationMoney(data.cost.premium);
        case 'monthlyRent':
            return formatLocationMoney(data.lease.monthlyRent);
        case 'maintenanceFee':
            return formatLocationMoney(data.lease.maintenanceFee);
        case 'facility':
            return getFacilitySummary(location);
        case 'landlord':
            return data.landlord.tendency || '-';
        case 'memo':
            return cleanText(location.memo);
        case 'manager':
            return managerName;
        case 'createdAt':
            return formatDate(location.createdAt);
        default:
            return '';
    }
}

export function buildLocationExportColumns(visibleColumnKeys: readonly string[]): readonly TableExportColumn[] {
    const visibleSet = new Set(visibleColumnKeys);
    return LOCATION_EXPORT_COLUMNS.filter(column => visibleSet.has(column.key));
}

export function buildLocationExportRows(
    locations: readonly CandidateLocation[],
    columns: readonly TableExportColumn[],
    getManagerName: (location: CandidateLocation) => string
): readonly TableExportRow[] {
    return locations.map(location => columns.reduce<Record<string, string>>((row, column) => {
        row[column.key] = getLocationCellValue(location, column.key, getManagerName(location));
        return row;
    }, {}));
}

export function buildOperationExportColumns(): readonly TableExportColumn[] {
    return OPERATION_EXPORT_COLUMNS;
}

export function buildOperationExportRows(locations: readonly OperationLocation[]): readonly TableExportRow[] {
    return locations.map(location => {
        const scan = location.competitionScan;
        const competitionCount = Number(scan?.totalCount || scan?.competitors?.length || 0);
        return {
            name: location.name || '-',
            brand: location.brand || '브랜드 미지정',
            status: location.status,
            locationType: location.locationType,
            region: location.region || normalizeRegion(location.address),
            address: location.address || '-',
            openedAt: formatDate(location.openedAt),
            competitionKeyword: location.competitionKeyword || location.brand || '-',
            competitionCount: competitionCount.toLocaleString(),
            lastScanAt: formatScanDate(scan?.scannedAt),
            memo: cleanText(location.memo)
        };
    });
}
