'use client';

import pageStyles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import { Download, Link2, Plus, Upload } from 'lucide-react';
import { FranchiseWorkspaceHero } from '@/components/franchise/FranchiseWorkspaceHero';
import { LeadDbWorkspace } from '@/components/franchise/leads/LeadDbWorkspace';
import { LeadDetailPanel } from '@/components/franchise/leads/LeadDetailPanel';
import { LeadFormModal } from '@/components/franchise/leads/LeadFormModal';
import { LeadQuickActivityModal } from '@/components/franchise/leads/LeadQuickActivityModal';
import { LeadToolbar } from '@/components/franchise/leads/LeadToolbar';
import {
    LeadWorkspaceTabs,
    type LeadWorkspaceTab
} from '@/components/franchise/leads/LeadWorkspaceTabs';
import type { DemoActionHandler, DemoScreenId } from '../demoTypes';
import { DemoGuideTarget, DemoGuidedLayout } from './DemoScreenGuide';
import { useDemoLeadDbController } from './useDemoLeadDbController';
import { useDemoLeadDetailController } from './useDemoLeadDetailController';

type DemoLeadDbAdapterProps = {
    readonly activeTab: LeadWorkspaceTab;
    readonly onScreenChange: (screen: DemoScreenId) => void;
    readonly onSimulate: DemoActionHandler;
};

export function DemoLeadDbAdapter({
    activeTab,
    onScreenChange,
    onSimulate
}: DemoLeadDbAdapterProps) {
    const controller = useDemoLeadDbController(onSimulate);
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

    return (
        <div className={pageStyles.pageShell}>
            <FranchiseWorkspaceHero
                title="모객 DB"
                description="가맹 희망자 유입부터 상담, 검토, 계약 전환까지 본사에서 한눈에 관리합니다."
                actions={(
                    <>
                        <button
                            className={pageStyles.secondaryButton}
                            onClick={() => onSimulate('Meta 연동 샘플 상태를 확인했습니다.')}
                        >
                            <Link2 size={16} />
                            Meta 연동
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

            <DemoGuideTarget marker={1} targetId="lead-db-filters" label="필터 검색">
                <LeadToolbar {...controller.toolbarProps} />
            </DemoGuideTarget>

            <LeadWorkspaceTabs
                activeTab={activeTab}
                onTabChange={tab => handleTabChange(tab, onScreenChange)}
            />

            <DemoGuidedLayout screen="leadDb" onScreenChange={onScreenChange}>
                <LeadDbWorkspace {...controller.workspaceProps} />
            </DemoGuidedLayout>

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

function handleTabChange(
    tab: LeadWorkspaceTab,
    onScreenChange: (screen: DemoScreenId) => void
) {
    switch (tab) {
        case 'dashboard':
            onScreenChange('dashboard');
            return;
        case 'db':
            onScreenChange('leadDb');
            return;
        case 'contractOwners':
            onScreenChange('contractOwners');
            return;
    }
}
