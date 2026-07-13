"use client";

import { readApiJson } from '@/utils/apiResponse';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck, Clock, Plus, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import { AlertModal } from '@/components/common/AlertModal';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { getRequesterId, getStoredCompanyName, getStoredUser } from '@/utils/userUtils';
import {
    buildScheduleDashboard,
    isScheduleEventCanceled,
    isScheduleEventDone,
    scheduleEventDateKey,
    sourceBadgeLabel,
    type ScheduleEvent
} from './schedule-dashboard';

// Mock Data for Events
const MOCK_EVENTS = [
    { id: 1, date: '2025-09-01', title: '신규조건', type: 'new', color: '#7950f2' },
    { id: 2, date: '2025-09-01', title: '점포(작업3건)', type: 'work', color: '#7950f2' },
    { id: 3, date: '2025-09-01', title: '빌딩(신규1건)', type: 'building', color: '#f06595' },
    { id: 4, date: '2025-09-02', title: '전속', type: 'exclusive', color: '#228be6' },
    { id: 5, date: '2025-09-02', title: '점포(작업5건)', type: 'work', color: '#5c7cfa' },
    { id: 6, date: '2025-09-09', title: '화재보험', type: 'insurance', color: '#fab005' },
    { id: 7, date: '2025-09-15', title: '단양펜션 답사', type: 'visit', color: '#868e96' },
    { id: 8, date: '2025-09-25', title: '김사장님 미팅', type: 'meeting', color: '#20c997' },
    { id: 9, date: '2025-09-25', title: '[추진] [조마루감자탕] · (5,000)', type: 'price_change', color: '#e64980' },
];

// South Korea Public Holidays (2025-2026)
const HOLIDAYS: { [key: string]: string } = {
    // 2025
    '2025-01-01': '신정',
    '2025-01-27': '설날 연휴',
    '2025-01-28': '설날',
    '2025-01-29': '설날 연휴',
    '2025-03-01': '삼일절',
    '2025-03-03': '대체공휴일(삼일절)',
    '2025-05-05': '어린이날',
    '2025-05-06': '부처님오신날/대체공휴일',
    '2025-06-06': '현충일',
    '2025-08-15': '광복절',
    '2025-10-03': '개천절',
    '2025-10-05': '추석 연휴',
    '2025-10-06': '추석',
    '2025-10-07': '추석 연휴',
    '2025-10-08': '대체공휴일(추석)',
    '2025-10-09': '한글날',
    '2025-12-25': '성탄절',

    // 2026
    '2026-01-01': '신정',
    '2026-02-16': '설날 연휴',
    '2026-02-17': '설날',
    '2026-02-18': '설날 연휴',
    '2026-03-01': '삼일절',
    '2026-03-02': '대체공휴일(삼일절)',
    '2026-05-05': '어린이날',
    '2026-05-24': '부처님오신날',
    '2026-05-25': '대체공휴일(부처님오신날)',
    '2026-06-03': '지방선거일(예정)', // Tentative
    '2026-06-06': '현충일',
    '2026-08-15': '광복절',
    '2026-08-17': '대체공휴일(광복절)',
    '2026-09-24': '추석 연휴',
    '2026-09-25': '추석',
    '2026-09-26': '추석 연휴',
    '2026-10-03': '개천절',
    '2026-10-05': '대체공휴일(개천절)',
    '2026-10-09': '한글날',
    '2026-12-25': '성탄절'
};

const getEventColor = (scope: string, status: string, type?: string, title?: string) => {


    // 2. Force 'Price Change' or 'Work' related types/titles to be Violet (Work)
    const isWorkRelated = type === 'price_change' ||
        (title && (title.includes('[금액변동]') || title.includes('[작업]')));

    if (isWorkRelated || scope === 'public' || scope === 'work') {
        return '#7950f2'; // Violet
    }

    // 3. Personal - Pink
    return '#f06595';
};

