"use client";

import { CalendarPlus, Check, ExternalLink, LockKeyhole, NotebookText, Pencil, Plus, Trash2, UserRound, UsersRound } from 'lucide-react';
import { getFranchiseScheduleSourceLabel } from './franchiseScheduleViewModel';
import type { FranchiseScheduleItem, FranchiseScheduleStatus } from './franchiseScheduleViewModel';
import styles from './FranchiseSchedulePage.module.css';

type DayListProps = {
    readonly selectedDate: string;
    readonly items: readonly FranchiseScheduleItem[];
    readonly onCreate: () => void;
    readonly onEdit: (item: FranchiseScheduleItem) => void;
    readonly onComplete: (item: FranchiseScheduleItem) => void;
    readonly onDelete: (item: FranchiseScheduleItem) => void;
};

const WEEKDAYS = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'] as const;

function getDateLabel(date: string): { readonly label: string; readonly year: string } {
    const [year, month, day] = date.split('-').map(Number);
    const weekday = year && month && day ? WEEKDAYS[new Date(year, month - 1, day).getDay()] : '';
    return {
        label: year && month && day ? `${month}월 ${day}일 ${weekday}` : date,
        year: year ? `${year}년` : ''
    };
}

function getStatusClass(status: FranchiseScheduleStatus): string {
    if (status === '완료') return styles.statusDone;
    if (status === '지연') return styles.statusLate;
    if (status === '진행중') return styles.statusActive;
    if (status === '취소') return styles.statusCancelled;
    return styles.statusPlanned;
}

export function FranchiseScheduleDayList({ selectedDate, items, onCreate, onEdit, onComplete, onDelete }: DayListProps) {
    const dateLabel = getDateLabel(selectedDate);

    return (
        <section className={styles.dayList} aria-label="선택 날짜 일정">
            <header className={styles.dayListHeader}>
                <div>
                    <span>{dateLabel.year}</span>
                    <h2>{dateLabel.label}</h2>
                </div>
                <strong>{items.length}건</strong>
            </header>

            {items.length === 0 ? (
                <div className={styles.dayEmpty}>
                    <CalendarPlus size={24} aria-hidden="true" />
                    <strong>이 날짜에는 일정이 없습니다.</strong>
                    <button type="button" onClick={onCreate}><Plus size={16} /> 일정 등록</button>
                </div>
            ) : (
                <div className={styles.scheduleList}>
                    {items.map(item => (
                        <article className={styles.scheduleRow} key={item.id}>
                            <div className={styles.scheduleHeading}>
                                <span className={getStatusClass(item.status)}>{item.status}</span>
                                <strong>{item.title}</strong>
                            </div>
                            <div className={styles.rowMeta}>
                                <span className={item.visibility === 'personal' ? styles.personalBadge : styles.sharedBadge}>
                                    {item.visibility === 'personal' ? <LockKeyhole size={12} /> : <UsersRound size={12} />}
                                    {item.visibility === 'personal' ? '개인 일정' : '공유 일정'}
                                </span>
                                <span>{getFranchiseScheduleSourceLabel(item.source)}</span>
                            </div>
                            <dl className={styles.scheduleDetails}>
                                <div>
                                    <dt><UserRound size={14} /> 담당자</dt>
                                    <dd>{item.assigneeName}</dd>
                                </div>
                                <div>
                                    <dt><NotebookText size={14} /> 메모</dt>
                                    <dd className={item.details ? '' : styles.emptyDetail}>{item.details || '메모 없음'}</dd>
                                </div>
                            </dl>
                            {item.source === 'manual' && (
                                <div className={styles.rowActions}>
                                    <button type="button" onClick={() => onEdit(item)}><Pencil size={15} /> 수정</button>
                                    {item.status !== '완료' && <button type="button" onClick={() => onComplete(item)}><Check size={15} /> 완료</button>}
                                    <button className={styles.rowDeleteButton} type="button" onClick={() => onDelete(item)}><Trash2 size={15} /> 삭제</button>
                                </div>
                            )}
                            {item.source !== 'manual' && item.actionUrl && (
                                <div className={styles.rowActions}>
                                    <a href={item.actionUrl}><ExternalLink size={15} /> 업무 열기</a>
                                </div>
                            )}
                        </article>
                    ))}
                </div>
            )}
        </section>
    );
}
