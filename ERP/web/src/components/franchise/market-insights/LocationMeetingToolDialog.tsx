"use client";

import React from 'react';
import Link from 'next/link';
import { Calculator, X } from 'lucide-react';
import { useAppDialog } from '@/components/common/AppDialogProvider';
import { useModalFocusTrap } from '@/components/common/useModalFocusTrap';
import type { LocationMapRuntime } from '@/components/franchise/location-map/types';
import {
    addMeetingToolCustomCostRow,
    calculateMeetingToolSummary,
    getMeetingToolDefaultsFromLocation,
    normalizeMeetingToolDraft,
    removeMeetingToolCustomCostRow,
    setMeetingToolActiveTarget,
    updateMeetingToolCostAmount,
    updateMeetingToolCostRatio,
    updateMeetingToolTargetSales,
    type MeetingToolCostKey,
    type MeetingToolDraft
} from '@/lib/franchise-location-meeting-tool';
import type { MeetingToolMarketReportKey } from '@/lib/franchise-location-meeting-tool-market-report';
import styles from './LocationMeetingTool.module.css';
import type { FranchiseLocation } from './locationMasterTypes';
import { LocationMeetingToolActions } from './LocationMeetingToolActions';
import { LocationMeetingToolCalculatorSection } from './LocationMeetingToolCalculatorSection';
import { LocationMeetingToolMarketMapSection } from './LocationMeetingToolMarketMapSection';
import { LocationMeetingToolMarketReportSection } from './LocationMeetingToolMarketReportSection';
import { LocationMeetingToolPresetPanel } from './LocationMeetingToolPresetPanel';
import { LocationMeetingToolResultSection } from './LocationMeetingToolResultSection';
import { LocationMeetingToolSummaryCards } from './LocationMeetingToolSummaryCards';
import { LocationMeetingToolVersionPanel } from './LocationMeetingToolVersionPanel';
import {
    isDemoApiBlockedError,
    openMeetingToolReport,
    parseNumberInput,
    removeRatioInputValue
} from './locationMeetingToolDialogUtils';
import type { ReportMapPosition } from './locationMeetingToolReportMap';
import {
    resolveLocationInteractionRuntime,
    type LocationInteractionRuntime
} from './locationInteractionRuntime';
import { useLocationMeetingToolPresets } from './useLocationMeetingToolPresets';
import { useLocationMeetingToolVersions } from './useLocationMeetingToolVersions';

type LocationMeetingToolDialogProps = {
    readonly open: boolean;
    readonly location: FranchiseLocation | null;
    readonly managerName: string;
    readonly runtime?: LocationInteractionRuntime | undefined;
    readonly mapRuntime?: LocationMapRuntime | undefined;
    readonly onOpenChange: (open: boolean) => void;
    readonly onSaved: (locationId: string, draft: MeetingToolDraft) => void;
};

