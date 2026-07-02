'use client';

import React from 'react';
import { Check, ClipboardCheck, Save, Send, X } from 'lucide-react';
import {
    buildDefaultInspectionItems,
    CORRECTIVE_ACTION_STATUSES,
    normalizeItemResult,
    SUPERVISION_ITEM_RESULTS,
    SUPERVISION_VISIT_PURPOSES,
    type SupervisionInspectionItem
} from '@/lib/franchise-supervision';
import {
    fetchSupervisionData,
    saveSupervisionAssignment,
    saveSupervisionReport,
    saveSupervisionVisit,
    updateCorrectiveAction
} from './supervisionRequests';
import type {
    SupervisionCorrectiveAction,
    SupervisionPayload,
    SupervisionReport,
    SupervisionScope,
    SupervisionVisit
} from './supervisionTypes';
import styles from './SupervisionPanel.module.css';

type FormState = {
    readonly locationId: string;
    readonly supervisorProfileId: string;
    readonly assignedAt: string;
    readonly regionScope: string;
    readonly memo: string;
};

type VisitFormState = {
    readonly locationId: string;
    readonly supervisorProfileId: string;
    readonly visitDate: string;
    readonly purpose: string;
    readonly memo: string;
};

const EMPTY_PAYLOAD: SupervisionPayload = {
    schemaReady: true,
    canManage: false,
    companyId: '',
    locations: [],
    supervisors: [],
    assignments: [],
    visits: [],
    reports: [],
    correctiveActions: [],
    summary: {
        todayVisitCount: 0,
        weekVisitCount: 0,
        missingReportCount: 0,
        pendingApprovalCount: 0,
        activeCorrectiveActionCount: 0
    }
};

function todayText(): string {
    return new Date().toISOString().slice(0, 10);
}

function makeAssignmentForm(data: SupervisionPayload): FormState {
    return {
        locationId: data.locations[0]?.id || '',
        supervisorProfileId: data.supervisors[0]?.id || '',
        assignedAt: todayText(),
        regionScope: '',
        memo: ''
    };
}

function makeVisitForm(data: SupervisionPayload): VisitFormState {
    const assignment = data.assignments.find(item => item.active);
    return {
        locationId: assignment?.locationId || data.locations[0]?.id || '',
        supervisorProfileId: assignment?.supervisorProfileId || data.supervisors[0]?.id || '',
        visitDate: todayText(),
        purpose: SUPERVISION_VISIT_PURPOSES[0],
        memo: ''
    };
}

