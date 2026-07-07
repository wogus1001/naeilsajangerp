'use client';

import React from 'react';
import {
    buildDefaultInspectionItems,
    buildDefaultReportTemplate,
    buildSupervisionReportListItems,
    isMissingSupervisionReportItem,
    kstDateKey,
    SUPERVISION_VISIT_PURPOSES,
    type SupervisionReportListItem,
    type SupervisionInspectionItem
} from '@/lib/franchise-supervision';
import { applySupervisionReportAiSummary, type SupervisionReportAiSummary } from '@/lib/franchise-supervision-ai-summary';
import type { SupervisionOperationQueueItem } from '@/lib/franchise-supervision-operation-queue';
import {
    deleteSupervisionVisit,
    fetchSupervisionData,
    saveSupervisionAssignment,
    saveSupervisionReport,
    saveSupervisionTemplate,
    saveSupervisionVisit,
    updateCorrectiveAction
} from './supervisionRequests';
import type {
    SupervisionAssignment,
    SupervisionCorrectiveAction,
    SupervisionPayload,
    SupervisionReport,
    SupervisionScope,
    SupervisionVisit
} from './supervisionTypes';
import { printSupervisionReport } from './SupervisionPanelPrint';
import {
    CorrectiveActionList,
    DashboardOverview,
    ReportEditor,
    ReportList,
    ReportReviewList,
    SectionHeader,
    ViewTabs,
    VisitForm,
    VisitList,
    type SupervisionFilter,
    type SupervisionView,
    type SupervisionReportMode,
    type VisitFormState
} from './SupervisionPanelSections';
import {
    SupervisionAssignmentSection
} from './SupervisionAssignmentSection';
import type { AssignmentFormState } from './SupervisionAssignmentTypes';
import { SupervisionOperationQueue } from './SupervisionOperationQueue';
import styles from './SupervisionPanel.module.css';

const EMPTY_PAYLOAD: SupervisionPayload = {
    schemaReady: true,
    canManage: false,
    companyId: '',
    locations: [],
    supervisors: [],
    assignments: [],
    visits: [],
    reports: [],
    reportTemplates: [],
    reportEvents: [],
    correctiveActions: [],
    correctiveActionEvents: [],
    operationQueue: [],
    summary: {
        todayVisitCount: 0,
        weekVisitCount: 0,
        missingReportCount: 0,
        pendingApprovalCount: 0,
        activeCorrectiveActionCount: 0
    }
};

function todayText(): string {
    return kstDateKey();
}

function makeAssignmentForm(data: SupervisionPayload): AssignmentFormState {
    return {
        locationId: data.locations[0]?.id || '',
        supervisorProfileId: data.supervisors[0]?.id || '',
        assignedAt: todayText(),
        memo: ''
    };
}

function makeVisitForm(data: SupervisionPayload): VisitFormState {
    const assignment = data.assignments.find(item => item.active);
    return {
        assignmentId: assignment?.id || '',
        locationId: assignment?.locationId || data.locations[0]?.id || '',
        supervisorProfileId: assignment?.supervisorProfileId || data.supervisors[0]?.id || '',
        visitDate: todayText(),
        purpose: SUPERVISION_VISIT_PURPOSES[0],
        memo: ''
    };
}

function isVisitInCurrentWeek(visit: SupervisionVisit): boolean {
    if (!visit.visitDate) return false;
    const today = new Date(`${todayText()}T00:00:00+09:00`);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const visitDate = new Date(`${visit.visitDate}T00:00:00+09:00`);
    return visitDate >= today && visitDate < weekEnd && visit.status !== '취소';
}

function filterVisits(visits: readonly SupervisionVisit[], filter: SupervisionFilter): readonly SupervisionVisit[] {
    if (filter === 'todayVisits') return visits.filter(visit => visit.visitDate === todayText() && visit.status !== '취소');
    if (filter === 'weekVisits') return visits.filter(isVisitInCurrentWeek);
    if (filter === 'missingReports') return visits.filter(visit => visit.status === '보고서대기');
    return visits;
}

