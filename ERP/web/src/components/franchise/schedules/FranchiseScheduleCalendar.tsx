"use client";

import { CheckCircle2 } from 'lucide-react';
import { getMonthDays, toDateKey } from './franchiseScheduleViewModel';
import type { FranchiseScheduleItem } from './franchiseScheduleViewModel';
import styles from './FranchiseSchedulePage.module.css';

type CalendarProps = {
    readonly monthDate: Date;
    readonly selectedDate: string;
    readonly items: readonly FranchiseScheduleItem[];
    readonly focusId: string;
    readonly onSelectDate: (date: string) => void;
};

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;

function getStatusTone(items: readonly FranchiseScheduleItem[]): string {
    if (items.some(item => item.status === '지연')) return styles.dayLate;
    if (items.some(item => item.status === '진행중')) return styles.dayActive;
    if (items.every(item => item.status === '완료')) return styles.dayDone;
    return styles.dayPlanned;
}

export function FranchiseScheduleCalendar({ monthDate, selectedDate, items, focusId, onSelectDate }: CalendarProps) {
    const month = monthDate.getMonth();
    const days = getMonthDays(monthDate);
    const today = toDateKey(new Date());

    return (
        <section className={styles.calendarPanel} aria-label="월간 일정 달력">
            <div className={styles.weekHeader}>
                {WEEKDAYS.map((day, index) => <span className={index === 0 ? styles.weekSunday : index === 6 ? styles.weekSaturday : ''} key={day}>{day}</span>)}
            </div>
            <div className={styles.calendarGrid}>
                {days.map((day, index) => {
                    const dayItems = items.filter(item => item.date === day);
                    const isSelected = day === selectedDate;
                    const isCurrentMonth = Number(day.slice(5, 7)) === month + 1;
                    const weekday = index % 7;
                    return (
                        <button
                            key={day}
                            type="button"
                            className={`${styles.dayCell} ${isSelected ? styles.daySelected : ''} ${day === today ? styles.dayToday : ''} ${weekday === 0 ? styles.daySunday : ''} ${weekday === 6 ? styles.daySaturday : ''} ${isCurrentMonth ? '' : styles.dayMuted}`}
                            onClick={() => onSelectDate(day)}
                            aria-pressed={isSelected}
                        >
                            <span className={styles.dayNumber}>{Number(day.slice(8, 10))}</span>
                            {dayItems.length > 0 && (
                                <span className={`${styles.dayCount} ${getStatusTone(dayItems)}`}>
                                    {dayItems.length}
                                </span>
                            )}
                            {dayItems.some(item => item.id === focusId) && (
                                <span className={styles.focusMark} title="연결된 결재 문서">
                                    <CheckCircle2 size={14} />
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </section>
    );
}
