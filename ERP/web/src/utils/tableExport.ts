"use client";

export type TableExportColumn = {
    readonly key: string;
    readonly label: string;
};

export type TableExportRow = Readonly<Record<string, string | number>>;

export type TableExportPayload = {
    readonly title: string;
    readonly filename: string;
    readonly sheetName?: string;
    readonly columns: readonly TableExportColumn[];
    readonly rows: readonly TableExportRow[];
    readonly filterSummary?: string;
};

function toDateStamp(date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

export function buildDatedExportFilename(prefix: string, extension: 'xlsx' | 'html' = 'xlsx'): string {
    return `${prefix}_${toDateStamp()}.${extension}`;
}

function normalizeCellValue(value: string | number | undefined): string | number {
    if (value === undefined) return '';
    return value;
}

export async function downloadTableAsXlsx(payload: TableExportPayload): Promise<void> {
    const XLSX = await import('xlsx');
    const headerRow = payload.columns.map(column => column.label);
    const bodyRows = payload.rows.map(row => payload.columns.map(column => normalizeCellValue(row[column.key])));
    const worksheet = XLSX.utils.aoa_to_sheet([headerRow, ...bodyRows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, (payload.sheetName || payload.title).slice(0, 31));
    XLSX.writeFile(workbook, payload.filename);
}

function escapeHtml(value: string | number): string {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function buildPrintableHtml(payload: TableExportPayload, mode: 'print' | 'pdf'): string {
    const generatedAt = new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    }).format(new Date());
    const modeLabel = mode === 'pdf' ? 'PDF 저장' : '인쇄';
    const printGuide = mode === 'pdf'
        ? '<p class="no-print">브라우저 인쇄 대화상자에서 대상 프린터를 PDF 저장으로 선택해주세요.</p>'
        : '';
    const summary = payload.filterSummary ? `<p>${escapeHtml(payload.filterSummary)}</p>` : '';
    const headers = payload.columns.map(column => `<th>${escapeHtml(column.label)}</th>`).join('');
    const rows = payload.rows.length > 0
        ? payload.rows.map(row => (
            `<tr>${payload.columns.map(column => `<td>${escapeHtml(normalizeCellValue(row[column.key]))}</td>`).join('')}</tr>`
        )).join('')
        : `<tr><td colspan="${payload.columns.length}">내보낼 데이터가 없습니다.</td></tr>`;

    return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(payload.title)} ${modeLabel}</title>
<style>
body { margin: 24px; color: #191f28; font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Pretendard", "Noto Sans KR", "Segoe UI", sans-serif; }
header { display: grid; gap: 6px; margin-bottom: 18px; }
h1 { margin: 0; font-size: 22px; line-height: 1.35; }
p { margin: 0; color: #6b7684; font-size: 12px; }
table { width: 100%; border-collapse: collapse; table-layout: auto; }
th, td { padding: 8px 7px; border: 1px solid #e5e8eb; font-size: 11px; line-height: 1.45; text-align: left; vertical-align: top; word-break: keep-all; overflow-wrap: anywhere; }
th { background: #f2f4f6; color: #4e5968; font-weight: 700; }
@page { size: A4 landscape; margin: 12mm; }
@media print { body { margin: 0; } .no-print { display: none; } }
</style>
</head>
<body>
<header>
<h1>${escapeHtml(payload.title)}</h1>
<p>생성일 ${escapeHtml(generatedAt)} · 총 ${payload.rows.length.toLocaleString()}건</p>
${printGuide}
${summary}
</header>
<table>
<thead><tr>${headers}</tr></thead>
<tbody>${rows}</tbody>
</table>
</body>
</html>`;
}

export function openPrintableTable(
    payload: TableExportPayload,
    mode: 'print' | 'pdf',
    onPopupBlocked: (message: string) => void
): void {
    const printWindow = window.open('', '_blank', 'width=1200,height=800');
    if (!printWindow) {
        onPopupBlocked('팝업이 차단되어 인쇄 화면을 열 수 없습니다. 브라우저 팝업 허용 후 다시 시도해주세요.');
        return;
    }

    printWindow.document.open();
    printWindow.document.write(buildPrintableHtml(payload, mode));
    printWindow.document.close();
    printWindow.focus();
    printWindow.setTimeout(() => {
        printWindow.print();
    }, 250);
}
