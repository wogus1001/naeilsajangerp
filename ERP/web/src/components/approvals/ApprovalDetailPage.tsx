'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, FileDown, FileText, Paperclip, Pencil } from 'lucide-react';
import { AlertModal } from '@/components/common/AlertModal';
import { fetchApprovalDocument, runApprovalAction } from './approvalApi';
import { ApprovalDocumentActions } from './ApprovalDocumentActions';
import { ApprovalFieldRenderer } from './ApprovalFieldRenderer';
import { formatApprovalDate } from './approvalFormatting';
import { ApprovalHistory } from './ApprovalHistory';
import { ApprovalLinePreview } from './ApprovalLinePreview';
import { ApprovalStatusBadge } from './ApprovalStatusBadge';
import type { ApprovalAction, ApprovalDocumentDetail } from './approvalTypes';
import styles from './ApprovalDocument.module.css';

type ApprovalDetailPageProps = {
    readonly documentId: string;
};

type ResultModal = { readonly message: string; readonly type: 'success' | 'error' };

export function ApprovalDetailPage({ documentId }: ApprovalDetailPageProps) {
    const [document, setDocument] = React.useState<ApprovalDocumentDetail | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState('');
    const [result, setResult] = React.useState<ResultModal | null>(null);

    const load = React.useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            setDocument(await fetchApprovalDocument(documentId));
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : '결재 문서를 불러오지 못했습니다.');
        } finally {
            setLoading(false);
        }
    }, [documentId]);

    React.useEffect(() => { void load(); }, [load]);

    async function handleAction(action: ApprovalAction, comment: string) {
        setSaving(true);
        try {
            const updated = await runApprovalAction(documentId, action, comment);
            setDocument(updated);
            setResult({ message: '문서 처리를 완료했습니다.', type: 'success' });
        } catch (caught) {
            setResult({ message: caught instanceof Error ? caught.message : '문서를 처리하지 못했습니다.', type: 'error' });
        } finally {
            setSaving(false);
        }
    }

    if (loading) return <div className={styles.detailState}>결재 문서를 불러오는 중입니다.</div>;
    if (!document) return (
        <div className={styles.detailState} role="alert">
            <strong>문서를 열 수 없습니다.</strong>
            <span>{error || '문서가 없거나 조회 권한이 없습니다.'}</span>
            <Link href="/approvals">전자결재 홈으로</Link>
        </div>
    );

    return (
        <section className={styles.page}>
            <div className={styles.detailHeader}>
                <Link className={styles.backLink} href="/approvals/mine"><ArrowLeft size={17} aria-hidden="true" />목록</Link>
                <div className={styles.detailTitle}>
                    <span><FileText size={20} aria-hidden="true" /><ApprovalStatusBadge status={document.status} /></span>
                    <h2>{document.title}</h2>
                    <p>{document.documentNumber} · {document.templateName}</p>
                </div>
                <div className={styles.detailHeaderActions}>
                    {document.editable && <Link className={styles.pdfLink} href={`/approvals/write?documentId=${encodeURIComponent(document.id)}`}><Pencil size={17} aria-hidden="true" />수정</Link>}
                    <a className={styles.pdfLink} href={`/api/approvals/documents/${encodeURIComponent(document.id)}/pdf`}><FileDown size={17} aria-hidden="true" />PDF 내려받기</a>
                </div>
            </div>
            <div className={styles.detailLayout}>
                <div className={styles.detailMain}>
                    <section className={styles.documentPanel}>
                        <dl className={styles.documentMeta}>
                            <div><dt>기안자</dt><dd>{document.authorName}</dd></div>
                            <div><dt>소속 부서</dt><dd>{document.departmentName}</dd></div>
                            <div><dt>제출일</dt><dd>{formatApprovalDate(document.submittedAt)}</dd></div>
                            <div><dt>처리기한</dt><dd>{formatApprovalDate(document.dueAt)}</dd></div>
                            <div><dt>보존기간</dt><dd>{document.retentionPeriod}</dd></div>
                            <div><dt>보안등급</dt><dd>{document.securityLevel}</dd></div>
                            <div><dt>문서함</dt><dd>{document.documentBox}</dd></div>
                        </dl>
                        <ApprovalFieldRenderer fields={document.fields ?? []} values={document.values ?? {}} />
                        <div className={styles.savedAttachments}>
                            <div className={styles.sectionHeading}>
                                <span><Paperclip size={18} aria-hidden="true" /><strong>첨부파일</strong></span>
                                <small>{document.attachments?.length ?? 0}개</small>
                            </div>
                            {document.attachments?.length ? (
                                <ul>
                                    {document.attachments.map(attachment => (
                                        <li key={attachment.id}>
                                            <span><Paperclip size={15} aria-hidden="true" />{attachment.name}</span>
                                            {attachment.url && <a href={attachment.url} rel="noreferrer" target="_blank"><Download size={15} aria-hidden="true" />열기</a>}
                                        </li>
                                    ))}
                                </ul>
                            ) : <p>첨부된 파일이 없습니다.</p>}
                        </div>
                    </section>
                    <ApprovalHistory events={document.events ?? []} />
                </div>
                <aside className={styles.detailSidebar}>
                    <section className={styles.sidePanel}>
                        <ApprovalLinePreview kind="document" steps={document.approvalLine ?? []} />
                    </section>
                    <ApprovalDocumentActions actions={document.eligibleActions ?? []} disabled={saving} onAction={(action, comment) => void handleAction(action, comment)} />
                </aside>
            </div>
            <AlertModal
                isOpen={result !== null}
                message={result?.message ?? ''}
                onClose={() => setResult(null)}
                title={result?.type === 'success' ? '처리 완료' : '처리 실패'}
                type={result?.type}
            />
        </section>
    );
}
