"use client";

import React from 'react';
import { FileText, Plus, Printer, Save, Trash2, X } from 'lucide-react';
import {
    addMeetingToolCustomCostRow,
    calculateMeetingToolSummary,
    getMeetingToolDefaultsFromLocation,
    MEETING_TOOL_DISCLAIMER,
    MEETING_TOOL_TARGET_SCENARIOS,
    normalizeMeetingToolDraft,
    removeMeetingToolCustomCostRow,
    setMeetingToolActiveTarget,
    updateMeetingToolCostAmount,
    updateMeetingToolCostRatio,
    updateMeetingToolTargetSales,
    type MeetingToolCostKey,
    type MeetingToolDraft
} from '@/lib/franchise-location-meeting-tool';
import {
    formatLocationMoney,
    getAcquisitionCostTotal,
    normalizeFranchiseLocationMasterData
} from '@/lib/franchise-location-master';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import type { FranchiseLocation } from './locationMasterTypes';
import { saveLocationMeetingToolRequest } from './locationMasterRequests';

type LocationMeetingToolDialogProps = {
    readonly open: boolean;
    readonly location: FranchiseLocation | null;
    readonly managerName: string;
    readonly onOpenChange: (open: boolean) => void;
    readonly onSaved: (locationId: string, draft: MeetingToolDraft) => void;
};

type PrintMode = 'print' | 'pdf';

function parseNumberInput(value: string): number | null {
    const parsed = Number(value.replace(/,/g, '').trim());
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function formatInputValue(value: number | null): string {
    return value === null ? '' : String(value);
}

function escapeHtml(value: string | number | null | undefined): string {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatPercent(value: number | null): string {
    return value === null ? '-' : `${value.toLocaleString()}%`;
}

function buildReportHtml(location: FranchiseLocation, draft: MeetingToolDraft, managerName: string, mode: PrintMode): string {
    const data = normalizeFranchiseLocationMasterData(location);
    const summary = calculateMeetingToolSummary(draft);
    const activeTargetScenario = draft.targetScenarios.find(scenario => scenario.key === draft.activeTargetKey);
    const generatedAt = new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    }).format(new Date());
    const costRows = draft.costRows.map(row => `
<tr>
<td>${escapeHtml(row.label)}</td>
<td>${escapeHtml(formatLocationMoney(row.amount))}</td>
<td>${escapeHtml(formatPercent(row.ratio))}</td>
<td>${escapeHtml(row.memo || '-')}</td>
</tr>`).join('');
    const modeGuide = mode === 'pdf'
        ? '<p class="no-print">브라우저 인쇄 대화상자에서 대상 프린터를 PDF 저장으로 선택해주세요.</p>'
        : '';

    return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(location.name)} 출점 검토 리포트</title>
