import { ApprovalFieldRenderer } from './ApprovalFieldRenderer';
import { ApprovalLinePreview } from './ApprovalLinePreview';
import { paginateApprovalPreview } from './approvalTemplatePagination';
import type { ApprovalTemplate } from './approvalTypes';
import styles from './ApprovalTemplates.module.css';

type ApprovalTemplatePreviewProps = {
    readonly template: ApprovalTemplate;
};

export function ApprovalTemplatePreview({ template }: ApprovalTemplatePreviewProps) {
    const pages = paginateApprovalPreview(template.fields, template.steps);
    return (
        <div className={styles.previewFrame}>
            {pages.map((page, index) => (
                <article className={styles.previewPage} key={`${index}-${page.fields[0]?.id ?? 'approval'}`}>
                    <span className={styles.pageNumber}>{index + 1} / {pages.length}</span>
                    {index === 0 ? (
                        <>
                            <header>
                                <span>전자결재</span>
                                <h3>{template.name || '제목 없는 양식'}</h3>
                                <p>{template.description || '양식 설명이 없습니다.'}</p>
                            </header>
                            <dl>
                                <div><dt>기안자</dt><dd>작성 시 자동 입력</dd></div>
                                <div><dt>기안일</dt><dd>작성 시 자동 입력</dd></div>
                                <div><dt>문서번호</dt><dd>제출 시 자동 발급</dd></div>
                            </dl>
                        </>
                    ) : (
                        <header className={styles.continuationHeader}>
                            <span>{template.name || '제목 없는 양식'}</span>
                            <strong>계속</strong>
                        </header>
                    )}
                    {page.fields.length > 0 && <ApprovalFieldRenderer fields={page.fields} values={{}} />}
                    {page.steps.length > 0 && <ApprovalLinePreview kind="template" startOrder={page.stepOffset + 1} steps={page.steps} />}
                </article>
            ))}
        </div>
    );
}
