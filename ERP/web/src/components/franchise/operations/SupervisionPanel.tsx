'use client';

import React from 'react';
import {
    buildDefaultInspectionItems,
    buildDefaultReportTemplate,
    kstDateKey,
    SUPERVISION_VISIT_PURPOSES,
    type SupervisionInspectionItem
} from '@/lib/franchise-supervision';
import {
    fetchSupervisionData,
    saveSupervisionAssignment,
    saveSupervisionReport,
    saveSupervisionTemplate,
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
import { printSupervisionReport } from './SupervisionPanelPrint';
import {
    AssignmentForm,
    AssignmentList,
    CorrectiveActionList,
    DashboardOverview,
    EventTimeline,
    ReportEditor,
    ReportReviewList,
    SectionHeader,
    SummaryCards,
    ViewTabs,
    VisitForm,
    VisitList,
    type FormState,
    type SupervisionFilter,
    type SupervisionView,
    type VisitFormState
} from './SupervisionPanelSections';
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

export function SupervisionPanel({ userId, companyName }: SupervisionScope) {
    const [data, setData] = React.useState<SupervisionPayload>(EMPTY_PAYLOAD);
    const [activeView, setActiveView] = React.useState<SupervisionView>('dashboard');
    const [activeFilter, setActiveFilter] = React.useState<SupervisionFilter>('all');
    const [assignmentForm, setAssignmentForm] = React.useState<FormState>(makeAssignmentForm(EMPTY_PAYLOAD));
    const [visitForm, setVisitForm] = React.useState<VisitFormState>(makeVisitForm(EMPTY_PAYLOAD));
    const [selectedVisitId, setSelectedVisitId] = React.useState('');
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

    const selectedVisit = data.visits.find(visit => visit.id === selectedVisitId) || data.visits[0] || null;
    const selectedReport = selectedVisit ? data.reports.find(report => report.visitId === selectedVisit.id) || null : null;
    const visibleVisits = React.useMemo(() => filterVisits(data.visits, activeFilter), [activeFilter, data.visits]);
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
            templateId: targetReport?.templateId || (activeTemplate.id === 'default' ? undefined : activeTemplate.id),
            specialNote: targetReport && report ? targetReport.specialNote : specialNote,
            rejectReason,
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

    const changeActionStatus = async (action: SupervisionCorrectiveAction, status: string) => {
        if (!data.companyId) return;
        await runSaving(() => updateCorrectiveAction({ ...scope, companyId: data.companyId, id: action.id, status, memo: action.memo }));
    };

    const selectSummaryFilter = (view: SupervisionView, filter: SupervisionFilter) => {
        setActiveView(view);
        setActiveFilter(filter);
        const firstVisit = filterVisits(data.visits, filter)[0];
        if (firstVisit) setSelectedVisitId(firstVisit.id);
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
            <SummaryCards data={data} isLoading={isLoading} onSelect={selectSummaryFilter} />
            <ViewTabs
                activeView={activeView}
                onSelect={view => {
                    setActiveView(view);
                    setActiveFilter('all');
                }}
            />
            {activeView === 'dashboard' ? (
                <DashboardOverview data={data} />
            ) : null}
            {activeView === 'assignments' ? (
                <div className={styles.layoutSingle}>
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
                </div>
            ) : null}
            {activeView === 'visits' ? (
                <div className={styles.layoutSingle}>
                    <section className={styles.section}>
                        <SectionHeader title="방문 점검" caption="방문 일정을 만들고 점검 보고서를 이어서 작성합니다." />
                        <div className={styles.body}>
                            <VisitForm data={data} form={visitForm} disabled={isSaving} onChange={setVisitForm} onSubmit={submitVisit} />
                            <VisitList visits={visibleVisits} selectedId={selectedVisit?.id || ''} onSelect={setSelectedVisitId} />
                        </div>
                    </section>
                </div>
            ) : null}
            {activeView === 'reports' ? (
                <div className={styles.layoutSingle}>
                    <section className={styles.section}>
                        <SectionHeader title="점검 보고서" caption="모바일 현장 입력 흐름으로 체크리스트와 사진을 제출합니다." />
                        <div className={styles.body}>
                            <VisitList visits={visibleVisits} selectedId={selectedVisit?.id || ''} onSelect={setSelectedVisitId} />
                            <ReportEditor
                                canManage={data.canManage}
                                disabled={isSaving}
                                inspectionItems={inspectionItems}
                                photoCount={photoFiles.length}
                                report={selectedReport}
                                selectedVisit={selectedVisit}
                                specialNote={specialNote}
                                templateName={templateName}
                                onFiles={setPhotoFiles}
                                onItemChange={setInspectionItems}
                                onPrint={() => printSupervisionReport({ report: selectedReport, visit: selectedVisit, items: inspectionItems, specialNote })}
                                onSave={() => void submitReport('saveDraft')}
                                onSaveTemplate={() => void submitTemplate()}
                                onSubmit={() => void submitReport('submit')}
                                onSpecialNote={setSpecialNote}
                                onTemplateName={setTemplateName}
                            />
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
                                onApprove={report => void submitReport('approve', report)}
                                onReject={report => void submitReport('reject', report)}
                            />
                            <CorrectiveActionList actions={visibleActions} disabled={isSaving} onStatusChange={changeActionStatus} />
                            <EventTimeline data={data} />
                        </div>
                    </section>
                </div>
            ) : null}
        </div>
    );
}
