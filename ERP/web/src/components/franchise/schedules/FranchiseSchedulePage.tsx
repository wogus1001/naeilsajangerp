"use client";

import React from 'react';
import { AlertCircle, Check, ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react';
import { getApiAuthHeaders } from '@/utils/apiAuthHeaders';
import { FranchiseScheduleCalendar } from './FranchiseScheduleCalendar';
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
    FranchiseScheduleStatus
} from './franchiseScheduleViewModel';
import type { ScheduleFormValue } from './FranchiseScheduleDialogs';
import { getFranchiseScheduleFailure, useFranchiseScheduleData } from './useFranchiseScheduleData';
import styles from './FranchiseSchedulePage.module.css';

const STATUS_FILTERS: readonly ('all' | FranchiseScheduleStatus)[] = ['all', '예정', '진행중', '완료', '지연'];
const SOURCE_FILTERS: readonly ('all' | FranchiseScheduleSource)[] = ['all', 'manual', 'approval-document', 'supervision-visit', 'report'];
const EMPTY_FORM: ScheduleFormValue = { id: '', title: '', date: toDateKey(new Date()), status: '예정', assigneeProfileId: '', details: '' };

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
        assigneeProfileId: item.assigneeProfileId,
        details: item.details
    };
}

export function FranchiseSchedulePage({ approvalDocumentId }: { readonly approvalDocumentId: string }) {
    const [monthDate, setMonthDate] = React.useState(new Date());
    const { items, assignees, assigneesLoading, assigneesError, state, message, reloadSchedules } = useFranchiseScheduleData(monthDate);
    const [selectedDate, setSelectedDate] = React.useState(toDateKey(new Date()));
    const [filters, setFilters] = React.useState<FranchiseScheduleFilters>({ status: 'all', source: 'all', assignee: '' });
    const [form, setForm] = React.useState<ScheduleFormValue | null>(null);
    const [confirm, setConfirm] = React.useState<{ readonly item: FranchiseScheduleItem; readonly action: 'complete' | 'delete' } | null>(null);
    const [alert, setAlert] = React.useState('');
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
            const next = getFranchiseScheduleFailure(response.status);
            setAlert(next.message);
            return;
        }
        setAlert('처리됐습니다.');
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
            {alert && <div className={styles.alert} role="status">{alert}<button type="button" onClick={() => setAlert('')}>확인</button></div>}
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
                <section className={styles.dayList} aria-label="선택 날짜 일정">
                    <h2>{model.selectedDate} 일정</h2>
                    {model.state === 'empty' && <StatePanel label="등록된 프랜차이즈 일정이 없습니다." />}
                    {model.selectedItems.map(item => (
                        <article className={`${styles.scheduleRow} ${item.id === model.focusId ? styles.focusRow : ''}`} key={item.id}>
                            <div><strong>{item.title}</strong><p>{item.assigneeName}</p><p>{item.details || '메모 없음'}</p></div>
                            <div className={styles.rowMeta}><span>{getSourceLabel(item.source)}</span><span>{item.status}</span></div>
                            {item.source === 'manual' && <div className={styles.rowActions}><button type="button" title="수정" onClick={() => setForm(getFormValue(item))}><Pencil size={16} /></button><button type="button" title="완료" onClick={() => setConfirm({ item, action: 'complete' })}><Check size={16} /></button><button type="button" title="삭제" onClick={() => setConfirm({ item, action: 'delete' })}><Trash2 size={16} /></button></div>}
                        </article>
                    ))}
                </section>
            </div>
            {form && <FranchiseScheduleDialog value={form} assignees={assignees} assigneesLoading={assigneesLoading} assigneesError={assigneesError} mode={formMode} saving={saving} onChange={setForm} onClose={() => setForm(null)} onSubmit={() => void persist(formMode === 'create' ? 'POST' : 'PATCH', { id: form.id, title: form.title, date: form.date, status: form.status, assigneeProfileId: form.assigneeProfileId, details: form.details })} />}
            {confirm && <FranchiseScheduleConfirm item={confirm.item} action={confirm.action} saving={saving} onClose={() => setConfirm(null)} onConfirm={() => void persist(confirm.action === 'delete' ? 'DELETE' : 'PATCH', { id: confirm.item.id, action: confirm.action })} />}
        </div>
    );
}

function StatePanel({ label }: { readonly label: string }) {
    return <div className={styles.statePanel} role="status"><AlertCircle size={18} /> {label}</div>;
}