<style>
body { margin: 24px; color: #191f28; font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Pretendard", "Noto Sans KR", "Segoe UI", sans-serif; }
header { display: grid; gap: 6px; margin-bottom: 18px; }
h1 { margin: 0; font-size: 22px; line-height: 1.35; }
h2 { margin: 24px 0 8px; font-size: 15px; }
p { margin: 0; color: #6b7684; font-size: 12px; line-height: 1.6; }
.grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin: 12px 0; }
.box { border: 1px solid #e5e8eb; border-radius: 8px; padding: 10px; }
.box span { display: block; color: #6b7684; font-size: 11px; font-weight: 700; }
.box strong { display: block; margin-top: 6px; font-size: 14px; }
table { width: 100%; border-collapse: collapse; table-layout: fixed; }
th, td { padding: 8px 7px; border: 1px solid #e5e8eb; font-size: 11px; line-height: 1.45; text-align: left; vertical-align: top; word-break: keep-all; overflow-wrap: anywhere; }
th { background: #f2f4f6; color: #4e5968; font-weight: 700; }
.memo { min-height: 70px; white-space: pre-wrap; }
.notice { margin-top: 16px; padding: 10px; border: 1px solid #e5e8eb; border-radius: 8px; background: #f9fafb; }
@page { size: A4 portrait; margin: 12mm; }
@media print { body { margin: 0; } .no-print { display: none; } }
</style>
</head>
<body>
<header>
<h1>${escapeHtml(location.name)} 출점 검토 리포트</h1>
<p>생성일 ${escapeHtml(generatedAt)} · 담당 ${escapeHtml(managerName || '미지정')}</p>
${modeGuide}
</header>
<section>
<h2>후보지 요약</h2>
<div class="grid">
<div class="box"><span>브랜드</span><strong>${escapeHtml(location.brand || '미지정')}</strong></div>
<div class="box"><span>주소</span><strong>${escapeHtml(location.address || location.region || '-')}</strong></div>
<div class="box"><span>입점비용</span><strong>${escapeHtml(formatLocationMoney(getAcquisitionCostTotal(data.cost)))}</strong></div>
<div class="box"><span>월세·관리비</span><strong>${escapeHtml(formatLocationMoney((data.lease.monthlyRent ?? 0) + (data.lease.maintenanceFee ?? 0)))}</strong></div>
</div>
</section>
<section>
<h2>수익분석표</h2>
<div class="grid">
<div class="box"><span>목표매출 변화 ${escapeHtml(activeTargetScenario?.label || '1차')}</span><strong>${escapeHtml(formatLocationMoney(summary.targetSales))}</strong></div>
<div class="box"><span>비용 합계</span><strong>${escapeHtml(formatLocationMoney(summary.totalCost))}</strong></div>
<div class="box"><span>세전수익</span><strong>${escapeHtml(formatLocationMoney(summary.preTaxProfit))}</strong></div>
<div class="box"><span>세전 수익률</span><strong>${escapeHtml(formatPercent(summary.profitRatio))}</strong></div>
</div>
<table>
<thead><tr><th>항목</th><th>금액(만원)</th><th>비율</th><th>메모</th></tr></thead>
<tbody>${costRows}</tbody>
</table>
</section>
<section>
<h2>보고 메모</h2>
<div class="box memo">${escapeHtml(draft.reportMemo || '-')}</div>
<p class="notice">${escapeHtml(MEETING_TOOL_DISCLAIMER)}</p>
</section>
</body>
</html>`;
}

function openReport(location: FranchiseLocation, draft: MeetingToolDraft, managerName: string, mode: PrintMode): void {
    const printWindow = window.open('', '_blank', 'width=980,height=760');
    if (!printWindow) {
        window.alert('팝업이 차단되어 보고서 화면을 열 수 없습니다. 브라우저 팝업 허용 후 다시 시도해주세요.');
        return;
    }

    printWindow.document.open();
    printWindow.document.write(buildReportHtml(location, draft, managerName, mode));
    printWindow.document.close();
    printWindow.focus();
    printWindow.setTimeout(() => {
        printWindow.print();
    }, 250);
}

export function LocationMeetingToolDialog({
    open,
    location,
    managerName,
    onOpenChange,
    onSaved
}: LocationMeetingToolDialogProps) {
    const [draft, setDraft] = React.useState<MeetingToolDraft>(() => normalizeMeetingToolDraft(null));
    const [customCostLabel, setCustomCostLabel] = React.useState('');
    const [saving, setSaving] = React.useState(false);
    const [message, setMessage] = React.useState('');
    const locationId = location?.id || '';
    const initializedLocationIdRef = React.useRef('');

    React.useEffect(() => {
        if (!location || !open) return;
        if (initializedLocationIdRef.current === locationId) return;
        initializedLocationIdRef.current = locationId;
        setDraft(normalizeMeetingToolDraft(location.meetingTool, getMeetingToolDefaultsFromLocation(location)));
        setCustomCostLabel('');
        setMessage('');
    }, [locationId, location, open]);

    React.useEffect(() => {
        if (!open) initializedLocationIdRef.current = '';
    }, [open]);

    if (!open || !location) return null;

    const data = normalizeFranchiseLocationMasterData(location);
    const summary = calculateMeetingToolSummary(draft);

    const updateAmount = (key: MeetingToolCostKey, value: string) => {
        setDraft(prev => updateMeetingToolCostAmount(prev, key, parseNumberInput(value)));
    };

    const updateRatio = (key: MeetingToolCostKey, value: string) => {
        setDraft(prev => updateMeetingToolCostRatio(prev, key, parseNumberInput(value)));
    };

    const addCustomCost = () => {
        const label = customCostLabel.trim();
        if (!label) return;
        setDraft(prev => addMeetingToolCustomCostRow(prev, label));
        setCustomCostLabel('');
    };

    const saveReport = async () => {
        if (!locationId) return;
        setSaving(true);
        setMessage('');
        try {
            const saved = await saveLocationMeetingToolRequest({ locationId, meetingTool: draft });
            setDraft(saved);
            onSaved(locationId, saved);
            setMessage('출점 검토 리포트를 저장했습니다.');
        } catch (error) {
            setMessage(error instanceof Error ? error.message : '출점 검토 리포트 저장에 실패했습니다.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={styles.meetingToolBackdrop} role="dialog" aria-modal="true" aria-label="출점 검토 리포트">
            <section className={styles.meetingToolPanel}>
                <header className={styles.meetingToolHeader}>
                    <div>
                        <span className={styles.locationMessageEyebrow}>점포개발 도구</span>
                        <h3>출점 검토 리포트</h3>
                        <p>{location.name} · {location.address || location.region || '주소 미등록'}</p>
                    </div>
                    <button type="button" className={styles.locationMessageCloseButton} onClick={() => onOpenChange(false)} aria-label="닫기">
                        <X size={18} />
                    </button>
                </header>

                <div className={styles.meetingToolBody}>
                    <section className={styles.meetingToolSummaryGrid}>
                        <div>
                            <span>브랜드</span>
                            <strong>{location.brand || '미지정'}</strong>
                        </div>
                        <div>
                            <span>입점비용</span>
                            <strong>{formatLocationMoney(getAcquisitionCostTotal(data.cost))}</strong>
                        </div>
                        <div>
                            <span>보증금 / 권리금</span>
                            <strong>{formatLocationMoney(data.cost.deposit)} / {formatLocationMoney(data.cost.premium)}</strong>
                        </div>
                        <div>
                            <span>월세 / 관리비</span>
                            <strong>{formatLocationMoney(data.lease.monthlyRent)} / {formatLocationMoney(data.lease.maintenanceFee)}</strong>
                        </div>
                    </section>

                    <section className={styles.meetingToolCalculator}>
                        <div className={styles.meetingToolSectionHeader}>
                            <div>
                                <h4>간단 수익분석표</h4>
                                <p>목표매출 변화에 따라 비용 비율과 세전수익을 비교합니다.</p>
                                <div className={styles.meetingToolTargetGroup}>
                                    <span className={styles.meetingToolTargetLabel}>목표매출 변화</span>
                                    <div className={styles.meetingToolTargetSwitch} aria-label="목표매출 변화 차수">
                                        {MEETING_TOOL_TARGET_SCENARIOS.map(scenario => (
                                            <button
                                                key={scenario.key}
                                                type="button"
                                                className={scenario.key === draft.activeTargetKey ? styles.meetingToolTargetButtonActive : styles.meetingToolTargetButton}
                                                onClick={() => setDraft(prev => setMeetingToolActiveTarget(prev, scenario.key))}
                                            >
                                                {scenario.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <label>
                                목표매출(만원)
                                <input
                                    type="number"
                                    min="0"
                                    value={formatInputValue(draft.targetSales)}
                                    onChange={(event) => setDraft(prev => updateMeetingToolTargetSales(prev, parseNumberInput(event.target.value)))}
                                    placeholder="4500"
                                />
                            </label>
                        </div>
                        <div className={styles.meetingToolRows}>
                            <div className={styles.meetingToolRowHead}>
                                <span>항목</span>
                                <span>금액(만원)</span>
                                <span>비율</span>
                                <span>메모</span>
                            </div>
                            {draft.costRows.map(row => (
                                <div key={row.key} className={styles.meetingToolRow}>
                                    <div className={styles.meetingToolRowLabel}>
                                        <strong>{row.label}</strong>
                                        {row.custom ? (
                                            <button
                                                type="button"
                                                onClick={() => setDraft(prev => removeMeetingToolCustomCostRow(prev, row.key))}
                                                aria-label={`${row.label} 삭제`}
                                            >
                                                <Trash2 size={13} /> 삭제
                                            </button>
                                        ) : null}
                                    </div>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formatInputValue(row.amount)}
                                        onChange={(event) => updateAmount(row.key, event.target.value)}
                                        placeholder="만원"
                                    />
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.1"
                                        value={formatInputValue(row.ratio)}
                                        onChange={(event) => updateRatio(row.key, event.target.value)}
                                        placeholder="%"
                                    />
                                    <input
                                        value={row.memo}
                                        onChange={(event) => {
                                            const memo = event.target.value;
                                            setDraft(prev => ({
                                                ...prev,
                                                costRows: prev.costRows.map(costRow => costRow.key === row.key ? { ...costRow, memo } : costRow)
                                            }));
                                        }}
                                        placeholder="메모"
                                    />
                                </div>
                            ))}
                            <div className={styles.meetingToolCustomRow}>
                                <input
                                    value={customCostLabel}
                                    onChange={(event) => setCustomCostLabel(event.target.value)}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter') {
                                            event.preventDefault();
                                            addCustomCost();
                                        }
                                    }}
                                    placeholder="추가 항목명 예: 배달수수료·광고비"
                                />
                                <button type="button" className={styles.secondaryButton} onClick={addCustomCost}>
                                    <Plus size={14} /> 항목 추가
                                </button>
                            </div>
                        </div>
                    </section>

                    <section className={styles.meetingToolResultGrid}>
                        <div>
                            <span>비용 합계</span>
                            <strong>{formatLocationMoney(summary.totalCost)}</strong>
                        </div>
                        <div>
                            <span>세전수익</span>
                            <strong>{formatLocationMoney(summary.preTaxProfit)}</strong>
                        </div>
                        <div>
                            <span>세전 수익률</span>
                            <strong>{formatPercent(summary.profitRatio)}</strong>
                        </div>
                    </section>

                    <label className={styles.meetingToolMemo}>
                        보고 메모
                        <textarea
                            value={draft.reportMemo}
                            onChange={(event) => setDraft(prev => ({ ...prev, reportMemo: event.target.value }))}
                            placeholder="상권분석, 목표매출 근거, 리스크, 면담 중 확인한 내용을 기록하세요."
                        />
                    </label>

                    <p className={styles.meetingToolDisclaimer}>{MEETING_TOOL_DISCLAIMER}</p>
                    {message ? <p className={styles.meetingToolMessage}>{message}</p> : null}
                </div>

                <footer className={styles.meetingToolActions}>
                    <button type="button" className={styles.secondaryButton} onClick={() => openReport(location, draft, managerName, 'pdf')}>
                        <FileText size={15} /> PDF 저장
                    </button>
                    <button type="button" className={styles.secondaryButton} onClick={() => openReport(location, draft, managerName, 'print')}>
                        <Printer size={15} /> 인쇄
                    </button>
                    <button type="button" className={styles.primaryButton} onClick={saveReport} disabled={saving}>
                        <Save size={15} /> {saving ? '저장 중' : '저장'}
                    </button>
                </footer>
            </section>
        </div>
    );
}
