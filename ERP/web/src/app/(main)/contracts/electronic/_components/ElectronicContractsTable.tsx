"use client";

import React from 'react';
import Link from 'next/link';
import { Download, FileText, Send, Trash2 } from 'lucide-react';
import { canDeleteElectronicContract } from '@/lib/electronic-contracts/document-permissions';
import { getApiAuthHeaders } from '@/utils/apiAuthHeaders';
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
    readonly onDeleteRequest: (contract: ElectronicContract) => void;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function safeDownloadBaseName(value: string): string {
    const normalized = value
        .replace(/[\\/:*?"<>|\r\n\t]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return normalized || '전자계약';
}

function fileExtensionFromContentType(contentType: string): string {
    return contentType.includes('zip') ? '.zip' : '.pdf';
}

function downloadNameFromResponse(response: Response, fallbackName: string): string {
    const baseName = safeDownloadBaseName(fallbackName);
    const contentType = response.headers.get('content-type') || '';
    const lowerName = baseName.toLowerCase();
    if (lowerName.endsWith('.pdf') || lowerName.endsWith('.zip')) return baseName;
    return `${baseName}${fileExtensionFromContentType(contentType)}`;
}

async function errorMessageFromDownloadResponse(response: Response): Promise<string> {
    try {
        const payload: unknown = await response.json();
        return isRecord(payload) && typeof payload.message === 'string' ? payload.message : '';
    } catch (caught) {
        if (caught instanceof Error) return '';
        throw caught;
    }
}

async function downloadElectronicContract(contract: ElectronicContract): Promise<void> {
    const response = await fetch(`/api/electronic-contracts/${encodeURIComponent(contract.id)}/download`, {
        cache: 'no-store',
        headers: await getApiAuthHeaders()
    });
    if (!response.ok) {
        const message = await errorMessageFromDownloadResponse(response);
        throw new Error(message || '문서를 다운로드하지 못했습니다.');
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = downloadNameFromResponse(response, contract.name);
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
}

export function ElectronicContractsTable({
    contracts,
    loading,
    requesterId,
    isAdmin,
    deletingContractId,
    onDeleteRequest
}: ElectronicContractsTableProps) {
    const [downloadError, setDownloadError] = React.useState('');
    const [downloadingContractId, setDownloadingContractId] = React.useState('');

    async function handleDownload(contract: ElectronicContract) {
        setDownloadError('');
        setDownloadingContractId(contract.id);
        try {
            await downloadElectronicContract(contract);
        } catch (caught) {
            setDownloadError(caught instanceof Error ? caught.message : '문서를 다운로드하지 못했습니다.');
        } finally {
            setDownloadingContractId('');
        }
    }

    return (
        <div className={styles.tableStack}>
            {downloadError && <div className={styles.error}>{downloadError}</div>}
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
                            const canDownload = Boolean(contract.ucansignDocumentId && contract.status !== 'draft');
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
                                        {contract.status !== 'draft' && !canDelete && !canDownload && <span className={styles.subText}>-</span>}
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
