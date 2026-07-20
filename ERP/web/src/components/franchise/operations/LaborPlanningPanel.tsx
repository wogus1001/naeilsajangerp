'use client';

import React from 'react';
import { Calculator, FileText, FolderOpen, Pencil, RotateCcw, Table2, Trash2, Wrench } from 'lucide-react';
import { useAppDialog } from '@/components/common/AppDialogProvider';
import { DEFAULT_LABOR_SETTINGS, LABOR_WEEKDAYS, calculateLaborPlan, type LaborPlanResult, type LaborSettings, type LaborWeekday } from '@/lib/franchise-labor-planning';
import { buildLaborScenarioResult, type LaborScenarioKey } from '@/lib/franchise-labor-scenario-summary';
import type { FranchiseLocation } from './types';
import { LaborPlanningInputSection } from './LaborPlanningInputSection';
import { LaborPlanningResultView } from './LaborPlanningResultView';
import { LaborDocumentBox, LaborUtilityCalculators, LaborWeeklySchedule } from './LaborPlanningUtilities';
import {
    buildLaborPlanInput,
    calculateLaborPlanRequest,
    deleteLaborPlan,
    fetchLaborPlans,
    fetchLaborSettings,
    saveLaborPlan,
    updateLaborPlan
} from './laborPlanningRequests';
import type { LaborPlanForm, LaborSavedPlan } from './laborPlanningTypes';
import styles from './LaborPlanningPanel.module.css';

type Props = {
    readonly userId: string;
    readonly companyName: string;
    readonly locations: readonly FranchiseLocation[];
    readonly initialLocationId?: string;
    readonly initialMonthlySalesManwon?: number;
};

const DEFAULT_WEEKDAYS: readonly LaborWeekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const LABOR_VIEWS = [
    { key: 'plan', label: '계산 입력', icon: Calculator },
    { key: 'result', label: '결과·근무표', icon: Table2 },
    { key: 'tools', label: '부속 도구', icon: Wrench },
    { key: 'saved', label: '저장안', icon: FolderOpen }
] as const;

type LaborView = typeof LABOR_VIEWS[number]['key'];

function defaultForm(locationId: string, monthlySalesManwon = 6000): LaborPlanForm {
    return {
        locationId,
        title: '기본 인력 세팅안',
        monthlySalesManwon,
        targetLaborRatio: 19,
        operatingWeekdays: DEFAULT_WEEKDAYS,
        partTimeWeekdays: DEFAULT_WEEKDAYS,
        openTime: '10:00',
        closeTime: '22:00',
        ownerWorks: false,
        useBreakTime: true,
        breakStartTime: '15:00',
        breakEndTime: '17:00',
        managerMonthlySalaryManwon: 350,
        staffMonthlySalaryManwon: 270,
        partTimeHourlyWage: DEFAULT_LABOR_SETTINGS.minimumHourlyWage,
        memo: ''
    };
}

function formatDate(value: string | null): string {
    return value ? new Date(value).toLocaleDateString('ko-KR') : '-';
}

