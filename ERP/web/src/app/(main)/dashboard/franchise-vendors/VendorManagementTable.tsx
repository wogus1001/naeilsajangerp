"use client";

import Link from 'next/link';
import type { FranchiseVendorView } from '@/lib/franchise-vendors';
import type { VendorManagementRow, VendorRiskLevel } from './vendorManagementModel';
import styles from './vendorManagementTable.module.css';

type Props = {
    readonly loading: boolean;
    readonly rows: readonly VendorManagementRow[];
    readonly vendorMasters: readonly FranchiseVendorView[];
    readonly onEdit: (vendor: FranchiseVendorView) => void;
};

function riskLabel(risk: VendorRiskLevel): string {
    switch (risk) {
        case 'danger':
            return '만료';
        case 'warning':
            return '갱신 필요';
        case 'normal':
            return '정상';
        case 'closed':
            return '종료';
    }
}

function riskClass(risk: VendorRiskLevel): string {
    switch (risk) {
        case 'danger':
            return styles.danger;
        case 'warning':
            return styles.warning;
        case 'normal':
            return styles.success;
        case 'closed':
            return styles.neutral;
    }
}

function endDateLabel(value: string): string {
    if (!value) return '-';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString('ko-KR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function VendorRow({
    onEdit,
    vendor,
    vendorMasters
}: {
    readonly onEdit: (vendor: FranchiseVendorView) => void;
    readonly vendor: VendorManagementRow;
    readonly vendorMasters: readonly FranchiseVendorView[];
}) {
    const master = vendor.masterId ? vendorMasters.find(item => item.id === vendor.masterId) : null;
    return (
        <tr>
            <td>
                <strong>{vendor.vendorName}</strong>
                <span>{vendor.categoryLabel} · {vendor.statusLabel}</span>
            </td>
            <td>
                <strong>{vendor.contactName || '-'}</strong>
                <span>{vendor.contactPhone || vendor.contactEmail || vendor.businessNumber || '-'}</span>
            </td>
            <td>{vendor.contractCount}</td>
            <td>{vendor.activeCount}</td>
            <td>{vendor.renewalDueCount + vendor.expiredCount}</td>
            <td>
                <strong>{vendor.nextContractTitle || '-'}</strong>
                <span>{endDateLabel(vendor.nextEndDate)}</span>
            </td>
            <td><span className={`${styles.badge} ${riskClass(vendor.riskLevel)}`}>{riskLabel(vendor.riskLevel)}</span></td>
            <td>{vendor.latestMemo || '-'}</td>
            <td>
                <div className={styles.tableActions}>
                    {master && (
                        <button className={styles.tableAction} type="button" onClick={() => onEdit(master)}>
                            수정
                        </button>
                    )}
                    <Link className={styles.tableAction} href={`/contracts/vendor?q=${encodeURIComponent(vendor.vendorName)}`}>
                        계약 보기
                    </Link>
                </div>
            </td>
        </tr>
    );
}

export function VendorManagementTable({ loading, rows, vendorMasters, onEdit }: Props) {
    return (
        <div className={styles.tableWrap}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>업체</th>
                        <th>담당자</th>
                        <th>계약</th>
                        <th>진행</th>
                        <th>관리 필요</th>
                        <th>다음 계약</th>
                        <th>상태</th>
                        <th>최근 메모</th>
                        <th>관리</th>
                    </tr>
                </thead>
                <tbody>
                    {!loading && rows.map(vendor => (
                        <VendorRow
                            key={`${vendor.masterId || 'contract'}-${vendor.vendorName}`}
                            vendor={vendor}
                            vendorMasters={vendorMasters}
                            onEdit={onEdit}
                        />
                    ))}
                </tbody>
            </table>
            {loading && <div className={styles.empty}>업체 목록을 불러오는 중입니다.</div>}
            {!loading && rows.length === 0 && <div className={styles.empty}>표시할 업체가 없습니다.</div>}
        </div>
    );
}
