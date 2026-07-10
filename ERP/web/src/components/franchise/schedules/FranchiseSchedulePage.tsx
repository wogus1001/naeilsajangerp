"use client";

import Link from 'next/link';
import React from 'react';
import {
    CalendarDays,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    ClipboardCheck,
    Plus,
    Trash2
} from 'lucide-react';
import { getApiAuthHeaders } from '@/utils/apiAuthHeaders';
import { readApiError, unwrapApiData } from '@/utils/apiResponse';
import {
    calculateFranchiseScheduleKpis,
    filterFranchiseSchedules,
    formatKoreanDate,
    isEditableManualSchedule,
    monthBounds,
    monthGrid,
    paginateFranchiseSchedules,
    schedulesForDay,
    sortFranchiseSchedules,
    sourceDetailPath,
    sourceLabelForSchedule,
    todayKey,
    type FranchiseScheduleFilter,
    type FranchiseScheduleItem
} from './franchiseScheduleViewModel';
import styles from './FranchiseSchedulePage.module.css';

type ApiSchedule = FranchiseScheduleItem;
type ToastKind = 'success' | 'error';
type Toast = {
    readonly kind: ToastKind;
    readonly message: string;
};

const FILTERS: readonly { readonly key: FranchiseScheduleFilter; readonly label: string }[] = [
    { key: 'all', label: '전체' },
    { key: 'today', label: '오늘 처리' },
    { key: 'week', label: '이번주' },
    { key: 'approval', label: '승인 대기' },
    { key: 'overdue', label: '지연' },
    { key: 'manual', label: '수동 일정' }
];

const STATUS_CLASS: Readonly<Record<string, string>> = {
    예정: styles.statusPlanned,
    진행중: styles.statusActive,
    완료: styles.statusDone,
    지연: styles.statusOverdue,
    취소: styles.statusCanceled
};

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
    const headers = await getApiAuthHeaders(init?.headers);
    const response = await fetch(url, { ...init, headers, cache: 'no-store' });
    const payload: unknown = await response.json();
    if (!response.ok) throw new Error(readApiError(payload));
    return unwrapApiData<T>(payload);
}

function monthKeyFromDate(dateKey: string): string {
    return dateKey.slice(0, 7);
}

function monthTitle(monthKey: string): string {
    const [year, month] = monthKey.split('-');
    return `${year}년 ${Number(month)}월`;
}

