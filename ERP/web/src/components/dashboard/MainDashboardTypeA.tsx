"use client";

import React from 'react';
import { ChevronRight, Plus } from 'lucide-react';
import { MainDashboardTypeAStats, type KpiMetrics } from './MainDashboardTypeAStats';

type DashboardSchedule = { readonly id?: string | number; readonly time?: string; readonly title?: string; readonly location?: string; };

type DashboardNotice = { readonly id?: string | number; readonly title?: string; readonly createdAt?: string; readonly type?: string; readonly isPinned?: boolean; };

type MainDashboardTypeAProps = {
    readonly requesterId: string;
    readonly companyName: string;
    readonly metrics?: KpiMetrics;
    readonly schedules: readonly DashboardSchedule[];
    readonly notices: readonly DashboardNotice[];
    readonly memo: string;
    readonly onMemoChange: (memo: string) => void;
    readonly onOpenNoticeModal: () => void;
    readonly onNavigate: (href: string) => void;
};

export function MainDashboardTypeA({
    requesterId,
    companyName,
    metrics,
    schedules,
    notices,
    memo,
    onMemoChange,
    onOpenNoticeModal,
    onNavigate
}: MainDashboardTypeAProps) {
    const visibleSchedules = schedules.slice(0, 5);
    const visibleNotices = notices.slice(0, 5);

    return (
        <div className="mb-8">
            <MainDashboardTypeAStats
                requesterId={requesterId}
                companyName={companyName}
                metrics={metrics}
                onNavigate={onNavigate}
            />

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <div className="flex flex-col">
                    <section aria-label="예정된 일정">
                        <SectionHeader
                            icon="📅"
                            title="예정된 일정"
                            actionLabel="더보기"
                            onAction={() => onNavigate('/schedule')}
                        />
                        <div className="bg-white rounded-2xl border border-[#f1f3f5] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                            {visibleSchedules.length > 0 ? (
                                visibleSchedules.map((schedule, index) => (
                                    <div
                                        key={buildRowKey('schedule', schedule.id, index)}
                                        className="flex items-center gap-4 px-5 py-5 border-b border-[#f1f3f5] last:border-b-0"
                                    >
                                        <div className="w-[50px] text-sm font-bold text-[#495057]">{schedule.time || '-'}</div>
                                        <div className="min-w-0 flex-1">
                                            <div className="truncate text-[15px] font-semibold text-[#343a40]">{schedule.title || '일정'}</div>
                                            <div className="mt-1 truncate text-[13px] text-[#868e96]">{schedule.location || '장소 미정'}</div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="px-5 py-10 text-center text-sm text-[#adb5bd]">예정된 일정이 없습니다.</div>
                            )}
                        </div>
                    </section>

                    <section className="mt-8" aria-label="간편 메모">
                        <SectionHeader icon="📌" title="간편 메모" />
                        <div className="bg-[#fff9db] rounded-2xl border border-[#f1f3f5] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                            <textarea
                                className="h-[120px] w-full resize-none border-0 bg-transparent text-sm leading-[1.6] text-[#495057] outline-none placeholder:text-[#adb5bd]"
                                placeholder="급한 메모를 남겨보세요..."
                                value={memo}
                                onChange={event => onMemoChange(event.target.value)}
                            />
                        </div>
                    </section>
                </div>

                <section className="flex flex-col" aria-label="공지사항">
                    <SectionHeader
                        icon="📢"
                        title="공지사항"
                        actionLabel="전체보기"
                        onAction={() => onNavigate('/board/notices')}
                        extraAction={onOpenNoticeModal}
                    />
                    <div className="bg-white rounded-2xl border border-[#f1f3f5] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                        {visibleNotices.length > 0 ? (
                            visibleNotices.map((notice, index) => (
                                <button
                                    key={buildRowKey('notice', notice.id, index)}
                                    type="button"
                                    className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left border-b border-[#f1f3f5] last:border-b-0"
                                    onClick={() => {
                                        if (notice.id !== undefined) onNavigate(`/board/notices/${notice.id}`);
                                    }}
                                >
                                    <span className="min-w-0 flex items-center gap-2">
                                        <NoticeBadge type={notice.type} />
                                        <span className="truncate text-sm text-[#343a40]">
                                            {notice.isPinned ? '고정 · ' : ''}
                                            {notice.title || '공지사항'}
                                        </span>
                                    </span>
                                    <span className="shrink-0 text-xs text-[#adb5bd]">{notice.createdAt || ''}</span>
                                </button>
                            ))
                        ) : (
                            <div className="px-5 py-10 text-center text-[13px] text-[#adb5bd]">등록된 공지사항이 없습니다.</div>
                        )}
                    </div>
                </section>
            </section>
        </div>
    );
}

function SectionHeader({
    icon,
    title,
    actionLabel,
    onAction,
    extraAction
}: {
    readonly icon: string;
    readonly title: string;
    readonly actionLabel?: string;
    readonly onAction?: () => void;
    readonly extraAction?: () => void;
}) {
    return (
        <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <h3 className="m-0 text-[18px] font-bold text-[#343a40]">{icon} {title}</h3>
                {extraAction ? (
                    <button
                        type="button"
                        className="flex h-6 w-6 items-center justify-center rounded-full border-0 bg-[#e7f5ff] p-0 text-[#339af0]"
                        title="공지사항 작성"
                        onClick={extraAction}
                    >
                        <Plus size={14} strokeWidth={3} />
                    </button>
                ) : null}
            </div>
            {actionLabel && onAction ? (
                <button
                    type="button"
                    className="flex items-center gap-1 border-0 bg-transparent p-0 text-[13px] text-[#868e96]"
                    onClick={onAction}
                >
                    {actionLabel} <ChevronRight size={14} />
                </button>
            ) : null}
        </div>
    );
}

function NoticeBadge({ type }: { readonly type?: string }) {
    if (type === 'system') {
        return <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold text-[#fa5252] bg-[#fff5f5]">전체</span>;
    }
    if (type === 'team') {
        return <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold text-[#1971c2] bg-[#e7f5ff]">팀</span>;
    }
    return null;
}

function buildRowKey(prefix: string, id: string | number | undefined, index: number) {
    return id === undefined ? `${prefix}-${index}` : `${prefix}-${String(id)}-${index}`;
}