const getStatusColor = (status: string) => {
    switch (status) {
        case '예정': return '#868e96';
        case '진행중': return '#339af0';
        case '완료': return '#2f9e44';
        case '지연': return '#f08c00';
        case '취소': return '#868e96';
        case 'progress': return '#339af0'; // Blue
        case 'postponed': return '#7950f2'; // Violet
        case 'canceled': return '#fab005'; // Yellow
        case 'completed': return '#c92a2a'; // Red
        case 'schedule': return '#868e96'; // Gray
        case 'price_change': return '#e64980'; // Pink (legacy fallback)
        default: return '#868e96';
    }
};

const getStatusLabel = (status: string) => {
    switch (status) {
        case '예정': return '예정';
        case '진행중': return '진행중';
        case '완료': return '완료';
        case '지연': return '지연';
        case '취소': return '취소';
        case 'progress': return '진행';
        case 'completed': return '완료';
        case 'postponed': return '연기';
        case 'canceled': return '취소';
        case 'schedule': return '일정';
        case 'price_change': return '변동';
        default: return '일정';
    }
};

export default function SchedulePage() {
    const router = useRouter();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<ScheduleEvent[]>([]);
    const [activeScheduleTab, setActiveScheduleTab] = useState<'location' | 'workflow'>('location');
    const [approvalDocumentId, setApprovalDocumentId] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [visibleScopes, setVisibleScopes] = useState({ work: true, personal: true });
    const [isPanelCollapsed, setIsPanelCollapsed] = useState(false); // New State: Side Panel Collapse

    const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean; message: string; type: 'success' | 'error' | 'info'; onClose?: () => void }>({
        isOpen: false,
        message: '',
        type: 'info'
    });
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; message: string; onConfirm: () => void; isDanger?: boolean }>({
        isOpen: false,
        message: '',
        onConfirm: () => { },
        isDanger: false
    });

    const showAlert = (message: string, type: 'success' | 'error' | 'info' = 'info', onClose?: () => void) => {
        setAlertConfig({ isOpen: true, message, type, onClose });
    };

    const closeAlert = () => {
        if (alertConfig.onClose) alertConfig.onClose();
        setAlertConfig(prev => ({ ...prev, isOpen: false }));
    };

    const showConfirm = (message: string, onConfirm: () => void, isDanger = false) => {
        setConfirmModal({ isOpen: true, message, onConfirm, isDanger });
    };

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        scope: 'personal', // personal, public
        date: '',
        status: 'progress', // progress, postponed, canceled, completed, schedule
        details: ''
    });

    useEffect(() => {
        fetchSchedules();
        const linkedApprovalDocumentId = new URLSearchParams(window.location.search).get('approvalDocumentId') || '';
        if (linkedApprovalDocumentId) {
            setApprovalDocumentId(linkedApprovalDocumentId);
        }
        // Set default date for form
        setFormData(prev => ({ ...prev, date: formatDate(new Date()) }));
    }, []);

    const fetchSchedules = async () => {
        try {
            const user = getStoredUser();
            let query = '';
            if (user) {
                const params = new URLSearchParams();
                const companyName = getStoredCompanyName(user);
                const requesterId = getRequesterId(user);
                if (companyName) params.append('company', companyName);
                if (requesterId) params.append('userId', requesterId);
                query = `?${params.toString()}`;
            }

            const res = await fetch(`/api/schedules${query}`);
            if (res.ok) {
                const data = await readApiJson<ScheduleEvent[]>(res);
                setEvents(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error('Failed to fetch schedules:', error);
        }
    };

    const handleDateClick = (date: Date) => {
        setSelectedDate(date);
    };

    const handleDateDoubleClick = (date: Date) => {
        setSelectedDate(date);
        setSelectedScheduleId(null);
        setFormData({
            title: '',
            scope: 'public', // Default to Business
            date: formatDate(date),
            status: 'progress',
            details: ''
        });
        setIsModalOpen(true);
    };

    const handleEventClick = (event: ScheduleEvent) => {
        setSelectedScheduleId(event.id);
        setFormData({
            title: event.title,
            scope: event.scope || 'personal',
            date: event.date,
            status: event.status || 'progress',
            details: event.details || ''
        });
        setIsModalOpen(true);
    };

    const handleOpenModal = () => {
        setSelectedScheduleId(null);
        setFormData({
            title: '',
            scope: 'public', // Default to Business
            date: formatDate(selectedDate),
            status: 'progress',
            details: ''
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (idToDelete?: string) => {
        const targetId = idToDelete || selectedScheduleId;
        if (!targetId) return;

        try {
            const currentUser = getStoredUser();
            const requesterId = getRequesterId(currentUser);
            const query = new URLSearchParams({ id: targetId });
            if (requesterId) {
                query.set('requesterId', requesterId);
            }

            const res = await fetch(`/api/schedules?${query.toString()}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                await fetchSchedules();
                setIsModalOpen(false);
                showAlert('삭제되었습니다.', 'success');
            } else {
                showAlert('삭제에 실패했습니다.', 'error');
            }
        } catch (error) {
            console.error('Error deleting schedule:', error);
            showAlert('오류가 발생했습니다.', 'error');
        }
    };

    const handleCompleteSchedule = async (event: ScheduleEvent) => {
        try {
            const currentUser = getStoredUser();
            const requesterId = getRequesterId(currentUser);
            const res = await fetch('/api/schedules', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: event.id,
                    action: 'complete',
                    requesterId,
                    userId: requesterId
                })
            });
            if (!res.ok) {
                showAlert('완료 처리에 실패했습니다.', 'error');
                return;
            }
            await fetchSchedules();
            showAlert('일정을 완료 처리했습니다.', 'success');
        } catch (error) {
            console.error('Error completing schedule:', error);
            showAlert('오류가 발생했습니다.', 'error');
        }
    };

    const handleSave = async () => {
        if (!formData.title) {
            showAlert('제목을 입력해주세요.', 'error');
            return;
        }

        try {
            const color = getEventColor(formData.scope || 'personal', formData.status, formData.status, formData.title);

            const currentUser = getStoredUser();
            const userInfo = {
                userId: getRequesterId(currentUser),
                companyName: getStoredCompanyName(currentUser)
            };

            const payload = {
                ...formData,
                ...userInfo, // Add userId and companyName
                type: formData.status, // Using status as type for simplicity in display
                color: color
            };

            let res;
            if (selectedScheduleId) {
                // Update existing
                res = await fetch('/api/schedules', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: selectedScheduleId, ...payload })
                });
            } else {
                // Create new
                res = await fetch('/api/schedules', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            }

            if (res.ok) {
                await fetchSchedules();
                setIsModalOpen(false);
            } else {
                showAlert('저장에 실패했습니다.', 'error');
            }
        } catch (error) {
            console.error('Error saving schedule:', error);
            showAlert('오류가 발생했습니다.', 'error');
        }
    };

    // Calendar Logic
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        const days = [];

        // Previous month padding
        const startDayOfWeek = firstDay.getDay(); // 0 (Sun) - 6 (Sat)
        for (let i = 0; i < startDayOfWeek; i++) {
            const d = new Date(year, month, 1 - (startDayOfWeek - i));
            days.push({ date: d, isCurrentMonth: false });
        }

        // Current month days
        for (let i = 1; i <= lastDay.getDate(); i++) {
            const d = new Date(year, month, i);
            days.push({ date: d, isCurrentMonth: true });
        }

        // Next month padding to complete 42 cells (6 rows * 7 cols)
        const remainingCells = 42 - days.length;
        for (let i = 1; i <= remainingCells; i++) {
            const d = new Date(year, month + 1, i);
            days.push({ date: d, isCurrentMonth: false });
        }

        return days;
    };

    const days = getDaysInMonth(currentDate);

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const goToday = () => {
        setCurrentDate(new Date());
    };

    const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const isToday = (date: Date) => {
        const today = new Date();
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
    };

    const isSameDate = (date1: Date, date2: Date) => {
        return date1.getFullYear() === date2.getFullYear() &&
            date1.getMonth() === date2.getMonth() &&
            date1.getDate() === date2.getDate();
    };

    const toggleScope = (scope: 'work' | 'personal' | 'all') => {
        if (scope === 'all') {
            const isAllVisible = visibleScopes.work && visibleScopes.personal;
            setVisibleScopes({ work: !isAllVisible, personal: !isAllVisible });
        } else {
            setVisibleScopes(prev => ({ ...prev, [scope]: !prev[scope] }));
        }
    };

    const isVisible = (event: ScheduleEvent) => {
        // 1. Check explicit scope first (Best)
        if (event.scope === 'public' || event.scope === 'work') return visibleScopes.work;
        if (event.scope === 'personal') return visibleScopes.personal;

        // 2. Fallback: Infer from type/title (Legacy/Mock)
        const isWorkLegacy = ['work', 'price_change', 'new', 'exclusive', 'building', 'insurance'].includes(event.type || '') ||
            event.title.includes('[작업]') ||
            event.title.includes('[금액변동]');

        if (isWorkLegacy) return visibleScopes.work;
        return visibleScopes.personal;
    };

    const handleTaskClick = (event: ScheduleEvent) => {
        if (event.propertyId) {
            router.push(`/properties/${event.propertyId}`);
        } else if (event.customerId) {
            router.push(`/customers?id=${event.customerId}`);
        } else {
            handleEventClick(event);
        }
    };

    // Filter for side panels based on Selected Date
    const selectedDateStr = formatDate(selectedDate);
    const selectedDateEvents = events.filter(e => e.date === selectedDateStr);
    const eventColor = (event: ScheduleEvent) => event.color || '#868e96';
    const isWorkPanelEvent = (event: ScheduleEvent) => ['work', 'price_change'].includes(event.type || '') ||
        event.title.includes('[작업]') ||
        event.title.includes('[금액변동]') ||
        event.title.includes('[신규]') ||
        event.title.includes('[계약]') ||
        event.title.includes('[고객작업]') ||
        event.title.includes('[추진등록]');
    const dashboard = buildScheduleDashboard(events);
    const isLinkedApprovalEvent = (event: ScheduleEvent) => {
        return Boolean(approvalDocumentId) &&
            event.sourceType === 'approval-document' &&
            event.sourceId === approvalDocumentId;
    };
    const linkedApprovalEvent = events.find(isLinkedApprovalEvent);
    const workflowCards = [
        { key: 'today', title: '오늘 처리', count: dashboard.today.length, icon: Clock, items: dashboard.today },
        { key: 'approval', title: '승인 대기', count: dashboard.approvalPending.length, icon: ClipboardCheck, items: dashboard.approvalPending },
        { key: 'delayed', title: '지연 업무', count: dashboard.delayed.length, icon: AlertTriangle, items: dashboard.delayed },
        { key: 'week', title: '이번주 일정', count: dashboard.week.length, icon: CheckCircle2, items: dashboard.week }
    ];
    const parseEventTitle = (title: string) => {
        const match = title.match(/^(\[[^\]]+\])\s*(.*)$/);
        if (match) {
            return {
                prefix: match[1],
                content: match[2]
            };
        }
        return { prefix: '', content: title };
    };

    const renderWorkflowItems = (items: readonly ScheduleEvent[], emptyText: string) => {
        const focusedItem = items.find(isLinkedApprovalEvent);
        const visibleItems = focusedItem && !items.slice(0, 5).some(event => event.id === focusedItem.id)
            ? [focusedItem, ...items.filter(event => event.id !== focusedItem.id).slice(0, 4)]
            : items.slice(0, 5);
        if (visibleItems.length === 0) {
            return <div className={styles.workflowEmpty}>{emptyText}</div>;
        }
        return (
            <div className={styles.workflowList}>
                {visibleItems.map(event => {
                    const isFocused = isLinkedApprovalEvent(event);
                    const canCompleteDirectly = event.sourceType !== 'approval-document';
                    return (
                        <div key={event.id} className={`${styles.workflowItem} ${isFocused ? styles.focusedWorkflowItem : ''}`}>
                            <button
                                className={styles.workflowItemMain}
                                onClick={() => handleTaskClick(event)}
                                aria-current={isFocused ? 'true' : undefined}
                            >
                                <span className={styles.sourceBadge}>{sourceBadgeLabel(event.sourceType)}</span>
                                <span className={styles.workflowTitle}>{event.title}</span>
                                <span className={styles.workflowMeta}>{scheduleEventDateKey(event) || event.date}</span>
                            </button>
                            {canCompleteDirectly && !isScheduleEventDone(event) && !isScheduleEventCanceled(event) && (
                                <button className={styles.workflowDoneBtn} onClick={() => handleCompleteSchedule(event)}>
                                    완료
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className={styles.container}>
            {/* Calendar Section */}
            <div className={styles.calendarSection}>
                <div className={styles.scheduleTabs}>
                    <button
                        className={`${styles.scheduleTab} ${activeScheduleTab === 'location' ? styles.activeScheduleTab : ''}`}
                        onClick={() => setActiveScheduleTab('location')}
                    >
                        점포개발 일정
                    </button>
                </div>
                {activeScheduleTab === 'workflow' ? (
                    <div className={styles.workflowTabContent}>
                        <div className={styles.workflowHub}>
                            {approvalDocumentId && (
                                <div className={styles.workflowDeepLinkNotice}>
                                    <strong>결재 알림에서 이동했습니다.</strong>
                                    <span>{linkedApprovalEvent ? linkedApprovalEvent.title : '결재 일정이 목록에 반영되면 이 탭에서 확인할 수 있습니다.'}</span>
                                </div>
                            )}
	                            <div className={styles.workflowSummary}>
                                {workflowCards.map(card => {
                                    const Icon = card.icon;
                                    return (
                                        <div key={card.key} className={styles.workflowKpi}>
                                            <div className={styles.workflowKpiIcon}><Icon size={16} /></div>
                                            <div>
                                                <div className={styles.workflowKpiLabel}>{card.title}</div>
                                                <div className={styles.workflowKpiValue}>{card.count}건</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className={styles.workflowQueues}>
                                <section className={styles.workflowQueue}>
                                    <div className={styles.workflowQueueHeader}>
                                        <span>오늘 처리 큐</span>
                                        <strong>{dashboard.today.length}</strong>
                                    </div>
                                    {renderWorkflowItems(dashboard.today, '오늘 처리할 일정이 없습니다.')}
                                </section>
                                <section className={styles.workflowQueue}>
                                    <div className={styles.workflowQueueHeader}>
                                        <span>승인 대기</span>
                                        <strong>{dashboard.approvalPending.length}</strong>
                                    </div>
                                    {renderWorkflowItems(dashboard.approvalPending, '승인 대기 문서가 없습니다.')}
                                </section>
                                <section className={styles.workflowQueue}>
                                    <div className={styles.workflowQueueHeader}>
                                        <span>지연 업무</span>
                                        <strong>{dashboard.delayed.length}</strong>
                                    </div>
                                    {renderWorkflowItems(dashboard.delayed, '지연된 업무가 없습니다.')}
                                </section>
                                <section className={styles.workflowQueue}>
                                    <div className={styles.workflowQueueHeader}>
                                        <span>이번주 일정</span>
                                        <strong>{dashboard.week.length}</strong>
                                    </div>
                                    {renderWorkflowItems(dashboard.week, '이번주 일정이 없습니다.')}
                                </section>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div className={styles.header}>
                            <div className={styles.monthNav}>
                                <span className={styles.monthTitle}>
                                    {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
                                </span>
                                <div style={{ display: 'flex', gap: 4 }}>
                                    <button className={styles.navBtn} onClick={prevMonth}><ChevronLeft size={24} /></button>
                                    <button className={styles.navBtn} onClick={nextMonth}><ChevronRight size={24} /></button>
                                </div>
                                <button className={styles.todayBtn} onClick={goToday}>오늘</button>
                            </div>

                            <div className={styles.filterBar}>
                                <button
                                    className={`${styles.filterBtn} ${visibleScopes.work && visibleScopes.personal ? styles.active : ''}`}
                                    style={{ backgroundColor: '#339af0' }}
                                    onClick={() => toggleScope('all')}
                                >
                                    전체
                                </button>
                                <button
                                    className={`${styles.filterBtn} ${visibleScopes.work ? styles.active : ''}`}
                                    style={{ backgroundColor: '#7950f2' }}
                                    onClick={() => toggleScope('work')}
                                >
                                    업무
                                </button>
                                <button
                                    className={`${styles.filterBtn} ${visibleScopes.personal ? styles.active : ''}`}
                                    style={{ backgroundColor: '#f06595' }}
                                    onClick={() => toggleScope('personal')}
                                >
                                    개인
                                </button>
                                {/* Collapse Toggle Button */}
                                <button
                                    className={styles.collapseBtn}
                                    onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
                                    title={isPanelCollapsed ? "패널 펼치기" : "패널 접기"}
                                >
                                    {isPanelCollapsed ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                                </button>
                            </div>
                        </div>

                        {/* Grid */}
                        <div className={styles.calendarGrid}>
                            <div className={styles.weekDays}>
                                <div className={`${styles.weekDay} ${styles.sun}`}>일</div>
                                <div className={styles.weekDay}>월</div>
                                <div className={styles.weekDay}>화</div>
                                <div className={styles.weekDay}>수</div>
                                <div className={styles.weekDay}>목</div>
                                <div className={styles.weekDay}>금</div>
                                <div className={`${styles.weekDay} ${styles.sat}`}>토</div>
                            </div>

                            <div className={styles.daysGrid}>
                                {days.map((dayObj, index) => {
                                    const dateStr = formatDate(dayObj.date);
                                    const dayEvents = events.filter(e => e.date === dateStr && isVisible(e));
                                    const isSun = dayObj.date.getDay() === 0;
                                    const isSat = dayObj.date.getDay() === 6;
                                    const isSelected = isSameDate(dayObj.date, selectedDate);
                                    const holidayName = HOLIDAYS[dateStr];
                                    const isHoliday = !!holidayName;

                                    return (
                                        <div
                                            key={index}
                                            className={`${styles.dayCell} ${!dayObj.isCurrentMonth ? styles.otherMonth : ''} ${isToday(dayObj.date) ? styles.today : ''} ${isSelected ? styles.selected : ''} ${isSun || isHoliday ? styles.sun : ''} ${isSat && !isHoliday ? styles.sat : ''} ${isHoliday ? styles.holiday : ''}`}
                                            onClick={() => handleDateClick(dayObj.date)}
                                            onDoubleClick={() => handleDateDoubleClick(dayObj.date)}
                                        >
                                            <div className={styles.dayHeader}>
                                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                                    <span className={styles.dateNum}>{dayObj.date.getDate()}</span>
                                                    {holidayName && <span className={styles.holidayName}>{holidayName}</span>}
                                                </div>
                                            </div>
                                            <div className={styles.eventList}>
                                                {dayEvents.map(event => {
                                                    const { prefix, content } = parseEventTitle(event.title);
                                                    return (
                                                        <div
                                                            key={event.id}
                                                            className={styles.eventItem}
                                                            style={{ backgroundColor: eventColor(event) }}
                                                            title={event.title}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleEventClick(event);
                                                            }}
                                                        >
                                                            {prefix && <span style={{ fontSize: '0.8em', opacity: 0.9, fontWeight: 600 }}>{prefix}</span>}
                                                            <span style={{ fontSize: '0.9em' }}>{content}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Side Panel */}
            {activeScheduleTab === 'location' && <div className={`${styles.sidePanel} ${isPanelCollapsed ? styles.collapsed : ''}`}>
                {/* Top: Task List */}
                <div className={styles.panelSection} style={{ flex: 1 }}>
                    <div className={styles.panelHeader}>
                        <span>작업내역 ({formatDate(selectedDate)})</span>
                    </div>
                    <div className={styles.panelContent}>
                        <div className={styles.taskList}>
                            {selectedDateEvents.filter(isWorkPanelEvent).map(event => {
                                const { prefix, content } = parseEventTitle(event.title);
                                return (
                                    <div
                                        key={event.id}
                                        className={styles.taskItem}
                                        style={{ borderLeft: `4px solid ${eventColor(event)}`, cursor: 'pointer' }}
                                        onClick={() => handleTaskClick(event)}
                                    >
                                        <button
                                            className={styles.deleteBtn}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                showConfirm('삭제하시겠습니까?', () => {
                                                    setSelectedScheduleId(event.id);
                                                    handleDelete(event.id);
                                                }, true);
                                            }}
                                        >
                                            <X size={12} />
                                        </button>
                                        <div className={styles.taskHeader} style={{ marginBottom: 4 }}>
                                            {prefix ? (
                                                <span className={styles.taskType} style={{ color: eventColor(event), fontSize: '13px', fontWeight: 'bold' }}>
                                                    {prefix}
                                                </span>
                                            ) : (
                                                // Fallback for events without standard prefix
                                                <span className={styles.taskType} style={{ color: eventColor(event) }}>
                                                    [일정]
                                                </span>
                                            )}
                                            <span style={{ fontSize: 11, color: '#495057', marginRight: 8, fontWeight: 600 }}>{event.userName}</span>
                                            <span style={{ fontSize: 11, color: '#868e96', marginLeft: 'auto' }}>{event.date}</span>
                                        </div>
                                        <div className={styles.taskTitle} style={{ fontWeight: 500 }}>{content}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Bottom: Schedule Details */}
                <div className={styles.panelSection} style={{ flex: 1 }}>
                    <div className={styles.panelHeader}>
                        <span>일정내역 ({formatDate(selectedDate)})</span>
                        <div className={styles.scheduleActions}>
                            <button
                                className={styles.actionLink}
                                onClick={handleOpenModal}
                                style={{ background: 'none', border: 'none', padding: 0 }}
                            >
                                <Plus size={12} /> 일정추가
                            </button>
                        </div>
                    </div>
                    <div className={styles.panelContent}>
                        {selectedDateEvents.filter(event => !isWorkPanelEvent(event)).length === 0 ? (
                            <div style={{ padding: 12, textAlign: 'center', color: '#adb5bd', fontSize: 12 }}>
                                등록된 일정이 없습니다.
                            </div>
                        ) : (
                            <div className={styles.taskList}>
                                {selectedDateEvents.filter(event => !isWorkPanelEvent(event)).map(event => (
                                    <div
                                        key={event.id}
                                        className={styles.taskItem}
                                        style={{ borderLeft: `4px solid ${eventColor(event)}`, cursor: 'pointer' }}
                                        onClick={() => handleEventClick(event)}
                                    >
                                        <button
                                            className={styles.deleteBtn}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                showConfirm('삭제하시겠습니까?', () => {
                                                    setSelectedScheduleId(event.id);
                                                    handleDelete(event.id);
                                                }, true);
                                            }}
                                        >
                                            <X size={12} />
                                        </button>
                                        <div className={styles.taskTitle} style={{ display: 'flex', alignItems: 'center' }}>
                                            <span
                                                style={{
                                                    backgroundColor: getStatusColor(event.status || 'schedule'),
                                                    color: 'white',
                                                    fontSize: '11px',
                                                    padding: '2px 8px',
                                                    borderRadius: '12px',
                                                    marginRight: 8,
                                                    fontWeight: 600,
                                                    display: 'inline-block',
                                                    whiteSpace: 'nowrap'
                                                }}
                                            >
                                                {getStatusLabel(event.status || 'schedule')}
                                            </span>
                                            {event.title}
                                        </div>
                                        <div style={{ fontSize: 11, color: '#868e96', display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                                            <span>{event.userName}</span>
                                            <span>{event.date}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>}

            {/* Add Schedule Modal */}
            {isModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>{selectedScheduleId ? '일정 수정' : '개인일정 추가'}</div>
                        <div className={styles.modalBody}>
                            <table className={styles.formTable}>
                                <tbody>
                                    <tr>
                                        <th>제목</th>
                                        <td>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <input
                                                    type="text"
                                                    value={formData.title}
                                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                                    style={{ flex: 1, padding: '4px', border: '1px solid #ced4da', borderRadius: '4px' }}
                                                />
                                                <div className={styles.radioGroup} style={{ marginLeft: 12 }}>
                                                    <label className={`${styles.scopeToggleBtn} ${formData.scope === 'public' ? styles.scopePublic : ''}`}>
                                                        <input
                                                            type="radio"
                                                            name="scope"
                                                            checked={formData.scope === 'public'}
                                                            onChange={() => setFormData({ ...formData, scope: 'public' })}
                                                            style={{ display: 'none' }}
                                                        /> 업무
                                                    </label>
                                                    <label className={`${styles.scopeToggleBtn} ${formData.scope === 'personal' ? styles.scopePersonal : ''}`}>
                                                        <input
                                                            type="radio"
                                                            name="scope"
                                                            checked={formData.scope === 'personal'}
                                                            onChange={() => setFormData({ ...formData, scope: 'personal' })}
                                                            style={{ display: 'none' }}
                                                        /> 개인
                                                    </label>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <th>날짜</th>
                                        <td>
                                            <div className={styles.formRow}>
                                                <input
                                                    type="date"
                                                    value={formData.date}
                                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                                    style={{ padding: '4px', border: '1px solid #ced4da', borderRadius: '4px' }}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <th>진행상태</th>
                                        <td>
                                            <div className={styles.radioGroup} style={{ display: 'flex', gap: 10 }}>
                                                {['progress', 'postponed', 'canceled', 'completed', 'schedule'].map(status => {
                                                    let label = '';
                                                    let color = '';
                                                    switch (status) {
                                                        case 'progress': label = '진행'; color = '#1c7ed6'; break;
                                                        case 'postponed': label = '연기'; color = '#7950f2'; break;
                                                        case 'canceled': label = '취소'; color = '#fab005'; break;
                                                        case 'completed': label = '완료'; color = '#c92a2a'; break;
                                                        case 'schedule': label = '일정'; color = '#868e96'; break;
                                                    }
                                                    return (
                                                        <label key={status} className={styles.statusRadioLabel}>
                                                            <input
                                                                type="radio"
                                                                name="status"
                                                                checked={formData.status === status}
                                                                onChange={() => setFormData({ ...formData, status })}
                                                                style={{ marginRight: 6 }}
                                                            />
                                                            <span className={styles.statusBadge} style={{ backgroundColor: color }}>{label}</span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <th style={{ verticalAlign: 'top', paddingTop: 12 }}>상세내용</th>
                                        <td>
                                            <div className={styles.detailsBox}>
                                                <textarea
                                                    value={formData.details}
                                                    onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                                                    className={styles.detailsTextarea}
                                                ></textarea>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div className={styles.modalFooter}>
                            {selectedScheduleId && (
                                <button className={`${styles.footerBtn} ${styles.closeBtn}`} style={{ marginRight: 'auto', backgroundColor: '#fa5252', color: 'white', border: 'none' }} onClick={() => showConfirm('정말 삭제하시겠습니까?', () => handleDelete(), true)}>
                                    <span style={{ fontSize: 14 }}>🗑️</span> 삭제
                                </button>
                            )}
                            <button className={`${styles.footerBtn} ${styles.saveBtn}`} onClick={handleSave}>
                                <span style={{ fontSize: 14 }}>💾</span> 작성완료
                            </button>
                            <button className={`${styles.footerBtn} ${styles.closeBtn}`} onClick={() => setIsModalOpen(false)}>
                                <X size={14} /> 창 닫기
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                message={confirmModal.message}
                isDanger={confirmModal.isDanger}
            />
            <AlertModal
                isOpen={alertConfig.isOpen}
                onClose={closeAlert}
                message={alertConfig.message}
                type={alertConfig.type}
            />
        </div>
    );
}
