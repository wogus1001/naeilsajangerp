"use client";

import React from 'react';
import Link from 'next/link';
import { CircleX, Download, ExternalLink, FileText, Send, Trash2 } from 'lucide-react';
import {
    canCancelElectronicContract,
    canDeleteElectronicContract,
    isElectronicContractCancelableStatus
} from '@/lib/electronic-contracts/document-permissions';
import {
    downloadElectronicContract,
    openElectronicContractView
} from './electronicContractDocumentActionsClient';
import {
    draftHref,
    formatDate,
    statusLabel,
    type ElectronicContract
} from './electronicContractDocumentsModel';
import styles from './electronicContracts.module.css';

type ElectronicContractsTableProps = {
    readonly contracts: readonly ElectronicContract[];
    readonly loading: boolean;
    readonly requesterId: string;
    readonly isAdmin: boolean;
    readonly deletingContractId: string;
    readonly cancelingContractId: string;
    readonly onDeleteRequest: (contract: ElectronicContract) => void;
    readonly onCancelRequest: (contract: ElectronicContract) => void;
};

export function ElectronicContractsTable({
    contracts,
    loading,
    requesterId,
    isAdmin,
    deletingContractId,
    cancelingContractId,
    onDeleteRequest,
    onCancelRequest
}: ElectronicContractsTableProps) {
    const [actionError, setActionError] = React.useState('');
    const [downloadingContractId, setDownloadingContractId] = React.useState('');
    const [openingContractId, setOpeningContractId] = React.useState('');

    async function handleDownload(contract: ElectronicContract) {
        setActionError('');
        setDownloadingContractId(contract.id);
        try {
            await downloadElectronicContract(contract);
        } catch (caught) {
            setActionError(caught instanceof Error ? caught.message : '문서를 다운로드하지 못했습니다.');
        } finally {
            setDownloadingContractId('');
        }
    }

    async function handleOpenView(contract: ElectronicContract) {
        setActionError('');
        setOpeningContractId(contract.id);
        try {
            await openElectronicContractView(contract);
        } catch (caught) {
            setActionError(caught instanceof Error ? caught.message : '문서를 열지 못했습니다.');
        } finally {
            setOpeningContractId('');
        }
    }

    return (
        <div className={styles.tableStack}>
            {actionError && <div className={styles.error}>{actionError}</div>}
            <div className={styles.tableWrap}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>문서</th>
                            <th>회사</th>
                            <th>참여자</th>
                            <th>상태</th>
                            <th>발송/저장일</th>
                            <th>관리</th>
                        </tr>
                    </thead>
                    <tbody>
                        {contracts.map(contract => {
                            const canDelete = canDeleteElectronicContract(
                                { id: requesterId, role: isAdmin ? 'admin' : null },
                                { sentByProfileId: contract.sentByProfileId }
                            );
                            const canCancel = canCancelElectronicContract(
                                { id: requesterId, role: isAdmin ? 'admin' : null },
                                { sentByProfileId: contract.sentByProfileId }
                            ) && isElectronicContractCancelableStatus(contract.status);
                            const canDownload = Boolean(contract.ucansignDocumentId && contract.status !== 'draft');
                            const canOpenView = Boolean(contract.ucansignDocumentId && contract.status !== 'draft' && contract.status !== 'send_failed' && contract.status !== 'canceled');
                            return (
                                <tr key={contract.id}>
                                    <td>
                                        <div className={styles.mainText}><FileText size={14} /> {contract.name}</div>
                                        <div className={styles.subText}>{contract.businessName || '-'}</div>
                                    </td>
                                    <td>{contract.companyName || '-'}</td>
                                    <td>
                                        <div>{contract.transferorName || '-'}</div>
                                        <div className={styles.subText}>{contract.transfereeName || '-'}</div>
                                    </td>
                                    <td><span className={styles.badge}><Send size={12} /> {statusLabel(contract.status)}</span></td>
                                    <td>{formatDate(contract.sentAt || contract.createdAt)}</td>
                                    <td>
                                    <div className={styles.rowActions}>
                                        {contract.status === 'draft' && (
                                            <Link className={styles.weakButton} href={draftHref(contract)}>
                                                이어쓰기
                                            </Link>
                                        )}
                                        {canOpenView && (
                                            <button
                                                className={styles.weakButton}
                                                type="button"
                                                onClick={() => void handleOpenView(contract)}
                                                disabled={openingContractId === contract.id}
                                            >
                                                <ExternalLink size={14} />
                                                내용 확인 후 서명
                                            </button>
                                        )}
                                        {canDownload && (
                                            <button
                                                className={styles.weakButton}
                                                type="button"
                                                onClick={() => void handleDownload(contract)}
                                                disabled={downloadingContractId === contract.id}
                                            >
                                                <Download size={14} />
                                                다운로드
                                            </button>
                                        )}
                                        {canCancel && (
                                            <button
                                                className={styles.dangerButton}
                                                type="button"
                                                onClick={() => onCancelRequest(contract)}
                                                disabled={cancelingContractId === contract.id}
                                            >
                                                <CircleX size={14} />
                                                서명 요청 취소
                                            </button>
                                        )}
                                        {canDelete && (
                                            <button
                                                className={styles.dangerButton}
                                                type="button"
                                                onClick={() => onDeleteRequest(contract)}
                                                disabled={deletingContractId === contract.id}
                                            >
                                                <Trash2 size={14} />
                                                삭제
                                            </button>
                                        )}
                                        {contract.status !== 'draft' && !canOpenView && !canDownload && !canCancel && !canDelete && <span className={styles.subText}>-</span>}
                                    </div>
                                </td>
                            </tr>
                            );
                        })}
                        {!loading && contracts.length === 0 && (
                            <tr>
                                <td className={styles.empty} colSpan={6}>표시할 전자계약 문서가 없습니다.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
