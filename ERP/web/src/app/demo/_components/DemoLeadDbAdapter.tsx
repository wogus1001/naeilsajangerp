'use client';

import React from 'react';
import pageStyles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import { Download, Link2, Plus, Upload } from 'lucide-react';
import { FranchiseWorkspaceHero } from '@/components/franchise/FranchiseWorkspaceHero';
import { FRANCHISE_LEAD_STATUSES, type FranchiseLeadStatus } from '@/lib/franchise-leads';
import type { LeadWorkQueueKey } from '@/lib/franchise-lead-workflow';
import { LeadDbWorkspace } from '@/components/franchise/leads/LeadDbWorkspace';
import { LeadToolbar } from '@/components/franchise/leads/LeadToolbar';
import { LeadWorkspaceTabs, type LeadWorkspaceTab } from '@/components/franchise/leads/LeadWorkspaceTabs';
import { PAGE_SIZE_OPTIONS, RANGE_OPTIONS, SOURCE_FILTER_OPTIONS, WORK_QUEUE_OPTIONS } from '@/components/franchise/leads/constants';
import {
    DEFAULT_LEAD_TABLE_COLUMN_KEYS,
    EMPTY_LEAD_TABLE_FILTERS
} from '@/components/franchise/leads/leadTableConfig';
import type { LeadTableColumnKey, LeadTableFilters, LeadTableSortKey } from '@/components/franchise/leads/leadTableTypes';
import type { FranchiseLead, LeadViewMode } from '@/components/franchise/leads/types';
import type { DemoActionHandler, DemoScreenId } from '../demoTypes';
import { DEMO_LEAD_MANAGERS, DEMO_SAMPLE_LEADS } from './DemoLeadSampleData';
import { DemoRecordDrawer } from './DemoRecordDrawer';
import { DemoGuidedLayout } from './DemoScreenGuide';

type DemoLeadDbAdapterProps = {
    readonly activeTab: LeadWorkspaceTab;
    readonly onScreenChange: (screen: DemoScreenId) => void;
    readonly onSimulate: DemoActionHandler;
};