export function LocationMeetingToolDialog({
    open,
    location,
    managerName,
    runtime,
    mapRuntime,
    onOpenChange,
    onSaved
}: LocationMeetingToolDialogProps) {
    const { isDialogOpen, showAlert } = useAppDialog();
    const interactions = resolveLocationInteractionRuntime(runtime);
    const [draft, setDraft] = React.useState<MeetingToolDraft>(() => normalizeMeetingToolDraft(null));
    const [customCostLabel, setCustomCostLabel] = React.useState('');
    const [ratioInputValues, setRatioInputValues] = React.useState<Record<MeetingToolCostKey, string>>({});
    const [reportMapPosition, setReportMapPosition] = React.useState<ReportMapPosition | null>(null);
    const [saving, setSaving] = React.useState(false);
    const [message, setMessage] = React.useState('');
    const dialogRef = React.useRef<HTMLDivElement | null>(null);
    const updateReportMapPosition = React.useCallback((position: ReportMapPosition | null) => {
        setReportMapPosition(prev => {
            if (!position) return prev === null ? prev : null;
            if (prev && prev.lat === position.lat && prev.lng === position.lng) return prev;
            return position;
        });
    }, []);
    const locationId = location?.id || '';
    const companyId = location?.companyId || '';
    const initializedLocationIdRef = React.useRef('');
    const presetState = useLocationMeetingToolPresets({
        open,
        companyId,
        locationId,
        runtime: interactions,
        draft,
        setDraft,
        setRatioInputValues,
        setMessage
    });
    const versionState = useLocationMeetingToolVersions({
        open,
        locationId,
        location,
        runtime: interactions,
        draft,
        setDraft,
        setRatioInputValues,
        setMessage
    });
    useModalFocusTrap({
        dialogRef,
        isOpen: open && Boolean(location),
        onClose: () => onOpenChange(false)
    });

    React.useEffect(() => {
        if (!location || !open) return;
        if (initializedLocationIdRef.current === locationId) return;
        initializedLocationIdRef.current = locationId;
        setDraft(normalizeMeetingToolDraft(location.meetingTool, getMeetingToolDefaultsFromLocation(location)));
        setCustomCostLabel('');
        setRatioInputValues({});
        setReportMapPosition(null);
        setMessage('');
    }, [locationId, location, open]);

    React.useEffect(() => {
        if (!open) initializedLocationIdRef.current = '';
    }, [open]);

    if (!open || !location) return null;

    const summary = calculateMeetingToolSummary(draft);
    const laborPlanningParams = new URLSearchParams({
        locationId,
        monthlySalesManwon: String(Math.max(0, Math.round(draft.targetSales || 0)))
    });
    const laborPlanningHref = `/dashboard/franchise-leads/labor-planning?${laborPlanningParams.toString()}`;

    const updateAmount = (key: MeetingToolCostKey, value: string) => {
        setRatioInputValues(prev => removeRatioInputValue(prev, key));
        setDraft(prev => updateMeetingToolCostAmount(prev, key, parseNumberInput(value)));
    };

    const updateRatio = (key: MeetingToolCostKey, value: string) => {
        setRatioInputValues(prev => ({ ...prev, [key]: value }));
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
            const saved = await interactions.saveMeetingTool({ locationId, meetingTool: draft });
            setDraft(saved);
            onSaved(locationId, saved);
            setMessage('출점 검토 리포트를 저장했습니다.');
        } catch (error) {
            if (isDemoApiBlockedError(error)) {
                setMessage('데모에서는 리포트 저장이 비활성화되어 있습니다.');
                return;
            }
            setMessage(error instanceof Error ? error.message : '출점 검토 리포트 저장에 실패했습니다.');
        } finally {
            setSaving(false);
        }
    };

    const updateTargetScenario = (key: MeetingToolDraft['activeTargetKey']) => {
        setRatioInputValues({});
        setDraft(prev => setMeetingToolActiveTarget(prev, key));
    };

    const updateTargetSales = (value: string) => {
        setRatioInputValues({});
        setDraft(prev => updateMeetingToolTargetSales(prev, parseNumberInput(value)));
    };

    const updateCostMemo = (key: MeetingToolCostKey, memo: string) => {
        setDraft(prev => ({
            ...prev,
            costRows: prev.costRows.map(costRow => costRow.key === key ? { ...costRow, memo } : costRow)
        }));
    };

    const removeCustomCost = (key: MeetingToolCostKey) => {
        setRatioInputValues({});
        setDraft(prev => removeMeetingToolCustomCostRow(prev, key));
    };

    const updateMarketReport = (key: MeetingToolMarketReportKey, value: string) => {
        setDraft(prev => ({
            ...prev,
            marketReport: {
                ...prev.marketReport,
                [key]: value
            }
        }));
    };

    return (
        <div
            ref={dialogRef}
            className={styles.meetingToolBackdrop}
            role="dialog"
            aria-hidden={isDialogOpen || undefined}
            aria-modal={isDialogOpen ? undefined : 'true'}
            aria-label="출점 검토 리포트"
            tabIndex={-1}
        >
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
                    <LocationMeetingToolSummaryCards location={location} />

                    <section className={styles.meetingToolCalculator}>
                        <div className={`${styles.meetingToolSectionHeader} ${styles.meetingToolSectionHeaderWithAction}`}>
                            <div>
                                <h4>간단 수익분석표</h4>
                                <p>목표매출 변화에 따라 비용 비율과 세전수익을 비교합니다.</p>
                            </div>
                            <Link href={laborPlanningHref} className={styles.meetingToolInlineAction}>
                                <Calculator size={15} /> 인력 세팅 열기
                            </Link>
                        </div>
                        <LocationMeetingToolPresetPanel
                            presets={presetState.presets}
                            selectedPresetId={presetState.selectedPresetId}
                            presetName={presetState.presetName}
                            presetLoading={presetState.presetLoading}
                            presetSaving={presetState.presetSaving}
                            selectedPreset={presetState.selectedPreset}
                            onSelectPreset={presetState.selectPreset}
                            onPresetNameChange={presetState.setPresetName}
                            onApplyPreset={presetState.applySelectedPreset}
                            onSavePreset={presetState.savePreset}
                            onDeletePreset={presetState.deletePreset}
                        />
                        <LocationMeetingToolCalculatorSection
                            draft={draft}
                            customCostLabel={customCostLabel}
                            ratioInputValues={ratioInputValues}
                            onTargetScenarioChange={updateTargetScenario}
                            onTargetSalesChange={updateTargetSales}
                            onCostAmountChange={updateAmount}
                            onCostRatioChange={updateRatio}
                            onCostRatioBlur={(key) => setRatioInputValues(prev => removeRatioInputValue(prev, key))}
                            onCostMemoChange={updateCostMemo}
                            onRemoveCustomCostRow={removeCustomCost}
                            onCustomCostLabelChange={setCustomCostLabel}
                            onAddCustomCost={addCustomCost}
                        />
                    </section>

                    <LocationMeetingToolMarketReportSection
                        marketReport={draft.marketReport}
                        onMarketReportChange={updateMarketReport}
                    />

                    <LocationMeetingToolMarketMapSection
                        location={location}
                        marketMap={draft.marketMap}
                        mapRuntime={mapRuntime}
                        onMapPositionChange={updateReportMapPosition}
                        onMarketMapChange={(marketMap) => setDraft(prev => ({ ...prev, marketMap }))}
                    />

                    <LocationMeetingToolResultSection
                        totalCost={summary.totalCost}
                        preTaxProfit={summary.preTaxProfit}
                        profitRatio={summary.profitRatio}
                        reportMemo={draft.reportMemo}
                        message={message}
                        onReportMemoChange={(reportMemo) => setDraft(prev => ({ ...prev, reportMemo }))}
                    >
                        <LocationMeetingToolVersionPanel
                            versions={versionState.versions}
                            versionTitle={versionState.versionTitle}
                            versionLoading={versionState.versionLoading}
                            versionSaving={versionState.versionSaving}
                            onVersionTitleChange={versionState.setVersionTitle}
                            onSaveVersion={versionState.saveVersion}
                            onLoadVersion={versionState.loadVersion}
                        />
                    </LocationMeetingToolResultSection>
                </div>

                <LocationMeetingToolActions
                    saving={saving}
                    onSave={saveReport}
                    onOpenPdf={() => openMeetingToolReport(
                        location,
                        draft,
                        managerName,
                        'pdf',
                        reportMapPosition,
                        message => void showAlert({ message, title: '팝업 차단', type: 'error' })
                    )}
                    onPrint={() => openMeetingToolReport(
                        location,
                        draft,
                        managerName,
                        'print',
                        reportMapPosition,
                        message => void showAlert({ message, title: '팝업 차단', type: 'error' })
                    )}
                    laborPlanningHref={laborPlanningHref}
                />
            </section>
        </div>
    );
}
