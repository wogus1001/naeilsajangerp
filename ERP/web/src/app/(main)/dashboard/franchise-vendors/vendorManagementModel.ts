import type { VendorContract } from '../../contracts/vendor/vendorContractsModel';
import type { FranchiseVendorView } from '@/lib/franchise-vendors';

export type VendorRiskLevel = 'danger' | 'warning' | 'normal' | 'closed';

export type VendorSummary = {
    readonly activeCount: number;
    readonly categoryLabel: string;
    readonly contractCount: number;
    readonly expiredCount: number;
    readonly latestMemo: string;
    readonly nextContractId: string;
    readonly nextContractTitle: string;
    readonly nextEndDate: string;
    readonly ownerProfileId: string;
    readonly renewalDueCount: number;
    readonly riskLevel: VendorRiskLevel;
    readonly terminalCount: number;
    readonly vendorId: string;
    readonly vendorName: string;
};

export type VendorManagementRow = VendorSummary & {
    readonly businessNumber: string;
    readonly contactEmail: string;
    readonly contactName: string;
    readonly contactPhone: string;
    readonly masterId: string;
    readonly statusLabel: string;
};

export type VendorManagementMetrics = {
    readonly activeContracts: number;
    readonly expiringVendors: number;
    readonly totalContracts: number;
    readonly totalVendors: number;
};

function normalizeVendorKey(vendorName: string): string {
    return vendorName.trim().toLowerCase();
}

function contractVendorGroupKey(contract: VendorContract): string {
    return contract.vendorId ? `id:${contract.vendorId}` : `name:${normalizeVendorKey(contract.vendorName)}`;
}

function contractTimestamp(contract: VendorContract): number {
    const value = Date.parse(contract.updatedAt || contract.createdAt || '');
    return Number.isNaN(value) ? 0 : value;
}

function dateTimestamp(date: string): number {
    const value = Date.parse(date);
    return Number.isNaN(value) ? Number.POSITIVE_INFINITY : value;
}

function isTerminal(contract: VendorContract): boolean {
    return contract.status === 'terminated' || contract.status === 'renewed' || contract.status === 'archived';
}

function riskLevel(contracts: readonly VendorContract[]): VendorRiskLevel {
    if (contracts.some(contract => contract.status === 'expired')) return 'danger';
    if (contracts.some(contract => contract.status === 'renewal_due')) return 'warning';
    if (contracts.every(isTerminal)) return 'closed';
    return 'normal';
}

function pickNextContract(contracts: readonly VendorContract[]): VendorContract {
    const openContracts = contracts.filter(contract => !isTerminal(contract));
    const candidates = openContracts.length > 0 ? openContracts : contracts;
    return [...candidates].sort((left, right) => {
        const dateOrder = dateTimestamp(left.contractEndDate) - dateTimestamp(right.contractEndDate);
        return dateOrder !== 0 ? dateOrder : contractTimestamp(right) - contractTimestamp(left);
    })[0] || contracts[0];
}

function pickLatestContract(contracts: readonly VendorContract[]): VendorContract {
    return [...contracts].sort((left, right) => contractTimestamp(right) - contractTimestamp(left))[0] || contracts[0];
}

export function buildVendorSummaries(contracts: readonly VendorContract[]): readonly VendorSummary[] {
    const groups = new Map<string, VendorContract[]>();

    for (const contract of contracts) {
        const key = contractVendorGroupKey(contract);
        if (key === 'name:') continue;
        const group = groups.get(key) || [];
        group.push(contract);
        groups.set(key, group);
    }

    return [...groups.values()]
        .map(group => {
            const nextContract = pickNextContract(group);
            const latestContract = pickLatestContract(group);
            return {
                activeCount: group.filter(contract => contract.status === 'active').length,
                categoryLabel: latestContract.categoryLabel,
                contractCount: group.length,
                expiredCount: group.filter(contract => contract.status === 'expired').length,
                latestMemo: latestContract.memo,
                nextContractId: nextContract.id,
                nextContractTitle: nextContract.contractTitle,
                nextEndDate: nextContract.contractEndDate,
                ownerProfileId: latestContract.ownerProfileId,
                renewalDueCount: group.filter(contract => contract.status === 'renewal_due').length,
                riskLevel: riskLevel(group),
                terminalCount: group.filter(isTerminal).length,
                vendorId: latestContract.vendorId,
                vendorName: latestContract.vendorName
            };
        })
        .sort((left, right) => {
            const riskOrder: Record<VendorRiskLevel, number> = { danger: 0, warning: 1, normal: 2, closed: 3 };
            const riskDelta = riskOrder[left.riskLevel] - riskOrder[right.riskLevel];
            if (riskDelta !== 0) return riskDelta;
            return left.vendorName.localeCompare(right.vendorName, 'ko');
        });
}