export function DemoLeadDbAdapter({ activeTab, onScreenChange, onSimulate }: DemoLeadDbAdapterProps) {
    const [leads, setLeads] = React.useState(DEMO_SAMPLE_LEADS);
    const [leadDbLayer, setLeadDbLayer] = React.useState<'raw_intake' | 'candidate'>('raw_intake');
    const [viewMode, setViewMode] = React.useState<LeadViewMode>('table');
    const [pageSize, setPageSize] = React.useState<typeof PAGE_SIZE_OPTIONS[number]>(50);
    const [filters, setFilters] = React.useState<LeadTableFilters>(EMPTY_LEAD_TABLE_FILTERS);
    const [sort, setSort] = React.useState<LeadTableSortKey>('created_desc');
    const [columns, setColumns] = React.useState<readonly LeadTableColumnKey[]>(DEFAULT_LEAD_TABLE_COLUMN_KEYS);
    const [selectedLeadIds, setSelectedLeadIds] = React.useState<readonly string[]>([]);
    const [taskQueueFilter, setTaskQueueFilter] = React.useState<LeadWorkQueueKey>('all');
    const [range, setRange] = React.useState<typeof RANGE_OPTIONS[number]>('최근 30일');
    const [searchTerm, setSearchTerm] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState<'전체' | FranchiseLeadStatus>('전체');
    const [sourceFilter, setSourceFilter] = React.useState<typeof SOURCE_FILTER_OPTIONS[number]>('전체');
    const [managerFilter, setManagerFilter] = React.useState('전체');
    const [createdFrom, setCreatedFrom] = React.useState('2026-05-20');
    const [createdTo, setCreatedTo] = React.useState('');
    const [selectedLeadId, setSelectedLeadId] = React.useState<string | null>(null);

    const layerLeads = React.useMemo(() => leads.filter(lead => lead.leadStage === leadDbLayer), [leadDbLayer, leads]);
    const pipelineColumns = FRANCHISE_LEAD_STATUSES.map(status => ({
        status,
        leads: layerLeads.filter(lead => lead.status === status)
    }));
    const taskQueueOptions = WORK_QUEUE_OPTIONS.map(option => ({
        ...option,
        count: option.key === 'all' ? layerLeads.length : layerLeads.filter(lead => lead.nextContactAt).length
    }));

    const updateLead = (leadId: string, updater: (lead: FranchiseLead) => FranchiseLead) => {
        setLeads(current => current.map(lead => lead.id === leadId ? updater(lead) : lead));
    };
    const selectedLead = selectedLeadId ? leads.find(lead => lead.id === selectedLeadId) || null : null;
    const openLeadDetail = (leadId: string, actionLabel = '샘플 상세 패널 열기') => {
        setSelectedLeadId(leadId);
        const lead = leads.find(item => item.id === leadId);
        onSimulate(lead ? `${lead.name} ${actionLabel}` : actionLabel);
    };
    const runDrawerPrimaryAction = (lead: FranchiseLead) => {
        if (lead.leadStage === 'raw_intake') {
            updateLead(lead.id, current => ({ ...current, leadStage: 'candidate', status: '가맹검토' }));
            setLeadDbLayer('candidate');
            setSelectedLeadId(null);
            onSimulate(`${lead.name} 가맹 희망자 승격`);
            return;
        }

        onScreenChange(lead.status === '계약완료' ? 'contractOwners' : 'location');
    };

    return (
        <div className={pageStyles.pageShell}>
            <FranchiseWorkspaceHero
                title="모객 DB"
                description="가맹 희망자 유입부터 상담, 검토, 계약 전환까지 본사에서 한눈에 관리합니다."
                actions={(
                    <>
                        <button className={pageStyles.secondaryButton} onClick={() => onSimulate('샘플 후보지 연결')}>
                            <Link2 size={16} />
                            Meta 연동
                        </button>
                        <button className={pageStyles.secondaryButton} onClick={() => onSimulate('샘플 양식 다운로드')}>
                            <Download size={16} />
                            샘플 양식
                        </button>
                        <button className={pageStyles.secondaryButton} onClick={() => onSimulate('샘플 엑셀 업로드')}>
                            <Upload size={16} />
                            엑셀 업로드
                        </button>
                        <button className={pageStyles.primaryButton} onClick={() => onSimulate('샘플 고객 등록')}>
                            <Plus size={16} />
                            가맹 희망자 등록
                        </button>
                    </>
                )}
            />
            <LeadToolbar
                rangeOptions={RANGE_OPTIONS}
                range={range}
                searchTerm={searchTerm}
                statusFilter={statusFilter}
                statusOptions={FRANCHISE_LEAD_STATUSES}
                sourceFilter={sourceFilter}
                sourceOptions={SOURCE_FILTER_OPTIONS}
                managerFilter={managerFilter}
                managerOptions={DEMO_LEAD_MANAGERS.map(manager => <option key={manager.id} value={manager.id}>{manager.label}</option>)}
                createdFrom={createdFrom}
                createdTo={createdTo}
                onRangeClickAction={(nextRange) => setRange(nextRange as typeof RANGE_OPTIONS[number])}
                onSearchTermChangeAction={setSearchTerm}
                onStatusFilterChangeAction={setStatusFilter}
                onSourceFilterChangeAction={(nextSource) => setSourceFilter(nextSource as typeof SOURCE_FILTER_OPTIONS[number])}
                onManagerFilterChangeAction={setManagerFilter}
                onCreatedFromChangeAction={(date) => {
                    setRange('전체');
                    setCreatedFrom(date);
                }}
                onCreatedToChangeAction={(date) => {
                    setRange('전체');
                    setCreatedTo(date);
                }}
            />
            <LeadWorkspaceTabs activeTab={activeTab} onTabChange={tab => handleTabChange(tab, onScreenChange)} />
            <DemoGuidedLayout screen="leadDb" onScreenChange={onScreenChange}>
                <LeadDbWorkspace
                    isLoading={false}
                    leadDbLayer={leadDbLayer}
                    viewMode={viewMode}
                    rawIntakeCount={leads.filter(lead => lead.leadStage === 'raw_intake').length}
                    candidateCount={leads.filter(lead => lead.leadStage === 'candidate').length}
                    listPolicyText="기본 조회: 최신 500건 · 화면 표시: 50건씩 · 검색 시 전체 범위 조회"
                    pageSize={pageSize}
                    visibleLayerLeadCount={layerLeads.length}
                    exportLeads={layerLeads}
                    paginatedLeads={layerLeads}
                    selectedLeadIds={selectedLeadIds}
                    allVisibleSelected={layerLeads.length > 0 && selectedLeadIds.length === layerLeads.length}
                    bulkNextContactAt=""
                    isBulkUpdating={false}
                    convertingLeadId=""
                    tableFilters={filters}
                    tableSort={sort}
                    visibleTableColumns={columns}
                    pipelineColumns={pipelineColumns}
                    taskQueueOptions={taskQueueOptions}
                    taskQueueFilter={taskQueueFilter}
                    taskLeads={layerLeads}
                    safeCurrentPage={1}
                    totalPages={1}
                    renderManagerOptions={() => DEMO_LEAD_MANAGERS.map(manager => <option key={manager.id} value={manager.id}>{manager.label}</option>)}
                    getManagerName={(managerId) => DEMO_LEAD_MANAGERS.find(manager => manager.id === managerId)?.label || '담당자 선택'}
                    onLeadDbLayerChangeAction={setLeadDbLayer}
                    onViewModeChangeAction={setViewMode}
                    onPageSizeChangeAction={setPageSize}
                    onTableFiltersChangeAction={setFilters}
                    onTableSortChangeAction={setSort}
                    onVisibleTableColumnsChangeAction={setColumns}
                    onBulkNextContactAtChangeAction={() => onSimulate('샘플 일괄 연락일 변경')}
                    onApplyBulkNextContactAction={() => onSimulate('샘플 일괄 연락일 저장')}
                    onClearSelectedAction={() => setSelectedLeadIds([])}
                    onToggleSelectAllVisibleAction={(checked) => setSelectedLeadIds(checked ? layerLeads.map(lead => lead.id) : [])}
                    onToggleSelectLeadAction={(leadId, checked) => setSelectedLeadIds(current => checked ? [...current, leadId] : current.filter(id => id !== leadId))}
                    onSelectLeadAction={openLeadDetail}
                    onStatusChangeAction={(lead, status) => updateLead(lead.id, current => ({ ...current, status }))}
                    onManagerChangeAction={(lead, managerId) => updateLead(lead.id, current => ({ ...current, managerId }))}
                    onTogglePriorityAction={(lead) => updateLead(lead.id, current => ({ ...current, grade: current.grade === 'HOT' ? 'WARM' : 'HOT' }))}
                    onPromoteLeadToCandidateAction={(lead) => updateLead(lead.id, current => ({ ...current, leadStage: 'candidate', status: '가맹검토' }))}
                    onConvertLeadAction={(lead) => openLeadDetail(lead.id, '샘플 고객 전환 확인')}
                    onOpenQuickActivityModalAction={(lead) => openLeadDetail(lead.id, '샘플 상담 이력 추가')}
                    onOpenEditModalAction={(lead) => openLeadDetail(lead.id, '샘플 수정')}
                    onRequestDeleteAction={(lead) => openLeadDetail(lead.id, '샘플 삭제 확인')}
                    onPreviousPageAction={() => undefined}
                    onNextPageAction={() => undefined}
                    onTaskQueueFilterChangeAction={setTaskQueueFilter}
                    onCompleteTodayTaskAction={(lead) => openLeadDetail(lead.id, '샘플 연락 완료')}
                />
            </DemoGuidedLayout>
            {selectedLead ? (
                <DemoRecordDrawer
                    badge={selectedLead.leadStage === 'raw_intake' ? '1차 유입 DB' : '가맹 희망자'}
                    title={selectedLead.name}
                    description={selectedLead.memo}
                    fields={[
                        { label: '연락처', value: selectedLead.mobile },
                        { label: '상태', value: selectedLead.status },
                        { label: '희망지역', value: selectedLead.desiredRegion },
                        { label: '예산', value: formatBudget(selectedLead.budgetMin, selectedLead.budgetMax) },
                        { label: '관심 브랜드', value: selectedLead.interestedBrand },
                        { label: '유입 경로', value: selectedLead.source },
                        { label: '담당자', value: DEMO_LEAD_MANAGERS.find(manager => manager.id === selectedLead.managerId)?.label || '담당자 미정' },
                        { label: '다음 액션', value: selectedLead.nextAction || '미정' }
                    ]}
                    steps={selectedLead.leadStage === 'raw_intake' ? [
                        { title: '상담 메모 확인', description: '예산, 지역, 브랜드 선호를 먼저 보고 상담 가능 여부를 판단합니다.' },
                        { title: '가맹 희망자 승격', description: '의사가 확인된 고객은 승격해 가맹 희망자 DB에서 별도로 관리합니다.' },
                        { title: '승격 후 후속 관리', description: '승격된 건은 후보지 연결, 정보공개서, 계약 가능일 확인으로 이어집니다.' }
                    ] : [
                        { title: '가맹 희망자 정보 확인', description: '희망지역, 예산, 관심 브랜드와 상담 메모를 기준으로 우선순위를 정합니다.' },
                        { title: '후보지 연결', description: '출점 후보지와 연결해 입지 조건과 계약 가능성을 함께 검토합니다.' },
                        { title: '계약 완료 전환', description: '정보공개서 기준과 구비서류를 확인한 뒤 계약 완료 흐름으로 이어집니다.' }
                    ]}
                    primaryActionLabel={selectedLead.leadStage === 'raw_intake' ? '가맹 희망자 승격' : selectedLead.status === '계약완료' ? '계약 완료 탭에서 보기' : '출점 후보지 보기'}
                    onPrimaryAction={() => runDrawerPrimaryAction(selectedLead)}
                    onCloseAction={() => setSelectedLeadId(null)}
                />
            ) : null}
        </div>
    );
}

function formatBudget(min: number | null, max: number | null) {
    if (min === null && max === null) return '미입력';
    if (min !== null && max !== null) return `${formatManwon(min)} ~ ${formatManwon(max)}`;
    if (min !== null) return `${formatManwon(min)} 이상`;
    return `${formatManwon(max || 0)} 이하`;
}

function formatManwon(value: number) {
    return `${Math.round(value / 10000).toLocaleString()}만원`;
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
            onScreenChange('contractOwners');
            return;
    }
}
