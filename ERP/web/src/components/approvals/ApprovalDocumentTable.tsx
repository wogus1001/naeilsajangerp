import Link from 'next/link';
import { ArrowRight, FileText } from 'lucide-react';
import { formatApprovalDate, isApprovalDelayed } from './approvalFormatting';
import { ApprovalStatusBadge } from './ApprovalStatusBadge';
import type { ApprovalDocumentSummary } from './approvalTypes';
import { approvalDocumentHref } from './approvalsNavigation';
import styles from './ApprovalLists.module.css';

type ApprovalDocumentTableProps = {
    readonly documents: readonly ApprovalDocumentSummary[];
    readonly emptyMessage: string;
    readonly loading: boolean;
};

export function ApprovalDocumentTable({ documents, emptyMessage, loading }: ApprovalDocumentTableProps) {
    if (loading) return <div className={styles.state}>문서를 불러오는 중입니다.</div>;
    if (documents.length === 0) return <div className={styles.state}>{emptyMessage}</div>;
    return (
        <div className={styles.tableScroll}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>문서</th>
                        <th>기안자</th>
                        <th>상태</th>
                        <th>제출일</th>
                        <th>처리기한</th>
                        <th><span className={styles.srOnly}>열기</span></th>
                    </tr>
                </thead>
                <tbody>
                    {documents.map(document => (
                        <tr key={document.id}>
                            <td>
                                <Link className={styles.documentLink} href={approvalDocumentHref(document.id)}>
                                    <FileText size={17} aria-hidden="true" />
                                    <span>
                                        <strong>{document.title}</strong>
                                        <small>{document.documentNumber || document.templateName}</small>
                                    </span>
                                </Link>
                            </td>
                            <td>
                                <span>{document.authorName}</span>
                                <small>{document.departmentName}</small>
                            </td>
                            <td><ApprovalStatusBadge status={document.status} /></td>
                            <td>{formatApprovalDate(document.submittedAt)}</td>
                            <td className={isApprovalDelayed(document.dueAt) ? styles.delayed : undefined}>
                                {formatApprovalDate(document.dueAt)}
                            </td>
                            <td>
                                <Link className={styles.openButton} href={approvalDocumentHref(document.id)} aria-label={`${document.title} 열기`}>
                                    <ArrowRight size={16} aria-hidden="true" />
                                </Link>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
