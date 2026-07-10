'use client';

import React from 'react';
import { Printer } from 'lucide-react';
import { buildLaborScenarioSummaries, type LaborScenarioKey } from '@/lib/franchise-labor-scenario-summary';
import type { LaborPlanResult } from '@/lib/franchise-labor-planning';
import { printLaborScheduleReport } from './LaborPlanningReportPrint';
import styles from './LaborPlanningPanel.module.css';

function won(value: number): string {
    return `${Math.round(value).toLocaleString('ko-KR')}원`;
}

function manwon(value: number): string {
    return `${Math.round(value / 10_000).toLocaleString('ko-KR')}만원`;
}

type LaborPlanningResultViewProps = {
    readonly locationName: string;
    readonly planTitle: string;
    readonly baseResult: LaborPlanResult | null;
    readonly result: LaborPlanResult | null;
    readonly selectedScenarioKey: LaborScenarioKey;
    readonly onSelectScenario: (scenarioKey: LaborScenarioKey) => void;
};

export function LaborPlanningResultView({
    locationName,
    planTitle,
    baseResult,
    result,
    selectedScenarioKey,
    onSelectScenario
}: LaborPlanningResultViewProps) {
    if (!baseResult || !result) {
        return (
            <section className={styles.section}>
                <div className={styles.sectionHeader}>
                    <h3>추천 인력 구성</h3>
                    <p>매출과 운영 조건을 입력하면 권장 구성이 계산됩니다.</p>
                </div>
                <div className={styles.emptyState}>아직 계산 결과가 없습니다.</div>
            </section>
        );
    }

    const scenarios = buildLaborScenarioSummaries(baseResult);
    const selectedScenario = scenarios.find(scenario => scenario.key === selectedScenarioKey) || scenarios[1];
    const handlePrint = () => {
        printLaborScheduleReport({
            locationName,
            planTitle,
            result
        });
    };

    return (
        <section className={styles.section}>
            <div className={styles.sectionHeader}>
                <div>
                    <h3>추천 인력 구성</h3>
                    <p>{result.memo}</p>
                </div>
                <button type="button" className={styles.secondaryButton} onClick={handlePrint}>
                    <Printer size={14} />
                    보고서 저장/인쇄
                </button>
            </div>
            <div className={styles.resultGrid}>
                <div className={styles.metricCard}>
                    <span>월 목표매출</span>
                    <strong>{manwon(result.monthlySalesTarget)}</strong>
                    <small>입력 매출 기준</small>
                </div>
                <div className={styles.metricCard}>
                    <span>월 인건비</span>
                    <strong>{manwon(result.monthlyLaborCost)}</strong>
                    <small>추천 구성 합산</small>
                </div>
                <div className={styles.metricCard}>
                    <span>인건비율</span>
                    <strong>{result.laborRatio}%</strong>
                    <small>목표 {result.targetLaborRatio}%</small>
                </div>
                <div className={styles.metricCard}>
                    <span>총 인원</span>
                    <strong>{result.totalHeadcount}명</strong>
                    <small>점장/직원/알바 포함</small>
                </div>
            </div>
            <div className={styles.scenarioGrid}>
                {scenarios.map(scenario => (
                    <button
                        key={scenario.key}
                        type="button"
                        className={scenario.key === selectedScenarioKey ? styles.scenarioCardSelected : styles.scenarioCard}
                        aria-pressed={scenario.key === selectedScenarioKey}
                        onClick={() => onSelectScenario(scenario.key)}
                    >
                        <div className={styles.scenarioCardHeader}>
                            <div>
                                <strong>{scenario.label}</strong>
                                <span>{scenario.description}</span>
                            </div>
                            <em className={styles[`scenarioBadge${scenario.riskTone}`]}>{scenario.riskLabel}</em>
                        </div>
                        <dl className={styles.scenarioMeta}>
                            <div><dt>월 인건비</dt><dd>{manwon(scenario.monthlyLaborCost)}</dd></div>
                            <div><dt>비율</dt><dd>{scenario.laborRatio}%</dd></div>
                            <div><dt>인원</dt><dd>{scenario.totalHeadcount}명</dd></div>
                        </dl>
                        <div className={styles.scenarioRoleList}>
                            {scenario.roleSummary.filter(role => role.headcount > 0).map(role => (
                                <span key={role.roleType}>{role.label} {role.headcount}명</span>
                            ))}
                        </div>
                    </button>
                ))}
            </div>
            <div className={styles.subSectionHeader}>
                <strong>{selectedScenario?.label || '표준형'} 구성 상세</strong>
                <span>{result.ownerWorks ? '점주/본인 근무 반영' : '유급 점장 기준'} · {result.useBreakTime ? `브레이크 ${result.breakStartTime}-${result.breakEndTime}` : '브레이크 미적용'}</span>
            </div>
            <div className={styles.roleGrid}>
                {result.roles.map(role => (
                    <article key={role.roleType} className={styles.roleCard}>
                        <div>
                            <strong>{role.label}</strong>
                            <span>{role.note}</span>
                        </div>
                        <dl>
                            <div><dt>인원</dt><dd>{role.headcount}명</dd></div>
                            <div><dt>주간시간</dt><dd>{Math.round(role.weeklyHours)}h</dd></div>
                            <div><dt>월 비용</dt><dd>{won(role.monthlyCost)}</dd></div>
                        </dl>
                    </article>
                ))}
            </div>
        </section>
    );
}
