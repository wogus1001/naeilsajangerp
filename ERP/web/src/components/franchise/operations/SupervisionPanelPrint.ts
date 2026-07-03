import type { SupervisionInspectionItem } from '@/lib/franchise-supervision';
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
    const rows = input.items.map(item => `
        <tr>
            <td>${escapeHtml(item.label)}</td>
            <td>${escapeHtml(item.result)}</td>
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
                body { margin: 32px; color: #191f28; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
                h1 { margin: 0 0 8px; font-size: 24px; }
                .meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 20px 0; }
                .box { border: 1px solid #dfe3e8; border-radius: 8px; padding: 10px; }
                .box span { display: block; color: #6b7684; font-size: 11px; font-weight: 700; }
                .box strong { display: block; margin-top: 5px; font-size: 14px; }
                table { width: 100%; border-collapse: collapse; margin-top: 16px; }
                th, td { border: 1px solid #dfe3e8; padding: 10px; text-align: left; vertical-align: top; }
                th { background: #f8fafc; color: #4e5968; font-size: 12px; }
                figure { display: inline-block; width: 220px; margin: 12px 12px 0 0; vertical-align: top; }
                img { width: 100%; max-height: 180px; object-fit: cover; border: 1px solid #dfe3e8; border-radius: 8px; }
                figcaption, li { color: #6b7684; font-size: 12px; }
                @media print { body { margin: 18mm; } }
            </style>
        </head>
        <body>
            <h1>SV 점검 보고서</h1>
            <p>${escapeHtml(input.visit.locationName)} 방문 점검 결과입니다.</p>
            <div class="meta">
                <div class="box"><span>운영점</span><strong>${escapeHtml(input.visit.locationName)}</strong></div>
                <div class="box"><span>SV</span><strong>${escapeHtml(input.visit.supervisorName)}</strong></div>
                <div class="box"><span>방문일</span><strong>${escapeHtml(input.visit.visitDate || '-')}</strong></div>
                <div class="box"><span>상태</span><strong>${escapeHtml(report?.status || input.visit.status)}</strong></div>
            </div>
            <table>
                <thead><tr><th>항목</th><th>결과</th><th>메모</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>
            <h2>특이사항</h2>
            <p>${escapeHtml(input.specialNote || report?.specialNote || '-')}</p>
            <h2>사진</h2>
            ${photos || '<p>첨부 사진 없음</p>'}
            <script>window.onload = () => { window.print(); };</script>
        </body>
        </html>
    `);
    printWindow.document.close();
}
