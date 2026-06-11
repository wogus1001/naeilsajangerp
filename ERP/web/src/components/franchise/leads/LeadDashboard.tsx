"use client";

import React from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    LabelList,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';
import type { FranchiseLeadStatus } from '@/lib/franchise-leads';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import type { LeadTrendMode, LeadTrendSeriesData } from './utils';

type StageDatum = {
    readonly status: FranchiseLeadStatus;
    readonly count: number;
};

type SourceDatum = {
    readonly source: string;
    readonly count: number;
};

type ManagerDatum = {
    readonly manager: string;
    readonly count: number;
};

const TREND_MODE_CONFIG: Record<LeadTrendMode, { readonly label: string; readonly title: string; readonly description: string }> = {
    daily: { label: '일별', title: '일별 DB 유입', description: '최근 14일 유입 추이' },
    weekly: { label: '주별', title: '주별 DB 유입', description: '최근 8주 유입 추이' },
    monthly: { label: '월별', title: '월별 DB 유입', description: '최근 6개월 유입 추이' }
};

const TREND_MODE_OPTIONS: readonly LeadTrendMode[] = ['daily', 'weekly', 'monthly'];

type LeadDashboardProps = {
    readonly candidateCount: number;
    readonly rawIntakeCount: number;
    readonly activeConsultingCount: number;
    readonly dueContactCount: number;
    readonly overdueContactCount: number;
    readonly conversionRate: number;
    readonly statusFilter: '전체' | FranchiseLeadStatus;
    readonly stageData: readonly StageDatum[];
    readonly sourceChartData: readonly SourceDatum[];
    readonly managerChartData: readonly ManagerDatum[];
    readonly trendSeriesData: LeadTrendSeriesData;
    readonly onStatusFilterChangeAction: (status: '전체' | FranchiseLeadStatus) => void;
};

