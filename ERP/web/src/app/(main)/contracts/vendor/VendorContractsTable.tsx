"use client";

import { ExternalLink, Link2, Trash2 } from 'lucide-react';
import {
    contractStatusTone,
    type VendorContract
} from './vendorContractsModel';
import styles from './vendorContracts.module.css';

type Props = {
    readonly contracts: readonly VendorContract[];
    readonly loading: boolean;
    readonly saving: boolean;
    readonly onDelete: (contractId: string) => void;
    readonly onDetail: (contract: VendorContract) => void;
    readonly onEdit: (contract: VendorContract) => void;
    readonly onOpenUpload: (contractId: string) => void;
};

export function VendorContractsTable({
    contracts,
    loading,
    saving,
    onDelete,
    onDetail,
    onEdit,
    onOpenUpload
}: Props) {
    return (
        <section className={styles.panel}>
            <div className={styles.statusLine}>
                <div className={styles.sectionTitle}>계약 목록</div>
                <span>{loading ? '불러오는 중' : `${contracts.length.toLocaleString('ko-KR')}건`}</span>
            </div>
            <div className={styles.tableWrap}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>계약</th>
                            <th>구분</th>
                            <th>만료</th>
                            <th>상태</th>
                            <th>문서</th>
                            <th>관리</th>
                        </tr>
                    </thead>
                    <tbody>
                        {contracts.map(contract => (
                            <tr key={contract.id}>
                                <td><strong>{contract.contractTitle}</strong><span>{contract.vendorName}</span></td>
                                <td>{contract.categoryLabel}</td>
                                <td><strong>{contract.ddayLabel}</strong><span>{contract.contractEndDate || '-'}</span></td>
                                <td><span className={`${styles.badge} ${styles[contractStatusTone(contract)]}`}>{contract.statusLabel}</span></td>
                                <td>{contract.storagePath ? '업로드' : contract.electronicContractId ? '전자계약' : '-'}</td>
                                <td>
                                    <div className={styles.rowActions}>
                                        {contract.storagePath && (
                                            <button type="button" onClick={() => onOpenUpload(contract.id)}>
                                                <ExternalLink size={14} />
                                                열기
                                            </button>
                                        )}
                                        {contract.electronicContractId && (
                                            <a href={`/contracts/electronic?contractId=${encodeURIComponent(contract.electronicContractId)}`}>
                                                <Link2 size={14} />
                                                전자계약
                                            </a>
                                        )}
                                        <button type="button" onClick={() => onDetail(contract)}>상세</button>
                                        <button type="button" onClick={() => onEdit(contract)}>수정</button>
                                        <button type="button" onClick={() => onDelete(contract.id)} disabled={saving}>
                                            <Trash2 size={14} />
                                            삭제
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {!loading && contracts.length === 0 && <div className={styles.empty}>등록된 업체 계약이 없습니다.</div>}
            </div>
        </section>
    );
}