function findVisitAssignment(data: SupervisionPayload, form: VisitFormState): SupervisionAssignment | null {
    return data.assignments.find(item => (
        item.active
        && item.locationId === form.locationId
        && item.supervisorProfileId === form.supervisorProfileId
    )) || null;
}

function filterReportItems(items: readonly SupervisionReportListItem[], filter: SupervisionFilter): readonly SupervisionReportListItem[] {
    if (filter === 'missingReports') return items.filter(item => isMissingSupervisionReportItem(item));
    if (filter === 'pendingApprovals') return items.filter(item => item.reportStatus === '제출');
    if (filter === 'todayVisits') return items.filter(item => item.visitDate === todayText());
    if (filter === 'weekVisits') {
        const visitIds = new Set(filterVisits(items.map(item => ({
            id: item.visitId,
            companyId: '',
            locationId: '',
            locationName: item.locationName,
            supervisorProfileId: '',
            supervisorName: item.supervisorName,
            assignmentId: null,
            scheduleId: null,
            visitDate: item.visitDate,
            purpose: item.purpose,
            status: item.visitStatus,
            memo: ''
        })), 'weekVisits').map(visit => visit.id));
        return items.filter(item => visitIds.has(item.visitId));
    }
    return items;
}

const QUEUE_FILTER_BY_TYPE: Record<SupervisionOperationQueueItem['type'], SupervisionFilter> = {
    visitToday: 'todayVisits',
    visitTomorrow: 'weekVisits',
    reportMissing: 'missingReports',
    approvalPending: 'pendingApprovals',
    actionOverdue: 'activeActions'
} as const;

