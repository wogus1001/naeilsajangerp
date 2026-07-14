"use client";

import React from 'react';
import { AlertCircle, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { AlertModal } from '@/components/common/AlertModal';
import { getApiAuthHeaders } from '@/utils/apiAuthHeaders';
import { FranchiseScheduleCalendar } from './FranchiseScheduleCalendar';
import { FranchiseScheduleDayList } from './FranchiseScheduleDayList';
import { FranchiseScheduleConfirm, FranchiseScheduleDialog } from './FranchiseScheduleDialogs';
import {
    FRANCHISE_SCHEDULES_API_PATH,
    buildFranchiseScheduleViewModel,
    getFranchiseScheduleMutationPath,
    toDateKey
} from './franchiseScheduleViewModel';
import type {
    FranchiseScheduleFilters,
    FranchiseScheduleItem,
    FranchiseScheduleSource,
    FranchiseScheduleStatus,
    FranchiseScheduleVisibility
} from './franchiseScheduleViewModel';
import type { ScheduleFormValue } from './FranchiseScheduleDialogs';
import { getFranchiseScheduleResponseFailure, useFranchiseScheduleData } from './useFranchiseScheduleData';
import styles from './FranchiseSchedulePage.module.css';

const STATUS_FILTERS: readonly ('all' | FranchiseScheduleStatus)[] = ['all', '예정', '진행중', '완료', '지연'];
const SOURCE_FILTERS: readonly ('all' | FranchiseScheduleSource)[] = ['all', 'manual', 'approval-document', 'supervision-visit', 'report'];
const VISIBILITY_FILTERS: readonly ('all' | FranchiseScheduleVisibility)[] = ['all', 'shared', 'personal'];
const EMPTY_FORM: ScheduleFormValue = { id: '', title: '', date: toDateKey(new Date()), status: '예정', visibility: 'shared', assigneeProfileId: '', details: '' };
type ScheduleAlert = { readonly message: string; readonly type: 'success' | 'error' };

function getSourceLabel(source: FranchiseScheduleSource): string {
    switch (source) {
        case 'manual':
            return '수동';
        case 'approval-document':
            return '결재';
        case 'supervision-visit':
            return 'SV 방문';
        case 'report':
            return '보고서';
        case 'corrective-action':
            return '시정조치';
    }
}

function getSelectedStatus(value: string): FranchiseScheduleStatus {
    return value === '진행중' || value === '완료' || value === '지연' || value === '취소' ? value : '예정';
}

function getSelectedStatusFilter(value: string): 'all' | FranchiseScheduleStatus {
    return value === 'all' ? 'all' : getSelectedStatus(value);
}

function getSelectedSourceFilter(value: string): 'all' | FranchiseScheduleSource {
    if (value === 'approval-document' || value === 'supervision-visit' || value === 'report' || value === 'corrective-action') return value;
    return value === 'manual' ? 'manual' : 'all';
}

function getFormValue(item: FranchiseScheduleItem): ScheduleFormValue {
    return {
        id: item.id,
        title: item.title,
        date: item.date,
        status: item.status,
        visibility: item.visibility,
        assigneeProfileId: item.assigneeProfileId,
        details: item.details
    };
}

export function FranchiseSchedulePage({ approvalDocumentId }: { readonly approvalDocumentId: string }) {
    const [monthDate, setMonthDate] = React.useState(new Date());
    const { items, assignees, assigneesLoading, assigneesError, requesterProfileId, state, message, reloadSchedules } = useFranchiseScheduleData(monthDate);
    const [selectedDate, setSelectedDate] = React.useState(toDateKey(new Date()));
    const [filters, setFilters] = React.useState<FranchiseScheduleFilters>({ status: 'all', source: 'all', visibility: 'all', assignee: '' });
    const [form, setForm] = React.useState<ScheduleFormValue | null>(null);
    const [confirm, setConfirm] = React.useState<{ readonly item: FranchiseScheduleItem; readonly action: 'complete' | 'delete' } | null>(null);
    const [alert, setAlert] = React.useState<ScheduleAlert | null>(null);
    const [saving, setSaving] = React.useState(false);

    const model = buildFranchiseScheduleViewModel({ items, filters, selectedDate, monthDate, state, approvalDocumentId, message });

    const persist = async (method: 'POST' | 'PATCH' | 'DELETE', body: Readonly<Record<string, string>>) => {
        setSaving(true);
        const response = await fetch(getFranchiseScheduleMutationPath(method, body), {
            method,
            headers: await getApiAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(body)
        });
        setSaving(false);
        if (!response.ok) {
            const next = await getFranchiseScheduleResponseFailure(response);
            setAlert({ message: next.message, type: 'error' });
            return;
        }
        setAlert({ message: '요청한 작업을 정상적으로 처리했습니다.', type: 'success' });
        setForm(null);
        setConfirm(null);
        await reloadSchedules();
    };

    const monthStep = (step: number) => setMonthDate(current => new Date(current.getFullYear(), current.getMonth() + step, 1));
    const goToday = () => {
        const today = new Date();
        setMonthDate(new Date(today.getFullYear(), today.getMonth(), 1));
        setSelectedDate(toDateKey(today));
    };
    const formMode = form?.id ? 'edit' : 'create';

    return (
        <div className={styles.pageShell} data-testid="franchise-schedule-root">
            {alert && (
                <AlertModal
                    isOpen
                    onClose={() => setAlert(null)}
                    title={alert.type === 'success' ? '처리 완료' : '처리 오류'}
                    message={alert.message}
                    type={alert.type}
                />
            )}
            <header className={styles.header}>
                <div>
                    <span className={styles.eyebrow}>가맹 운영</span>
                    <h1>일정관리</h1>
                    <p>결재, 슈퍼바이징, 수동 운영 일정을 한 달 단위로 확인합니다.</p>
                </div>
                <button className={styles.primaryButton} type="button" onClick={() => setForm({ ...EMPTY_FORM, date: model.selectedDate })}>
                    <Plus size={16} /> 수동 일정 등록
                </button>
            </header>
            <section className={styles.kpiGrid}>{model.kpis.map(kpi => <article className={styles.kpiCard} key={kpi.label}><span>{kpi.label}</span><strong>{kpi.value}</strong><p>{kpi.helper}</p></article>)}</section>
            <section className={styles.filterBar} aria-label="일정 필터">
                <select value={filters.status} onChange={event => {
                    const status = getSelectedStatusFilter(event.currentTarget.value);
                    setFilters(current => ({ ...current, status }));
                }}>
                    {STATUS_FILTERS.map(status => <option key={status} value={status}>{status === 'all' ? '전체 상태' : status}</option>)}
                </select>
                <select value={filters.source} onChange={event => {
                    const source = getSelectedSourceFilter(event.currentTarget.value);
                    setFilters(current => ({ ...current, source }));
                }}>
                    {SOURCE_FILTERS.map(source => <option key={source} value={source}>{source === 'all' ? '전체 유형' : getSourceLabel(source)}</option>)}
                </select>
                <select value={filters.visibility} onChange={event => {
                    const value = event.currentTarget.value;
                    const visibility = value === 'shared' || value === 'personal' ? value : 'all';
                    setFilters(current => ({ ...current, visibility }));
                }}>
                    {VISIBILITY_FILTERS.map(visibility => <option key={visibility} value={visibility}>{visibility === 'all' ? '전체 일정' : visibility === 'shared' ? '공유 일정' : '개인 일정'}</option>)}
                </select>
                <input value={filters.assignee} onChange={event => {
                    const assignee = event.currentTarget.value;
                    setFilters(current => ({ ...current, assignee }));
                }} placeholder="담당자 검색" />
            </section>
            {model.state === 'loading' && <StatePanel label="일정을 불러오는 중입니다." />}
            {model.state !== 'loading' && model.state !== 'ready' && model.state !== 'empty' && <StatePanel label={model.message} />}
            <div className={styles.workspace}>
                <div className={styles.calendarColumn}>
                    <div className={styles.monthBar}>
                        <strong>{model.monthLabel}</strong>
                        <button className={styles.iconButton} type="button" title="이전 달" onClick={() => monthStep(-1)}><ChevronLeft size={18} /></button>
                        <button className={styles.iconButton} type="button" title="다음 달" onClick={() => monthStep(1)}><ChevronRight size={18} /></button>
                        <button className={styles.todayButton} type="button" onClick={goToday}>오늘</button>
                    </div>
                    <FranchiseScheduleCalendar monthDate={monthDate} selectedDate={model.selectedDate} items={model.filteredItems} focusId={model.focusId} onSelectDate={setSelectedDate} />
                </div>
                <FranchiseScheduleDayList
                    selectedDate={model.selectedDate}
                    items={model.selectedItems}
                    focusId={model.focusId}
                    onCreate={() => setForm({ ...EMPTY_FORM, date: model.selectedDate })}
                    onEdit={item => setForm(getFormValue(item))}
                    onComplete={item => setConfirm({ item, action: 'complete' })}
                    onDelete={item => setConfirm({ item, action: 'delete' })}
                />
            </div>
            {form && <FranchiseScheduleDialog value={form} assignees={assignees} assigneesLoading={assigneesLoading} assigneesError={assigneesError} requesterProfileId={requesterProfileId} mode={formMode} saving={saving} onChange={setForm} onClose={() => setForm(null)} onSubmit={() => void persist(formMode === 'create' ? 'POST' : 'PATCH', { id: form.id, title: form.title, date: form.date, status: form.status, visibility: form.visibility, assigneeProfileId: form.assigneeProfileId, details: form.details })} />}
            {confirm && <FranchiseScheduleConfirm item={confirm.item} action={confirm.action} saving={saving} onClose={() => setConfirm(null)} onConfirm={() => void persist(confirm.action === 'delete' ? 'DELETE' : 'PATCH', { id: confirm.item.id, action: confirm.action })} />}
        </div>
    );
}

function StatePanel({ label }: { readonly label: string }) {
    return <div className={styles.statePanel} role="status"><AlertCircle size={18} /> {label}</div>;
}
