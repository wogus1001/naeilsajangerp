import type { LaborDaySchedule, LaborPlanResult, LaborRoleRecommendation } from '@/lib/franchise-labor-planning';

type LaborScheduleReportInput = {
    readonly locationName: string;
    readonly planTitle: string;
    readonly result: LaborPlanResult;
};

function escapeHtml(value: string): string {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function won(value: number): string {
    return `${Math.round(value).toLocaleString('ko-KR')}원`;
}

function manwon(value: number): string {
    return `${Math.round(value / 10_000).toLocaleString('ko-KR')}만원`;
}

function formatGeneratedDate(): string {
    return new Intl.DateTimeFormat('ko-KR', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(new Date());
}

function buildRoleRows(roles: readonly LaborRoleRecommendation[]): string {
    return roles.map(role => `
        <tr>
            <td>${escapeHtml(role.label)}</td>
            <td>${role.headcount.toLocaleString('ko-KR')}명</td>
            <td>${Math.round(role.weeklyHours).toLocaleString('ko-KR')}h</td>
            <td>${won(role.monthlyCost)}</td>
            <td>${escapeHtml(role.note)}</td>
        </tr>
    `).join('');
}

function buildScheduleRows(schedule: readonly LaborDaySchedule[]): string {
    return schedule.map(day => `
        <tr>
            <td><strong>${escapeHtml(day.label)}</strong></td>
            <td>${escapeHtml(day.shifts.join(' / '))}</td>
            <td>${day.totalHours.toLocaleString('ko-KR')}h</td>
            <td>${won(day.dailyCost)}</td>
        </tr>
    `).join('');
}

export function buildLaborScheduleReportHtml(input: LaborScheduleReportInput): string {
    const generatedAt = formatGeneratedDate();
    const activeDays = input.result.weeklySchedule.filter(day => day.totalHours > 0);
    const weeklyHours = activeDays.reduce((sum, day) => sum + day.totalHours, 0);
    const weeklyCost = activeDays.reduce((sum, day) => sum + day.dailyCost, 0);
    const roleRows = buildRoleRows(input.result.roles);
    const scheduleRows = buildScheduleRows(input.result.weeklySchedule);

    return `
        <!doctype html>
        <html lang="ko">
        <head>
            <meta charset="utf-8" />
            <title>인력 세팅 근무표 보고서</title>
            <style>
                * { box-sizing: border-box; }
                @page { size: A4; margin: 14mm; }
                body {
                    margin: 0;
                    color: #191f28;
                    font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Pretendard", "Noto Sans KR", "Segoe UI", sans-serif;
                    font-size: 13px;
                    line-height: 1.55;
                }
                .report-shell { width: 100%; max-width: 180mm; margin: 0 auto; }
                .topline {
                    display: flex;
                    justify-content: space-between;
                    gap: 16px;
                    border-bottom: 2px solid #191f28;
                    padding-bottom: 16px;
                    margin-bottom: 16px;
                }
                h1 { margin: 0 0 8px; font-size: 25px; line-height: 1.35; }
                h2 { margin: 22px 0 10px; font-size: 17px; }
                p { margin: 0; }
                strong, p, td, th { overflow-wrap: anywhere; word-break: break-word; }
                .muted { color: #6b7684; font-weight: 700; }
                .stamp { min-width: 152px; border: 1px solid #dfe3e8; border-radius: 8px; padding: 10px; text-align: right; }
                .stamp span { display: block; color: #6b7684; font-size: 11px; font-weight: 800; }
                .stamp strong { display: block; margin-top: 4px; font-size: 17px; }
                .meta, .summary {
                    display: grid;
                    grid-template-columns: repeat(4, minmax(0, 1fr));
                    gap: 8px;
                    margin: 16px 0;
                }
                .box, .metric, .note-box {
                    min-width: 0;
                    border: 1px solid #dfe3e8;
                    border-radius: 8px;
                    padding: 11px;
                    break-inside: avoid;
                }
                .box span, .metric span { display: block; color: #6b7684; font-size: 11px; font-weight: 800; }
                .box strong, .metric strong { display: block; margin-top: 5px; font-size: 15px; }
                .metric strong { font-size: 21px; font-variant-numeric: tabular-nums; }
                .note-box { background: #fbfcfe; color: #333d4b; }
                table {
                    width: 100%;
                    table-layout: fixed;
                    border-collapse: collapse;
                    margin-top: 10px;
                    break-inside: avoid;
                }
                th, td {
                    border: 1px solid #dfe3e8;
                    padding: 9px;
                    text-align: left;
                    vertical-align: top;
                }
                th {
                    background: #f8fafc;
                    color: #4e5968;
                    font-size: 12px;
                    font-weight: 900;
                }
                .role-table th:nth-child(1), .role-table td:nth-child(1) { width: 19%; }
                .role-table th:nth-child(2), .role-table td:nth-child(2) { width: 13%; }
                .role-table th:nth-child(3), .role-table td:nth-child(3) { width: 15%; }
                .role-table th:nth-child(4), .role-table td:nth-child(4) { width: 22%; }
                .schedule-table th:nth-child(1), .schedule-table td:nth-child(1) { width: 14%; }
                .schedule-table th:nth-child(3), .schedule-table td:nth-child(3) { width: 16%; }
                .schedule-table th:nth-child(4), .schedule-table td:nth-child(4) { width: 22%; }
                .footer {
                    margin-top: 28px;
                    border-top: 1px solid #dfe3e8;
                    padding-top: 12px;
                    color: #8b95a1;
                    font-size: 11px;
                    font-weight: 700;
                }
                @media print {
                    .report-shell { max-width: none; }
                    .box, .metric, .note-box, tr { break-inside: avoid; }
                }
            </style>
        </head>
        <body>
            <main class="report-shell">
                <header class="topline">
                    <div>
                        <h1>인력 세팅 근무표 보고서</h1>
                        <p class="muted">${escapeHtml(input.locationName)} 운영 기준의 권장 인력 구성과 주간 근무표입니다.</p>
                    </div>
                    <div class="stamp">
                        <span>세팅안</span>
                        <strong>${escapeHtml(input.planTitle)}</strong>
                        <span>${escapeHtml(generatedAt)}</span>
                    </div>
                </header>
                <section class="meta">
                    <div class="box"><span>운영점</span><strong>${escapeHtml(input.locationName)}</strong></div>
                    <div class="box"><span>월 목표매출</span><strong>${manwon(input.result.monthlySalesTarget)}</strong></div>
                    <div class="box"><span>목표 인건비율</span><strong>${input.result.targetLaborRatio}%</strong></div>
                    <div class="box"><span>운영 조건</span><strong>${input.result.ownerWorks ? '점주 근무 포함' : '유급 점장 기준'}</strong></div>
                </section>
                <section class="summary">
                    <div class="metric"><span>추천 총 인원</span><strong>${input.result.totalHeadcount.toLocaleString('ko-KR')}명</strong><span>점장/직원/알바 기준</span></div>
                    <div class="metric"><span>월 인건비</span><strong>${manwon(input.result.monthlyLaborCost)}</strong><span>회사 부담 포함 참고</span></div>
                    <div class="metric"><span>매출 대비</span><strong>${input.result.laborRatio}%</strong><span>목표 ${input.result.targetLaborRatio}%</span></div>
                    <div class="metric"><span>주간 기준</span><strong>${weeklyHours.toLocaleString('ko-KR')}h</strong><span>${won(weeklyCost)} / 주</span></div>
                </section>
                <h2>추천 인력 구성</h2>
                <table class="role-table">
                    <thead><tr><th>구분</th><th>인원</th><th>주간시간</th><th>월 비용</th><th>운영 기준</th></tr></thead>
                    <tbody>${roleRows}</tbody>
                </table>
                <h2>주간 근무표</h2>
                <table class="schedule-table">
                    <thead><tr><th>요일</th><th>근무 배치</th><th>총 시간</th><th>예상 인건비</th></tr></thead>
                    <tbody>${scheduleRows}</tbody>
                </table>
                <h2>검토 메모</h2>
                <p class="note-box">${escapeHtml(input.result.memo)}</p>
                <footer class="footer">본 자료는 운영 예산 산정용 참고 보고서입니다. 실제 급여, 보험, 세무, 노무 판단은 회사 기준과 전문가 검토를 함께 확인해주세요.</footer>
            </main>
            <script>window.onload = () => { window.print(); };</script>
        </body>
        </html>
    `;
}

export function printLaborScheduleReport(input: LaborScheduleReportInput): void {
    const printWindow = window.open('', '_blank', 'width=960,height=720');
    if (!printWindow) return;
    printWindow.document.write(buildLaborScheduleReportHtml(input));
    printWindow.document.close();
}
