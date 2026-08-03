'use client';

import React from 'react';
import pageStyles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import { FranchiseWorkspaceHero } from '@/components/franchise/FranchiseWorkspaceHero';
import { LeadContractChecklistWorkspace } from '@/components/franchise/leads/LeadContractChecklistWorkspace';
import { LeadDetailPanel } from '@/components/franchise/leads/LeadDetailPanel';
import { LeadToolbar } from '@/components/franchise/leads/LeadToolbar';
import {
    LeadWorkspaceTabs,
    type LeadWorkspaceTab
} from '@/components/franchise/leads/LeadWorkspaceTabs';
import {
    EMPTY_LEAD_TABLE_FILTERS
} from '@/components/franchise/leads/leadTableConfig';
import type { FranchiseLead } from '@/components/franchise/leads/types';
import type { DemoActionHandler, DemoRole, DemoScreenId } from '../demoTypes';
import { DEMO_CONTRACT_CHECKLIST_SUMMARIES } from './DemoContractChecklistSummaries';
import { selectDemoContractLeads } from './DemoLeadSampleData';
import { DemoGuideTarget, DemoGuidedLayout } from './DemoScreenGuide';
import { filterDemoLeads, rebaseDemoLeadDates } from './DemoLeadState';
import { useDemoLeadDetailController } from './useDemoLeadDetailController';
import { useDemoLeadToolbar } from './useDemoLeadToolbar';

type DemoContractOwnersAdapterProps = {
    readonly role: DemoRole;
    readonly onScreenChange: (screen: DemoScreenId) => void;
    readonly onSimulate: DemoActionHandler;
};

export function DemoContractOwnersAdapter({
    role,
    onScreenChange,
    onSimulate
}: DemoContractOwnersAdapterProps) {
    const [leads, setLeads] = React.useState(() => rebaseDemoLeadDates(
        selectDemoContractLeads(role),
        new Date()
    ));
    const [selectedLeadId, setSelectedLeadId] = React.useState('');
    const toolbar = useDemoLeadToolbar();
    const visibleLeads = filterDemoLeads(leads, {
        layer: 'candidate',
        ...toolbar.filter,
        tableFilters: EMPTY_LEAD_TABLE_FILTERS,
        tableSort: 'created_desc'
    });
    const selectedLead = leads.find(lead => lead.id === selectedLeadId) || null;
    const updateLead = (leadId: string, updater: (lead: FranchiseLead) => FranchiseLead) => {
        setLeads(current => current.map(lead => lead.id === leadId ? updater(lead) : lead));
    };
    const detailProps = useDemoLeadDetailController({
        role,
        lead: selectedLead,
        mode: 'contractChecklist',
        updateLeadAction: updateLead,
        onCloseAction: () => setSelectedLeadId(''),
        onEditAction: lead => onSimulate(`${lead.name} 수정 화면`),
        onPromoteAction: lead => updateLead(lead.id, current => ({ ...current, leadStage: 'candidate' })),
        onConvertAction: lead => onSimulate(`${lead.name} 고객 DB 전환`),
        onSimulate
    });
    const selectLead = (leadId: string) => {
        setSelectedLeadId(leadId);
        const lead = leads.find(item => item.id === leadId);
        onSimulate(lead ? `${lead.name} 계약 완료 상세 열기` : '구비서류 상세 열기');
    };

    return (
        <div className={pageStyles.pageShell}>
            <FranchiseWorkspaceHero
                title="계약 완료"
                description="계약 완료 점주의 오픈 준비, 구비서류, 점주 문서함 흐름을 실제 화면 구조로 확인합니다."
            />
            <DemoGuideTarget marker={1} targetId="contract-owner-toolbar" label="계약 완료 필터">
                <LeadToolbar {...toolbar.toolbarProps} />
            </DemoGuideTarget>
            <DemoGuideTarget marker={2} targetId="contract-owner-tabs" label="계약 업무 탭">
                <LeadWorkspaceTabs
                    activeTab="contractOwners"
                    onTabChange={tab => handleTabChange(tab, onScreenChange)}
                />
            </DemoGuideTarget>
            <DemoGuidedLayout screen="contractOwners" onScreenChange={onScreenChange}>
                <DemoGuideTarget marker={3} targetId="contract-owner-list" label="구비서류 열기">
                    <section className={pageStyles.tablePanel}>
                        <div className={pageStyles.tableHeader}>
                            <div>
                                <h2>구비서류 체크리스트</h2>
                                <p>계약완료 점주의 필수 서류, 내부보고, 선택 보관 항목을 빠르게 점검합니다.</p>
                            </div>
                        </div>
                        <LeadContractChecklistWorkspace
                            isLoading={false}
                            isSummaryLoading={false}
                            schemaReady
                            errorMessage=""
                            visibleLeadCount={visibleLeads.length}
                            leads={visibleLeads}
                            summaries={DEMO_CONTRACT_CHECKLIST_SUMMARIES}
                            safeCurrentPage={1}
                            totalPages={1}
                            onOpenChecklistAction={selectLead}
                            onPreviousPageAction={() => undefined}
                            onNextPageAction={() => undefined}
                        />
                    </section>
                </DemoGuideTarget>
            </DemoGuidedLayout>
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
            return;
    }
}
