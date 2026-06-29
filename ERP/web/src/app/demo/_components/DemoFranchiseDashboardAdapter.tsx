'use client';

import React from 'react';
import pageStyles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import { ChevronRight, FileCheck2, Link2, MapPinned, Plus, Users } from 'lucide-react';
import type { DemoActionHandler, DemoScreenId } from '../demoTypes';
import { DEMO_SAMPLE_LEADS } from './DemoLeadSampleData';
import { DEMO_LOCATION_MASTER_ITEMS } from './DemoFranchiseSampleData';
import { DemoGuideTarget, DemoGuidedLayout } from './DemoScreenGuide';
import styles from '../demo.module.css';

type DemoFranchiseDashboardAdapterProps = {
    readonly onScreenChange: (screen: DemoScreenId) => void;
    readonly onSimulate: DemoActionHandler;
};

export function DemoFranchiseDashboardAdapter({ onScreenChange, onSimulate }: DemoFranchiseDashboardAdapterProps) {
    const [memo, setMemo] = React.useState('');
    const candidateLeads = DEMO_SAMPLE_LEADS.filter(lead => lead.leadStage === 'candidate');

    return (
        <div className={pageStyles.pageShell} data-demo-id="franchise-dashboard">
            <DemoGuidedLayout screen="dashboard" onScreenChange={onScreenChange}>
                <section className={styles.demoMainDashboardHero}>
                    <div>
                        <h1>안녕하세요, 관리자님!</h1>
                        <p>오늘도 성공적인 비즈니스를 응원합니다.</p>
                    </div>
                    <span>2026년 6월 25일 목요일</span>
                </section>
                <DemoGuideTarget marker={1} targetId="dashboard-home-kpis" label="KPI 확인">
                    <section className={styles.demoMainKpiGrid} aria-label="데모 메인 대시보드 주요 지표">
                        <DemoMainKpiCard
                            label="모객 DB"
                            value={DEMO_SAMPLE_LEADS.length.toLocaleString()}
                            unit="명"
                            caption="전체 가맹 희망자"
                            tone="purple"
                            icon={<Users size={24} aria-hidden="true" />}
                            onClick={() => onScreenChange('leadDb')}
                        />
                        <DemoMainKpiCard
                            label="계약 가능"
                            value={candidateLeads.filter(lead => lead.disclosureSummary?.remainingDays === 0).length.toLocaleString()}
                            unit="명"
                            caption="14일 기준 충족"
                            tone="yellow"
                            icon={<FileCheck2 size={24} aria-hidden="true" />}
                            onClick={() => onScreenChange('contractOwners')}
                        />
                        <DemoMainKpiCard
                            label="출점 후보지"
                            value={DEMO_LOCATION_MASTER_ITEMS.length.toLocaleString()}
                            unit="건"
                            caption="검토중·오픈준비"
                            tone="green"
                            icon={<MapPinned size={24} aria-hidden="true" />}
                            onClick={() => onScreenChange('location')}
                        />
                        <DemoMainKpiCard
                            label="연결 필요"
                            value={DEMO_SAMPLE_LEADS.filter(lead => !lead.locationLinks?.length).length.toLocaleString()}
                            unit="건"
                            caption="후보지 매칭 전"
                            tone="orange"
                            icon={<Link2 size={24} aria-hidden="true" />}
                            onClick={() => onScreenChange('locationMap')}
                        />
                    </section>
                </DemoGuideTarget>
                <section className={styles.demoMainWorkGrid}>
                    <div className={styles.demoMainWorkColumn}>
                        <DemoGuideTarget marker={2} targetId="dashboard-home-schedule" label="일정 확인">
                            <DemoMainSectionHeader title="예정된 일정" actionLabel="더보기" onAction={() => onSimulate('샘플 일정 더보기')} />
                            <div className={styles.demoMainPanel}>
                                {[
                                    { time: '10:30', title: '강남역 후보지 현장 확인', location: '서울 강남구' },
                                    { time: '14:00', title: '최하늘 점주 오픈 준비 점검', location: '판교테크노점' },
                                    { time: '16:30', title: '정보공개서 수령 확인 콜', location: '담당자 김담당' }
                                ].map(item => (
                                    <button key={`${item.time}-${item.title}`} type="button" className={styles.demoMainScheduleRow} onClick={() => onSimulate(`${item.title} 확인`)}>
                                        <strong>{item.time}</strong>
                                        <span>
                                            <b>{item.title}</b>
                                            <small>{item.location}</small>
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </DemoGuideTarget>
                        <DemoGuideTarget marker={4} targetId="dashboard-home-memo" label="간편 메모">
                            <div className={styles.demoMainMemoBlock}>
                                <DemoMainSectionHeader title="간편 메모" />
                                <textarea
                                    value={memo}
                                    onChange={event => setMemo(event.target.value)}
                                    placeholder="급한 메모를 남겨보세요..."
                                />
                            </div>
                        </DemoGuideTarget>
                    </div>
                    <DemoGuideTarget marker={3} targetId="dashboard-home-notices" label="공지사항 확인">
                        <div>
                            <DemoMainSectionHeader title="공지사항" actionLabel="전체보기" onAction={() => onSimulate('샘플 공지사항 전체보기')} extraAction={() => onSimulate('샘플 공지사항 작성')} />
                            <div className={styles.demoMainPanel}>
                                {[
                                    { badge: '팀', title: '계약 완료 상세 오픈 준비 탭 안내', date: '06/25/2026' },
                                    { badge: '팀', title: '물건지 지도 반경분석 사용 가이드', date: '06/25/2026' },
                                    { badge: '전체', title: '데모 계정은 샘플 데이터만 표시됩니다.', date: '06/24/2026' }
                                ].map(notice => (
                                    <button key={notice.title} type="button" className={styles.demoMainNoticeRow} onClick={() => onSimulate(`${notice.title} 열기`)}>
                                        <span>
                                            <em>{notice.badge}</em>
                                            <b>{notice.title}</b>
                                        </span>
                                        <small>{notice.date}</small>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </DemoGuideTarget>
                </section>
            </DemoGuidedLayout>
        </div>
    );
}

function DemoMainKpiCard({
    label,
    value,
    unit,
    caption,
    tone,
    icon,
    onClick
}: {
    readonly label: string;
    readonly value: string;
    readonly unit: string;
    readonly caption: string;
    readonly tone: 'purple' | 'yellow' | 'green' | 'orange';
    readonly icon: React.ReactNode;
    readonly onClick: () => void;
}) {
    return (
        <button type="button" className={styles.demoMainKpiCard} onClick={onClick}>
            <span>
                <b>{label}</b>
                <strong>{value}<small>{unit}</small></strong>
                <em>{caption}</em>
            </span>
            <i className={styles[`demoMainKpiIcon_${tone}`]}>{icon}</i>
        </button>
    );
}

function DemoMainSectionHeader({
    title,
    actionLabel,
    onAction,
    extraAction
}: {
    readonly title: string;
    readonly actionLabel?: string;
    readonly onAction?: () => void;
    readonly extraAction?: () => void;
}) {
    return (
        <div className={styles.demoMainSectionHeader}>
            <div>
                <h2>{title}</h2>
                {extraAction ? (
                    <button type="button" onClick={extraAction} aria-label={`${title} 작성`}>
                        <Plus size={14} strokeWidth={3} aria-hidden="true" />
                    </button>
                ) : null}
            </div>
            {actionLabel && onAction ? (
                <button type="button" onClick={onAction}>
                    {actionLabel}
                    <ChevronRight size={14} aria-hidden="true" />
                </button>
            ) : null}
        </div>
    );
}