export function LaborPlanningPanel({
    userId,
    companyName,
    locations,
    initialLocationId = '',
    initialMonthlySalesManwon
}: Props) {
    const { showAlert, showConfirm } = useAppDialog();
    const initialSales = initialMonthlySalesManwon && initialMonthlySalesManwon > 0 ? initialMonthlySalesManwon : 6000;
    const [form, setForm] = React.useState<LaborPlanForm>(() => defaultForm(initialLocationId || locations[0]?.id || '', initialSales));
    const [settings, setSettings] = React.useState<LaborSettings>(DEFAULT_LABOR_SETTINGS);
    const [companyId, setCompanyId] = React.useState('');
    const [schemaReady, setSchemaReady] = React.useState(true);
    const [plans, setPlans] = React.useState<readonly LaborSavedPlan[]>([]);
    const [result, setResult] = React.useState<LaborPlanResult | null>(() => calculateLaborPlan(buildLaborPlanInput(defaultForm(locations[0]?.id || ''), DEFAULT_LABOR_SETTINGS)));
    const [selectedScenarioKey, setSelectedScenarioKey] = React.useState<LaborScenarioKey>('standard');
    const [activeView, setActiveView] = React.useState<LaborView>('plan');
    const [isSaving, setIsSaving] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(false);
    const [editingPlanId, setEditingPlanId] = React.useState('');
    const scope = React.useMemo(() => ({ userId, companyName }), [companyName, userId]);
    const editingPlan = plans.find(plan => plan.id === editingPlanId);
    const selectedLocationName = locations.find(location => location.id === form.locationId)?.name || '운영점 미지정';
    const displayResult = React.useMemo(
        () => result ? buildLaborScenarioResult(result, selectedScenarioKey) : null,
        [result, selectedScenarioKey]
    );

    React.useEffect(() => {
        setForm(current => {
            const nextLocationId = initialLocationId && locations.some(location => location.id === initialLocationId)
                ? initialLocationId
                : current.locationId || locations[0]?.id || '';
            const nextSales = initialMonthlySalesManwon && initialMonthlySalesManwon > 0
                ? initialMonthlySalesManwon
                : current.monthlySalesManwon;
            if (current.locationId === nextLocationId && current.monthlySalesManwon === nextSales) return current;
            return { ...current, locationId: nextLocationId, monthlySalesManwon: nextSales };
        });
    }, [initialLocationId, initialMonthlySalesManwon, locations]);

    const load = React.useCallback(async () => {
        if (!scope.userId.trim()) return;
        setIsLoading(true);
        try {
            const [settingsPayload, plansPayload] = await Promise.all([
                fetchLaborSettings(scope),
                fetchLaborPlans(scope)
            ]);
            setCompanyId(settingsPayload.companyId || plansPayload.companyId);
            setSchemaReady(settingsPayload.schemaReady && plansPayload.schemaReady);
            setSettings(settingsPayload.settings || DEFAULT_LABOR_SETTINGS);
            setPlans(plansPayload.plans || []);
        } catch (error) {
            setSchemaReady(false);
            console.warn('Franchise labor load warning:', error);
        } finally {
            setIsLoading(false);
        }
    }, [scope]);

    React.useEffect(() => {
        void load();
    }, [load]);

    const updateForm = (patch: Partial<LaborPlanForm>) => {
        setForm(current => ({ ...current, ...patch }));
    };

    const toggleWeekday = (weekday: LaborWeekday) => {
        const set = new Set(form.operatingWeekdays);
        const partTimeSet = new Set(form.partTimeWeekdays);
        if (set.has(weekday)) {
            set.delete(weekday);
            partTimeSet.delete(weekday);
        } else {
            set.add(weekday);
            partTimeSet.add(weekday);
        }
        const operatingWeekdays = LABOR_WEEKDAYS.map(day => day.key).filter(day => set.has(day));
        const partTimeWeekdays = LABOR_WEEKDAYS.map(day => day.key).filter(day => partTimeSet.has(day) && set.has(day));
        updateForm({ operatingWeekdays, partTimeWeekdays });
    };

    const togglePartTimeWeekday = (weekday: LaborWeekday) => {
        if (!form.operatingWeekdays.includes(weekday)) return;
        const set = new Set(form.partTimeWeekdays);
        if (set.has(weekday)) set.delete(weekday);
        else set.add(weekday);
        updateForm({ partTimeWeekdays: LABOR_WEEKDAYS.map(day => day.key).filter(day => set.has(day) && form.operatingWeekdays.includes(day)) });
    };

    const runCalculate = async () => {
        try {
            const nextResult = await calculateLaborPlanRequest(form, settings);
            setResult(nextResult);
            setSelectedScenarioKey('standard');
            setActiveView('result');
        } catch (error) {
            console.warn('Franchise labor calculate fallback:', error);
            setResult(calculateLaborPlan(buildLaborPlanInput(form, settings)));
            setSelectedScenarioKey('standard');
            setActiveView('result');
        }
    };

    const saveCurrentPlan = async () => {
        if (!companyId || !form.locationId) {
            void showAlert({ message: '운영점과 회사 정보를 확인해주세요.', type: 'error' });
            return;
        }
        setIsSaving(true);
        try {
            const isEditing = Boolean(editingPlanId);
            if (isEditing) {
                await updateLaborPlan(scope, companyId, editingPlanId, form, settings);
            } else {
                await saveLaborPlan(scope, companyId, form, settings);
            }
            setEditingPlanId('');
            await load();
            setActiveView('saved');
            void showAlert({ message: isEditing ? '인력 세팅안을 수정했습니다.' : '인력 세팅안을 저장했습니다.', type: 'success' });
        } catch (error) {
            void showAlert({ message: error instanceof Error ? error.message : '인력 세팅안을 저장하지 못했습니다.', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const applySavedPlan = (plan: LaborSavedPlan) => {
        setForm(current => ({
            ...current,
            locationId: plan.locationId,
            title: plan.title,
            monthlySalesManwon: Math.round(plan.monthlySalesTarget / 10_000),
            targetLaborRatio: plan.targetLaborRatio,
            operatingWeekdays: plan.operatingWeekdays.length > 0 ? plan.operatingWeekdays : current.operatingWeekdays,
            partTimeWeekdays: plan.summary?.partTimeWeekdays?.length ? plan.summary.partTimeWeekdays : plan.operatingWeekdays.length > 0 ? plan.operatingWeekdays : current.partTimeWeekdays,
            openTime: plan.openTime || current.openTime,
            closeTime: plan.closeTime || current.closeTime,
            ownerWorks: Boolean(plan.summary?.ownerWorks),
            useBreakTime: plan.summary?.useBreakTime ?? current.useBreakTime,
            breakStartTime: plan.summary?.breakStartTime || current.breakStartTime,
            breakEndTime: plan.summary?.breakEndTime || current.breakEndTime,
            memo: plan.memo
        }));
        setResult(plan.summary);
        setSelectedScenarioKey('standard');
        setEditingPlanId('');
        setActiveView('result');
    };

    const editSavedPlan = (plan: LaborSavedPlan) => {
        setForm(current => ({
            ...current,
            locationId: plan.locationId,
            title: plan.title,
            monthlySalesManwon: Math.round(plan.monthlySalesTarget / 10_000),
            targetLaborRatio: plan.targetLaborRatio,
            operatingWeekdays: plan.operatingWeekdays.length > 0 ? plan.operatingWeekdays : current.operatingWeekdays,
            partTimeWeekdays: plan.summary?.partTimeWeekdays?.length ? plan.summary.partTimeWeekdays : plan.operatingWeekdays.length > 0 ? plan.operatingWeekdays : current.partTimeWeekdays,
            openTime: plan.openTime || current.openTime,
            closeTime: plan.closeTime || current.closeTime,
            ownerWorks: Boolean(plan.summary?.ownerWorks),
            useBreakTime: plan.summary?.useBreakTime ?? current.useBreakTime,
            breakStartTime: plan.summary?.breakStartTime || current.breakStartTime,
            breakEndTime: plan.summary?.breakEndTime || current.breakEndTime,
            memo: plan.memo
        }));
        setResult(plan.summary);
        setSelectedScenarioKey('standard');
        setEditingPlanId(plan.id);
        setActiveView('plan');
    };

    const deleteSavedPlan = async (plan: LaborSavedPlan) => {
        if (!companyId) {
            void showAlert({ message: '회사 정보를 확인해주세요.', type: 'error' });
            return;
        }
        const confirmed = await showConfirm({
            title: '인력 세팅안 삭제',
            message: `'${plan.title}' 인력 세팅안을 삭제할까요? 삭제한 세팅안은 목록에서 제거됩니다.`,
            confirmText: '삭제',
            isDanger: true
        });
        if (!confirmed) return;
        setIsSaving(true);
        try {
            await deleteLaborPlan(scope, companyId, plan.id);
            if (editingPlanId === plan.id) setEditingPlanId('');
            await load();
            void showAlert({ message: '인력 세팅안을 삭제했습니다.', type: 'success' });
        } catch (error) {
            void showAlert({ message: error instanceof Error ? error.message : '인력 세팅안을 삭제하지 못했습니다.', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const clearEditingPlan = () => {
        setEditingPlanId('');
        setForm(defaultForm(locations[0]?.id || ''));
        setResult(calculateLaborPlan(buildLaborPlanInput(defaultForm(locations[0]?.id || ''), settings)));
        setSelectedScenarioKey('standard');
    };

    return (
        <div className={styles.panel}>
            {!schemaReady ? (
                <div className={styles.notice}>인력 세팅 저장 SQL이 아직 적용되지 않았습니다. 계산은 가능하지만 저장/불러오기는 SQL 적용 후 활성화됩니다.</div>
            ) : null}
            <nav className={styles.viewTabs} aria-label="인력 세팅 보기">
                {LABOR_VIEWS.map(view => {
                    const Icon = view.icon;
                    const isActive = activeView === view.key;
                    return (
                        <button
                            key={view.key}
                            type="button"
                            className={isActive ? styles.viewTabActive : styles.viewTab}
                            aria-current={isActive ? 'page' : undefined}
                            onClick={() => setActiveView(view.key)}
                        >
                            <Icon size={14} />
                            {view.label}
                        </button>
                    );
                })}
            </nav>
            {activeView === 'plan' ? (
                <>
                    {editingPlan ? (
                        <div className={styles.editingBanner}>
                            <div>
                                <strong>수정 중</strong>
                                <span>{editingPlan.title} 저장안을 수정하고 있습니다.</span>
                            </div>
                            <button type="button" className={styles.secondaryButton} onClick={clearEditingPlan}>
                                <RotateCcw size={14} />
                                새 세팅안
                            </button>
                        </div>
                    ) : null}
                    <LaborPlanningInputSection
                        form={form}
                        settings={settings}
                        locations={locations}
                        schemaReady={schemaReady}
                        isSaving={isSaving}
                        onUpdateForm={updateForm}
                        onToggleWeekday={toggleWeekday}
                        onTogglePartTimeWeekday={togglePartTimeWeekday}
                        onCalculate={() => void runCalculate()}
                        onSave={() => void saveCurrentPlan()}
                    />
                </>
            ) : null}
            {activeView === 'result' ? (
                <>
                    <LaborPlanningResultView
                        locationName={selectedLocationName}
                        planTitle={form.title}
                        baseResult={result}
                        result={displayResult}
                        selectedScenarioKey={selectedScenarioKey}
                        onSelectScenario={setSelectedScenarioKey}
                    />
                    <LaborWeeklySchedule result={displayResult} />
                </>
            ) : null}
            {activeView === 'tools' ? (
                <div className={styles.bottomGrid}>
                    <LaborUtilityCalculators settings={settings} />
                    <LaborDocumentBox />
                </div>
            ) : null}
            {activeView === 'saved' ? (
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h3>저장된 인력 세팅안</h3>
                        <p>운영점별 저장안을 불러와 다시 계산하거나 수정할 수 있습니다.</p>
                    </div>
                    <div className={styles.savedPlans}>
                        {isLoading ? <span>불러오는 중...</span> : null}
                        {plans.map(plan => (
                            <div key={plan.id} className={styles.savedPlanRow}>
                                <button type="button" className={styles.savedPlanMain} onClick={() => applySavedPlan(plan)}>
                                    <b>{plan.title}</b>
                                    <span>
                                        {Math.round(plan.monthlySalesTarget / 10_000).toLocaleString('ko-KR')}만원 · 인건비율 {plan.summary?.laborRatio || 0}% · {formatDate(plan.createdAt)}
                                    </span>
                                </button>
                                <div className={styles.savedPlanActions}>
                                    <button type="button" className={styles.secondaryButton} onClick={() => editSavedPlan(plan)}>
                                        <Pencil size={14} />
                                        수정
                                    </button>
                                    <button type="button" className={styles.dangerButton} onClick={() => void deleteSavedPlan(plan)} disabled={isSaving}>
                                        <Trash2 size={14} />
                                        삭제
                                    </button>
                                </div>
                            </div>
                        ))}
                        {!isLoading && plans.length === 0 ? (
                            <div className={styles.emptyState}>
                                <FileText size={16} />
                                저장된 세팅안이 없습니다. 계산 입력에서 첫 세팅안을 저장해보세요.
                            </div>
                        ) : null}
                    </div>
                </section>
            ) : null}
        </div>
    );
}
