import type { SupervisionInspectionItem } from '@/lib/franchise-supervision';
import { getActionRequiredInspectionItems, summarizeInspectionItems } from './SupervisionReportSummary';
import type { SupervisionReport, SupervisionVisit } from './supervisionTypes';

function escapeHtml(value: string): string {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

export function printSupervisionReport(input: {
    readonly items: readonly SupervisionInspectionItem[];
    readonly report: SupervisionReport | null;
    readonly specialNote: string;
    readonly visit: SupervisionVisit | null;
}) {
    if (!input.visit) return;
    const report = input.report;
    const summary = summarizeInspectionItems(input.items);
    const actionRequiredItems = getActionRequiredInspectionItems(input.items);
    const actionTitle = actionRequiredItems.length > 0
        ? `주의 ${summary.warningCount.toLocaleString()}건 · 개선필요 ${summary.improvementCount.toLocaleString()}건`
        : '후속 조치 대상 없음';
    const generatedAt = new Intl.DateTimeFormat('ko-KR', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(new Date());
    const actionCards = actionRequiredItems.map(item => `
        <div class="action-card">
            <span class="${resultClass(item.result)}">${escapeHtml(item.result)}</span>
            <strong>${escapeHtml(item.label)}</strong>
        </div>
    `).join('');
    const rows = input.items.map(item => `
        <tr>
            <td>${escapeHtml(item.label)}</td>
            <td><span class="${resultClass(item.result)}">${escapeHtml(item.result)}</span></td>
            <td>${escapeHtml(item.memo || '-')}</td>
        </tr>
    `).join('');
    const photos = (report?.photoAttachments || []).map(photo => {
        if (photo.publicUrl && photo.contentType.startsWith('image/')) {
            return `<figure><img src="${escapeHtml(photo.publicUrl)}" alt="${escapeHtml(photo.name)}" /><figcaption>${escapeHtml(photo.name)}</figcaption></figure>`;
        }
        return `<li>${escapeHtml(photo.name)}</li>`;
    }).join('');
    const printWindow = window.open('', '_blank', 'width=960,height=720');
    if (!printWindow) return;
    printWindow.document.write(`
        <!doctype html>
        <html lang="ko">
        <head>
            <meta charset="utf-8" />
            <title>SV 점검 보고서</title>
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
                h1 { margin: 0 0 8px; font-size: 26px; line-height: 1.35; }
                h2 { margin: 22px 0 10px; font-size: 17px; }
                p { margin: 0; }
                strong, p, td, th, li, figcaption { overflow-wrap: anywhere; word-break: break-word; }
                .muted { color: #6b7684; font-weight: 700; }
                .stamp { min-width: 150px; border: 1px solid #dfe3e8; border-radius: 8px; padding: 10px; text-align: right; }
                .stamp span { display: block; color: #6b7684; font-size: 11px; font-weight: 800; }
                .stamp strong { display: block; margin-top: 4px; font-size: 18px; }
                .meta, .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 16px 0; }
                .box, .metric, .note-box, .action-card {
                    min-width: 0;
                    border: 1px solid #dfe3e8;
                    border-radius: 8px;
                    padding: 11px;
                    break-inside: avoid;
                }
                .box span, .metric span { display: block; color: #6b7684; font-size: 11px; font-weight: 800; }
                .box strong, .metric strong { display: block; margin-top: 5px; font-size: 15px; }
                .metric strong { font-size: 22px; font-variant-numeric: tabular-nums; }
                .section-title {
                    display: flex;
                    align-items: flex-end;
                    justify-content: space-between;
                    gap: 12px;
                    margin: 22px 0 10px;
                }
                .section-title h2 { margin: 0; }
                .section-title span { color: #6b7684; font-size: 12px; font-weight: 800; }
                .action-items { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-top: 10px; }
                .action-card {
                    display: flex;
                    min-height: 54px;
                    align-items: center;
                    justify-content: space-between;
                    gap: 8px;
                }
                .action-card strong { display: block; font-size: 13px; }
                .badge-good, .badge-warning, .badge-critical, .badge-neutral {
                    display: inline-flex;
                    min-height: 22px;
                    align-items: center;
                    border-radius: 999px;
                    padding: 0 8px;
                    font-size: 11px;
                    font-weight: 900;
                    white-space: nowrap;
                }
                .badge-good { background: #e6fcf5; color: #087f5b; }
                .badge-warning { background: #fff4e6; color: #d9480f; }
                .badge-critical { background: #fff5f5; color: #e03131; }
                .badge-neutral { background: #f2f4f6; color: #4e5968; }
                table { width: 100%; table-layout: fixed; border-collapse: collapse; margin-top: 10px; }
                th, td { border: 1px solid #dfe3e8; padding: 10px; text-align: left; vertical-align: top; }
                th { background: #f8fafc; color: #4e5968; font-size: 12px; font-weight: 900; }
                th:first-child, td:first-child { width: 28%; font-weight: 800; }
                th:nth-child(2), td:nth-child(2) { width: 25mm; }
                .note-box { min-height: 72px; background: #fbfcfe; color: #333d4b; }
                .photos { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
                figure { margin: 0; }
                img { width: 100%; max-height: 220px; object-fit: cover; border: 1px solid #dfe3e8; border-radius: 8px; }
                figcaption, li { color: #6b7684; font-size: 12px; font-weight: 700; }
                .footer { margin-top: 28px; border-top: 1px solid #dfe3e8; padding-top: 12px; color: #8b95a1; font-size: 11px; font-weight: 700; }
                @media print {
                    .report-shell { max-width: none; }
                    .action-card, .note-box, figure, tr { break-inside: avoid; }
                }
            </style>
        </head>
        <body>
            <main class="report-shell">
                <header class="topline">
                    <div>
                        <h1>SV 점검 보고서</h1>
                        <p class="muted">${escapeHtml(input.visit.locationName)} 방문 점검 결과와 후속 검토 사항입니다.</p>
                    </div>
                    <div class="stamp">
                        <span>종합 결과</span>
                        <strong>${escapeHtml(summary.overallResult)}</strong>
                        <span>${escapeHtml(generatedAt)}</span>
                    </div>
                </header>
                <section class="meta">
                    <div class="box"><span>운영점</span><strong>${escapeHtml(input.visit.locationName)}</strong></div>
                    <div class="box"><span>SV</span><strong>${escapeHtml(input.visit.supervisorName)}</strong></div>
                    <div class="box"><span>방문일</span><strong>${escapeHtml(input.visit.visitDate || '-')}</strong></div>
                    <div class="box"><span>보고서 상태</span><strong>${escapeHtml(report?.status || input.visit.status)}</strong></div>
                </section>
                <section class="summary">
                    <div class="metric"><span>양호율</span><strong>${summary.completionRate.toLocaleString()}%</strong><span>${summary.goodCount.toLocaleString()} / ${summary.total.toLocaleString()} 항목</span></div>
                    <div class="metric"><span>주의</span><strong>${summary.warningCount.toLocaleString()}</strong><span>현장 추적 필요</span></div>
                    <div class="metric"><span>개선필요</span><strong>${summary.improvementCount.toLocaleString()}</strong><span>시정요청 후보</span></div>
                    <div class="metric"><span>기록</span><strong>${summary.memoCount.toLocaleString()}</strong><span>메모 · 사진 ${(report?.photoAttachments.length || 0).toLocaleString()}개</span></div>
                </section>
                <div class="section-title">
                    <h2>조치 필요 항목</h2>
                    <span>${escapeHtml(actionTitle)}</span>
                </div>
                ${actionCards ? `<section class="action-items">${actionCards}</section>` : '<p class="note-box">현재 후속 조치가 필요한 항목이 없습니다.</p>'}
                <h2>전체 점검 내역</h2>
                <table>
                    <thead><tr><th>항목</th><th>결과</th><th>메모</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
                <h2>특이사항</h2>
                <p class="note-box">${escapeHtml(input.specialNote || report?.specialNote || '-')}</p>
                <h2>사진 및 첨부</h2>
                <section class="photos">${photos || '<p class="note-box">첨부 사진 없음</p>'}</section>
                <footer class="footer">본 보고서는 프랜차이즈 본부 ERP 슈퍼바이징 기록 기준으로 생성된 본사 내부 검토 자료입니다.</footer>
            </main>
            <script>window.onload = () => { window.print(); };</script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

function resultClass(result: SupervisionInspectionItem['result']): string {
    if (result === '개선필요') return 'badge-critical';
    if (result === '주의') return 'badge-warning';
    return 'badge-good';
}
