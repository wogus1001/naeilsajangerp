import React from 'react';
import { useAppDialog } from '@/components/common/AppDialogProvider';
import { LeadDbWorkspace } from '@/components/franchise/leads/LeadDbWorkspace';
import {
    PAGE_SIZE_OPTIONS,
    WORK_QUEUE_OPTIONS
} from '@/components/franchise/leads/constants';
import {
    DEFAULT_LEAD_TABLE_COLUMN_KEYS,
    EMPTY_LEAD_TABLE_FILTERS
} from '@/components/franchise/leads/leadTableConfig';
import type {
    LeadTableColumnKey,
    LeadTableFilters,
    LeadTableSortKey
} from '@/components/franchise/leads/leadTableTypes';
import type {
    FranchiseLead,
    LeadActivity,
    LeadDbLayer,
    LeadViewMode
} from '@/components/franchise/leads/types';
import { FRANCHISE_LEAD_STATUSES } from '@/lib/franchise-leads';
import {
    getLeadWorkQueueSummary,
    matchesLeadWorkQueue,
    type LeadWorkQueueKey
} from '@/lib/franchise-lead-workflow';
import { DEMO_TOUR_STEP_ADVANCE_EVENT } from '../demoTypes';
import type { DemoActionHandler } from '../demoTypes';
import { DEMO_LEAD_MANAGERS, DEMO_SAMPLE_LEADS } from './DemoLeadSampleData';
import { filterDemoLeads, rebaseDemoLeadDates } from './DemoLeadState';
import { useDemoLeadModals } from './useDemoLeadModals';
import { useDemoLeadToolbar } from './useDemoLeadToolbar';

