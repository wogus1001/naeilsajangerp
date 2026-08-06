'use client';

import React from 'react';
import pageStyles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import { ChevronDown, ChevronUp, Download, Link2, Plus, Upload } from 'lucide-react';
import { FranchiseWorkspaceHero } from '@/components/franchise/FranchiseWorkspaceHero';
import { LeadDashboard } from '@/components/franchise/leads/LeadDashboard';
import { LeadDbWorkspace } from '@/components/franchise/leads/LeadDbWorkspace';
import { LeadDetailPanel } from '@/components/franchise/leads/LeadDetailPanel';
import { LeadFormModal } from '@/components/franchise/leads/LeadFormModal';
import { LeadQuickActivityModal } from '@/components/franchise/leads/LeadQuickActivityModal';
import { LeadMetaIntegrationPanel } from '@/components/franchise/leads/LeadMetaIntegrationPanel';
import { LeadToolbar } from '@/components/franchise/leads/LeadToolbar';
import {
    LeadWorkspaceTabs,
    type LeadWorkspaceTab
} from '@/components/franchise/leads/LeadWorkspaceTabs';
import {
    DEMO_TOUR_STEP_ADVANCE_EVENT,
    type DemoActionHandler,
    type DemoScreenId
} from '../demoTypes';
import { DemoGuideTarget, DemoGuidedLayout } from './DemoScreenGuide';
import { useDemoLeadDbController } from './useDemoLeadDbController';
import { useDemoLeadDetailController } from './useDemoLeadDetailController';
import { useDemoMetaIntegration } from './useDemoMetaIntegration';

type DemoLeadDbAdapterProps = {
    readonly onScreenChange: (screen: DemoScreenId) => void;
    readonly onSimulate: DemoActionHandler;
};

export function DemoLeadDbAdapter({
    onScreenChange,
    onSimulate
}: DemoLeadDbAdapterProps) {
    const [workspaceTab, setWorkspaceTab] = React.useState<Exclude<LeadWorkspaceTab, 'contractOwners'>>('dashboard');
    const [isMetaPanelOpen, setIsMetaPanelOpen] = React.useState(false);
    const controller = useDemoLeadDbController(onSimulate);
    const meta = useDemoMetaIntegration(onSimulate);
    const detailProps = useDemoLeadDetailController({
        lead: controller.selectedLead,
        mode: 'default',
        updateLeadAction: controller.updateLead,
        onCloseAction: () => controller.setSelectedLeadId(''),
        onEditAction: controller.openEditModal,
        onPromoteAction: controller.promoteLead,
        onConvertAction: controller.convertLead,
        onSimulate
    });

    React.useEffect(() => {
        const handleGuideAdvance = (event: WindowEventMap[typeof DEMO_TOUR_STEP_ADVANCE_EVENT]) => {
            if (event.detail.screen !== 'leadDb') return;
            const nextTargetId = event.detail.toTargetId || '';
            if (nextTargetId === 'lead-db-dashboard-tab' || nextTargetId.startsWith('lead-dashboard-')) {
                setWorkspaceTab('dashboard');
                return;
            }
            if (nextTargetId.startsWith('lead-db-') || nextTargetId.startsWith('lead-detail-')) {
                setWorkspaceTab('db');
            }
        };
        window.addEventListener(DEMO_TOUR_STEP_ADVANCE_EVENT, handleGuideAdvance);
        return () => window.removeEventListener(DEMO_TOUR_STEP_ADVANCE_EVENT, handleGuideAdvance);
    }, []);

    const handleTabChange = (tab: LeadWorkspaceTab) => {
        if (tab === 'contractOwners') {
            onScreenChange('contractOwners');
            return;
        }
        setWorkspaceTab(tab);
    };

    return (
        <div className={pageStyles.pageShell}>
            <FranchiseWorkspaceHero
                title="모객 DB"
                description="가맹 희망자 유입부터 상담, 검토, 계약 전환까지 본사에서 한눈에 관리합니다."
                actions={(
                    <>
                        <button
                            className={isMetaPanelOpen ? pageStyles.metaToggleButtonActive : pageStyles.metaToggleButton}
                            onClick={() => setIsMetaPanelOpen(open => !open)}
                            aria-expanded={isMetaPanelOpen}
                            aria-controls="meta-integration-panel"
                        >
                            <Link2 size={16} />
                            {isMetaPanelOpen ? 'Meta 설정 닫기' : 'Meta 연동 설정'}
                            {isMetaPanelOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        </button>
                        <button
                            className={pageStyles.secondaryButton}
                            onClick={() => onSimulate('샘플 양식 다운로드를 준비했습니다.')}
                        >
                            <Download size={16} />
                            샘플 양식
                        </button>
                        <button
                            className={pageStyles.secondaryButton}
                            onClick={() => onSimulate('엑셀 업로드 샘플을 확인했습니다.')}
                        >
                            <Upload size={16} />
                            엑셀 업로드
                        </button>
                        <button
                            className={pageStyles.primaryButton}
                            onClick={controller.openCreateModal}
                        >
                            <Plus size={16} />
                            가맹 희망자 등록
                        </button>
                    </>
                )}
            />

            <DemoGuideTarget marker={6} targetId="lead-db-filters" label="필터 검색">
                <LeadToolbar {...controller.toolbarProps} />
            </DemoGuideTarget>

            <LeadWorkspaceTabs
                activeTab={workspaceTab}
                onTabChange={handleTabChange}
            />

            {isMetaPanelOpen ? (
                <LeadMetaIntegrationPanel
                    metaState={meta.metaState}
                    enabledFormCount={meta.enabledFormCount}
                    lastSyncAt={meta.lastSyncAt}
                    errorCount={meta.errorCount}
                    canManageMeta
                    isMetaLoading={false}
                    isMetaSyncing={false}
                    savingMetaFormId=""
                    savingMetaFormOperation={null}
                    dirtyMetaFormIds={meta.dirtyMetaFormIds}
                    renderManagerOptionsAction={meta.renderManagerOptions}
                    onRefreshAction={meta.refresh}
                    onStartConnectAction={meta.startConnect}
                    onSyncAction={meta.sync}
                    onDisconnectConnectionAction={meta.disconnect}
                    onRefreshFormQuestionsAction={meta.refreshQuestions}
                    onReplaceQuestionMappingAction={meta.replaceQuestionMapping}
                    onUpdateFormAction={meta.updateForm}
                    onUpdateQuestionMappingAction={meta.updateQuestionMapping}
                />
            ) : null}

            {workspaceTab === 'dashboard' ? (
                <LeadDashboard {...controller.dashboardProps} />
            ) : (
                <DemoGuidedLayout screen="leadDb" onScreenChange={onScreenChange}>
                    <LeadDbWorkspace {...controller.workspaceProps} />
                </DemoGuidedLayout>
            )}

            {controller.formModalProps ? (
                <LeadFormModal {...controller.formModalProps} />
            ) : null}
            {controller.quickActivityModalProps ? (
                <LeadQuickActivityModal {...controller.quickActivityModalProps} />
            ) : null}
            {detailProps ? <LeadDetailPanel {...detailProps} /> : null}
        </div>
    );
}