export function SupervisionPanel({ userId, companyName }: SupervisionScope) {
    const [data, setData] = React.useState<SupervisionPayload>(EMPTY_PAYLOAD);
    const [assignmentForm, setAssignmentForm] = React.useState<FormState>(makeAssignmentForm(EMPTY_PAYLOAD));
    const [visitForm, setVisitForm] = React.useState<VisitFormState>(makeVisitForm(EMPTY_PAYLOAD));
    const [selectedVisitId, setSelectedVisitId] = React.useState('');
    const [inspectionItems, setInspectionItems] = React.useState<readonly SupervisionInspectionItem[]>(buildDefaultInspectionItems());
    const [specialNote, setSpecialNote] = React.useState('');
    const [rejectReason, setRejectReason] = React.useState('');
    const [photoFiles, setPhotoFiles] = React.useState<readonly File[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSaving, setIsSaving] = React.useState(false);
    const scope = React.useMemo(() => ({ userId, companyName }), [companyName, userId]);

    const load = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const nextData = await fetchSupervisionData(scope);
            setData(nextData);
            setAssignmentForm(makeAssignmentForm(nextData));
            setVisitForm(makeVisitForm(nextData));
            setSelectedVisitId(current => current || nextData.visits[0]?.id || '');
        } catch (error) {
            window.alert(error instanceof Error ? error.message : '슈퍼바이징 정보를 불러오지 못했습니다.');
        } finally {
            setIsLoading(false);
        }
    }, [scope]);

    React.useEffect(() => {
        void load();
    }, [load]);

    const selectedVisit = data.visits.find(visit => visit.id === selectedVisitId) || data.visits[0] || null;
    const selectedReport = selectedVisit ? data.reports.find(report => report.visitId === selectedVisit.id) || null : null;

    React.useEffect(() => {
        if (!selectedReport) {
            setInspectionItems(buildDefaultInspectionItems());
            setSpecialNote('');
            setRejectReason('');
            return;
        }
        setInspectionItems(selectedReport.inspectionItems);
        setSpecialNote(selectedReport.specialNote);
        setRejectReason(selectedReport.rejectReason);
    }, [selectedReport]);

    const submitAssignment = async () => {
        if (!data.companyId || !assignmentForm.locationId || !assignmentForm.supervisorProfileId) return;
        await runSaving(() => saveSupervisionAssignment({ ...scope, companyId: data.companyId, ...assignmentForm }));
    };

    const submitVisit = async () => {
        if (!data.companyId || !visitForm.locationId || !visitForm.supervisorProfileId || !visitForm.visitDate) return;
        await runSaving(() => saveSupervisionVisit({ ...scope, companyId: data.companyId, ...visitForm }));
    };

    const submitReport = async (event: 'saveDraft' | 'submit' | 'approve' | 'reject', report?: SupervisionReport) => {
        const targetReport = report || selectedReport;
        const targetVisit = report ? data.visits.find(visit => visit.id === report.visitId) || selectedVisit : selectedVisit;
        if (!data.companyId || !targetVisit) return;
        await runSaving(() => saveSupervisionReport({
            ...scope,
            companyId: data.companyId,
            reportId: targetReport?.id,
            visitId: targetVisit.id,
            event,
            inspectionItems: targetReport && report ? targetReport.inspectionItems : inspectionItems,
            specialNote: targetReport && report ? targetReport.specialNote : specialNote,
            rejectReason,
            photoFiles: report ? [] : photoFiles,
            existingAttachments: targetReport?.photoAttachments || []
        }));
        setPhotoFiles([]);
    };

    const changeActionStatus = async (action: SupervisionCorrectiveAction, status: string) => {
        if (!data.companyId) return;
        await runSaving(() => updateCorrectiveAction({ ...scope, companyId: data.companyId, id: action.id, status, memo: action.memo }));
    };

    const runSaving = async (task: () => Promise<void>) => {
        setIsSaving(true);
        try {
            await task();
            await load();
        } catch (error) {
            window.alert(error instanceof Error ? error.message : '슈퍼바이징 정보를 저장하지 못했습니다.');
        } finally {
            setIsSaving(false);
        }
    };

    if (!data.schemaReady) {
        return (
            <div className={styles.notice}>
                슈퍼바이징 데이터베이스가 아직 적용되지 않았습니다. `supabase_franchise_supervision_migration.sql` 등록 후 사용할 수 있습니다.
            </div>
        );
    }

    return (
        <div className={styles.panel}>
            <SummaryCards data={data} isLoading={isLoading} />
            <div className={styles.layout}>
                <section className={styles.section}>
                    <SectionHeader title="SV 배정" caption="운영점별 활성 SV 1명을 기준으로 관리합니다." />
                    <div className={styles.body}>
                        {data.canManage ? (
                            <AssignmentForm
                                data={data}
                                form={assignmentForm}
                                disabled={isSaving}
                                onChange={setAssignmentForm}
                                onSubmit={submitAssignment}
                            />
                        ) : null}
                        <AssignmentList data={data} />
                    </div>
                </section>

                <section className={styles.section}>
                    <SectionHeader title="방문 점검" caption="방문 일정을 만들고 점검 보고서를 이어서 작성합니다." />
                    <div className={styles.body}>
                        <VisitForm data={data} form={visitForm} disabled={isSaving} onChange={setVisitForm} onSubmit={submitVisit} />
                        <VisitList visits={data.visits} selectedId={selectedVisit?.id || ''} onSelect={setSelectedVisitId} />
                        <ReportEditor
                            canManage={data.canManage}
                            disabled={isSaving}
                            inspectionItems={inspectionItems}
                            photoCount={photoFiles.length}
                            report={selectedReport}
                            selectedVisit={selectedVisit}
                            specialNote={specialNote}
                            onFiles={setPhotoFiles}
                            onItemChange={setInspectionItems}
                            onSave={() => void submitReport('saveDraft')}
                            onSubmit={() => void submitReport('submit')}
                            onSpecialNote={setSpecialNote}
                        />
                    </div>
                </section>

                <section className={styles.section}>
                    <SectionHeader title="승인/시정요청" caption="제출 보고서 승인과 개선 항목 후속 처리를 봅니다." />
                    <div className={styles.body}>
                        <ReportReviewList
                            canManage={data.canManage}
                            disabled={isSaving}
                            reports={data.reports}
                            rejectReason={rejectReason}
                            onRejectReason={setRejectReason}
                            onApprove={report => void submitReport('approve', report)}
                            onReject={report => void submitReport('reject', report)}
                        />
                        <CorrectiveActionList actions={data.correctiveActions} disabled={isSaving} onStatusChange={changeActionStatus} />
                    </div>
                </section>
            </div>
        </div>
    );
}

