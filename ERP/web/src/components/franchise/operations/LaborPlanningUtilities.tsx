'use client';

import React from 'react';
import {
    DEFAULT_LABOR_SETTINGS,
    calculateDayWage,
    calculatePayrollWithNonTaxable,
    calculateWeeklyPartTimeCost,
    calculateWithholding33,
    type LaborPlanResult,
    type LaborSettings
} from '@/lib/franchise-labor-planning';
import styles from './LaborPlanningPanel.module.css';

function won(value: number): string {
    return `${Math.round(value).toLocaleString('ko-KR')}원`;
}

const SCHEDULE_START_HOUR = 8;
const SCHEDULE_END_HOUR = 24;
const SCHEDULE_HOUR_MARKS = Array.from(
    { length: Math.floor((SCHEDULE_END_HOUR - SCHEDULE_START_HOUR) / 2) + 1 },
    (_, index) => SCHEDULE_START_HOUR + index * 2
);

type TimetableShift = {
    readonly label: string;
    readonly range: string;
    readonly startHour: number;
    readonly endHour: number;
    readonly raw: string;
};

function parseShiftText(shift: string): TimetableShift | null {
    const match = shift.match(/^(.+?)\s+(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const [, label, startHourText, startMinuteText, endHourText, endMinuteText] = match;
    const startHour = Number(startHourText) + Number(startMinuteText) / 60;
    const rawEndHour = Number(endHourText) + Number(endMinuteText) / 60;
    const endHour = rawEndHour <= startHour ? rawEndHour + 24 : rawEndHour;

    return {
        label: label.trim(),
        range: `${startHourText.padStart(2, '0')}:${startMinuteText}-${endHourText.padStart(2, '0')}:${endMinuteText}`,
        startHour,
        endHour,
        raw: shift
    };
}

function hourGridStyle(hour: number): React.CSSProperties {
    const line = Math.round((hour - SCHEDULE_START_HOUR) * 2) + 1;
    return { gridColumn: `${line} / span 2` };
}

function shiftGridStyle(shift: TimetableShift): React.CSSProperties {
    const start = Math.max(SCHEDULE_START_HOUR, Math.min(SCHEDULE_END_HOUR, shift.startHour));
    const end = Math.max(start + 0.5, Math.min(SCHEDULE_END_HOUR, shift.endHour));
    const startLine = Math.round((start - SCHEDULE_START_HOUR) * 2) + 1;
    const endLine = Math.round((end - SCHEDULE_START_HOUR) * 2) + 1;
    return { gridColumn: `${startLine} / ${endLine}` };
}

function shiftClassName(label: string): string {
    if (label.includes('점장')) return `${styles.scheduleBar} ${styles.scheduleBarManager}`;
    if (label.includes('직원')) return `${styles.scheduleBar} ${styles.scheduleBarStaff}`;
    if (label.includes('알바')) return `${styles.scheduleBar} ${styles.scheduleBarPartTime}`;
    return `${styles.scheduleBar} ${styles.scheduleBarSupport}`;
}

export function LaborWeeklySchedule({ result }: { readonly result: LaborPlanResult | null }) {
    const weeklySchedule = result?.weeklySchedule || [];
    const activeDays = weeklySchedule.filter(day => day.totalHours > 0);
    const weeklyHours = activeDays.reduce((sum, day) => sum + day.totalHours, 0);
    const weeklyCost = activeDays.reduce((sum, day) => sum + day.dailyCost, 0);
    const busiestDay = activeDays.reduce<LaborPlanResult['weeklySchedule'][number] | null>(
        (current, day) => !current || day.totalHours > current.totalHours ? day : current,
        null
    );

    return (
        <section className={styles.section}>
            <div className={styles.sectionHeader}>
                <div>
                    <h3>주간 근무표</h3>
                    <p>요일별 근무 배치를 시간표 방식으로 확인합니다.</p>
                </div>
            </div>
            {!result ? <div className={styles.emptyState}>계산 후 주간 근무표가 표시됩니다.</div> : null}
            {result ? (
                <div className={styles.scheduleGrid}>
                    <div className={styles.scheduleSummaryBar}>
                        <div>
                            <span>운영일</span>
                            <strong>{activeDays.length}일</strong>
                        </div>
                        <div>
                            <span>주간 총 시간</span>
                            <strong>{weeklyHours.toLocaleString('ko-KR')}h</strong>
                        </div>
                        <div>
                            <span>주간 인건비</span>
                            <strong>{won(weeklyCost)}</strong>
                        </div>
                        <div>
                            <span>가장 긴 운영일</span>
                            <strong>{busiestDay ? `${busiestDay.label} ${busiestDay.totalHours}h` : '-'}</strong>
                        </div>
                    </div>
                    <div className={styles.scheduleLegend} aria-label="근무표 역할 범례">
                        <span><i className={styles.legendManager} />점장</span>
                        <span><i className={styles.legendStaff} />직원</span>
                        <span><i className={styles.legendPartTime} />알바</span>
                        <span><i className={styles.legendSupport} />브레이크</span>
                    </div>
                    <div className={styles.scheduleTable}>
                        <div className={styles.scheduleHeaderRow}>
                            <div className={styles.scheduleDayHeader}>요일</div>
                            <div className={styles.scheduleHours}>
                                {SCHEDULE_HOUR_MARKS.map(hour => (
                                    <span key={hour} style={hourGridStyle(hour)}>
                                        {String(hour).padStart(2, '0')}:00
                                    </span>
                                ))}
                            </div>
                        </div>
                        {weeklySchedule.map(day => {
                            const parsedShifts = day.shifts.map(parseShiftText).filter(shift => shift !== null);
                            return (
                                <div key={day.weekday} className={styles.scheduleRow}>
                                    <div className={styles.scheduleDayCell}>
                                        <strong>{day.label}</strong>
                                        <span>{day.totalHours}h</span>
                                        <small>{won(day.dailyCost)}</small>
                                    </div>
                                    <div className={styles.scheduleTrack}>
                                        {parsedShifts.length > 0 ? (
                                            <>
                                                <div className={styles.scheduleBars}>
                                                    {parsedShifts.map(shift => (
                                                        <div
                                                            key={`${day.weekday}-${shift.raw}`}
                                                            className={shiftClassName(shift.label)}
                                                            style={shiftGridStyle(shift)}
                                                            aria-label={`${shift.label} ${shift.range}`}
                                                        >
                                                            <strong>{shift.label}</strong>
                                                            <span>{shift.range}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </>
                                        ) : (
                                            <div className={styles.scheduleClosed}>{day.shifts.join(' · ')}</div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : null}
        </section>
    );
}

export function LaborUtilityCalculators({ settings = DEFAULT_LABOR_SETTINGS }: { readonly settings?: LaborSettings }) {
    const [grossPay, setGrossPay] = React.useState(300);
    const [nonTaxablePay, setNonTaxablePay] = React.useState(20);
    const [hourlyWage, setHourlyWage] = React.useState(settings.minimumHourlyWage);
    const [dayHours, setDayHours] = React.useState(8);
    const [overtimeHours, setOvertimeHours] = React.useState(0);
    const [nightHours, setNightHours] = React.useState(0);
    const [weeklyHours, setWeeklyHours] = React.useState(18);
    const [weeklyWorkdays, setWeeklyWorkdays] = React.useState(3);
    React.useEffect(() => {
        setHourlyWage(settings.minimumHourlyWage);
    }, [settings.minimumHourlyWage]);

    const payroll = calculatePayrollWithNonTaxable({
        grossPay: grossPay * 10_000,
        nonTaxablePay: nonTaxablePay * 10_000,
        settings
    });
    const withholding = calculateWithholding33(grossPay * 10_000);
    const dayWage = calculateDayWage({
        hourlyWage,
        baseHours: dayHours,
        overtimeHours,
        nightHours,
        settings
    });
    const weeklyCost = calculateWeeklyPartTimeCost({
        hourlyWage,
        weeklyHours,
        weeklyWorkdays,
        settings
    });

    return (
        <section className={styles.section}>
            <div className={styles.sectionHeader}>
                <h3>부속 계산기</h3>
                <p>급여, 3.3%, 일당, 주휴 기준을 운영 예산 산정용으로 빠르게 확인합니다.</p>
            </div>
            <div className={styles.utilityGrid}>
                <div className={styles.utilityCard}>
                    <div className={styles.utilityCardHeader}>
                        <strong>월 급여 실수령</strong>
                        <span>4대보험·간이 공제 참고</span>
                    </div>
                    <div className={styles.utilityFieldRow}>
                        <label className={styles.field}>
                            <span>월 급여(만원)</span>
                            <input type="number" value={grossPay} onChange={event => setGrossPay(Number(event.target.value) || 0)} />
                        </label>
                        <label className={styles.field}>
                            <span>비과세(만원)</span>
                            <input type="number" value={nonTaxablePay} onChange={event => setNonTaxablePay(Number(event.target.value) || 0)} />
                        </label>
                    </div>
                    <div className={styles.utilityMetricGrid}>
                        <div className={styles.utilityResult}>
                            <strong>{won(payroll.netPay)}</strong>
                            <span>예상 실수령</span>
                        </div>
                        <div className={styles.utilityResult}>
                            <strong>{won(payroll.insuranceDeduction + payroll.incomeTax)}</strong>
                            <span>공제 합계</span>
                        </div>
                        <div className={styles.utilityResult}>
                            <strong>{won(payroll.employerCost)}</strong>
                            <span>회사 부담 포함</span>
                        </div>
                    </div>
                </div>
                <div className={styles.utilityCard}>
                    <div className={styles.utilityCardHeader}>
                        <strong>3.3% 지급액</strong>
                        <span>사업소득 처리 참고</span>
                    </div>
                    <div className={styles.utilityMetricGrid}>
                        <div className={styles.utilityResult}>
                            <strong>{won(withholding.netPay)}</strong>
                            <span>지급액</span>
                        </div>
                        <div className={styles.utilityResult}>
                            <strong>{won(withholding.incomeTax)}</strong>
                            <span>원천징수액</span>
                        </div>
                    </div>
                </div>
                <div className={styles.utilityCard}>
                    <div className={styles.utilityCardHeader}>
                        <strong>일당 계산</strong>
                        <span>기본·연장·야간 시간 기준</span>
                    </div>
                    <div className={styles.dayInputs}>
                        <label className={styles.field}>
                            <span>시급</span>
                            <input type="number" value={hourlyWage} onChange={event => setHourlyWage(Number(event.target.value) || settings.minimumHourlyWage)} />
                        </label>
                        <label className={styles.field}><span>기본</span><input type="number" value={dayHours} onChange={event => setDayHours(Number(event.target.value) || 0)} /></label>
                        <label className={styles.field}><span>연장</span><input type="number" value={overtimeHours} onChange={event => setOvertimeHours(Number(event.target.value) || 0)} /></label>
                        <label className={styles.field}><span>야간</span><input type="number" value={nightHours} onChange={event => setNightHours(Number(event.target.value) || 0)} /></label>
                    </div>
                    <div className={styles.utilityResult}>
                        <strong>{won(dayWage)}</strong>
                        <span>최저시급 {won(settings.minimumHourlyWage)} 이상 기준</span>
                    </div>
                </div>
                <div className={styles.utilityCard}>
                    <div className={styles.utilityCardHeader}>
                        <strong>주휴·주간 근무</strong>
                        <span>주 15시간 이상 여부 확인</span>
                    </div>
                    <div className={styles.utilityFieldRow}>
                        <label className={styles.field}>
                            <span>주간 시간</span>
                            <input type="number" value={weeklyHours} onChange={event => setWeeklyHours(Number(event.target.value) || 0)} />
                        </label>
                        <label className={styles.field}>
                            <span>근무일수</span>
                            <input type="number" value={weeklyWorkdays} onChange={event => setWeeklyWorkdays(Number(event.target.value) || 1)} />
                        </label>
                    </div>
                    <div className={styles.utilityMetricGrid}>
                        <div className={styles.utilityResult}>
                            <strong>{won(weeklyCost.weeklyTotal)}</strong>
                            <span>주간 지급 참고</span>
                        </div>
                        <div className={styles.utilityResult}>
                            <strong>{won(weeklyCost.holidayAllowance)}</strong>
                            <span>주휴 {weeklyCost.holidayHours}h</span>
                        </div>
                        <div className={styles.utilityResult}>
                            <strong>{won(weeklyCost.monthlyEstimate)}</strong>
                            <span>월 환산</span>
                        </div>
                    </div>
                </div>
            </div>
            <p className={styles.utilityNotice}>최저시급·보험률·공제율은 회사 설정 기준의 참고 계산값입니다. 실제 지급, 세무, 노무 판단 전 최종 확인이 필요합니다.</p>
        </section>
    );
}

export function LaborDocumentBox() {
    const documents = ['근로계약서', '급여명세서', '개인정보 수집 동의서'];
    return (
        <section className={styles.section}>
            <div className={styles.sectionHeader}>
                <h3>노무 서식함</h3>
                <p>1차는 표준 양식 목록과 전자계약 진입점만 제공합니다.</p>
            </div>
            <div className={styles.documentList}>
                {documents.map(document => (
                    <div key={document} className={styles.documentItem}>
                        <strong>{document}</strong>
                        <a href={`/contracts/electronic?mode=templates&laborDocument=${encodeURIComponent(document)}`}>
                            전자계약 관리
                        </a>
                    </div>
                ))}
            </div>
        </section>
    );
}
