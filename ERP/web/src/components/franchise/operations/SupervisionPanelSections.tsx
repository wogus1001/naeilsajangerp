'use client';

import React from 'react';
import { Check, ClipboardCheck, Printer, Save, Send, X } from 'lucide-react';
import {
    CORRECTIVE_ACTION_STATUSES,
    kstDateKey,
    normalizeItemResult,
    SUPERVISION_ITEM_RESULTS,
    SUPERVISION_VISIT_PURPOSES,
    type SupervisionInspectionItem,
    type SupervisionReportListItem
} from '@/lib/franchise-supervision';
import type {
    SupervisionCorrectiveAction,
    SupervisionPayload,
    SupervisionReport,
    SupervisionVisit
} from './supervisionTypes';
import styles from './SupervisionPanel.module.css';

export type VisitFormState = {
    readonly locationId: string;
    readonly supervisorProfileId: string;
    readonly visitDate: string;
    readonly purpose: string;
    readonly memo: string;
};

export type SupervisionView = 'dashboard' | 'assignments' | 'visits' | 'reports' | 'review';
export type SupervisionFilter = 'all' | 'todayVisits' | 'weekVisits' | 'missingReports' | 'pendingApprovals' | 'activeActions';

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
    readonly onSelect: (view: SupervisionView) => void;
}) {
    return (
        <div className={styles.viewTabs}>
            {VIEW_TABS.map(tab => (
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
    return (
        <div className={styles.layoutSingle}>
            <section className={styles.section}>
                <SectionHeader title="운영 리포트" caption="SV 방문율, 승인 대기, 시정요청 지연을 한 화면에서 확인합니다." />
                <div className={styles.reportGrid}>
                    <div className={styles.reportCard}>
                        <span>SV 배정</span>
                        <strong>{data.assignments.filter(item => item.active).length.toLocaleString()}</strong>
                        <small>활성 배정 기준</small>
                    </div>
                    <div className={styles.reportCard}>
                        <span>방문 일정</span>
                        <strong>{data.visits.length.toLocaleString()}</strong>
                        <small>전체 방문 기록</small>
                    </div>
                    <div className={styles.reportCard}>
                        <span>보고서 승인</span>
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

export function SummaryCards(props: {
    readonly data: SupervisionPayload;
    readonly isLoading: boolean;
    readonly onSelect: (view: SupervisionView, filter: SupervisionFilter) => void;
}) {
    const cards = [
        ['오늘 방문', props.data.summary.todayVisitCount, 'visits', 'todayVisits'],
        ['이번주 예정', props.data.summary.weekVisitCount, 'visits', 'weekVisits'],
        ['미제출 보고서', props.data.summary.missingReportCount, 'reports', 'missingReports'],
        ['승인 대기', props.data.summary.pendingApprovalCount, 'review', 'pendingApprovals'],
        ['시정요청 진행', props.data.summary.activeCorrectiveActionCount, 'review', 'activeActions']
    ] as const;
    return (
        <div className={styles.summaryGrid}>
            {cards.map(([label, value, view, filter]) => (
                <button key={label} type="button" className={styles.summaryCard} onClick={() => props.onSelect(view, filter)}>
                    <span>{label}</span>
                    <strong>{props.isLoading ? '-' : value.toLocaleString()}</strong>
                </button>
            ))}
        </div>
    );
}

export function VisitForm(props: {
    readonly data: SupervisionPayload;
    readonly form: VisitFormState;
    readonly disabled: boolean;
    readonly onChange: (form: VisitFormState) => void;
    readonly onSubmit: () => void;
}) {
    return (
        <div className={styles.formGrid}>
            <SelectField label="운영점" value={props.form.locationId} onChange={(value: string) => props.onChange({ ...props.form, locationId: value })}>
                {props.data.locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}
            </SelectField>
            <SelectField label="SV" value={props.form.supervisorProfileId} onChange={(value: string) => props.onChange({ ...props.form, supervisorProfileId: value })}>
                {props.data.supervisors.map(supervisor => <option key={supervisor.id} value={supervisor.id}>{supervisor.name}</option>)}
            </SelectField>
            <InputField label="방문일" type="date" value={props.form.visitDate} onChange={(value: string) => props.onChange({ ...props.form, visitDate: value })} />
            <SelectField label="방문 목적" value={props.form.purpose} onChange={(value: string) => props.onChange({ ...props.form, purpose: value })}>
                {SUPERVISION_VISIT_PURPOSES.map(purpose => <option key={purpose} value={purpose}>{purpose}</option>)}
            </SelectField>
            <TextField label="방문 메모" value={props.form.memo} placeholder="점검 목적, 사전 요청사항" onChange={(value: string) => props.onChange({ ...props.form, memo: value })} />
            <div className={styles.buttonRow}>
                <button type="button" className={styles.primaryButton} disabled={props.disabled} onClick={props.onSubmit}>
                    <ClipboardCheck size={13} /> 방문 등록
                </button>
            </div>
        </div>
    );
}

export function VisitList(props: {
    readonly visits: readonly SupervisionVisit[];
    readonly selectedId: string;
    readonly onSelect: (id: string) => void;
}) {
    if (props.visits.length === 0) return <div className={styles.empty}>방문 일정이 없습니다.</div>;
    return (
        <div className={styles.list}>
            {props.visits.slice(0, 6).map(visit => (
                <button
                    key={visit.id}
                    type="button"
                    className={styles.listItem}
                    onClick={() => props.onSelect(visit.id)}
                >
                    <strong>{visit.visitDate || '-'} · {visit.locationName}</strong>
                    <div className={styles.badgeRow}>
                        <span className={props.selectedId === visit.id ? styles.badgeBlue : styles.badge}>{visit.status}</span>
                        <span className={styles.badge}>{visit.purpose}</span>
                        <span className={styles.badgeGreen}>{visit.supervisorName}</span>
                    </div>
                    {visit.memo ? <span>{visit.memo}</span> : null}
                </button>
            ))}
        </div>
    );
}

export function ReportEditor(props: {
    readonly canManage: boolean;
    readonly disabled: boolean;
    readonly inspectionItems: readonly SupervisionInspectionItem[];
    readonly photoCount: number;
    readonly report: SupervisionReport | null;
    readonly selectedVisit: SupervisionVisit | null;
    readonly specialNote: string;
    readonly templateName: string;
    readonly onFiles: (files: readonly File[]) => void;
    readonly onItemChange: (items: readonly SupervisionInspectionItem[]) => void;
    readonly onPrint: () => void;
    readonly onSave: () => void;
    readonly onSaveTemplate: () => void;
    readonly onSubmit: () => void;
    readonly onSpecialNote: (value: string) => void;
    readonly onTemplateName: (value: string) => void;
}) {
    if (!props.selectedVisit) return <div className={styles.empty}>보고서를 작성할 방문 일정을 선택해주세요.</div>;
    const canSubmit = props.report?.status !== '승인';
    return (
        <div className={styles.itemGrid}>
            {props.canManage ? (
                <div className={`${styles.field} ${styles.fieldFull}`}>
                    <label>회사 점검 템플릿</label>
                    <div className={styles.inlineControls}>
                        <input
                            type="text"
                            value={props.templateName}
                            placeholder="예: 정기 방문 점검 템플릿"
                            onChange={event => props.onTemplateName(event.currentTarget.value)}
                        />
                        <button type="button" className={styles.secondaryButton} disabled={props.disabled} onClick={props.onSaveTemplate}>
                            <Save size={13} /> 템플릿 저장
                        </button>
                    </div>
                </div>
            ) : null}
            {props.inspectionItems.map(item => (
                <div key={item.id} className={styles.itemRow}>
                    <strong>{item.label}</strong>
                    <select
                        value={item.result}
                        onChange={event => props.onItemChange(props.inspectionItems.map(next => (
                            next.id === item.id ? { ...next, result: normalizeItemResult(event.currentTarget.value) } : next
                        )))}
                    >
                        {SUPERVISION_ITEM_RESULTS.map(result => <option key={result} value={result}>{result}</option>)}
                    </select>
                    <textarea
                        value={item.memo}
                        placeholder="점검 메모"
                        onChange={event => props.onItemChange(props.inspectionItems.map(next => (
                            next.id === item.id ? { ...next, memo: event.currentTarget.value } : next
                        )))}
                    />
                </div>
            ))}
            <TextField label="특이사항" value={props.specialNote} placeholder="본사 지원 필요사항, 현장 이슈" onChange={props.onSpecialNote} />
            <div className={styles.field}>
                <label>사진 첨부</label>
                <input type="file" multiple accept="image/*" onChange={event => props.onFiles(Array.from(event.currentTarget.files || []))} />
                <small>선택 {props.photoCount.toLocaleString()}개 · 저장된 사진 {props.report?.photoAttachments.length.toLocaleString() || 0}개</small>
            </div>
            <div className={styles.buttonRow}>
                <button type="button" className={styles.secondaryButton} disabled={props.disabled || !canSubmit} onClick={props.onSave}>
                    <Save size={13} /> 임시저장
                </button>
                <button type="button" className={styles.primaryButton} disabled={props.disabled || !canSubmit} onClick={props.onSubmit}>
                    <Send size={13} /> 제출
                </button>
                <button type="button" className={styles.secondaryButton} disabled={props.disabled} onClick={props.onPrint}>
                    <Printer size={13} /> PDF/인쇄
                </button>
                {props.canManage && props.report?.status === '제출' ? <span className={styles.badgeBlue}>승인 대기</span> : null}
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
    readonly onApprove: (report: SupervisionReport) => void;
    readonly onReject: (report: SupervisionReport, rejectReason: string) => void;
}) {
    const reports = props.reports;
    const [rejectReasons, setRejectReasons] = React.useState<Record<string, string>>({});
    if (reports.length === 0) return <div className={styles.empty}>최근 점검 보고서가 없습니다.</div>;
    return (
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
                    {reports.map(report => {
                        const rowRejectReason = rejectReasons[report.id] ?? (props.rejectReason && reports.length === 1 ? props.rejectReason : '');
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
                                            onChange={event => {
                                                const nextReason = event.currentTarget.value;
                                                setRejectReasons(current => ({ ...current, [report.id]: nextReason }));
                                                if (reports.length === 1) props.onRejectReason(nextReason);
                                            }}
                                        />
                                    ) : (
                                        <span className={styles.mutedText}>{report.rejectReason || '-'}</span>
                                    )}
                                </td>
                                <td>
                                    {props.canManage && report.status === '제출' ? (
                                        <div className={styles.actionCell}>
                                            <button type="button" className={styles.secondaryButton} disabled={props.disabled} onClick={() => props.onApprove(report)}>
                                                <Check size={13} /> 승인
                                            </button>
                                            <button type="button" className={styles.dangerButton} disabled={props.disabled} onClick={() => props.onReject(report, rowRejectReason)}>
                                                <X size={13} /> 반려
                                            </button>
                                        </div>
                                    ) : (
                                        <span className={styles.mutedText}>-</span>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
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
        .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
        .slice(0, 10);
    if (events.length === 0) return <div className={styles.empty}>제출/승인/시정요청 처리 이력이 없습니다.</div>;
    return (
        <div className={styles.timeline}>
            <strong>처리 이력</strong>
            {events.map(event => (
                <div key={event.id} className={styles.timelineItem}>
                    <span>{event.title}</span>
                    <small>{event.actorName} · {event.createdAt?.slice(0, 16).replace('T', ' ') || '-'}</small>
                    {event.memo ? <p>{event.memo}</p> : null}
                </div>
            ))}
        </div>
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
    readonly onChange: (value: string) => void;
}) {
    return (
        <div className={`${styles.field} ${styles.fieldFull}`}>
            <label>{props.label}</label>
            <textarea value={props.value} placeholder={props.placeholder} onChange={event => props.onChange(event.currentTarget.value)} />
        </div>
    );
}