function SectionHeader({ title, caption }: { readonly title: string; readonly caption: string }) {
    return (
        <div className={styles.sectionHeader}>
            <div>
                <h3>{title}</h3>
                <p>{caption}</p>
            </div>
        </div>
    );
}

function SummaryCards({ data, isLoading }: { readonly data: SupervisionPayload; readonly isLoading: boolean }) {
    const cards = [
        ['오늘 방문', data.summary.todayVisitCount],
        ['이번주 예정', data.summary.weekVisitCount],
        ['미제출 보고서', data.summary.missingReportCount],
        ['승인 대기', data.summary.pendingApprovalCount],
        ['시정요청 진행', data.summary.activeCorrectiveActionCount]
    ] as const;
    return (
        <div className={styles.summaryGrid}>
            {cards.map(([label, value]) => (
                <div key={label} className={styles.summaryCard}>
                    <span>{label}</span>
                    <strong>{isLoading ? '-' : value.toLocaleString()}</strong>
                </div>
            ))}
        </div>
    );
}

function AssignmentForm(props: {
    readonly data: SupervisionPayload;
    readonly form: FormState;
    readonly disabled: boolean;
    readonly onChange: (form: FormState) => void;
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
            <InputField label="담당 시작일" type="date" value={props.form.assignedAt} onChange={(value: string) => props.onChange({ ...props.form, assignedAt: value })} />
            <InputField label="담당 지역" value={props.form.regionScope} placeholder="예: 경기 남부" onChange={(value: string) => props.onChange({ ...props.form, regionScope: value })} />
            <TextField label="담당 메모" value={props.form.memo} placeholder="권한, 인수인계 메모" onChange={(value: string) => props.onChange({ ...props.form, memo: value })} />
            <div className={styles.buttonRow}>
                <button type="button" className={styles.primaryButton} disabled={props.disabled} onClick={props.onSubmit}>
                    <Save size={13} /> 배정 저장
                </button>
            </div>
        </div>
    );
}

function AssignmentList({ data }: { readonly data: SupervisionPayload }) {
    if (data.assignments.length === 0) return <div className={styles.empty}>등록된 SV 배정이 없습니다.</div>;
    return (
        <div className={styles.list}>
            {data.assignments.slice(0, 8).map(assignment => (
                <div key={assignment.id} className={styles.listItem}>
                    <strong>{assignment.locationName}</strong>
                    <div className={styles.badgeRow}>
                        <span className={assignment.active ? styles.badgeGreen : styles.badge}>{assignment.active ? '활성' : '해제'}</span>
                        <span className={styles.badgeBlue}>{assignment.supervisorName}</span>
                    </div>
                    <small>{assignment.regionScope || '담당 지역 미지정'} · {assignment.assignedAt || '-'}</small>
                    {assignment.memo ? <span>{assignment.memo}</span> : null}
                </div>
            ))}
        </div>
    );
}