export function LeadDashboard({
    candidateCount,
    rawIntakeCount,
    activeConsultingCount,
    dueContactCount,
    overdueContactCount,
    conversionRate,
    statusFilter,
    stageData,
    sourceChartData,
    managerChartData,
    trendSeriesData,
    onStatusFilterChangeAction
}: LeadDashboardProps) {
    const [trendMode, setTrendMode] = React.useState<LeadTrendMode>('daily');
    const maxStageCount = Math.max(1, ...stageData.map(item => item.count));
    const mutableStageData = [...stageData];
    const mutableSourceChartData = [...sourceChartData];
    const mutableManagerChartData = [...managerChartData];
    const mutableTrendData = [...trendSeriesData[trendMode]];
    const trendModeConfig = TREND_MODE_CONFIG[trendMode];

    return (
        <>
            <section className={styles.kpiGrid}>
                <article className={styles.kpiCard}>
                    <span>1차 유입 DB</span>
                    <strong>{rawIntakeCount.toLocaleString()}</strong>
                    <small>의사 확인 전 원천 DB</small>
                </article>
                <article className={styles.kpiCard}>
                    <span>후보자</span>
                    <strong>{candidateCount.toLocaleString()}</strong>
                    <small>파이프라인 관리 대상</small>
                </article>
                <article className={styles.kpiCard}>
                    <span>상담 진행</span>
                    <strong>{activeConsultingCount.toLocaleString()}</strong>
                    <small>상담중 + 가맹검토</small>
                </article>
                <article className={styles.kpiCardAccent}>
                    <span>오늘 연락</span>
                    <strong>{dueContactCount.toLocaleString()}</strong>
                    <small>오늘 예정된 연락</small>
                </article>
                <article className={overdueContactCount > 0 ? styles.kpiCardDanger : styles.kpiCard}>
                    <span>연락 지연</span>
                    <strong>{overdueContactCount.toLocaleString()}</strong>
                    <small>다음 연락일이 지난 후보</small>
                </article>
                <article className={styles.kpiCard}>
                    <span>계약 전환율</span>
                    <strong>{conversionRate}%</strong>
                    <small>계약예정/완료 기준</small>
                </article>
            </section>

            <section className={styles.analyticsGrid}>
                <article className={styles.panelWide}>
                    <div className={styles.panelHeader}>
                        <div>
                            <h2>모객 파이프라인</h2>
                            <p>상태별 후보자 분포와 병목 구간을 확인합니다.</p>
                        </div>
                        {statusFilter !== '전체' && (
                            <button className={styles.clearStageButton} onClick={() => onStatusFilterChangeAction('전체')}>
                                전체 보기
                            </button>
                        )}
                    </div>
                    <div className={styles.stageStrip}>
                        {stageData.map((item, index) => (
                            <button
                                key={item.status}
                                className={statusFilter === item.status ? styles.stageCardActive : styles.stageCard}
                                onClick={() => onStatusFilterChangeAction(statusFilter === item.status ? '전체' : item.status)}
                            >
                                <span>{index + 1}. {item.status}</span>
                                <strong>{item.count.toLocaleString()}</strong>
                                <div className={styles.stageBarTrack}>
                                    <div className={styles.stageBarFill} style={{ width: `${Math.max(4, (item.count / maxStageCount) * 100)}%` }} />
                                </div>
                            </button>
                        ))}
                    </div>
                    <div className={styles.chartBox}>
                        <ResponsiveContainer width="100%" height={180}>
                            <BarChart data={mutableStageData} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e5e7eb" />
                                <XAxis dataKey="status" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                                <YAxis allowDecimals={false} hide />
                                <Tooltip cursor={{ fill: '#f3f4f6' }} />
                                <Bar dataKey="count" fill="#3182f6" radius={[8, 8, 0, 0]}>
                                    <LabelList dataKey="count" position="top" fill="#333d4b" fontSize={11} fontWeight={700} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </article>

                <article className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <div>
                            <h2>유입 경로</h2>
                            <p>채널별 모객 볼륨</p>
                        </div>
                    </div>
                    <div className={styles.chartBoxSmall}>
                        {sourceChartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart data={mutableSourceChartData} layout="vertical" margin={{ left: 12, right: 32 }}>
                                    <CartesianGrid strokeDasharray="4 4" horizontal={false} stroke="#e5e7eb" />
                                    <XAxis type="number" allowDecimals={false} hide />
                                    <YAxis dataKey="source" type="category" width={78} tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                                    <Tooltip cursor={{ fill: '#f3f4f6' }} />
                                    <Bar dataKey="count" fill="#18a5a5" radius={[0, 8, 8, 0]}>
                                        <LabelList dataKey="count" position="right" fill="#333d4b" fontSize={11} fontWeight={700} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className={styles.emptyChart}>유입 데이터가 없습니다.</div>
                        )}
                    </div>
                </article>

                <article className={styles.panel}>
                    <div className={`${styles.panelHeader} ${styles.trendPanelHeader}`}>
                        <div>
                            <h2>{trendModeConfig.title}</h2>
                            <p>{trendModeConfig.description}</p>
                        </div>
                        <div className={styles.chartModeTabs} aria-label="DB 유입 추이 단위">
                            {TREND_MODE_OPTIONS.map(option => (
                                <button
                                    key={option}
                                    type="button"
                                    className={trendMode === option ? styles.chartModeTabActive : styles.chartModeTab}
                                    onClick={() => setTrendMode(option)}
                                >
                                    {TREND_MODE_CONFIG[option].label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className={styles.chartBoxSmall}>
                        <ResponsiveContainer width="100%" height={260}>
                            <LineChart data={mutableTrendData} margin={{ top: 18, right: 16, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e5e7eb" />
                                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                                <YAxis allowDecimals={false} hide />
                                <Tooltip />
                                <Line type="monotone" dataKey="count" stroke="#3182f6" strokeWidth={3} dot={{ r: 3 }}>
                                    <LabelList dataKey="count" position="top" fill="#333d4b" fontSize={11} fontWeight={700} />
                                </Line>
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </article>

                <article className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <div>
                            <h2>담당자별 모객</h2>
                            <p>직원별 후보자 담당 수</p>
                        </div>
                    </div>
                    <div className={styles.chartBoxSmall}>
                        {managerChartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart data={mutableManagerChartData} layout="vertical" margin={{ left: 12, right: 32 }}>
                                    <CartesianGrid strokeDasharray="4 4" horizontal={false} stroke="#e5e7eb" />
                                    <XAxis type="number" allowDecimals={false} hide />
                                    <YAxis dataKey="manager" type="category" width={78} tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                                    <Tooltip cursor={{ fill: '#f3f4f6' }} />
                                    <Bar dataKey="count" fill="#4e5968" radius={[0, 8, 8, 0]}>
                                        <LabelList dataKey="count" position="right" fill="#333d4b" fontSize={11} fontWeight={700} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className={styles.emptyChart}>담당자 데이터가 없습니다.</div>
                        )}
                    </div>
                </article>
            </section>
        </>
    );
}