export function useDemoLeadDbController(onSimulate: DemoActionHandler) {
    const { showAlert } = useAppDialog();
    const [leads, setLeads] = React.useState(() => rebaseDemoLeadDates(DEMO_SAMPLE_LEADS, new Date()));
    const [leadDbLayer, setLeadDbLayer] = React.useState<LeadDbLayer>('raw_intake');
    const [viewMode, setViewMode] = React.useState<LeadViewMode>('table');
    const [pageSize, setPageSize] = React.useState<typeof PAGE_SIZE_OPTIONS[number]>(50);
    const [tableFilters, setTableFilters] = React.useState<LeadTableFilters>(EMPTY_LEAD_TABLE_FILTERS);
    const [tableSort, setTableSort] = React.useState<LeadTableSortKey>('created_desc');
    const [visibleColumns, setVisibleColumns] = React.useState<readonly LeadTableColumnKey[]>(DEFAULT_LEAD_TABLE_COLUMN_KEYS);
    const [selectedLeadIds, setSelectedLeadIds] = React.useState<readonly string[]>([]);
    const [taskQueueFilter, setTaskQueueFilter] = React.useState<LeadWorkQueueKey>('all');
    const [selectedLeadId, setSelectedLeadId] = React.useState('');
    const [bulkNextContactAt, setBulkNextContactAt] = React.useState('');
    const toolbar = useDemoLeadToolbar();
    const selectedLead = leads.find(lead => lead.id === selectedLeadId) || null;
    const getManagerName = (managerId?: string) => (
        DEMO_LEAD_MANAGERS.find(manager => manager.id === managerId)?.label || '담당자 선택'
    );
    const renderManagerOptions = () => (
        <>
            <option value="">담당자 선택</option>
            {DEMO_LEAD_MANAGERS.map(manager => (
                <option key={manager.id} value={manager.id}>
                    {manager.label}
                </option>
            ))}
        </>
    );
    const updateLead = (leadId: string, updater: (lead: FranchiseLead) => FranchiseLead) => {
        setLeads(current => current.map(lead => lead.id === leadId ? updater(lead) : lead));
    };
    const clearSelectedLead = (leadId: string) => {
        if (selectedLeadId === leadId) setSelectedLeadId('');
        setSelectedLeadIds(current => current.filter(id => id !== leadId));
    };
    const modals = useDemoLeadModals({
        leads,
        setLeads,
        updateLeadAction: updateLead,
        clearSelectedLeadAction: clearSelectedLead,
        getManagerNameAction: getManagerName,
        renderManagerOptionsAction: renderManagerOptions,
        onSimulate
    });
    const visibleLeads = filterDemoLeads(leads, {
        layer: leadDbLayer,
        ...toolbar.filter,
        tableFilters,
        tableSort
    });
    const pipelineColumns = FRANCHISE_LEAD_STATUSES.map(status => ({
        status,
        leads: visibleLeads.filter(lead => lead.status === status)
    }));
    const taskSummary = getLeadWorkQueueSummary(visibleLeads);
    const taskLeads = visibleLeads.filter(lead => matchesLeadWorkQueue(lead, taskQueueFilter));
    const taskQueueOptions = WORK_QUEUE_OPTIONS.map(option => ({
        ...option,
        count: option.key === 'all'
            ? taskSummary.actionable
            : option.key === 'no_response'
                ? taskSummary.noResponse
                : taskSummary[option.key]
    }));

    const promoteLead = React.useCallback((lead: FranchiseLead) => {
        setLeads(current => current.map(item => (
            item.id === lead.id
                ? { ...item, leadStage: 'candidate', status: '가맹검토' }
                : item
        )));
        setSelectedLeadId('');
        onSimulate(`${lead.name} 가맹 희망자 승격`);
    }, [onSimulate]);
    const convertLead = (lead: FranchiseLead) => {
        const now = new Date().toISOString();
        updateLead(lead.id, current => ({
            ...current,
            convertedCustomerId: `demo-customer-${lead.id}`,
            convertedCustomerName: lead.name,
            convertedAt: now,
            updatedAt: now
        }));
        onSimulate(`${lead.name} 고객 DB 전환`);
    };
    const completeTodayTask = (lead: FranchiseLead) => {
        const now = new Date().toISOString();
        const activity: LeadActivity = {
            id: `demo-complete-${lead.id}-${now}`,
            type: '전화',
            content: '오늘 연락 완료',
            createdAt: now,
            createdBy: '김담당'
        };
        updateLead(lead.id, current => ({
            ...current,
            nextContactAt: null,
            lastContactedAt: now,
            nextAction: '미정',
            activityLog: [activity, ...(current.activityLog || [])],
            updatedAt: now
        }));
    };
    const applyBulkNextContact = () => {
        if (!bulkNextContactAt || selectedLeadIds.length === 0) {
            void showAlert({ title: '일괄 변경 실패', message: '대상과 다음 연락일을 선택해주세요.', type: 'error' });
            return;
        }
        const nextContactAt = new Date(bulkNextContactAt).toISOString();
        const selected = new Set(selectedLeadIds);
        setLeads(current => current.map(lead => (
            selected.has(lead.id) ? { ...lead, nextContactAt, updatedAt: new Date().toISOString() } : lead
        )));
        setSelectedLeadIds([]);
        setBulkNextContactAt('');
        void showAlert({ title: '일괄 변경 완료', message: '선택한 다음 연락일을 저장했습니다.', type: 'success' });
    };
    const returnSelectedLeadsToRawIntake = () => {
        const selected = new Set(selectedLeadIds);
        setLeads(current => current.map(lead => (
            selected.has(lead.id) ? { ...lead, leadStage: 'raw_intake' } : lead
        )));
        setSelectedLeadIds([]);
        setLeadDbLayer('raw_intake');
        onSimulate(`${selectedLeadIds.length}건 1차 유입 DB 이동`);
        void showAlert({
            title: '이동 완료',
            message: `${selectedLeadIds.length}건을 1차 유입 DB로 이동했습니다.`,
            type: 'success'
        });
    };

    React.useEffect(() => {
        const advance = (event: WindowEventMap[typeof DEMO_TOUR_STEP_ADVANCE_EVENT]) => {
            if (event.detail.screen !== 'leadDb') return;
            const firstRawLead = leads.find(lead => lead.leadStage === 'raw_intake');
            if (!firstRawLead) return;
            if (event.detail.fromTargetId === 'lead-db-promote-action') {
                promoteLead(selectedLead || firstRawLead);
                setLeadDbLayer('candidate');
            }
        };
        window.addEventListener(DEMO_TOUR_STEP_ADVANCE_EVENT, advance);
        return () => window.removeEventListener(DEMO_TOUR_STEP_ADVANCE_EVENT, advance);
    }, [leads, promoteLead, selectedLead]);

    const workspaceProps: React.ComponentProps<typeof LeadDbWorkspace> = {
        isLoading: false,
        leadDbLayer,
        viewMode,
        rawIntakeCount: leads.filter(lead => lead.leadStage === 'raw_intake').length,
        candidateCount: leads.filter(lead => lead.leadStage === 'candidate').length,
        listPolicyText: `현재 필터 ${visibleLeads.length}건 · 화면 표시 ${pageSize}건`,
        pageSize,
        visibleLayerLeadCount: visibleLeads.length,
        exportLeads: visibleLeads,
        paginatedLeads: visibleLeads,
        selectedLeadIds,
        allVisibleSelected: visibleLeads.length > 0 && visibleLeads.every(lead => selectedLeadIds.includes(lead.id)),
        bulkNextContactAt,
        isBulkUpdating: false,
        convertingLeadId: '',
        tableFilters,
        tableSort,
        visibleTableColumns: visibleColumns,
        pipelineColumns,
        taskQueueOptions,
        taskQueueFilter,
        taskLeads,
        safeCurrentPage: 1,
        totalPages: 1,
        renderManagerOptions,
        getManagerName,
        onLeadDbLayerChangeAction: setLeadDbLayer,
        onViewModeChangeAction: setViewMode,
        onPageSizeChangeAction: setPageSize,
        onTableFiltersChangeAction: setTableFilters,
        onTableSortChangeAction: setTableSort,
        onVisibleTableColumnsChangeAction: setVisibleColumns,
        onBulkNextContactAtChangeAction: setBulkNextContactAt,
        onApplyBulkNextContactAction: applyBulkNextContact,
        onReturnSelectedToRawIntakeAction: returnSelectedLeadsToRawIntake,
        onClearSelectedAction: () => setSelectedLeadIds([]),
        onToggleSelectAllVisibleAction: checked => setSelectedLeadIds(checked ? visibleLeads.map(lead => lead.id) : []),
        onToggleSelectLeadAction: (leadId, checked) => setSelectedLeadIds(current => (
            checked ? [...new Set([...current, leadId])] : current.filter(id => id !== leadId)
        )),
        onSelectLeadAction: setSelectedLeadId,
        onStatusChangeAction: (lead, status) => updateLead(lead.id, current => ({ ...current, status })),
        onManagerChangeAction: (lead, managerId) => updateLead(lead.id, current => ({ ...current, managerId })),
        onTogglePriorityAction: lead => updateLead(lead.id, current => ({ ...current, grade: current.grade === 'HOT' ? 'WARM' : 'HOT' })),
        onPromoteLeadToCandidateAction: promoteLead,
        onConvertLeadAction: convertLead,
        onOpenQuickActivityModalAction: modals.openQuickActivityModal,
        onOpenEditModalAction: modals.openEditModal,
        onRequestDeleteAction: lead => void modals.requestDelete(lead),
        onPreviousPageAction: () => undefined,
        onNextPageAction: () => undefined,
        onTaskQueueFilterChangeAction: setTaskQueueFilter,
        onCompleteTodayTaskAction: completeTodayTask
    };
    return {
        ...modals,
        convertLead,
        leads,
        openCreateModal: modals.openCreateModal,
        promoteLead,
        selectedLead,
        setLeadDbLayer,
        setSelectedLeadId,
        toolbarProps: toolbar.toolbarProps,
        updateLead,
        workspaceProps
    };
}
