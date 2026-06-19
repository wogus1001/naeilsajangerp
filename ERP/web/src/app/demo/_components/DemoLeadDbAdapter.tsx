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
                onSelectLeadAction={() => onSimulate('샘플 상세 패널 열기')}
                onStatusChangeAction={(lead, status) => updateLead(lead.id, current => ({ ...current, status }))}
                onManagerChangeAction={(lead, managerId) => updateLead(lead.id, current => ({ ...current, managerId }))}
                onTogglePriorityAction={(lead) => updateLead(lead.id, current => ({ ...current, grade: current.grade === 'HOT' ? 'WARM' : 'HOT' }))}
                onPromoteLeadToCandidateAction={(lead) => updateLead(lead.id, current => ({ ...current, leadStage: 'candidate', status: '가맹검토' }))}
                onConvertLeadAction={() => onSimulate('샘플 고객 전환')}
                onOpenQuickActivityModalAction={() => onSimulate('샘플 상담 이력 추가')}
                onOpenEditModalAction={() => onSimulate('샘플 수정 모달 열기')}
                onRequestDeleteAction={() => onSimulate('샘플 삭제 요청')}
                onPreviousPageAction={() => undefined}
                onNextPageAction={() => undefined}
                onTaskQueueFilterChangeAction={setTaskQueueFilter}
                onCompleteTodayTaskAction={() => onSimulate('샘플 연락 완료')}
            />
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
            onScreenChange('contractOwners');
            return;
    }
}