function addMonths(monthKey: string, amount: number): string {
    const [yearValue, monthValue] = monthKey.split('-').map(Number);
    const date = new Date(yearValue, monthValue - 1 + amount, 1);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${date.getFullYear()}-${month}`;
}

function hasScheduleCount(items: readonly FranchiseScheduleItem[], dateKey: string): number {
    return items.filter(item => item.date === dateKey).length;
}

function buildInitialForm(dateKey: string) {
    return {
        date: dateKey,
        details: '',
        title: ''
    };
}

export function FranchiseSchedulePage() {
    const baseDateKey = todayKey();
    const [monthKey, setMonthKey] = React.useState(monthKeyFromDate(baseDateKey));
    const [selectedDateKey, setSelectedDateKey] = React.useState(baseDateKey);
    const [filter, setFilter] = React.useState<FranchiseScheduleFilter>('all');
    const [items, setItems] = React.useState<FranchiseScheduleItem[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSaving, setIsSaving] = React.useState(false);
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [form, setForm] = React.useState(buildInitialForm(baseDateKey));
    const [page, setPage] = React.useState(1);
    const [toast, setToast] = React.useState<Toast | null>(null);

    const loadSchedules = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const bounds = monthBounds(monthKey);
            const params = new URLSearchParams({ dateFrom: bounds.from, dateTo: bounds.to });
            const data = await requestJson<readonly ApiSchedule[]>(`/api/franchise-schedules?${params.toString()}`);
            setItems(data.map(item => ({
                ...item,
                date: item.date || baseDateKey,
                status: item.status || '예정',
                title: item.title || '제목 없는 일정'
            })));
            setToast(null);
        } catch (error) {
            setToast({
                kind: 'error',
                message: error instanceof Error ? error.message : '프랜차이즈 일정을 불러오지 못했습니다.'
            });
        } finally {
            setIsLoading(false);
        }
    }, [baseDateKey, monthKey]);

    React.useEffect(() => {
        void loadSchedules();
    }, [loadSchedules]);

    React.useEffect(() => {
        setPage(1);
    }, [filter, items]);

    const kpis = React.useMemo(() => calculateFranchiseScheduleKpis(items, baseDateKey), [baseDateKey, items]);
    const filteredItems = React.useMemo(() => (
        sortFranchiseSchedules(filterFranchiseSchedules(items, filter, baseDateKey))
    ), [baseDateKey, filter, items]);
    const paged = React.useMemo(() => paginateFranchiseSchedules(filteredItems, page, 8), [filteredItems, page]);
    const selectedItems = React.useMemo(() => schedulesForDay(items, selectedDateKey), [items, selectedDateKey]);
    const grid = React.useMemo(() => monthGrid(monthKey), [monthKey]);

    const openCreateForm = (dateKey = selectedDateKey) => {
        setForm(buildInitialForm(dateKey));
        setIsFormOpen(true);
        setToast(null);
    };

    const createSchedule = async () => {
        if (!form.title.trim() || !form.date) {
            setToast({ kind: 'error', message: '제목과 날짜를 입력해주세요.' });
            return;
        }
        setIsSaving(true);
        try {
            await requestJson<FranchiseScheduleItem>('/api/franchise-schedules', {
                body: JSON.stringify({
                    date: form.date,
                    details: form.details,
                    status: '예정',
                    title: form.title
                }),
                headers: { 'Content-Type': 'application/json' },
                method: 'POST'
            });
            setToast({ kind: 'success', message: '프랜차이즈 수동 일정을 등록했습니다.' });
            setIsFormOpen(false);
            setSelectedDateKey(form.date);
            setMonthKey(monthKeyFromDate(form.date));
            await loadSchedules();
        } catch (error) {
            setToast({
                kind: 'error',
                message: error instanceof Error ? error.message : '일정을 등록하지 못했습니다.'
            });
        } finally {
            setIsSaving(false);
        }
    };

    const completeSchedule = async (schedule: FranchiseScheduleItem) => {
        if (!isEditableManualSchedule(schedule)) return;
        setIsSaving(true);
        try {
            await requestJson<FranchiseScheduleItem>('/api/franchise-schedules?action=complete', {
                body: JSON.stringify({ id: schedule.id }),
                headers: { 'Content-Type': 'application/json' },
                method: 'PATCH'
            });
            setToast({ kind: 'success', message: '일정을 완료 처리했습니다.' });
            await loadSchedules();
        } catch (error) {
            setToast({
                kind: 'error',
                message: error instanceof Error ? error.message : '일정을 완료 처리하지 못했습니다.'
            });
        } finally {
            setIsSaving(false);
        }
    };

    const deleteSchedule = async (schedule: FranchiseScheduleItem) => {
        if (!isEditableManualSchedule(schedule)) return;
        const confirmed = window.confirm('이 프랜차이즈 수동 일정을 삭제할까요?');
        if (!confirmed) return;
        setIsSaving(true);
        try {
            await requestJson<{ readonly deleted: boolean }>(`/api/franchise-schedules?id=${encodeURIComponent(schedule.id)}`, {
                method: 'DELETE'
            });
            setToast({ kind: 'success', message: '수동 일정을 삭제했습니다.' });
            await loadSchedules();
        } catch (error) {
            setToast({
                kind: 'error',
                message: error instanceof Error ? error.message : '일정을 삭제하지 못했습니다.'
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <main className={styles.page} data-testid="franchise-schedule-page">
            <section className={styles.hero}>
                <div>
                    <p className={styles.eyebrow}>가맹 운영</p>
                    <h1>프랜차이즈 일정관리</h1>
                    <p>점포개발 업무 일정과 분리된 가맹 운영 전용 일정입니다.</p>
                </div>
                <button className={styles.primaryButton} type="button" onClick={() => openCreateForm()}>
                    <Plus size={16} />
                    일정 추가
                </button>
            </section>

            {toast ? (
                <div className={`${styles.toast} ${toast.kind === 'error' ? styles.toastError : styles.toastSuccess}`} role="status">
                    {toast.message}
                </div>
            ) : null}

            <section className={styles.kpiGrid} aria-label="프랜차이즈 일정 요약">
                <div className={styles.kpiCard}>
                    <span>오늘 처리</span>
                    <strong>{kpis.today}건</strong>
                </div>
                <div className={styles.kpiCard}>
                    <span>이번주 일정</span>
                    <strong>{kpis.week}건</strong>
                </div>
                <div className={styles.kpiCard}>
                    <span>승인 대기</span>
                    <strong>{kpis.approval}건</strong>
                </div>
                <div className={styles.kpiCard}>
                    <span>지연 업무</span>
                    <strong>{kpis.overdue}건</strong>
                </div>
            </section>

            <section className={styles.workspace}>
                <div className={styles.calendarPanel}>
                    <div className={styles.panelHeader}>
                        <div>
                            <h2>월간 캘린더</h2>
                            <p>{monthTitle(monthKey)} 기준 가맹 운영 일정</p>
                        </div>
                        <div className={styles.monthControls}>
                            <button type="button" aria-label="이전 달" onClick={() => setMonthKey(current => addMonths(current, -1))}>
                                <ChevronLeft size={16} />
                            </button>
                            <button type="button" aria-label="다음 달" onClick={() => setMonthKey(current => addMonths(current, 1))}>
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                    <div className={styles.weekdayGrid}>
                        {WEEKDAYS.map(day => <span key={day}>{day}</span>)}
                    </div>
                    <div className={styles.monthGrid}>
                        {grid.map(dateKey => {
                            const count = hasScheduleCount(items, dateKey);
                            const isCurrentMonth = dateKey.startsWith(monthKey);
                            const isSelected = dateKey === selectedDateKey;
                            const isToday = dateKey === baseDateKey;
                            return (
                                <button
                                    key={dateKey}
                                    type="button"
                                    className={`${styles.dayCell} ${isCurrentMonth ? '' : styles.dayMuted} ${isSelected ? styles.daySelected : ''}`}
                                    onClick={() => setSelectedDateKey(dateKey)}
                                >
                                    <span className={styles.dayNumber}>{Number(dateKey.slice(-2))}</span>
                                    {isToday ? <span className={styles.todayDot}>오늘</span> : null}
                                    {count > 0 ? <span className={styles.dayCount}>{count}</span> : null}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <aside className={styles.dayPanel}>
                    <div className={styles.panelHeader}>
                        <div>
                            <h2>{formatKoreanDate(selectedDateKey)}</h2>
                            <p>선택한 날짜의 일정</p>
                        </div>
                        <button className={styles.iconTextButton} type="button" onClick={() => openCreateForm(selectedDateKey)}>
                            <Plus size={15} />
                            추가
                        </button>
                    </div>
                    <div className={styles.dayList}>
                        {selectedItems.length === 0 ? (
                            <div className={styles.emptyState}>
                                <CalendarDays size={22} />
                                <span>등록된 일정이 없습니다.</span>
                            </div>
                        ) : selectedItems.map(item => (
                            <ScheduleCard
                                key={item.id}
                                item={item}
                                compact
                                isSaving={isSaving}
                                onComplete={completeSchedule}
                                onDelete={deleteSchedule}
                            />
                        ))}
                    </div>
                </aside>
            </section>

            <section className={styles.listPanel}>
                <div className={styles.panelHeader}>
                    <div>
                        <h2>업무 큐</h2>
                        <p>수동 일정과 원천 업무 일정을 함께 확인합니다.</p>
                    </div>
                    <div className={styles.filterTabs} role="tablist" aria-label="일정 필터">
                        {FILTERS.map(option => (
                            <button
                                key={option.key}
                                type="button"
                                className={filter === option.key ? styles.activeFilter : ''}
                                onClick={() => setFilter(option.key)}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>
                {isLoading ? (
                    <div className={styles.loadingState}>프랜차이즈 일정을 불러오는 중입니다.</div>
                ) : paged.pageItems.length === 0 ? (
                    <div className={styles.emptyState}>
                        <ClipboardCheck size={22} />
                        <span>표시할 일정이 없습니다.</span>
                    </div>
                ) : (
                    <div className={styles.queueList}>
                        {paged.pageItems.map(item => (
                            <ScheduleCard
                                key={item.id}
                                item={item}
                                isSaving={isSaving}
                                onComplete={completeSchedule}
                                onDelete={deleteSchedule}
                            />
                        ))}
                    </div>
                )}
                <div className={styles.pagination}>
                    <span>총 {filteredItems.length}건</span>
                    <div>
                        <button type="button" disabled={paged.page <= 1} onClick={() => setPage(current => current - 1)}>이전</button>
                        <strong>{paged.page} / {paged.pageCount}</strong>
                        <button type="button" disabled={paged.page >= paged.pageCount} onClick={() => setPage(current => current + 1)}>다음</button>
                    </div>
                </div>
            </section>

            {isFormOpen ? (
                <div className={styles.modalBackdrop} role="presentation">
                    <div className={styles.modal} role="dialog" aria-modal="true" aria-label="프랜차이즈 일정 추가">
                        <div className={styles.panelHeader}>
                            <div>
                                <h2>일정 추가</h2>
                                <p>가맹 운영 전용 수동 일정을 등록합니다.</p>
                            </div>
                            <button className={styles.ghostButton} type="button" onClick={() => setIsFormOpen(false)}>
                                닫기
                            </button>
                        </div>
                        <label className={styles.field}>
                            <span>제목</span>
                            <input
                                value={form.title}
                                onChange={event => setForm(current => ({ ...current, title: event.target.value }))}
                                placeholder="예: 오픈 체크 회의"
                            />
                        </label>
                        <label className={styles.field}>
                            <span>날짜</span>
                            <input
                                type="date"
                                value={form.date}
                                onChange={event => setForm(current => ({ ...current, date: event.target.value }))}
                            />
                        </label>
                        <label className={styles.field}>
                            <span>메모</span>
                            <textarea
                                value={form.details}
                                onChange={event => setForm(current => ({ ...current, details: event.target.value }))}
                                placeholder="필요한 준비 사항을 적어주세요."
                            />
                        </label>
                        <div className={styles.modalActions}>
                            <button className={styles.ghostButton} type="button" onClick={() => setIsFormOpen(false)}>
                                취소
                            </button>
                            <button className={styles.primaryButton} type="button" disabled={isSaving} onClick={createSchedule}>
                                등록
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </main>
    );
}

type ScheduleCardProps = {
    readonly item: FranchiseScheduleItem;
    readonly compact?: boolean;
    readonly isSaving: boolean;
    readonly onComplete: (item: FranchiseScheduleItem) => Promise<void>;
    readonly onDelete: (item: FranchiseScheduleItem) => Promise<void>;
};

function ScheduleCard({ item, compact = false, isSaving, onComplete, onDelete }: ScheduleCardProps) {
    const isManual = isEditableManualSchedule(item);
    const statusClass = STATUS_CLASS[item.status] ?? styles.statusActive;
    return (
        <article className={`${styles.scheduleCard} ${compact ? styles.compactCard : ''}`}>
            <div className={styles.scheduleMain}>
                <div className={styles.scheduleTitleRow}>
                    <span className={styles.sourceBadge}>{sourceLabelForSchedule(item)}</span>
                    <span className={`${styles.statusBadge} ${statusClass}`}>{item.status}</span>
                </div>
                <h3>{item.title}</h3>
                <p>{formatKoreanDate(item.date)}{item.details ? ` · ${item.details}` : ''}</p>
            </div>
            <div className={styles.scheduleActions}>
                {!isManual ? (
                    <Link className={styles.ghostButton} href={sourceDetailPath(item)}>
                        원천 보기
                    </Link>
                ) : null}
                {isManual && item.status !== '완료' ? (
                    <button className={styles.ghostButton} type="button" disabled={isSaving} onClick={() => void onComplete(item)}>
                        <CheckCircle2 size={15} />
                        완료
                    </button>
                ) : null}
                {isManual ? (
                    <button className={styles.dangerButton} type="button" disabled={isSaving} onClick={() => void onDelete(item)} aria-label={`${item.title} 삭제`}>
                        <Trash2 size={15} />
                    </button>
                ) : null}
            </div>
        </article>
    );
}