function VisitForm(props: {
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

function VisitList(props: {
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

function ReportEditor(props: {
    readonly canManage: boolean;
    readonly disabled: boolean;
    readonly inspectionItems: readonly SupervisionInspectionItem[];
    readonly photoCount: number;
    readonly report: SupervisionReport | null;
    readonly selectedVisit: SupervisionVisit | null;
    readonly specialNote: string;
    readonly onFiles: (files: readonly File[]) => void;
    readonly onItemChange: (items: readonly SupervisionInspectionItem[]) => void;
    readonly onSave: () => void;
    readonly onSubmit: () => void;
    readonly onSpecialNote: (value: string) => void;
}) {
    if (!props.selectedVisit) return <div className={styles.empty}>보고서를 작성할 방문 일정을 선택해주세요.</div>;
    const canSubmit = props.report?.status !== '승인';
    return (
        <div className={styles.itemGrid}>
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
                {props.canManage && props.report?.status === '제출' ? <span className={styles.badgeBlue}>승인 대기</span> : null}
            </div>
        </div>
    );
}

function ReportReviewList(props: {
    readonly canManage: boolean;
    readonly disabled: boolean;
    readonly reports: readonly SupervisionReport[];
    readonly rejectReason: string;
    readonly onRejectReason: (value: string) => void;
    readonly onApprove: (report: SupervisionReport) => void;
    readonly onReject: (report: SupervisionReport) => void;
}) {
    const reports = props.reports.slice(0, 6);
    if (reports.length === 0) return <div className={styles.empty}>최근 점검 보고서가 없습니다.</div>;
    return (
        <div className={styles.list}>
            {reports.map(report => (
                <div key={report.id} className={styles.listItem}>
                    <strong>{report.locationName}</strong>
                    <div className={styles.badgeRow}>
                        <span className={report.status === '반려' ? styles.badgeRed : report.status === '승인' ? styles.badgeGreen : styles.badgeBlue}>{report.status}</span>
                        <span className={styles.badge}>{report.supervisorName}</span>
                    </div>
                    <small>{report.updatedAt?.slice(0, 10) || '-'}</small>
                    {props.canManage && report.status === '제출' ? (
                        <>
                            <TextField label="반려 사유" value={props.rejectReason} placeholder="반려 시 입력" onChange={props.onRejectReason} />
                            <div className={styles.buttonRow}>
                                <button type="button" className={styles.secondaryButton} disabled={props.disabled} onClick={() => props.onApprove(report)}>
                                    <Check size={13} /> 승인
                                </button>
                                <button type="button" className={styles.dangerButton} disabled={props.disabled} onClick={() => props.onReject(report)}>
                                    <X size={13} /> 반려
                                </button>
                            </div>
                        </>
                    ) : null}
                </div>
            ))}
        </div>
    );
}

function CorrectiveActionList(props: {
    readonly actions: readonly SupervisionCorrectiveAction[];
    readonly disabled: boolean;
    readonly onStatusChange: (action: SupervisionCorrectiveAction, status: string) => void;
}) {
    if (props.actions.length === 0) return <div className={styles.empty}>진행 중인 시정요청이 없습니다.</div>;
    return (
        <div className={styles.list}>
            {props.actions.slice(0, 8).map(action => (
                <div key={action.id} className={styles.listItem}>
                    <strong>{action.title}</strong>
                    <small>{action.locationName} · 담당 {action.assigneeName} · 기한 {action.dueDate || '-'}</small>
                    <select
                        value={action.status}
                        disabled={props.disabled}
                        onChange={event => props.onStatusChange(action, event.currentTarget.value)}
                    >
                        {CORRECTIVE_ACTION_STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
                    </select>
                    {action.memo ? <span>{action.memo}</span> : null}
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
