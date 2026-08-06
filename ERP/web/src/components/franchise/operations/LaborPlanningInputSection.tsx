'use client';

import React from 'react';
import { Calculator, Save, SlidersHorizontal } from 'lucide-react';
import { LABOR_WEEKDAYS, type LaborSettings, type LaborWeekday } from '@/lib/franchise-labor-planning';
import type { FranchiseLocation } from './types';
import type { LaborPlanForm } from './laborPlanningTypes';
import styles from './LaborPlanningPanel.module.css';

type Props = {
    readonly form: LaborPlanForm;
    readonly settings: LaborSettings;
    readonly locations: readonly FranchiseLocation[];
    readonly schemaReady: boolean;
    readonly isSaving: boolean;
    readonly onUpdateForm: (patch: Partial<LaborPlanForm>) => void;
    readonly onToggleWeekday: (weekday: LaborWeekday) => void;
    readonly onTogglePartTimeWeekday: (weekday: LaborWeekday) => void;
    readonly onCalculate: () => void;
    readonly onSave: () => void;
};

function formatWon(value: number): string {
    return `${Math.round(value).toLocaleString('ko-KR')}원`;
}

export function LaborPlanningInputSection({
    form,
    settings,
    locations,
    schemaReady,
    isSaving,
    onUpdateForm,
    onToggleWeekday,
    onTogglePartTimeWeekday,
    onCalculate,
    onSave
}: Props) {
    const [isAdvancedOpen, setIsAdvancedOpen] = React.useState(false);

    return (
        <section className={styles.section} aria-label="인력 계산 조건">
            <div className={styles.sectionHeader}>
                <h3>매출별 인력 계산</h3>
                <p>핵심 조건으로 빠르게 계산하고, 상세 조건에서 급여·본인 근무·브레이크타임을 조정합니다.</p>
            </div>
            <div className={styles.inputLayout}>
                <div className={styles.formStepHeader}>
                    <div>
                        <strong>빠른 계산</strong>
                        <span>운영점, 매출, 영업시간만 먼저 입력해 추천안을 확인합니다.</span>
                    </div>
                    <button type="button" className={styles.secondaryButton} onClick={() => setIsAdvancedOpen(open => !open)}>
                        <SlidersHorizontal size={14} />
                        {isAdvancedOpen ? '상세 조건 닫기' : '상세 조건 열기'}
                    </button>
                </div>
                <div className={styles.quickGrid}>
                    <label className={styles.field}>
                        <span>운영점</span>
                        <select value={form.locationId} onChange={event => onUpdateForm({ locationId: event.target.value })}>
                            {locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}
                        </select>
                    </label>
                    <label className={styles.field}>
                        <span>월 목표매출(만원)</span>
                        <input type="number" value={form.monthlySalesManwon} onChange={event => onUpdateForm({ monthlySalesManwon: Number(event.target.value) || 0 })} />
                    </label>
                    <label className={styles.field}>
                        <span>오픈</span>
                        <input type="time" value={form.openTime} onChange={event => onUpdateForm({ openTime: event.target.value })} />
                    </label>
                    <label className={styles.field}>
                        <span>마감</span>
                        <input type="time" value={form.closeTime} onChange={event => onUpdateForm({ closeTime: event.target.value })} />
                    </label>
                </div>
                <div className={styles.weekdayRowInline}>
                    {LABOR_WEEKDAYS.map(day => (
                        <button key={day.key} type="button" className={form.operatingWeekdays.includes(day.key) ? styles.weekdayActive : styles.weekday} onClick={() => onToggleWeekday(day.key)}>
                            {day.label}
                        </button>
                    ))}
                </div>
                {isAdvancedOpen ? (
                    <div className={styles.advancedPanel}>
                        <div className={styles.formGrid}>
                            <label className={styles.field}>
                                <span>세팅안 이름</span>
                                <input value={form.title} onChange={event => onUpdateForm({ title: event.target.value })} />
                            </label>
                            <label className={styles.field}>
                                <span>목표 인건비율(%)</span>
                                <input type="number" value={form.targetLaborRatio} onChange={event => onUpdateForm({ targetLaborRatio: Number(event.target.value) || 0 })} />
                            </label>
                            <label className={styles.switchField}>
                                <input type="checkbox" checked={form.ownerWorks} onChange={event => onUpdateForm({ ownerWorks: event.target.checked })} />
                                <span>점주/본인 근무 포함</span>
                                <small>유급 점장 필요 인원을 우선 줄입니다.</small>
                            </label>
                            <label className={styles.switchField}>
                                <input type="checkbox" checked={form.useBreakTime} onChange={event => onUpdateForm({ useBreakTime: event.target.checked })} />
                                <span>브레이크타임 적용</span>
                                <small>기본 15:00-17:00, 필요 시 조정합니다.</small>
                            </label>
                            <label className={styles.field}>
                                <span>브레이크 시작</span>
                                <input type="time" value={form.breakStartTime} disabled={!form.useBreakTime} onChange={event => onUpdateForm({ breakStartTime: event.target.value })} />
                            </label>
                            <label className={styles.field}>
                                <span>브레이크 종료</span>
                                <input type="time" value={form.breakEndTime} disabled={!form.useBreakTime} onChange={event => onUpdateForm({ breakEndTime: event.target.value })} />
                            </label>
                            <label className={styles.field}>
                                <span>점장 급여(만원)</span>
                                <input type="number" value={form.managerMonthlySalaryManwon} onChange={event => onUpdateForm({ managerMonthlySalaryManwon: Number(event.target.value) || 0 })} />
                            </label>
                            <label className={styles.field}>
                                <span>직원 급여(만원)</span>
                                <input type="number" value={form.staffMonthlySalaryManwon} onChange={event => onUpdateForm({ staffMonthlySalaryManwon: Number(event.target.value) || 0 })} />
                            </label>
                            <label className={styles.field}>
                                <span>알바 시급</span>
                                <input type="number" value={form.partTimeHourlyWage} onChange={event => onUpdateForm({ partTimeHourlyWage: Number(event.target.value) || 0 })} />
                            </label>
                            <div className={styles.fieldWide}>
                                <span>알바 근무 요일</span>
                                <div className={styles.weekdaySelectorBox}>
                                    <p>운영일 중 알바가 필요한 요일만 선택합니다.</p>
                                    <div className={styles.weekdayRowInline}>
                                        {LABOR_WEEKDAYS.map(day => {
                                            const isOperatingDay = form.operatingWeekdays.includes(day.key);
                                            const isActive = form.partTimeWeekdays.includes(day.key) && isOperatingDay;
                                            return (
                                                <button
                                                    key={day.key}
                                                    type="button"
                                                    className={isActive ? styles.weekdayActive : styles.weekday}
                                                    disabled={!isOperatingDay}
                                                    onClick={() => onTogglePartTimeWeekday(day.key)}
                                                >
                                                    {day.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                            <label className={styles.fieldWide}>
                                <span>메모</span>
                                <textarea value={form.memo} onChange={event => onUpdateForm({ memo: event.target.value })} placeholder="오픈 준비, 피크타임, 점주 요청사항 등" />
                            </label>
                        </div>
                    </div>
                ) : null}
            </div>
            <div className={styles.settingsSummary}>
                <span>기준연도 {settings.effectiveYear}</span>
                <span>최저시급 {formatWon(settings.minimumHourlyWage)}</span>
                <span>근로자 보험률 {settings.employeeInsuranceRate}%</span>
                <span>원천징수 기준 {settings.withholdingRate}%</span>
            </div>
            <div className={styles.actions}>
                <button type="button" className={styles.secondaryButton} onClick={onCalculate}><Calculator size={14} /> 계산하기</button>
                <button type="button" className={styles.primaryButton} disabled={isSaving || !schemaReady} onClick={onSave}><Save size={14} /> 인력 세팅안 저장</button>
            </div>
        </section>
    );
}