function emptyContractSummary(vendor: FranchiseVendorView): VendorSummary {
    return {
        activeCount: 0,
        categoryLabel: vendor.categoryLabel,
        contractCount: 0,
        expiredCount: 0,
        latestMemo: vendor.memo,
        nextContractId: '',
        nextContractTitle: '',
        nextEndDate: '',
        ownerProfileId: '',
        renewalDueCount: 0,
        riskLevel: vendor.status === 'inactive' ? 'closed' : 'normal',
        terminalCount: vendor.status === 'inactive' ? 1 : 0,
        vendorId: vendor.id,
        vendorName: vendor.vendorName
    };
}

function mergeMaster(summary: VendorSummary, vendor: FranchiseVendorView | null): VendorManagementRow {
    return {
        ...summary,
        businessNumber: vendor?.businessNumber || '',
        categoryLabel: vendor?.categoryLabel || summary.categoryLabel,
        contactEmail: vendor?.contactEmail || '',
        contactName: vendor?.contactName || '',
        contactPhone: vendor?.contactPhone || '',
        latestMemo: vendor?.memo || summary.latestMemo,
        masterId: vendor?.id || '',
        statusLabel: vendor?.statusLabel || '계약 기반',
        vendorName: vendor?.vendorName || summary.vendorName
    };
}

export function buildVendorManagementRows(
    vendors: readonly FranchiseVendorView[],
    contractSummaries: readonly VendorSummary[]
): readonly VendorManagementRow[] {
    const mastersById = new Map(vendors.map(vendor => [vendor.id, vendor]));
    const mastersByName = new Map(vendors.map(vendor => [normalizeVendorKey(vendor.vendorName), vendor]));
    const matchedMasterIds = new Set<string>();
    const rows = contractSummaries.map(summary => {
        const key = normalizeVendorKey(summary.vendorName);
        const master = summary.vendorId
            ? mastersById.get(summary.vendorId) || mastersByName.get(key) || null
            : mastersByName.get(key) || null;
        if (master) matchedMasterIds.add(master.id);
        return mergeMaster(summary, master);
    });
    for (const vendor of vendors) {
        if (!vendor.id || matchedMasterIds.has(vendor.id)) continue;
        rows.push(mergeMaster(emptyContractSummary(vendor), vendor));
    }

    return rows.sort((left, right) => {
        const riskOrder: Record<VendorRiskLevel, number> = { danger: 0, warning: 1, normal: 2, closed: 3 };
        const riskDelta = riskOrder[left.riskLevel] - riskOrder[right.riskLevel];
        if (riskDelta !== 0) return riskDelta;
        return left.vendorName.localeCompare(right.vendorName, 'ko');
    });
}

export function buildVendorManagementMetrics(summaries: readonly VendorSummary[]): VendorManagementMetrics {
    return {
        activeContracts: summaries.reduce((sum, vendor) => sum + vendor.activeCount + vendor.renewalDueCount, 0),
        expiringVendors: summaries.filter(vendor => vendor.riskLevel === 'danger' || vendor.riskLevel === 'warning').length,
        totalContracts: summaries.reduce((sum, vendor) => sum + vendor.contractCount, 0),
        totalVendors: summaries.length
    };
}

export function filterVendorSummaries(
    summaries: readonly VendorManagementRow[],
    query: string,
    risk: VendorRiskLevel | 'all'
): readonly VendorManagementRow[] {
    const keyword = query.trim().toLowerCase();
    return summaries.filter(summary => {
        const matchesRisk = risk === 'all' || summary.riskLevel === risk;
        const matchesKeyword = !keyword
            || summary.vendorName.toLowerCase().includes(keyword)
            || summary.categoryLabel.toLowerCase().includes(keyword)
            || summary.nextContractTitle.toLowerCase().includes(keyword)
            || summary.contactName.toLowerCase().includes(keyword)
            || summary.contactPhone.toLowerCase().includes(keyword)
            || summary.businessNumber.toLowerCase().includes(keyword);
        return matchesRisk && matchesKeyword;
    });
}
