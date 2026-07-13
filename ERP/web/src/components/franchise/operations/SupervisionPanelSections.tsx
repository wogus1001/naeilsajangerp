'use client';

import React from 'react';
import { Check, ChevronDown, ClipboardCheck, Pencil, Plus, Printer, Save, Send, Trash2, X } from 'lucide-react';
import {
    CORRECTIVE_ACTION_STATUSES,
    canEditSupervisionReport,
    kstDateKey,
    normalizeItemResult,
    SUPERVISION_ITEM_RESULTS,
    SUPERVISION_VISIT_PURPOSES,
    type SupervisionInspectionItem,
    type SupervisionReportListItem
} from '@/lib/franchise-supervision';
import type {
    SupervisionCorrectiveAction,
    SupervisionCorrectiveActionEvent,
    SupervisionPayload,
    SupervisionReport,
    SupervisionReportEvent,
    SupervisionVisit
} from './supervisionTypes';
import type { SupervisionReportAiSummary } from '@/lib/franchise-supervision-ai-summary';
import { formatSupervisorOptionLabel, getDuplicateSupervisorNames } from './supervisorDisplay';
import { getActionRequiredInspectionItems, summarizeInspectionItems } from './SupervisionReportSummary';
import { SupervisionReportAiSummaryPanel } from './SupervisionReportAiSummaryPanel';
import styles from './SupervisionPanel.module.css';

export type VisitFormState = {
    readonly assignmentId: string;
    readonly locationId: string;
    readonly supervisorProfileId: string;
    readonly visitDate: string;
    readonly purpose: string;
    readonly memo: string;
};

export type SupervisionView = 'dashboard' | 'assignments' | 'visits' | 'reports' | 'review';
export type SupervisionFilter = 'all' | 'todayVisits' | 'weekVisits' | 'missingReports' | 'pendingApprovals' | 'activeActions';
export type SupervisionReportMode = 'list' | 'editor';

const VIEW_TABS: readonly { readonly key: SupervisionView; readonly label: string }[] = [
    { key: 'dashboard', label: '운영 리포트' },
    { key: 'assignments', label: '배정 관리' },
    { key: 'visits', label: '방문 일정' },
    { key: 'reports', label: '점검 보고서' },
    { key: 'review', label: '승인·시정요청' }
];

function todayText(): string {
    return kstDateKey();
}

function reportStatusClass(status: SupervisionReportListItem['reportStatus'] | SupervisionReport['status']): string {
    if (status === '승인') return styles.badgeGreen;
    if (status === '반려') return styles.badgeRed;
    if (status === '제출') return styles.badgeBlue;
    if (status === '미작성') return styles.badge;
    return styles.badgeBlue;
}

function itemResultClass(result: SupervisionInspectionItem['result']): string {
    if (result === '개선필요') return styles.badgeRed;
    if (result === '주의') return styles.badgeWarning;
    return styles.badgeGreen;
}

function itemRowClass(result: SupervisionInspectionItem['result']): string {
    if (result === '개선필요') return `${styles.itemRow} ${styles.itemRowCritical}`;
    if (result === '주의') return `${styles.itemRow} ${styles.itemRowWarning}`;
    return styles.itemRow;
}

function actionStatusClass(status: SupervisionCorrectiveAction['status']): string {
    if (status === '완료') return styles.badgeGreen;
    if (status === '보류') return styles.badge;
    return styles.badgeRed;
}

function displayDate(value: string | null): string {
    return value?.slice(0, 10) || '-';
}

export function SectionHeader({ title, caption }: { readonly title: string; readonly caption: string }) {
    return (
        <div className={styles.sectionHeader}>
            <div>
                <h3>{title}</h3>
                <p>{caption}</p>
            </div>
        </div>
    );
}