export function SupervisionPanel({ userId, companyName }: SupervisionScope) {
    const [data, setData] = React.useState<SupervisionPayload>(EMPTY_PAYLOAD);
    const [activeView, setActiveView] = React.useState<SupervisionView>('dashboard');
    const [activeFilter, setActiveFilter] = React.useState<SupervisionFilter>('all');
    const [assignmentForm, setAssignmentForm] = React.useState<AssignmentFormState>(makeAssignmentForm(EMPTY_PAYLOAD));
    const [selectedAssignmentId, setSelectedAssignmentId] = React.useState('');
    const [selectedAssignmentLocationId, setSelectedAssignmentLocationId] = React.useState('');
    const [visitForm, setVisitForm] = React.useState<VisitFormState>(makeVisitForm(EMPTY_PAYLOAD));
    const [selectedVisitId, setSelectedVisitId] = React.useState('');
    const [editingVisitId, setEditingVisitId] = React.useState('');
    const [visitEditorOpen, setVisitEditorOpen] = React.useState(false);
    const [reportMode, setReportMode] = React.useState<SupervisionReportMode>('list');
    const [inspectionItems, setInspectionItems] = React.useState<readonly SupervisionInspectionItem[]>(buildDefaultInspectionItems());
    const [templateName, setTemplateName] = React.useState('현장 점검 템플릿');
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

    React.useEffect(() => {
        if (!data.canManage && activeView === 'assignments') {
            setActiveView('dashboard');
        }
    }, [activeView, data.canManage]);

    const visibleVisits = React.useMemo(() => filterVisits(data.visits, activeFilter), [activeFilter, data.visits]);
    const reportListItems = React.useMemo(
        () => buildSupervisionReportListItems({ visits: data.visits, reports: data.reports }),
        [data.reports, data.visits]
    );
    const selectedVisit = data.visits.find(visit => visit.id === selectedVisitId) || data.visits[0] || null;
    const selectedReportId = selectedVisit ? reportListItems.find(item => item.visitId === selectedVisit.id)?.reportId || '' : '';
    const selectedReport = selectedReportId ? data.reports.find(report => report.id === selectedReportId) || null : null;
    const selectedReportEvents = React.useMemo(
        () => selectedReport ? data.reportEvents.filter(event => event.reportId === selectedReport.id) : [],
        [data.reportEvents, selectedReport]
    );
    const selectedReportActions = React.useMemo(
        () => selectedReport ? data.correctiveActions.filter(action => action.reportId === selectedReport.id) : [],
        [data.correctiveActions, selectedReport]
    );
    const selectedReportActionEvents = React.useMemo(() => {
        const actionIds = new Set(selectedReportActions.map(action => action.id));
        return data.correctiveActionEvents.filter(event => actionIds.has(event.correctiveActionId));
    }, [data.correctiveActionEvents, selectedReportActions]);
    const visibleReportItems = React.useMemo(
        () => filterReportItems(reportListItems, activeFilter),
        [activeFilter, reportListItems]
    );
    const visibleReports = React.useMemo(
        () => activeFilter === 'pendingApprovals' ? data.reports.filter(report => report.status === '제출') : data.reports,
        [activeFilter, data.reports]
    );
    const visibleActions = React.useMemo(
        () => activeFilter === 'activeActions'
            ? data.correctiveActions.filter(action => action.status === '요청' || action.status === '진행중')
            : data.correctiveActions,
        [activeFilter, data.correctiveActions]
    );
    const activeTemplate = React.useMemo(
        () => data.reportTemplates.find(template => template.active) || data.reportTemplates[0] || buildDefaultReportTemplate(),
        [data.reportTemplates]
    );

    React.useEffect(() => {
        setTemplateName(activeTemplate.name);
        if (!selectedReport) {
            setInspectionItems(activeTemplate.inspectionItems.map(item => ({ ...item, result: '양호', memo: '' })));
            setSpecialNote('');
            setRejectReason('');
            return;
        }
        setInspectionItems(selectedReport.inspectionItems);
        setSpecialNote(selectedReport.specialNote);
        setRejectReason(selectedReport.rejectReason);
    }, [activeTemplate, selectedReport]);

    const submitAssignment = async () => {
        if (!data.companyId || !assignmentForm.locationId || !assignmentForm.supervisorProfileId) return;
        const saved = await runSaving(() => saveSupervisionAssignment({
            ...scope,
            companyId: data.companyId,
            id: selectedAssignmentId || undefined,
            ...assignmentForm
        }));
        if (saved) {
            setSelectedAssignmentId('');
            setSelectedAssignmentLocationId('');
        }
    };

    const submitVisit = async () => {
        if (!data.companyId || !visitForm.locationId || !visitForm.supervisorProfileId || !visitForm.visitDate) return;
        const assignment = findVisitAssignment(data, visitForm);
        const { assignmentId: visitAssignmentId, ...visitFields } = visitForm;
        const saved = await runSaving(() => saveSupervisionVisit({
            ...scope,
            companyId: data.companyId,
            id: editingVisitId || undefined,
            ...visitFields,
            assignmentId: assignment?.id || visitAssignmentId || undefined
        }));
        if (saved) {
            setEditingVisitId('');
            setVisitForm(makeVisitForm(data));
            setVisitEditorOpen(false);
        }
    };

    const editVisit = (visit: SupervisionVisit) => {
        setSelectedVisitId(visit.id);
        setEditingVisitId(visit.id);
        setVisitEditorOpen(true);
        setVisitForm({
            assignmentId: visit.assignmentId || '',
            locationId: visit.locationId,
            supervisorProfileId: visit.supervisorProfileId,
            visitDate: visit.visitDate || todayText(),
            purpose: visit.purpose,
            memo: visit.memo
        });
    };

    const openNewVisitForm = () => {
        setEditingVisitId('');
        setVisitForm(makeVisitForm(data));
        setVisitEditorOpen(true);
    };

    const resetVisitForm = () => {
        setEditingVisitId('');
        setVisitForm(makeVisitForm(data));
        setVisitEditorOpen(false);
    };

    const deleteVisit = async (visit: SupervisionVisit) => {
        if (!data.companyId) return;
        const confirmed = window.confirm(`${visit.locationName} 방문 일정을 삭제할까요? 삭제한 일정은 취소 상태로 보관됩니다.`);
        if (!confirmed) return;
        await runSaving(() => deleteSupervisionVisit({
            ...scope,
            companyId: data.companyId,
            id: visit.id
        }));
    };

    const submitReport = async (event: 'saveDraft' | 'submit' | 'approve' | 'reject', report?: SupervisionReport, rejectReasonOverride?: string) => {
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
            templateId: targetReport?.templateId || (activeTemplate.id === 'default' ? undefined : activeTemplate.id),
            specialNote: targetReport && report ? targetReport.specialNote : specialNote,
            rejectReason: rejectReasonOverride ?? rejectReason,
            photoFiles: report ? [] : photoFiles,
            existingAttachments: targetReport?.photoAttachments || []
        }));
        setPhotoFiles([]);
    };

    const submitTemplate = async () => {
        if (!data.companyId || !data.canManage) return;
        await runSaving(() => saveSupervisionTemplate({
            ...scope,
            companyId: data.companyId,
            name: templateName || '현장 점검 템플릿',
            description: '회사 공용 슈퍼바이징 점검 항목',
            inspectionItems: inspectionItems.map(item => ({ id: item.id, label: item.label }))
        }));
    };

    const applyReportAiSummary = (summary: SupervisionReportAiSummary) => {
        const applied = applySupervisionReportAiSummary({ inspectionItems, specialNote, summary });
        setInspectionItems(applied.inspectionItems);
        setSpecialNote(applied.specialNote);
    };

    const changeActionStatus = async (action: SupervisionCorrectiveAction, status: string) => {
        if (!data.companyId) return;
        await runSaving(() => updateCorrectiveAction({ ...scope, companyId: data.companyId, id: action.id, status, memo: action.memo }));
    };

    const openReportForReview = (report: SupervisionReport) => {
        if (report.visitId) {
            setSelectedVisitId(report.visitId);
        }
        setActiveFilter('all');
        setActiveView('reports');
        setReportMode('editor');
    };

    const openQueueItem = (item: SupervisionOperationQueueItem) => {
        setActiveView(item.target);
        setActiveFilter(QUEUE_FILTER_BY_TYPE[item.type]);
        if (item.type === 'approvalPending') {
            const report = data.reports.find(candidate => candidate.id === item.sourceId);
            if (report?.visitId) setSelectedVisitId(report.visitId);
            return;
        }
        if (item.type === 'actionOverdue') return;
        setSelectedVisitId(item.sourceId);
    };

    const editAssignment = (assignment: SupervisionAssignment) => {
        setSelectedAssignmentId(assignment.id);
        setSelectedAssignmentLocationId(assignment.locationId);
        setAssignmentForm({
            locationId: assignment.locationId,
            supervisorProfileId: assignment.supervisorProfileId,
            assignedAt: assignment.assignedAt || todayText(),
            memo: assignment.memo
        });
    };

    const prepareLocationAssignment = (locationId: string) => {
        setSelectedAssignmentId('');
        setSelectedAssignmentLocationId(locationId);
        setAssignmentForm({
            ...makeAssignmentForm(data),
            locationId
        });
    };

    const resetAssignmentForm = () => {
        setSelectedAssignmentId('');
        setSelectedAssignmentLocationId('');
        setAssignmentForm(makeAssignmentForm(data));
    };

    const runSaving = async (task: () => Promise<void>): Promise<boolean> => {
        setIsSaving(true);
        try {
            await task();
            await load();
            return true;
        } catch (error) {
            window.alert(error instanceof Error ? error.message : '슈퍼바이징 정보를 저장하지 못했습니다.');
            return false;
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
            <ViewTabs
                activeView={activeView}
                canManage={data.canManage}
                onSelect={view => {
                    setActiveView(view);
                    setActiveFilter('all');
                }}
            />
            {activeView === 'dashboard' ? (
                <>
                    <DashboardOverview data={data} />
                    <SupervisionOperationQueue items={data.operationQueue} onOpen={openQueueItem} />
                </>
            ) : null}
            {activeView === 'assignments' && data.canManage ? (
                <div className={styles.layoutSingle}>
                    <section className={styles.section}>
                        <SectionHeader title="SV 배정" caption="운영점별 활성 SV 1명을 기준으로 관리합니다." />
                        <div className={styles.body}>
                            <SupervisionAssignmentSection
                                data={data}
                                form={assignmentForm}
                                selectedAssignmentId={selectedAssignmentId}
                                selectedLocationId={selectedAssignmentLocationId}
                                disabled={isSaving}
                                onChange={setAssignmentForm}
                                onEdit={editAssignment}
                                onPrepareLocation={prepareLocationAssignment}
                                onReset={resetAssignmentForm}
                                onSubmit={submitAssignment}
                            />
                        </div>
                    </section>
                </div>
            ) : null}
            {activeView === 'visits' ? (
                <div className={styles.layoutSingle}>
                    <section className={styles.section}>
                        <SectionHeader title="방문 점검" caption="방문 일정을 만들고 점검 보고서를 이어서 작성합니다." />
                        <div className={styles.body}>
                            <VisitList
                                data={data}
                                visits={visibleVisits}
                                selectedId={selectedVisit?.id || ''}
                                onDelete={deleteVisit}
                                onEdit={editVisit}
                                onNew={openNewVisitForm}
                                onSelect={setSelectedVisitId}
                            />
                            {visitEditorOpen ? (
                                <VisitForm
                                    data={data}
                                    editing={Boolean(editingVisitId)}
                                    form={visitForm}
                                    disabled={isSaving}
                                    onCancelEdit={resetVisitForm}
                                    onChange={setVisitForm}
                                    onSubmit={submitVisit}
                                />
                            ) : null}
                        </div>
                    </section>
                </div>
            ) : null}
            {activeView === 'reports' ? (
                <div className={styles.layoutSingle}>
                    <section className={styles.section}>
                        <SectionHeader title="점검 보고서" caption="모바일 현장 입력 흐름으로 체크리스트와 사진을 제출합니다." />
                        <div className={styles.body}>
                            <div className={styles.subTabs}>
                                <button type="button" className={reportMode === 'list' ? styles.viewTabActive : styles.viewTab} onClick={() => setReportMode('list')}>
                                    보고서 목록
                                </button>
                                <button type="button" className={reportMode === 'editor' ? styles.viewTabActive : styles.viewTab} onClick={() => setReportMode('editor')}>
                                    보고서 작성
                                </button>
                            </div>
                            {reportMode === 'list' ? (
                                <ReportList
                                    items={visibleReportItems}
                                    selectedVisitId={selectedVisit?.id || ''}
                                    onSelect={visitId => {
                                        setSelectedVisitId(visitId);
                                        setReportMode('editor');
                                    }}
                                />
                            ) : (
                                <ReportEditor
                                    canManage={data.canManage}
                                    disabled={isSaving}
                                    inspectionItems={inspectionItems}
                                    photoCount={photoFiles.length}
                                    report={selectedReport}
                                    reportEvents={selectedReportEvents}
                                    correctiveActions={selectedReportActions}
                                    correctiveActionEvents={selectedReportActionEvents}
                                    selectedVisit={selectedVisit}
                                    specialNote={specialNote}
                                    templateName={templateName}
                                    userId={userId}
                                    companyName={companyName}
                                    onApplyAiSummary={applyReportAiSummary}
                                    onBackToList={() => setReportMode('list')}
                                    onFiles={setPhotoFiles}
                                    onItemChange={setInspectionItems}
                                    onPrint={() => printSupervisionReport({ report: selectedReport, visit: selectedVisit, items: inspectionItems, specialNote })}
                                    onSave={() => void submitReport('saveDraft')}
                                    onSaveTemplate={() => void submitTemplate()}
                                    onSubmit={() => void submitReport('submit')}
                                    onSpecialNote={setSpecialNote}
                                    onTemplateName={setTemplateName}
                                />
                            )}
                        </div>
                    </section>
                </div>
            ) : null}
            {activeView === 'review' ? (
                <div className={styles.layoutSingle}>
                    <section className={styles.section}>
                        <SectionHeader title="승인/시정요청" caption="제출 보고서 승인과 개선 항목 후속 처리를 봅니다." />
                        <div className={styles.body}>
                            <ReportReviewList
                                canManage={data.canManage}
                                disabled={isSaving}
                                reports={visibleReports}
                                rejectReason={rejectReason}
                                onRejectReason={setRejectReason}
                                onOpenReport={openReportForReview}
                                onApprove={report => void submitReport('approve', report)}
                                onReject={(report, reason) => void submitReport('reject', report, reason)}
                            />
                            <CorrectiveActionList actions={visibleActions} disabled={isSaving} onStatusChange={changeActionStatus} />
                        </div>
                    </section>
                </div>
            ) : null}
        </div>
    );
}
