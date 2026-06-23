import Link from 'next/link';
import { ArchiveRestore, Copy, ExternalLink, Send, Trash2 } from 'lucide-react';
import type { CompanyTemplateSummary } from './companyTemplatesClient';
import { companyTemplateCreateHref } from './companyTemplateRoutes';
import { getCompanyTemplateUsageState } from './companyTemplateTableState';
import styles from './electronicContracts.module.css';

function formatDate(value: string): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

type CompanyTemplateTableProps = {
    readonly templates: readonly CompanyTemplateSummary[];
    readonly emptyText: string;
    readonly busy: boolean;
    readonly archived?: boolean;
    readonly onEdit: (template: CompanyTemplateSummary) => void;
    readonly onCopy?: (template: CompanyTemplateSummary) => void;
    readonly onDelete: (template: CompanyTemplateSummary) => void;
    readonly onRestore?: (template: CompanyTemplateSummary) => void;
};

export function CompanyTemplateTable({
    templates,
    emptyText,
    busy,
    archived = false,
    onEdit,
    onCopy,
    onDelete,
    onRestore
}: CompanyTemplateTableProps) {
    return (
        <div className={styles.tableWrap}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>템플릿</th>
                        <th>사용 상태</th>
                        <th>생성자</th>
                        <th>생성일</th>
                        <th>연결 버전</th>
                        <th>관리</th>
                    </tr>
                </thead>
                <tbody>
                    {templates.map(template => {
                        const usageState = getCompanyTemplateUsageState(template);
                        return (
                        <tr key={template.id}>
                            <td><strong>{template.name}</strong></td>
                            <td><span className={styles.badge}>{usageState.statusLabel}</span></td>
                            <td>{template.createdByName || '-'}</td>
                            <td>{formatDate(template.createdAt)}</td>
                            <td>{template.latestVersion ? `v${template.latestVersion.versionNumber}` : '-'}</td>
                            <td>
                                <div className={styles.templateActions}>
                                    {!archived && (
                                        <>
                                            {usageState.canCreateContract ? (
                                                <Link className={styles.primaryButton} href={companyTemplateCreateHref(template.id)}>
                                                    <Send size={14} />
                                                    {usageState.createLabel}
                                                </Link>
                                            ) : (
                                                <button className={styles.weakButton} type="button" disabled>
                                                    <Send size={14} />
                                                    {usageState.createLabel}
                                                </button>
                                            )}
                                            <button className={styles.weakButton} type="button" onClick={() => onEdit(template)} disabled={busy || !template.latestVersion}>
                                                <ExternalLink size={14} />
                                                {usageState.editLabel}
                                            </button>
                                            {onCopy && (
                                                <button className={styles.weakButton} type="button" onClick={() => onCopy(template)} disabled={busy || !template.latestVersion}>
                                                    <Copy size={14} />
                                                    복사
                                                </button>
                                            )}
                                        </>
                                    )}
                                    {archived && onRestore && (
                                        <button className={styles.weakButton} type="button" onClick={() => onRestore(template)} disabled={busy}>
                                            <ArchiveRestore size={14} />
                                            복원
                                        </button>
                                    )}
                                    <button className={styles.dangerButton} type="button" onClick={() => onDelete(template)} disabled={busy}>
                                        <Trash2 size={14} />
                                        삭제
                                    </button>
                                </div>
                            </td>
                        </tr>
                        );
                    })}
                    {templates.length === 0 && (
                        <tr><td className={styles.empty} colSpan={6}>{emptyText}</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
