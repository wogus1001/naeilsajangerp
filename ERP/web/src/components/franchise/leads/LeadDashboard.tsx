"use client";

import {
    Bar,
    BarChart,
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';
import type { FranchiseLeadStatus } from '@/lib/franchise-leads';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';

type StageDatum = {
    readonly status: FranchiseLeadStatus;
    readonly count: number;
};

type SourceDatum = {
    readonly source: string;
    readonly count: number;
};

type TrendDatum = {
    readonly date: string;
    readonly count: number;
};

type LeadDashboardProps = {
    readonly candidateCount: number;
    readonly rawIntakeCount: number;
    readonly activeConsultingCount: number;
    readonly dueContactCount: number;
    readonly overdueContactCount: number;
    readonly conversionRate: number;
    readonly hotCount: number;
    readonly statusFilter: '전체' | FranchiseLeadStatus;
    readonly stageData: readonly StageDatum[];
    readonly sourceChartData: readonly SourceDatum[];
    readonly trendData: readonly TrendDatum[];
    readonly onStatusFilterChange: (status: '전체' | FranchiseLeadStatus) => void;
};

export function LeadDashboard({
    candidateCount,
    rawIntakeCount,
    activeConsultingCount,
    dueContactCount,
    overdueContactCount,
    conversionRate,
    hotCount,
    statusFilter,
    stageData,
    sourceChartData,
    trendData,
    onStatusFilterChange
}: LeadDashboardProps) {
    const maxStageCount = Math.max(1, ...stageData.map(item => item.count));
    const mutableStageData = [...stageData];
    const mutableSourceChartData = [...sourceChartData];
    const mutableTrendData = [...trendData];

    return (
        <>
            <section className={styles.kpiGrid}>
                <article className={styles.kpiCard}>
                    <span>총 후보자</span>
                    <strong>{candidateCount.toLocaleString()}</strong>
                    <small>파이프라인 관리 대상</small>
                </article>
                <article className={styles.kpiCard}>
                    <span>1차 유입 DB</span>
                    <strong>{rawIntakeCount.toLocaleString()}</strong>
                    <small>의사 확인 전 원천 DB</small>
                </article>
                <article className={styles.kpiCard}>
                    <span>상담 진행</span>
                    <strong>{activeConsultingCount.toLocaleString()}</strong>
                    <small>상담중 + 가맹검토</small>
                </article>
                <article className={styles.kpiCardAccent}>
                    <span>오늘 연락</span>
                    <strong>{dueContactCount.toLocaleString()}</strong>
                    <small>오늘이거나 이미 지난 연락</small>
                </article>
                <article className={styles.kpiCard}>
                    <span>연락 지연</span>
                    <strong>{overdueContactCount.toLocaleString()}</strong>
                    <small>다음 연락일이 지난 후보</small>
                </article>
                <article className={styles.kpiCard}>
                    <span>계약 전환율</span>
                    <strong>{conversionRate}%</strong>
                    <small>계약예정/완료 기준</small>
                </article>
                <article className={styles.kpiCard}>
                    <span>즉시상담</span>
                    <strong>{hotCount.toLocaleString()}</strong>
                    <small>빠른 연락 필요 후보</small>
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
                            <button className={styles.clearStageButton} onClick={() => onStatusFilterChange('전체')}>
                                전체 보기
                            </button>
                        )}
                    </div>
                    <div className={styles.stageStrip}>
                        {stageData.map((item, index) => (
                            <button
                                key={item.status}
                                className={statusFilter === item.status ? styles.stageCardActive : styles.stageCard}
                                onClick={() => onStatusFilterChange(statusFilter === item.status ? '전체' : item.status)}
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
                            <BarChart data={mutableStageData}>
                                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e5e7eb" />
                                <XAxis dataKey="status" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                                <Tooltip cursor={{ fill: '#f3f4f6' }} />
                                <Bar dataKey="count" fill="#3182f6" radius={[8, 8, 0, 0]} />
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
                            <ResponsiveContainer width="100%" height={230}>
                                <BarChart data={mutableSourceChartData} layout="vertical" margin={{ left: 12, right: 12 }}>
                                    <CartesianGrid strokeDasharray="4 4" horizontal={false} stroke="#e5e7eb" />
                                    <XAxis type="number" allowDecimals={false} hide />
                                    <YAxis dataKey="source" type="category" width={78} tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                                    <Tooltip cursor={{ fill: '#f3f4f6' }} />
                                    <Bar dataKey="count" fill="#00a66a" radius={[0, 8, 8, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className={styles.emptyChart}>유입 데이터가 없습니다.</div>
                        )}
                    </div>
                </article>

                <article className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <div>
                            <h2>최근 7일 유입</h2>
                            <p>원천 DB와 후보자 유입 추이</p>
                        </div>
                    </div>
                    <div className={styles.chartBoxSmall}>
                        <ResponsiveContainer width="100%" height={230}>
                            <LineChart data={mutableTrendData}>
                                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e5e7eb" />
                                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                                <Tooltip />
                                <Line type="monotone" dataKey="count" stroke="#3182f6" strokeWidth={3} dot={{ r: 3 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </article>
            </section>
        </>
    );
}
