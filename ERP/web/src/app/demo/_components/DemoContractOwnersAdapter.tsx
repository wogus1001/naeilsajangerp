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
import { DemoRecordDrawer } from './DemoRecordDrawer';
import { DemoGuideTarget, DemoGuidedLayout } from './DemoScreenGuide';

type DemoContractOwnersAdapterProps = {
    readonly onScreenChange: (screen: DemoScreenId) => void;
    readonly onSimulate: DemoActionHandler;
};

const DEMO_CONTRACT_CHECKLIST_SUMMARIES: Record<string, LeadContractChecklistSummaryView> = {
    'demo-candidate-2': {
        leadId: 'demo-candidate-2',
        total: 17,
        completed: 5,
        resolved: 8,
        remaining: 9,
        progressPercent: 47,
        missingRequiredCount: 2,
        groups: {
            required: { total: 6, completed: 4, resolved: 4, remaining: 2, progressPercent: 67, missingDocumentCount: 2 },
            report: { total: 7, completed: 1, resolved: 2, remaining: 5, progressPercent: 29, missingDocumentCount: 5 },
            optional: { total: 4, completed: 0, resolved: 2, remaining: 2, progressPercent: 50, missingDocumentCount: 0 }
        },
        remainingLabels: ['가맹계약서', '사업자등록증/영업신고증'],
        schemaReady: true
    },
    'demo-candidate-4': {
        leadId: 'demo-candidate-4',
        total: 17,
        completed: 11,
        resolved: 13,
        remaining: 4,
        progressPercent: 76,
        missingRequiredCount: 0,
        groups: {
            required: { total: 6, completed: 6, resolved: 6, remaining: 0, progressPercent: 100, missingDocumentCount: 0 },
            report: { total: 7, completed: 4, resolved: 5, remaining: 2, progressPercent: 71, missingDocumentCount: 2 },
            optional: { total: 4, completed: 1, resolved: 2, remaining: 2, progressPercent: 50, missingDocumentCount: 0 }
        },
        remainingLabels: ['오픈물품 발주 확인서', '점주교육확인서'],
        schemaReady: true
    },
    'demo-candidate-6': {
        leadId: 'demo-candidate-6',
        total: 17,
        completed: 14,
        resolved: 16,
        remaining: 1,
        progressPercent: 94,
        missingRequiredCount: 0,
        groups: {
            required: { total: 6, completed: 6, resolved: 6, remaining: 0, progressPercent: 100, missingDocumentCount: 0 },
            report: { total: 7, completed: 6, resolved: 7, remaining: 0, progressPercent: 100, missingDocumentCount: 0 },
            optional: { total: 4, completed: 2, resolved: 3, remaining: 1, progressPercent: 75, missingDocumentCount: 0 }
        },
        remainingLabels: ['냉난방기 하자이행증권'],
        schemaReady: true
    }
};

export function DemoContractOwnersAdapter({ onScreenChange, onSimulate }: DemoContractOwnersAdapterProps) {
    const [range, setRange] = React.useState<typeof RANGE_OPTIONS[number]>('최근 30일');
    const [searchTerm, setSearchTerm] = React.useState('');
    const [createdFrom, setCreatedFrom] = React.useState('2026-05-20');
    const contractOwnerLeads = DEMO_SAMPLE_LEADS.filter(lead => lead.status === '계약완료');
    const [selectedLeadId, setSelectedLeadId] = React.useState<string | null>(null);
    const selectedLead = selectedLeadId ? contractOwnerLeads.find(lead => lead.id === selectedLeadId) || null : null;
    const selectedSummary = selectedLead ? DEMO_CONTRACT_CHECKLIST_SUMMARIES[selectedLead.id] : null;
    const openContractOwner = (leadId: string) => {
        setSelectedLeadId(leadId);
        const lead = contractOwnerLeads.find(item => item.id === leadId);
        onSimulate(lead ? `${lead.name} 계약 완료 상세 열기` : '샘플 구비서류 상세 열기');
    };

    return (
        <div className={pageStyles.pageShell}>
            <FranchiseWorkspaceHero
                title="계약 완료"
                description="계약 완료 점주의 오픈 준비, 구비서류, 점주 문서함 흐름을 실제 화면 구조로 확인합니다."
            />
            <DemoGuideTarget marker={1} targetId="contract-owner-toolbar" label="계약 완료 필터">
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
            </DemoGuideTarget>
            <DemoGuideTarget marker={2} targetId="contract-owner-tabs" label="계약 업무 탭">
                <LeadWorkspaceTabs activeTab="contractOwners" onTabChange={tab => handleTabChange(tab, onScreenChange)} />
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
                            visibleLeadCount={contractOwnerLeads.length}
                            leads={contractOwnerLeads}
                            summaries={DEMO_CONTRACT_CHECKLIST_SUMMARIES}
                            safeCurrentPage={1}
                            totalPages={1}
                            onOpenChecklistAction={openContractOwner}
                            onPreviousPageAction={() => undefined}
                            onNextPageAction={() => undefined}
                        />
                    </section>
                </DemoGuideTarget>
            </DemoGuidedLayout>
            {selectedLead ? (
                <DemoRecordDrawer
                    badge="계약 완료 점주"
                    title={selectedLead.name}
                    description={selectedLead.memo}
                    fields={[
                        { label: '연락처', value: selectedLead.mobile },
                        { label: '희망지역', value: selectedLead.desiredRegion },
                        { label: '관심 브랜드', value: selectedLead.interestedBrand },
                        { label: '담당자', value: DEMO_LEAD_MANAGERS.find(manager => manager.id === selectedLead.managerId)?.label || '담당자 미정' },
                        { label: '구비서류', value: selectedSummary ? `${selectedSummary.groups.required.resolved}/${selectedSummary.groups.required.total}` : '-' },
                        { label: '누락 필수', value: selectedSummary ? `${selectedSummary.missingRequiredCount}건` : '-' },
                        { label: '오픈 준비', value: '프로젝트 탭에서 관리' },
                        { label: '문서함', value: '전자계약·업로드 문서 연결' }
                    ]}
                    steps={[
                        { title: '오픈 준비 먼저 확인', description: '계약 완료 점주는 실제 오픈일까지 프로젝트 상태와 기한임박 항목을 봅니다.' },
                        { title: '구비서류 누락 점검', description: '필수 서류는 계약 진행 게이트, 내부보고는 경고 기준으로 확인합니다.' },
                        { title: '점주 문서함 연결', description: '전자계약 문서와 업로드 문서를 체크 항목에 연결해 보관 흐름을 확인합니다.' }
                    ]}
                    primaryActionLabel="오픈 준비 흐름 보기"
                    onPrimaryAction={() => onScreenChange('operations')}
                    onCloseAction={() => setSelectedLeadId(null)}
                />
            ) : null}
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
