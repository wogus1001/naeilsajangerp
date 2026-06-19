'use client';

import React from 'react';
import pageStyles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import { FranchiseWorkspaceHero } from '@/components/franchise/FranchiseWorkspaceHero';
import { LeadContractChecklistWorkspace } from '@/components/franchise/leads/LeadContractChecklistWorkspace';
import { LeadToolbar } from '@/components/franchise/leads/LeadToolbar';
import { LeadWorkspaceTabs, type LeadWorkspaceTab } from '@/components/franchise/leads/LeadWorkspaceTabs';
import { FRANCHISE_LEAD_STATUSES } from '@/lib/franchise-leads';
import type { LeadContractChecklistSummaryView } from '@/lib/franchise-lead-contract-checklist';
import { RANGE_OPTIONS, SOURCE_FILTER_OPTIONS } from '@/components/franchise/leads/constants';
import type { DemoActionHandler, DemoScreenId } from '../demoTypes';
import { DEMO_LEAD_MANAGERS, DEMO_SAMPLE_LEADS } from './DemoLeadSampleData';

type DemoContractOwnersAdapterProps = {
    readonly onScreenChange: (screen: DemoScreenId) => void;
    readonly onSimulate: DemoActionHandler;
};

const DEMO_CONTRACT_CHECKLIST_SUMMARIES: Record<string, LeadContractChecklistSummaryView> = {
    'demo-candidate-2': {
        leadId: 'demo-candidate-2',
        total: 7,
        completed: 5,
        remaining: 2,
        progressPercent: 71,
        remainingLabels: ['가맹금 안내', '인근 가맹점 현황 확인'],
        schemaReady: true
    }
};

export function DemoContractOwnersAdapter({ onScreenChange, onSimulate }: DemoContractOwnersAdapterProps) {
    const [range, setRange] = React.useState<typeof RANGE_OPTIONS[number]>('최근 30일');
    const [searchTerm, setSearchTerm] = React.useState('');
    const [createdFrom, setCreatedFrom] = React.useState('2026-05-20');
    const contractOwnerLeads = DEMO_SAMPLE_LEADS.filter(lead => lead.status === '계약완료');

    return (
        <div className={pageStyles.pageShell}>
            <FranchiseWorkspaceHero
                title="모객 DB"
                description="계약 완료 점주의 계약 전 체크리스트를 실제 화면 구조로 확인합니다."
            />
            <LeadToolbar
                rangeOptions={RANGE_OPTIONS}
                range={range}
                searchTerm={searchTerm}
                statusFilter="전체"
                statusOptions={FRANCHISE_LEAD_STATUSES}
                sourceFilter="전체"
                sourceOptions={SOURCE_FILTER_OPTIONS}
                managerFilter="전체"
                managerOptions={DEMO_LEAD_MANAGERS.map(manager => <option key={manager.id} value={manager.id}>{manager.label}</option>)}
                createdFrom={createdFrom}
                createdTo=""
                onRangeClickAction={(nextRange) => setRange(nextRange as typeof RANGE_OPTIONS[number])}
                onSearchTermChangeAction={setSearchTerm}
                onStatusFilterChangeAction={() => undefined}
                onSourceFilterChangeAction={() => undefined}
                onManagerFilterChangeAction={() => undefined}
                onCreatedFromChangeAction={(date) => {
                    setRange('전체');
                    setCreatedFrom(date);
                }}
                onCreatedToChangeAction={() => undefined}
            />
            <LeadWorkspaceTabs activeTab="contractOwners" onTabChange={tab => handleTabChange(tab, onScreenChange)} />
            <section className={pageStyles.tablePanel}>
                <div className={pageStyles.tableHeader}>
                    <div>
                        <h2>계약 전 체크리스트</h2>
                        <p>계약완료 점주의 계약 전 확인 항목만 빠르게 점검합니다.</p>
                    </div>
                </div>
                <LeadContractChecklistWorkspace
                    isLoading={false}
                    isSummaryLoading={false}
                    schemaReady
                    errorMessage=""
                    visibleLeadCount={contractOwnerLeads.length}
                    leads={contractOwnerLeads}
                    summaries={DEMO_CONTRACT_CHECKLIST_SUMMARIES}
                    safeCurrentPage={1}
                    totalPages={1}
                    onOpenChecklistAction={() => onSimulate('샘플 체크리스트 열기')}
                    onPreviousPageAction={() => undefined}
                    onNextPageAction={() => undefined}
                />
            </section>
        </div>
    );
}

function handleTabChange(tab: LeadWorkspaceTab, onScreenChange: (screen: DemoScreenId) => void) {
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