export function ViewTabs(props: {
    readonly activeView: SupervisionView;
    readonly canManage: boolean;
    readonly onSelect: (view: SupervisionView) => void;
}) {
    const tabs = props.canManage ? VIEW_TABS : VIEW_TABS.filter(tab => tab.key !== 'assignments');
    return (
        <div className={styles.viewTabs}>
            {tabs.map(tab => (
                <button
                    key={tab.key}
                    type="button"
                    className={props.activeView === tab.key ? styles.viewTabActive : styles.viewTab}
                    onClick={() => props.onSelect(tab.key)}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
}

export function DashboardOverview({ data }: { readonly data: SupervisionPayload }) {
    const approvedReports = data.reports.filter(report => report.status === '승인').length;
    const submittedReports = data.reports.filter(report => report.status === '제출').length;
    const delayedActions = data.correctiveActions.filter(action => (
        action.dueDate && action.dueDate < todayText() && action.status !== '완료'
    )).length;
    const title = data.canManage ? '팀장 운영 리포트' : 'SV 업무 리포트';
    const caption = data.canManage
        ? '회사 전체 SV 방문율, 승인 대기, 시정요청 지연을 확인합니다.'
        : '내 담당 운영점의 방문, 보고서, 시정요청 상태를 확인합니다.';
    return (
        <div className={styles.layoutSingle}>
            <section className={styles.section}>
                <SectionHeader title={title} caption={caption} />
                <div className={styles.reportGrid}>
                    <div className={styles.reportCard}>
                        <span>{data.canManage ? 'SV 배정' : '내 담당 운영점'}</span>
                        <strong>{data.assignments.filter(item => item.active).length.toLocaleString()}</strong>
                        <small>활성 배정 기준</small>
                    </div>
                    <div className={styles.reportCard}>
                        <span>{data.canManage ? '방문 일정' : '내 방문 일정'}</span>
                        <strong>{data.visits.length.toLocaleString()}</strong>
                        <small>전체 방문 기록</small>
                    </div>
                    <div className={styles.reportCard}>
                        <span>{data.canManage ? '보고서 승인' : '보고서 상태'}</span>
                        <strong>{approvedReports.toLocaleString()}</strong>
                        <small>승인 대기 {submittedReports.toLocaleString()}건</small>
                    </div>
                    <div className={styles.reportCard}>
                        <span>시정요청 지연</span>
                        <strong>{delayedActions.toLocaleString()}</strong>
                        <small>기한 초과 미완료</small>
                    </div>
                </div>
            </section>
        </div>
    );
}

export function VisitForm(props: {
    readonly data: SupervisionPayload;
    readonly editing: boolean;
    readonly form: VisitFormState;
    readonly disabled: boolean;
    readonly onCancelEdit: () => void;
    readonly onChange: (form: VisitFormState) => void;
    readonly onSubmit: () => void;
}) {
    const activeAssignments = props.data.assignments.filter(assignment => assignment.active);
    const assignedSupervisors = props.data.supervisors.filter(supervisor => (
        activeAssignments.some(assignment => assignment.supervisorProfileId === supervisor.id)
    ));
    const supervisors = assignedSupervisors.length > 0 ? assignedSupervisors : props.data.supervisors;
    const duplicateSupervisorNames = getDuplicateSupervisorNames(supervisors);
    const locationOptions = activeAssignments
        .filter(assignment => assignment.supervisorProfileId === props.form.supervisorProfileId)
        .map(assignment => ({
            assignmentId: assignment.id,
            locationId: assignment.locationId,
            locationName: assignment.locationName
        }));
    const canSubmit = Boolean(props.form.supervisorProfileId && props.form.locationId && props.form.visitDate);
    const changeSupervisor = (supervisorProfileId: string) => {
        const firstAssignment = activeAssignments.find(assignment => assignment.supervisorProfileId === supervisorProfileId);
        props.onChange({
            ...props.form,
            assignmentId: firstAssignment?.id || '',
            locationId: firstAssignment?.locationId || '',
            supervisorProfileId
        });
    };
    const changeLocation = (locationId: string) => {
        const assignment = locationOptions.find(option => option.locationId === locationId);
        props.onChange({ ...props.form, assignmentId: assignment?.assignmentId || '', locationId });
    };
    return (
        <div className={styles.formPanel}>
            <div className={styles.formPanelHeader}>
                <strong>{props.editing ? '방문 일정 수정' : '방문 일정 등록'}</strong>
                <span>SV를 먼저 선택하면 배정된 운영점만 표시됩니다.</span>
            </div>
            <div className={styles.formGrid}>
                <SelectField label="SV" value={props.form.supervisorProfileId} onChange={changeSupervisor}>
                    {supervisors.map(supervisor => (
                        <option key={supervisor.id} value={supervisor.id}>
                            {formatSupervisorOptionLabel(supervisor, duplicateSupervisorNames)}
                        </option>
                    ))}
                </SelectField>
                <SelectField label="운영점" value={props.form.locationId} onChange={changeLocation}>
                    {locationOptions.length === 0 ? <option value="">배정된 운영점 없음</option> : null}
                    {locationOptions.map(option => <option key={option.assignmentId} value={option.locationId}>{option.locationName}</option>)}
                </SelectField>
                <InputField label="방문일" type="date" value={props.form.visitDate} onChange={(value: string) => props.onChange({ ...props.form, visitDate: value })} />
                <SelectField label="방문 목적" value={props.form.purpose} onChange={(value: string) => props.onChange({ ...props.form, purpose: value })}>
                    {SUPERVISION_VISIT_PURPOSES.map(purpose => <option key={purpose} value={purpose}>{purpose}</option>)}
                </SelectField>
                <TextField label="방문 메모" value={props.form.memo} placeholder="점검 목적, 사전 요청사항" onChange={(value: string) => props.onChange({ ...props.form, memo: value })} />
            </div>
            <div className={styles.formFooter}>
                <button type="button" className={styles.secondaryButton} disabled={props.disabled} onClick={props.onCancelEdit}>
                    {props.editing ? '수정 취소' : '닫기'}
                </button>
                <button type="button" className={styles.primaryButton} disabled={props.disabled || !canSubmit} onClick={props.onSubmit}>
                    <ClipboardCheck size={13} /> {props.editing ? '방문 수정 저장' : '방문 등록'}
                </button>
            </div>
        </div>
    );
}

export function VisitList(props: {
    readonly data: SupervisionPayload;
    readonly visits: readonly SupervisionVisit[];
    readonly selectedId: string;
    readonly onDelete: (visit: SupervisionVisit) => void;
    readonly onEdit: (visit: SupervisionVisit) => void;
    readonly onNew: () => void;
    readonly onSelect: (id: string) => void;
}) {
    const [query, setQuery] = React.useState('');
    const [supervisorFilter, setSupervisorFilter] = React.useState('all');
    const [statusFilter, setStatusFilter] = React.useState('active');
    const [page, setPage] = React.useState(1);
    const normalizedQuery = query.trim().toLocaleLowerCase('ko-KR');
    const filteredVisits = props.visits.filter(visit => {
        if (supervisorFilter !== 'all' && visit.supervisorProfileId !== supervisorFilter) return false;
        if (statusFilter === 'active' && visit.status === '취소') return false;
        if (statusFilter !== 'all' && statusFilter !== 'active' && visit.status !== statusFilter) return false;
        if (!normalizedQuery) return true;
        return [visit.locationName, visit.supervisorName, visit.purpose, visit.memo].some(value => value.toLocaleLowerCase('ko-KR').includes(normalizedQuery));
    });
    const pageSize = 8;
    const maxPage = Math.max(1, Math.ceil(filteredVisits.length / pageSize));
    const safePage = Math.min(page, maxPage);
    const pagedVisits = filteredVisits.slice((safePage - 1) * pageSize, safePage * pageSize);
    const duplicateSupervisorNames = React.useMemo(() => getDuplicateSupervisorNames(props.data.supervisors), [props.data.supervisors]);
    React.useEffect(() => {
        setPage(1);
    }, [normalizedQuery, statusFilter, supervisorFilter]);
    return (
        <div className={styles.listPanel}>
            <div className={styles.listHeader}>
                <div>
                    <strong>방문 일정 목록</strong>
                    <span>SV, 운영점, 상태별로 일정을 확인하고 수정합니다.</span>
                </div>
                <button type="button" className={styles.primaryButton} onClick={props.onNew}>
                    <Plus size={13} /> 새 방문
                </button>
            </div>
            <div className={styles.listFilters}>
                <input type="search" value={query} placeholder="운영점, SV, 목적, 메모 검색" onChange={event => setQuery(event.currentTarget.value)} />
                <select value={supervisorFilter} onChange={event => setSupervisorFilter(event.currentTarget.value)}>
                    <option value="all">전체 SV</option>
                    {props.data.supervisors.map(supervisor => (
                        <option key={supervisor.id} value={supervisor.id}>
                            {formatSupervisorOptionLabel(supervisor, duplicateSupervisorNames)}
                        </option>
                    ))}
                </select>
                <select value={statusFilter} onChange={event => setStatusFilter(event.currentTarget.value)}>
                    <option value="active">취소 제외</option>
                    <option value="all">전체 상태</option>
                    <option value="예정">예정</option>
                    <option value="진행중">진행중</option>
                    <option value="보고서대기">보고서대기</option>
                    <option value="승인대기">승인대기</option>
                    <option value="완료">완료</option>
                    <option value="취소">취소</option>
                </select>
            </div>
            {filteredVisits.length === 0 ? <div className={styles.empty}>조건에 맞는 방문 일정이 없습니다.</div> : (
                <>
                    <div className={styles.tableWrap}>
                        <table className={styles.compactTable}>
                            <thead>
                                <tr>
                                    <th>방문</th>
                                    <th>SV</th>
                                    <th>목적</th>
                                    <th>상태</th>
                                    <th>메모</th>
                                    <th>관리</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pagedVisits.map(visit => (
                                    <tr key={visit.id} className={props.selectedId === visit.id ? styles.tableRowActive : undefined}>
                                        <td>
                                            <button type="button" className={styles.linkButton} onClick={() => props.onSelect(visit.id)}>
                                                <strong>{visit.locationName}</strong>
                                                <small>{visit.visitDate || '-'}</small>
                                            </button>
                                        </td>
                                        <td>{visit.supervisorName}</td>
                                        <td>{visit.purpose}</td>
                                        <td><span className={visit.status === '취소' ? styles.badgeRed : styles.badgeBlue}>{visit.status}</span></td>
                                        <td><span className={styles.mutedText}>{visit.memo || '-'}</span></td>
                                        <td>
                                            <div className={styles.actionCell}>
                                                <button type="button" className={styles.secondaryButton} onClick={() => props.onEdit(visit)}>
                                                    <Pencil size={13} /> 수정
                                                </button>
                                                <button type="button" className={styles.dangerButton} onClick={() => props.onDelete(visit)}>
                                                    <Trash2 size={13} /> 삭제
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className={styles.paginationBar}>
                        <span>총 {filteredVisits.length.toLocaleString()}건</span>
                        <div className={styles.paginationControls}>
                            <button type="button" className={styles.secondaryButton} disabled={safePage <= 1} onClick={() => setPage(current => Math.max(1, current - 1))}>이전</button>
                            <strong>{safePage.toLocaleString()} / {maxPage.toLocaleString()}</strong>
                            <button type="button" className={styles.secondaryButton} disabled={safePage >= maxPage} onClick={() => setPage(current => Math.min(maxPage, current + 1))}>다음</button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export function ReportEditor(props: {
    readonly canManage: boolean;
    readonly disabled: boolean;
    readonly inspectionItems: readonly SupervisionInspectionItem[];
    readonly photoCount: number;
    readonly report: SupervisionReport | null;
    readonly reportEvents: readonly SupervisionReportEvent[];
    readonly correctiveActions: readonly SupervisionCorrectiveAction[];
    readonly correctiveActionEvents: readonly SupervisionCorrectiveActionEvent[];
    readonly selectedVisit: SupervisionVisit | null;
    readonly specialNote: string;
    readonly templateName: string;
    readonly userId: string;
    readonly companyName: string;
    readonly onApplyAiSummary: (summary: SupervisionReportAiSummary) => void;
    readonly onFiles: (files: readonly File[]) => void;
    readonly onItemChange: (items: readonly SupervisionInspectionItem[]) => void;
    readonly onPrint: () => void;
    readonly onSave: () => void;
    readonly onSaveTemplate: () => void;
    readonly onSubmit: () => void;
    readonly onSpecialNote: (value: string) => void;
    readonly onTemplateName: (value: string) => void;
    readonly onBackToList: () => void;
}) {
    if (!props.selectedVisit) return <div className={styles.empty}>보고서를 작성할 방문 일정을 선택해주세요.</div>;
    const canEditReport = canEditSupervisionReport(props.report?.status)
        && (!props.report || props.report.createdBy === props.userId);
    const editorDisabled = props.disabled || !canEditReport;
    const summary = summarizeInspectionItems(props.inspectionItems);
    const actionRequiredItems = getActionRequiredInspectionItems(props.inspectionItems);
    const savedPhotoCount = props.report?.photoAttachments.length ?? 0;
    const totalPhotoCount = savedPhotoCount + props.photoCount;
    return (
        <div className={styles.reportEditorStack}>
            <div className={styles.reportHero}>
                <div>
                    <span>SV 점검 보고서</span>
                    <h4>{props.selectedVisit.locationName}</h4>
                    <p>{props.selectedVisit.purpose} · 방문 {displayDate(props.selectedVisit.visitDate)} · 담당 {props.selectedVisit.supervisorName}</p>
                </div>
                <div className={styles.reportVerdict}>
                    <span>종합 결과</span>
                    <strong className={itemResultClass(summary.overallResult)}>{summary.overallResult}</strong>
                    <small>{props.report?.status || '작성중'}</small>
                </div>
            </div>
            <section className={styles.reportSummaryPanel}>
                <div className={styles.reportSectionHeading}>
                    <h4>이번 점검 요약</h4>
                    <p>종합 결과와 후속 조치가 필요한 항목을 먼저 확인합니다.</p>
                </div>
                <div className={styles.reportSummaryGrid}>
                    <div className={styles.reportMetricCard}>
                        <span>종합 결과</span>
                        <strong>{summary.overallResult}</strong>
                        <small>{props.report?.status || '작성중'}</small>
                    </div>
                    <div className={styles.reportMetricCard}>
                        <span>양호율</span>
                        <strong>{summary.completionRate.toLocaleString()}%</strong>
                        <small>{summary.goodCount.toLocaleString()} / {summary.total.toLocaleString()} 항목</small>
                    </div>
                    <div className={styles.reportMetricCard}>
                        <span>주의/개선</span>
                        <strong>{(summary.warningCount + summary.improvementCount).toLocaleString()}</strong>
                        <small>주의 {summary.warningCount.toLocaleString()} · 개선필요 {summary.improvementCount.toLocaleString()}</small>
                    </div>
                    <div className={styles.reportMetricCard}>
                        <span>자료</span>
                        <strong>{totalPhotoCount.toLocaleString()}</strong>
                        <small>사진 · 특이사항 {props.specialNote.trim() ? '있음' : '없음'}</small>
                    </div>
                </div>
            </section>
            <div className={actionRequiredItems.length > 0 ? styles.reportAttention : styles.reportAttentionClear}>
                <div>
                    <strong>{actionRequiredItems.length > 0 ? '조치 필요 항목' : '조치 필요 항목 없음'}</strong>
                    <span>{actionRequiredItems.length > 0 ? '주의 또는 개선필요 항목만 모아 봅니다.' : '현재 후속 조치가 필요한 항목이 없습니다.'}</span>
                </div>
                {actionRequiredItems.length > 0 ? (
                    <div className={styles.reportAttentionList}>
                        {actionRequiredItems.map(item => (
                            <span key={item.id}>
                                <b className={itemResultClass(item.result)}>{item.result}</b>
                                {item.label}
                            </span>
                        ))}
                    </div>
                ) : null}
            </div>
            {props.canManage ? (
                <div className={`${styles.field} ${styles.fieldFull}`}>
                    <label>회사 점검 템플릿</label>
                    <div className={styles.inlineControls}>
                        <input
                            type="text"
                            value={props.templateName}
                            placeholder="예: 정기 방문 점검 템플릿"
                            disabled={editorDisabled}
                            onChange={event => props.onTemplateName(event.currentTarget.value)}
                        />
                        <button type="button" className={styles.secondaryButton} disabled={editorDisabled} onClick={props.onSaveTemplate}>
                            <Save size={13} /> 템플릿 저장
                        </button>
                    </div>
                </div>
            ) : null}
            <SupervisionReportAiSummaryPanel
                userId={props.userId}
                companyName={props.companyName}
                disabled={editorDisabled}
                selectedVisitId={props.selectedVisit.id}
                inspectionItems={props.inspectionItems}
                onApplySummary={props.onApplyAiSummary}
            />
            <div className={styles.reportChecklistGrid}>
                {props.inspectionItems.map((item, index) => (
                    <div key={item.id} className={itemRowClass(item.result)}>
                        <div className={styles.itemRowHeader}>
                            <span>{String(index + 1).padStart(2, '0')}</span>
                            <strong>{item.label}</strong>
                            <b className={itemResultClass(item.result)}>{item.result}</b>
                        </div>
                        <select
                            value={item.result}
                            disabled={editorDisabled}
                            onChange={event => props.onItemChange(props.inspectionItems.map(next => (
                                next.id === item.id ? { ...next, result: normalizeItemResult(event.currentTarget.value) } : next
                            )))}
                        >
                            {SUPERVISION_ITEM_RESULTS.map(result => <option key={result} value={result}>{result}</option>)}
                        </select>
                        <textarea
                            value={item.memo}
                            placeholder="현장 확인 내용, 수치, 후속 조치 메모"
                            disabled={editorDisabled}
                            onChange={event => props.onItemChange(props.inspectionItems.map(next => (
                                next.id === item.id ? { ...next, memo: event.currentTarget.value } : next
                            )))}
                        />
                    </div>
                ))}
            </div>
            <div className={styles.reportFooterGrid}>
                <TextField label="특이사항" value={props.specialNote} placeholder="본사 지원 필요사항, 현장 이슈" disabled={editorDisabled} onChange={props.onSpecialNote} />
                <div className={styles.field}>
                    <label>사진 첨부</label>
                    <input type="file" multiple accept="image/*" disabled={editorDisabled} onChange={event => props.onFiles(Array.from(event.currentTarget.files || []))} />
                    <small>선택 {props.photoCount.toLocaleString()}개 · 저장된 사진 {savedPhotoCount.toLocaleString()}개</small>
                </div>
            </div>
            {props.report ? (
                <ReportScopedTimeline
                    reportEvents={props.reportEvents}
                    correctiveActions={props.correctiveActions}
                    correctiveActionEvents={props.correctiveActionEvents}
                />
            ) : null}
            <div className={styles.buttonRow}>
                <button type="button" className={styles.secondaryButton} disabled={props.disabled} onClick={props.onBackToList}>
                    목록으로
                </button>
                <button type="button" className={styles.secondaryButton} disabled={editorDisabled} onClick={props.onSave}>
                    <Save size={13} /> 임시저장
                </button>
                <button type="button" className={styles.primaryButton} disabled={editorDisabled} onClick={props.onSubmit}>
                    <Send size={13} /> {props.report?.status === '제출' ? '제출 완료' : '제출'}
                </button>
                <button type="button" className={styles.secondaryButton} disabled={props.disabled} onClick={props.onPrint}>
                    <Printer size={13} /> PDF/인쇄
                </button>
                {props.canManage && props.report?.status === '제출' ? <span className={styles.badgeBlue}>승인 대기</span> : null}
                {!canEditReport && props.report?.status !== '제출' ? <span className={reportStatusClass(props.report?.status || '임시저장')}>{props.report?.status}</span> : null}
            </div>
        </div>
    );
}

export function ReportList(props: {
    readonly items: readonly SupervisionReportListItem[];
    readonly selectedVisitId: string;
    readonly onSelect: (visitId: string) => void;
}) {
    if (props.items.length === 0) return <div className={styles.empty}>점검 보고서 대상 방문 일정이 없습니다.</div>;
    return (
        <div className={styles.tableWrap}>
            <table className={styles.compactTable}>
                <thead>
                    <tr>
                        <th>운영점</th>
                        <th>방문</th>
                        <th>SV</th>
                        <th>보고서</th>
                        <th>점검 결과</th>
                        <th>관리</th>
                    </tr>
                </thead>
                <tbody>
                    {props.items.map(item => (
                        <tr key={item.visitId} className={props.selectedVisitId === item.visitId ? styles.tableRowActive : undefined}>
                            <td>
                                <div className={styles.reportTitleCell}>
                                    <strong>{item.locationName}</strong>
                                    <small>{item.purpose} · 방문 {item.visitStatus}</small>
                                </div>
                            </td>
                            <td>{item.visitDate || '-'}</td>
                            <td>{item.supervisorName}</td>
                            <td>
                                <div className={styles.statusMeta}>
                                    <span className={reportStatusClass(item.reportStatus)}>{item.reportStatus}</span>
                                    <small>{displayDate(item.updatedAt || item.submittedAt || item.reviewedAt)}</small>
                                </div>
                            </td>
                            <td>
                                <div className={styles.resultPills}>
                                    <span className={item.improvementCount > 0 ? styles.badgeRed : styles.badgeGreen}>개선 {item.improvementCount.toLocaleString()}</span>
                                    <span className={styles.badge}>사진 {item.photoCount.toLocaleString()}</span>
                                    {item.hasSpecialNote ? <span className={styles.badgeBlue}>특이사항</span> : null}
                                </div>
                            </td>
                            <td>
                                <button type="button" className={styles.secondaryButton} onClick={() => props.onSelect(item.visitId)}>
                                    확인/작성
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export function ReportReviewList(props: {
    readonly canManage: boolean;
    readonly disabled: boolean;
    readonly reports: readonly SupervisionReport[];
    readonly rejectReason: string;
    readonly onRejectReason: (value: string) => void;
    readonly onOpenReport: (report: SupervisionReport) => void;
    readonly onApprove: (report: SupervisionReport) => void;
    readonly onReject: (report: SupervisionReport, rejectReason: string) => void;
}) {
    const pendingReports = props.reports.filter(report => report.status === '제출');
    const approvedReports = props.reports.filter(report => report.status === '승인');
    const rejectedReports = props.reports.filter(report => report.status === '반려');
    const [activeGroup, setActiveGroup] = React.useState<'pending' | 'archive' | 'rejected'>('pending');
    const [rejectReasons, setRejectReasons] = React.useState<Record<string, string>>({});
    if (props.reports.length === 0) return <div className={styles.empty}>최근 점검 보고서가 없습니다.</div>;
    const groups = [
        {
            key: 'pending' as const,
            title: '승인 대기',
            caption: '팀장 검토가 필요한 제출 보고서입니다.',
            emptyText: '승인 대기 중인 보고서가 없습니다.',
            reports: pendingReports
        },
        {
            key: 'archive' as const,
            title: '승인 완료 보관함',
            caption: '승인 완료된 보고서를 별도로 보관해 추후 확인합니다.',
            emptyText: '승인 완료된 보고서가 없습니다.',
            reports: approvedReports
        },
        {
            key: 'rejected' as const,
            title: '반려 보고서',
            caption: '보완 후 재제출이 필요한 보고서입니다.',
            emptyText: '반려된 보고서가 없습니다.',
            reports: rejectedReports
        }
    ];
    const selectedGroup = groups.find(group => group.key === activeGroup) || groups[0];
    return (
        <div className={styles.reviewStack}>
            <div className={styles.reviewSegmentTabs}>
                {groups.map(group => (
                    <button
                        key={group.key}
                        type="button"
                        className={activeGroup === group.key ? styles.reviewSegmentTabActive : styles.reviewSegmentTab}
                        onClick={() => setActiveGroup(group.key)}
                    >
                        <span>{group.title}</span>
                        <b>{group.reports.length.toLocaleString()}</b>
                    </button>
                ))}
            </div>
            <ReportReviewGroup
                variant={selectedGroup.key}
                title={selectedGroup.title}
                caption={selectedGroup.caption}
                emptyText={selectedGroup.emptyText}
                reports={selectedGroup.reports}
                canManage={props.canManage}
                disabled={props.disabled}
                rejectReasons={rejectReasons}
                fallbackRejectReason={selectedGroup.key === 'pending' ? props.rejectReason : ''}
                onRejectReason={nextRejectReasons => {
                    setRejectReasons(nextRejectReasons);
                    const onlyReason = pendingReports.length === 1 ? nextRejectReasons[pendingReports[0]?.id || ''] || '' : '';
                    if (selectedGroup.key === 'pending' && pendingReports.length === 1) props.onRejectReason(onlyReason);
                }}
                onOpenReport={props.onOpenReport}
                onApprove={props.onApprove}
                onReject={props.onReject}
            />
        </div>
    );
}

function ReportReviewGroup(props: {
    readonly variant: 'pending' | 'archive' | 'rejected';
    readonly title: string;
    readonly caption: string;
    readonly emptyText: string;
    readonly reports: readonly SupervisionReport[];
    readonly canManage: boolean;
    readonly disabled: boolean;
    readonly rejectReasons: Readonly<Record<string, string>>;
    readonly fallbackRejectReason: string;
    readonly onRejectReason: (rejectReasons: Readonly<Record<string, string>>) => void;
    readonly onOpenReport: (report: SupervisionReport) => void;
    readonly onApprove: (report: SupervisionReport) => void;
    readonly onReject: (report: SupervisionReport, rejectReason: string) => void;
}) {
    const groupClassName = [
        styles.reviewGroup,
        props.variant === 'archive' ? styles.reviewGroupArchive : '',
        props.variant === 'rejected' ? styles.reviewGroupRejected : '',
        props.variant === 'pending' ? styles.reviewGroupPending : ''
    ].filter(Boolean).join(' ');
    return (
        <section className={groupClassName}>
            <div className={styles.reviewGroupHeader}>
                <div>
                    <strong>{props.title}</strong>
                    <span>{props.caption}</span>
                </div>
                <b>{props.reports.length.toLocaleString()}건</b>
            </div>
            {props.reports.length === 0 ? <div className={styles.empty}>{props.emptyText}</div> : (
                <div className={styles.tableWrap}>
                    <table className={styles.compactTable}>
                        <thead>
                            <tr>
                                <th>보고서</th>
                                <th>SV</th>
                                <th>상태</th>
                                <th>제출/검토</th>
                                <th>반려 사유</th>
                                <th>관리</th>
                            </tr>
                        </thead>
                        <tbody>
                            {props.reports.map(report => {
                                const rowRejectReason = props.rejectReasons[report.id] ?? (props.fallbackRejectReason && props.reports.length === 1 ? props.fallbackRejectReason : '');
                                return (
                                    <tr key={report.id}>
                                        <td>
                                            <div className={styles.reportTitleCell}>
                                                <strong>{report.locationName}</strong>
                                                <small>개선필요 {report.inspectionItems.filter(item => item.result === '개선필요').length.toLocaleString()}건 · 사진 {report.photoAttachments.length.toLocaleString()}개</small>
                                            </div>
                                        </td>
                                        <td>{report.supervisorName}</td>
                                        <td><span className={reportStatusClass(report.status)}>{report.status}</span></td>
                                        <td>
                                            <div className={styles.statusMeta}>
                                                <small>제출 {displayDate(report.submittedAt)}</small>
                                                <small>검토 {displayDate(report.reviewedAt)}</small>
                                            </div>
                                        </td>
                                        <td>
                                            {props.canManage && report.status === '제출' ? (
                                                <input
                                                    className={styles.inlineInput}
                                                    type="text"
                                                    value={rowRejectReason}
                                                    placeholder="반려 시 입력"
                                                    onChange={event => props.onRejectReason({ ...props.rejectReasons, [report.id]: event.currentTarget.value })}
                                                />
                                            ) : (
                                                <span className={styles.mutedText}>{report.rejectReason || '-'}</span>
                                            )}
                                        </td>
                                        <td>
                                            <div className={styles.actionCell}>
                                                <button type="button" className={styles.secondaryButton} onClick={() => props.onOpenReport(report)}>
                                                    <ClipboardCheck size={13} /> 보고서 확인
                                                </button>
                                                {props.canManage && report.status === '제출' ? (
                                                    <>
                                                        <button type="button" className={styles.secondaryButton} disabled={props.disabled} onClick={() => props.onApprove(report)}>
                                                            <Check size={13} /> 승인
                                                        </button>
                                                        <button type="button" className={styles.dangerButton} disabled={props.disabled} onClick={() => props.onReject(report, rowRejectReason)}>
                                                            <X size={13} /> 반려
                                                        </button>
                                                    </>
                                                ) : null}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}

export function CorrectiveActionList(props: {
    readonly actions: readonly SupervisionCorrectiveAction[];
    readonly disabled: boolean;
    readonly onStatusChange: (action: SupervisionCorrectiveAction, status: string) => void;
}) {
    if (props.actions.length === 0) return <div className={styles.empty}>진행 중인 시정요청이 없습니다.</div>;
    return (
        <div className={styles.tableWrap}>
            <table className={styles.compactTable}>
                <thead>
                    <tr>
                        <th>시정요청</th>
                        <th>운영점</th>
                        <th>담당</th>
                        <th>기한</th>
                        <th>상태</th>
                    </tr>
                </thead>
                <tbody>
                    {props.actions.map(action => (
                        <tr key={action.id}>
                            <td>
                                <div className={styles.reportTitleCell}>
                                    <strong>{action.title}</strong>
                                    <small>{action.memo || '처리 메모 없음'}</small>
                                </div>
                            </td>
                            <td>{action.locationName}</td>
                            <td>{action.assigneeName}</td>
                            <td>
                                <span className={action.dueDate && action.dueDate < todayText() && action.status !== '완료' ? styles.badgeRed : styles.badge}>
                                    {action.dueDate || '-'}
                                </span>
                            </td>
                            <td>
                                <div className={styles.statusMeta}>
                                    <span className={actionStatusClass(action.status)}>{action.status}</span>
                                    <select
                                        value={action.status}
                                        disabled={props.disabled}
                                        onChange={event => props.onStatusChange(action, event.currentTarget.value)}
                                    >
                                        {CORRECTIVE_ACTION_STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
                                    </select>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export function EventTimeline({ data }: { readonly data: SupervisionPayload }) {
    const reportEvents = data.reportEvents.map(event => ({
        id: `report-${event.id}`,
        title: `보고서 ${event.eventType}`,
        actorName: event.actorName,
        memo: event.memo,
        createdAt: event.createdAt
    }));
    const actionEvents = data.correctiveActionEvents.map(event => ({
        id: `action-${event.id}`,
        title: `시정요청 ${event.eventType}`,
        actorName: event.actorName,
        memo: event.memo || [event.fromStatus, event.toStatus].filter(Boolean).join(' → '),
        createdAt: event.createdAt
    }));
    const events = [...reportEvents, ...actionEvents]
        .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    const visibleEvents = events.slice(0, 5);
    if (events.length === 0) return <div className={styles.empty}>제출/승인/시정요청 처리 이력이 없습니다.</div>;
    return (
        <div className={styles.timeline}>
            <div className={styles.timelineHeader}>
                <strong>전체 처리 이력</strong>
                <span>최근 {visibleEvents.length.toLocaleString()}건 / 전체 {events.length.toLocaleString()}건</span>
            </div>
            {visibleEvents.map(event => (
                <div key={event.id} className={styles.timelineItem}>
                    <span>{event.title}</span>
                    <small>{event.actorName} · {event.createdAt?.slice(0, 16).replace('T', ' ') || '-'}</small>
                    {event.memo ? <p>{event.memo}</p> : null}
                </div>
            ))}
        </div>
    );
}

function ReportScopedTimeline(props: {
    readonly reportEvents: readonly SupervisionReportEvent[];
    readonly correctiveActions: readonly SupervisionCorrectiveAction[];
    readonly correctiveActionEvents: readonly SupervisionCorrectiveActionEvent[];
}) {
    const actionIds = new Set(props.correctiveActions.map(action => action.id));
    const events = [
        ...props.reportEvents.map(event => ({
            id: `report-${event.id}`,
            title: `보고서 ${event.eventType}`,
            actorName: event.actorName,
            memo: event.memo,
            createdAt: event.createdAt
        })),
        ...props.correctiveActionEvents
            .filter(event => actionIds.has(event.correctiveActionId))
            .map(event => ({
                id: `action-${event.id}`,
                title: `시정요청 ${event.eventType}`,
                actorName: event.actorName,
                memo: event.memo || [event.fromStatus, event.toStatus].filter(Boolean).join(' → '),
                createdAt: event.createdAt
            }))
    ].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    if (events.length === 0) return null;
    return (
        <details className={styles.timelineAccordion}>
            <summary className={styles.timelineSummary}>
                <span className={styles.timelineSummaryTitle}>
                    <ChevronDown className={styles.timelineChevron} size={16} aria-hidden="true" />
                    <strong>이 보고서 처리 이력</strong>
                </span>
                <span>{events.length.toLocaleString()}건</span>
            </summary>
            <div className={styles.timelineContent}>
                {events.map(event => (
                    <div key={event.id} className={styles.timelineItem}>
                        <span>{event.title}</span>
                        <small>{event.actorName} · {event.createdAt?.slice(0, 16).replace('T', ' ') || '-'}</small>
                        {event.memo ? <p>{event.memo}</p> : null}
                    </div>
                ))}
            </div>
        </details>
    );
}

function SelectField(props: {
    readonly label: string;
    readonly value: string;
    readonly children: React.ReactNode;
    readonly onChange: (value: string) => void;
}) {
    return (
        <div className={styles.field}>
            <label>{props.label}</label>
            <select value={props.value} onChange={event => props.onChange(event.currentTarget.value)}>
                {props.children}
            </select>
        </div>
    );
}

function InputField(props: {
    readonly label: string;
    readonly value: string;
    readonly type?: string;
    readonly placeholder?: string;
    readonly onChange: (value: string) => void;
}) {
    return (
        <div className={styles.field}>
            <label>{props.label}</label>
            <input type={props.type || 'text'} value={props.value} placeholder={props.placeholder} onChange={event => props.onChange(event.currentTarget.value)} />
        </div>
    );
}

function TextField(props: {
    readonly label: string;
    readonly value: string;
    readonly placeholder?: string;
    readonly disabled?: boolean;
    readonly onChange: (value: string) => void;
}) {
    return (
        <div className={`${styles.field} ${styles.fieldFull}`}>
            <label>{props.label}</label>
            <textarea value={props.value} placeholder={props.placeholder} disabled={props.disabled} onChange={event => props.onChange(event.currentTarget.value)} />
        </div>
    );
}
