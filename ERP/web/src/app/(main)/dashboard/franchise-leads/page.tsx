"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import {
    Download,
    Link2,
    Plus,
    Upload
} from 'lucide-react';
import { AlertModal } from '@/components/common/AlertModal';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { FranchiseWorkspaceHero } from '@/components/franchise/FranchiseWorkspaceHero';
import { LeadDashboard } from '@/components/franchise/leads/LeadDashboard';
import { LeadDbWorkspace } from '@/components/franchise/leads/LeadDbWorkspace';
import { LeadDetailPanel, type LeadDetailMode } from '@/components/franchise/leads/LeadDetailPanel';
import { LeadFormModal } from '@/components/franchise/leads/LeadFormModal';
import { LeadMetaIntegrationPanel } from '@/components/franchise/leads/LeadMetaIntegrationPanel';
import { LeadQuickActivityModal } from '@/components/franchise/leads/LeadQuickActivityModal';
import { LeadToolbar } from '@/components/franchise/leads/LeadToolbar';
import { LeadWorkspaceTabs, type LeadWorkspaceTab } from '@/components/franchise/leads/LeadWorkspaceTabs';
import { useLeadCustomerConversion } from '@/components/franchise/leads/useLeadCustomerConversion';
import { useLeadDerivedData } from '@/components/franchise/leads/useLeadDerivedData';
import { useLeadExcelImport } from '@/components/franchise/leads/useLeadExcelImport';
import { useLeadLocationLinks } from '@/components/franchise/leads/useLeadLocationLinks';
import { useLeadMetaIntegration } from '@/components/franchise/leads/useLeadMetaIntegration';
import {
    DEFAULT_FRANCHISE_LEAD_STATUS,
    FRANCHISE_LEAD_STATUSES,
    normalizeLeadPhone
} from '@/lib/franchise-leads';
import type { FranchiseLeadStatus } from '@/lib/franchise-leads';
import {
    EMPTY_FORM,
    PAGE_SIZE_OPTIONS,
    RANGE_OPTIONS,
    SOURCE_FILTER_OPTIONS
} from '@/components/franchise/leads/constants';
import {
    DEFAULT_LEAD_TABLE_COLUMN_KEYS,
    EMPTY_LEAD_TABLE_FILTERS,
    LEAD_TABLE_COLUMNS_STORAGE_KEY,
    normalizeLeadTableColumnKeys
} from '@/components/franchise/leads/leadTableConfig';
import type { LeadTableColumnKey, LeadTableFilters, LeadTableSortKey } from '@/components/franchise/leads/leadTableTypes';
import type {
    AuthUser,
    FranchiseLead,
    LeadActivity,
    LeadActivityType,
    LeadDbLayer,
    LeadFormState,
    LeadListResponse,
    LeadSummary,
    LeadViewMode,
    ManagerOption,
    RelatedBusinessCard,
    RelatedCustomer
} from '@/components/franchise/leads/types';
import {
    buildDateFromRange,
    createActivityId,
    createEmptySummary,
    createFormFromLead,
    formatBudget,
    formatFullDateTime,
    formatDate,
    isContactActionDue,
    parseBudgetInputToWon,
    toDatetimeLocalValue,
    toRangeOption,
    toSourceFilterOption
} from '@/components/franchise/leads/utils';
import {
    formatLeadPhoneInput,
    normalizeLeadDesiredRegionValue
} from '@/components/franchise/leads/leadFormFormatters';
import {
    EMPTY_LEAD_WORKFLOW_DRAFT,
    buildLeadWorkflowDraft
} from '@/lib/franchise-lead-workflow';
import type { LeadWorkflowDraft, LeadWorkQueueKey } from '@/lib/franchise-lead-workflow';
import {
    canEnterContractStatus,
    getContractLockMessage,
    isContractLockedLeadStatus,
    type DisclosureEligibility
} from '@/lib/franchise-disclosure-deliveries';
import { readApiError, unwrapApiData } from '@/utils/apiResponse';
import styles from './page.module.css';

export default function FranchiseLeadsPage() {
    const router = useRouter();
    const [user, setUser] = React.useState<AuthUser | null>(null);
    const [userId, setUserId] = React.useState('');
    const [companyName, setCompanyName] = React.useState('');
    const [leads, setLeads] = React.useState<FranchiseLead[]>([]);
    const [pipelineStageLeads, setPipelineStageLeads] = React.useState<FranchiseLead[]>([]);
    const [summary, setSummary] = React.useState<LeadSummary>(createEmptySummary);
    const [total, setTotal] = React.useState(0);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSaving, setIsSaving] = React.useState(false);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState<'전체' | FranchiseLeadStatus>('전체');
    const [sourceFilter, setSourceFilter] = React.useState<typeof SOURCE_FILTER_OPTIONS[number]>('전체');
    const [managerFilter, setManagerFilter] = React.useState('전체');
    const [range, setRange] = React.useState<typeof RANGE_OPTIONS[number]>('최근 30일');
    const [workspaceTab, setWorkspaceTab] = React.useState<LeadWorkspaceTab>('dashboard');
    const [leadDbLayer, setLeadDbLayer] = React.useState<LeadDbLayer>('candidate');
    const [viewMode, setViewMode] = React.useState<LeadViewMode>('table');
    const [taskQueueFilter, setTaskQueueFilter] = React.useState<LeadWorkQueueKey>('all');
    const [pageSize, setPageSize] = React.useState<typeof PAGE_SIZE_OPTIONS[number]>(50);
    const [currentPage, setCurrentPage] = React.useState(1);
    const [createdFrom, setCreatedFrom] = React.useState(() => buildDateFromRange('최근 30일'));
    const [createdTo, setCreatedTo] = React.useState('');
    const [tableFilters, setTableFilters] = React.useState<LeadTableFilters>(EMPTY_LEAD_TABLE_FILTERS);
    const [tableSort, setTableSort] = React.useState<LeadTableSortKey>('created_desc');
    const [visibleTableColumns, setVisibleTableColumns] = React.useState<readonly LeadTableColumnKey[]>(DEFAULT_LEAD_TABLE_COLUMN_KEYS);
    const [selectedLeadId, setSelectedLeadId] = React.useState('');
    const [selectedLeadDetailMode, setSelectedLeadDetailMode] = React.useState<LeadDetailMode>('default');
    const [selectedLeadIds, setSelectedLeadIds] = React.useState<string[]>([]);
    const [contractChecklistRefreshKey, setContractChecklistRefreshKey] = React.useState(0);
    const [activityType, setActivityType] = React.useState<LeadActivityType>('전화');
    const [activityContent, setActivityContent] = React.useState('');
    const [quickActivityLeadId, setQuickActivityLeadId] = React.useState('');
    const [quickActivityType, setQuickActivityType] = React.useState<LeadActivityType>('전화');
    const [quickActivityContent, setQuickActivityContent] = React.useState('');
    const [isQuickSaving, setIsQuickSaving] = React.useState(false);
    const [detailNextContactAt, setDetailNextContactAt] = React.useState('');
    const [bulkNextContactAt, setBulkNextContactAt] = React.useState('');
    const [isBulkUpdating, setIsBulkUpdating] = React.useState(false);
    const [relatedCustomers, setRelatedCustomers] = React.useState<RelatedCustomer[]>([]);
    const [relatedCards, setRelatedCards] = React.useState<RelatedBusinessCard[]>([]);
    const [managerOptions, setManagerOptions] = React.useState<ManagerOption[]>([]);
    const [managerMap, setManagerMap] = React.useState<Record<string, string>>({});
    const [isRelatedLoading, setIsRelatedLoading] = React.useState(false);
    const [detailWorkflow, setDetailWorkflow] = React.useState<LeadWorkflowDraft>(EMPTY_LEAD_WORKFLOW_DRAFT);
    const [isWorkflowSaving, setIsWorkflowSaving] = React.useState(false);
    const [selectedDisclosureEligibility, setSelectedDisclosureEligibility] = React.useState<DisclosureEligibility | null>(null);
    const [isMetaPanelOpen, setIsMetaPanelOpen] = React.useState(false);
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [form, setForm] = React.useState<LeadFormState>(EMPTY_FORM);
    const [alertConfig, setAlertConfig] = React.useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info' as 'success' | 'error' | 'info'
    });
    const [confirmConfig, setConfirmConfig] = React.useState({
        isOpen: false,
        leadId: '',
        leadName: ''
    });
    const selectedLead = React.useMemo(
        () => leads.find(lead => lead.id === selectedLeadId) || null,
        [leads, selectedLeadId]
    );
    const quickActivityLead = React.useMemo(
        () => leads.find(lead => lead.id === quickActivityLeadId) || null,
        [leads, quickActivityLeadId]
    );

    React.useEffect(() => {
        const stored = localStorage.getItem('user');
        let parsedUser: AuthUser = {};

        if (stored) {
            try {
                parsedUser = JSON.parse(stored);
            } catch (error) {
                console.error('Failed to parse stored user:', error);
            }
        }

        const currentUserId = parsedUser.uid || parsedUser.id || localStorage.getItem('userId') || '';
        setUser(parsedUser);
        setUserId(currentUserId);
        setCompanyName(parsedUser.role === 'admin' ? '' : parsedUser.companyName || '');
    }, []);

    React.useEffect(() => {
        const storedColumns = localStorage.getItem(LEAD_TABLE_COLUMNS_STORAGE_KEY);
        if (!storedColumns) return;

        try {
            const parsed: unknown = JSON.parse(storedColumns);
            if (!Array.isArray(parsed)) return;
            setVisibleTableColumns(normalizeLeadTableColumnKeys(
                parsed.filter((item): item is string => typeof item === 'string')
            ));
        } catch (error) {
            if (error instanceof Error) {
                console.error('Failed to parse stored lead table columns:', error.message);
                return;
            }
            console.error('Failed to parse stored lead table columns.');
        }
    }, []);

    React.useEffect(() => {
        localStorage.setItem(LEAD_TABLE_COLUMNS_STORAGE_KEY, JSON.stringify(visibleTableColumns));
    }, [visibleTableColumns]);

    const fetchLeads = React.useCallback(async () => {
        if (!userId) return;

        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                requesterId: userId,
                limit: searchTerm.trim() ? 'all' : '500',
                summary: 'true'
            });

            if (companyName) params.set('company', companyName);
            if (searchTerm.trim()) params.set('search', searchTerm.trim());
            if (statusFilter !== '전체') params.set('status', statusFilter);
            if (sourceFilter !== '전체') params.set('source', sourceFilter);
            if (managerFilter !== '전체') params.set('managerId', managerFilter);
            if (createdFrom) params.set('createdFrom', createdFrom);
            if (createdTo) params.set('createdTo', createdTo);

            const response = await fetch(`/api/franchise-leads?${params.toString()}`, { cache: 'no-store' });
            const payload = await response.json();

            if (!response.ok) {
                throw new Error(readApiError(payload));
            }

            const data = unwrapApiData<LeadListResponse>(payload);
            const nextLeads = data.leads || [];
            setLeads(nextLeads);
            setSummary(data.summary || createEmptySummary());
            setTotal(data.total || 0);

            if (statusFilter === '전체') {
                setPipelineStageLeads(nextLeads);
            } else {
                const stageParams = new URLSearchParams(params);
                stageParams.delete('status');
                const stageResponse = await fetch(`/api/franchise-leads?${stageParams.toString()}`, { cache: 'no-store' });
                const stagePayload = await stageResponse.json();

                if (!stageResponse.ok) {
                    throw new Error(readApiError(stagePayload));
                }

                const stageData = unwrapApiData<LeadListResponse>(stagePayload);
                setPipelineStageLeads(stageData.leads || []);
            }
        } catch (error) {
            console.error(error);
            setLeads([]);
            setPipelineStageLeads([]);
            setSummary(createEmptySummary());
            setTotal(0);
            setAlertConfig({
                isOpen: true,
                title: '모객 DB 조회 실패',
                message: error instanceof Error ? error.message : '모객 DB를 불러오지 못했습니다.',
                type: 'error'
            });
        } finally {
            setIsLoading(false);
        }
    }, [companyName, createdFrom, createdTo, managerFilter, searchTerm, sourceFilter, statusFilter, userId]);

    React.useEffect(() => {
        if (!userId) return;
        const timer = window.setTimeout(() => {
            void fetchLeads();
        }, 250);

        return () => window.clearTimeout(timer);
    }, [fetchLeads, userId]);

    React.useEffect(() => {
        setCurrentPage(1);
    }, [createdFrom, createdTo, leadDbLayer, managerFilter, pageSize, searchTerm, sourceFilter, statusFilter, tableFilters, tableSort]);

    React.useEffect(() => {
        setSelectedLeadIds([]);
    }, [createdFrom, createdTo, currentPage, leadDbLayer, managerFilter, pageSize, searchTerm, sourceFilter, statusFilter, tableFilters, tableSort]);

    React.useEffect(() => {
        setSelectedDisclosureEligibility(null);
    }, [selectedLeadId]);

    React.useEffect(() => {
        if (leadDbLayer === 'raw_intake' && viewMode !== 'table') {
            setViewMode('table');
        }
    }, [leadDbLayer, viewMode]);

    React.useEffect(() => {
        const visibleLeadIds = new Set(leads.map(lead => lead.id));
        setSelectedLeadIds(prev => {
            const next = prev.filter(id => visibleLeadIds.has(id));
            return next.length === prev.length ? prev : next;
        });
    }, [leads]);

    React.useEffect(() => {
        if (!userId) return;

        const controller = new AbortController();
        const currentUserId = user?.uid || user?.id || userId;
        const currentUserName = user?.name || currentUserId;

        const fallbackToCurrentUser = () => {
            setManagerOptions(currentUserId ? [{ id: currentUserId, uuid: currentUserId, name: currentUserName }] : []);
            setManagerMap(currentUserId ? { [currentUserId]: currentUserName } : {});
        };

        const fetchManagers = async () => {
            try {
                const params = new URLSearchParams({ requesterId: userId });
                if (companyName) params.set('company', companyName);

                const response = await fetch(`/api/users?${params.toString()}`, {
                    cache: 'no-store',
                    signal: controller.signal
                });

                if (!response.ok) {
                    fallbackToCurrentUser();
                    return;
                }

                const users = await response.json() as ManagerOption[];
                const nextMap: Record<string, string> = {};
                const nextOptions = (users || [])
                    .filter(manager => manager.id || manager.uuid)
                    .map(manager => {
                        const label = manager.name || manager.id || manager.uuid || '담당자 미상';
                        if (manager.id) nextMap[manager.id] = label;
                        if (manager.uuid) nextMap[manager.uuid] = label;
                        return manager;
                    });

                if (currentUserId && !nextMap[currentUserId]) {
                    nextMap[currentUserId] = currentUserName;
                }

                setManagerOptions(nextOptions.length > 0 ? nextOptions : [{ id: currentUserId, uuid: currentUserId, name: currentUserName }]);
                setManagerMap(nextMap);
            } catch (error) {
                if (error instanceof DOMException && error.name === 'AbortError') return;
                console.error('Failed to fetch lead managers:', error);
                fallbackToCurrentUser();
            }
        };

        void fetchManagers();
        return () => controller.abort();
    }, [companyName, user, userId]);

    React.useEffect(() => {
        if (!selectedLead) {
            setDetailNextContactAt('');
            setDetailWorkflow(EMPTY_LEAD_WORKFLOW_DRAFT);
            setRelatedCustomers([]);
            setRelatedCards([]);
            return;
        }

        setDetailNextContactAt(toDatetimeLocalValue(selectedLead.nextContactAt));
        setDetailWorkflow(buildLeadWorkflowDraft(selectedLead));
    }, [selectedLead]);

    React.useEffect(() => {
        if (!selectedLead || !userId || selectedLeadDetailMode === 'contractChecklist') {
            setRelatedCustomers([]);
            setRelatedCards([]);
            return;
        }

        const normalizedPhone = normalizeLeadPhone(selectedLead.mobile);
        if (normalizedPhone.length < 4) {
            setRelatedCustomers([]);
            setRelatedCards([]);
            return;
        }

        const controller = new AbortController();
        const params = new URLSearchParams({
            requesterId: userId,
            search: normalizedPhone,
            limit: 'all'
        });
        if (companyName) params.set('company', companyName);

        setIsRelatedLoading(true);
        Promise.all([
            fetch(`/api/customers?${params.toString()}`, { cache: 'no-store', signal: controller.signal })
                .then(async response => {
                    const payload = await response.json();
                    if (!response.ok) throw new Error(readApiError(payload));
                    return unwrapApiData<RelatedCustomer[]>(payload);
                }),
            fetch(`/api/business-cards?${params.toString()}`, { cache: 'no-store', signal: controller.signal })
                .then(async response => {
                    const payload = await response.json();
                    if (!response.ok) throw new Error(readApiError(payload));
                    return unwrapApiData<RelatedBusinessCard[]>(payload);
                })
        ])
            .then(([customers, cards]) => {
                setRelatedCustomers((customers || []).slice(0, 5));
                setRelatedCards((cards || []).slice(0, 5));
            })
            .catch(error => {
                if (error instanceof DOMException && error.name === 'AbortError') return;
                console.error(error);
                setRelatedCustomers([]);
                setRelatedCards([]);
            })
            .finally(() => {
                if (!controller.signal.aborted) setIsRelatedLoading(false);
            });

        return () => controller.abort();
    }, [companyName, selectedLead, selectedLeadDetailMode, userId]);

    const showAlert = (message: string, type: 'success' | 'error' | 'info' = 'info', title = '알림') => {
        setAlertConfig({ isOpen: true, title, message, type });
    };

    const {
        canManageMeta,
        disconnectMetaConnection,
        fetchMetaIntegration,
        isMetaLoading,
        isMetaSyncing,
        metaState,
        savingMetaFormId,
        startMetaConnect,
        syncMetaLeads,
        updateMetaFieldMapping,
        updateMetaForm
    } = useLeadMetaIntegration({
        userId,
        companyName,
        userRole: user?.role,
        onLeadsRefreshAction: fetchLeads,
        showAlertAction: showAlert
    });

    const {
        downloadTemplate,
        downloadUploadErrorRows,
        handleUploadFile,
        isUploading,
        uploadErrors,
        uploadInputRef
    } = useLeadExcelImport({
        userId,
        userName: user?.name,
        companyName,
        onLeadsRefreshAction: fetchLeads,
        showAlertAction: showAlert
    });

    const taskManagerScopeIds = React.useMemo(() => {
        const currentUserIds = [user?.uid, user?.id, userId].filter((id): id is string => Boolean(id));
        const matchedManager = managerOptions.find(manager => currentUserIds.some(id => manager.id === id || manager.uuid === id));
        return [
            ...currentUserIds,
            matchedManager?.id || '',
            matchedManager?.uuid || ''
        ];
    }, [managerOptions, user, userId]);
    const isContractOwnersTab = workspaceTab === 'contractOwners';

    const {
        rawIntakeLeads,
        candidateLeads,
        visibleLayerLeads,
        stageData,
        sourceChartData,
        metaEnabledForms,
        metaErrorCount,
        metaLastSyncAt,
        trendSeriesData,
        conversionRate,
        dueContactCount,
        overdueContactCount,
        pipelineColumns,
        taskLeads,
        taskQueueOptions,
        listPolicyText,
        totalPages,
        safeCurrentPage,
        paginatedLeads,
        selectedLeads,
        allVisibleSelected
    } = useLeadDerivedData({
        leads,
        pipelineStageLeads,
        summary,
        metaState,
        leadDbLayer,
        taskQueueFilter,
        tableFilters: isContractOwnersTab ? EMPTY_LEAD_TABLE_FILTERS : tableFilters,
        tableSort: isContractOwnersTab ? 'created_desc' : tableSort,
        searchTerm,
        pageSize,
        currentPage,
        selectedLeadIds,
        taskManagerScopeIds
    });

    React.useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const getManagerName = (managerId?: string) => {
        if (!managerId) return '-';
        return managerMap[managerId] || managerId;
    };

    const managerChartData = React.useMemo(() => {
        const counts = new Map<string, number>();
        candidateLeads.forEach(lead => {
            const managerName = lead.managerId ? managerMap[lead.managerId] || lead.managerId : '미배정';
            counts.set(managerName, (counts.get(managerName) || 0) + 1);
        });
        return Array.from(counts.entries())
            .map(([manager, count]) => ({ manager, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 8);
    }, [candidateLeads, managerMap]);

    const getManagerOptionValue = (manager: ManagerOption) => manager.uuid || manager.id;

    const scopedManagerOptions = React.useMemo(() => {
        if (user?.role === 'admin') return managerOptions;
        const currentUserId = user?.uid || user?.id || userId;
        return managerOptions.filter(manager => {
            if (manager.id === currentUserId || manager.uuid === currentUserId) return true;
            if (user?.companyId) return manager.companyId === user.companyId;
            if (companyName) return manager.companyName === companyName;
            return false;
        });
    }, [companyName, managerOptions, user, userId]);

    const renderManagerOptions = (currentManagerId?: string) => (
        <>
            {currentManagerId && !scopedManagerOptions.some(manager => getManagerOptionValue(manager) === currentManagerId) && (
                <option value={currentManagerId}>{getManagerName(currentManagerId)}</option>
            )}
            {scopedManagerOptions.map(manager => {
                const value = getManagerOptionValue(manager);
                return (
                    <option key={value} value={value}>
                        {manager.name || manager.id}{manager.companyName && user?.role === 'admin' ? ` · ${manager.companyName}` : ''}
                    </option>
                );
            })}
        </>
    );

    const defaultManagerId = React.useMemo(() => {
        const currentUserId = user?.uid || user?.id || userId;
        const matched = scopedManagerOptions.find(manager => manager.id === currentUserId || manager.uuid === currentUserId);
        return matched ? getManagerOptionValue(matched) : currentUserId;
    }, [scopedManagerOptions, user, userId]);

    const toggleSelectAllVisible = (checked: boolean) => {
        setSelectedLeadIds(checked ? paginatedLeads.map(lead => lead.id) : []);
    };

    const toggleSelectLead = (leadId: string, checked: boolean) => {
        setSelectedLeadIds(prev => {
            if (checked) return prev.includes(leadId) ? prev : [...prev, leadId];
            return prev.filter(id => id !== leadId);
        });
    };

    const openLeadDetail = (leadId: string) => {
        setSelectedLeadDetailMode('default');
        setSelectedLeadId(leadId);
    };

    const openLeadContractChecklist = (leadId: string) => {
        setSelectedLeadDetailMode('contractChecklist');
        setSelectedLeadId(leadId);
    };

    const closeLeadDetail = () => {
        setSelectedLeadId('');
        setSelectedLeadDetailMode('default');
    };

    const markContractChecklistSaved = () => {
        setContractChecklistRefreshKey(prev => prev + 1);
    };

    const openCustomerDetail = (customerId: string) => {
        if (!customerId) return;
        router.push(`/customers?openCustomerId=${encodeURIComponent(customerId)}`);
    };

    const openCreateModal = () => {
        setForm({ ...EMPTY_FORM, managerId: defaultManagerId });
        setIsModalOpen(true);
    };

    const openEditModal = (lead: FranchiseLead) => {
        const nextForm = createFormFromLead(lead);
        setForm({
            ...nextForm,
            mobile: formatLeadPhoneInput(nextForm.mobile),
            desiredRegion: normalizeLeadDesiredRegionValue(nextForm.desiredRegion)
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        if (isSaving) return;
        setIsModalOpen(false);
        setForm(EMPTY_FORM);
    };

    const handleRangeClick = (nextRange: typeof RANGE_OPTIONS[number]) => {
        setRange(nextRange);
        setCreatedFrom(buildDateFromRange(nextRange));
        setCreatedTo('');
    };

    const submitLead = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!userId) return;

        if (!form.name.trim()) {
            showAlert('가맹 희망자명을 입력해주세요.', 'error');
            return;
        }

        setIsSaving(true);
        try {
            const body = {
                ...form,
                requesterId: userId,
                companyName,
                leadStage: 'candidate',
                mobile: formatLeadPhoneInput(form.mobile),
                desiredRegion: normalizeLeadDesiredRegionValue(form.desiredRegion),
                managerId: form.managerId || userId,
                budgetMin: parseBudgetInputToWon(form.budgetMin),
                budgetMax: parseBudgetInputToWon(form.budgetMax),
                nextContactAt: form.nextContactAt ? new Date(form.nextContactAt).toISOString() : null
            };

            const response = await fetch('/api/franchise-leads', {
                method: form.id ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const payload = await response.json();

            if (!response.ok) {
                throw new Error(readApiError(payload));
            }

            const data = unwrapApiData<{ lead?: FranchiseLead; deduplicated?: boolean }>(payload);
            closeModal();
            await fetchLeads();
            showAlert(
                data.deduplicated ? '같은 연락처의 기존 가맹 희망자를 업데이트했습니다.' : '모객 DB가 저장되었습니다.',
                'success',
                '저장 완료'
            );
        } catch (error) {
            console.error(error);
            showAlert(error instanceof Error ? error.message : '저장 중 오류가 발생했습니다.', 'error', '저장 실패');
        } finally {
            setIsSaving(false);
        }
    };

    const updateLeadStatus = async (lead: FranchiseLead, status: FranchiseLeadStatus) => {
        if (!userId || lead.status === status) return;

        if (selectedLead?.id === lead.id && isContractLockedLeadStatus(status)) {
            if (!selectedDisclosureEligibility) {
                showAlert('정보공개서 발송 이력을 확인한 뒤 계약 단계로 변경할 수 있습니다.', 'info', '정보공개서 확인 필요');
                return;
            }
            if (!canEnterContractStatus(status, selectedDisclosureEligibility)) {
                showAlert(getContractLockMessage(selectedDisclosureEligibility), 'error', '계약 단계 변경 불가');
                return;
            }
        }

        try {
            const nextActivity: LeadActivity = {
                id: createActivityId(),
                type: '상태변경',
                content: `${lead.status}에서 ${status}(으)로 변경`,
                createdAt: new Date().toISOString(),
                createdBy: user?.name || userId
            };

            await updateLeadWithPatch(lead, {
                status,
                activityLog: [nextActivity, ...(lead.activityLog || [])]
            });
        } catch (error) {
            console.error(error);
            showAlert(error instanceof Error ? error.message : '상태 변경에 실패했습니다.', 'error', '상태 변경 실패');
        }
    };

    const updateLeadManager = async (lead: FranchiseLead, managerId: string) => {
        if (!userId || !managerId || lead.managerId === managerId) return;

        try {
            await updateLeadWithPatch(lead, { managerId });
        } catch (error) {
            console.error(error);
            showAlert(error instanceof Error ? error.message : '담당자 변경에 실패했습니다.', 'error', '담당자 변경 실패');
        }
    };

    const putLeadPatch = async (lead: FranchiseLead, patch: Record<string, unknown>) => {
        if (!userId) return null;

        const response = await fetch('/api/franchise-leads', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: lead.id,
                requesterId: userId,
                ...patch
            })
        });
        const payload = await response.json();

        if (!response.ok) {
            throw new Error(readApiError(payload));
        }

        const data = unwrapApiData<{ lead?: FranchiseLead }>(payload);
        return data.lead || null;
    };

    const updateLeadWithPatch = async (lead: FranchiseLead, patch: Record<string, unknown>) => {
        const updatedLead = await putLeadPatch(lead, patch);
        await fetchLeads();
        return updatedLead;
    };

    const {
        convertingLeadId,
        convertLeadToCustomer
    } = useLeadCustomerConversion({
        userId,
        userName: user?.name,
        companyName,
        onLeadPatchAction: updateLeadWithPatch,
        onCustomerOpenAction: openCustomerDetail,
        showAlertAction: showAlert
    });

    const {
        addLocationLink,
        externalListings,
        franchiseLocations,
        isLocationLinkSaving,
        isLocationMatchLoading,
        removeLocationLink,
        selectedLeadLocationLinks,
        updateLocationLink
    } = useLeadLocationLinks({
        userId,
        userName: user?.name,
        companyName,
        selectedLead,
        onLeadPatchAction: updateLeadWithPatch,
        showAlertAction: showAlert
    });

    const toggleLeadPriority = async (lead: FranchiseLead) => {
        const nextGrade = lead.grade === 'HOT' ? 'WARM' : 'HOT';

        try {
            await updateLeadWithPatch(lead, { grade: nextGrade });
            showAlert(
                nextGrade === 'HOT' ? '중요 가맹 희망자로 표시했습니다.' : '중요 표시를 해제했습니다.',
                'success',
                '중요 표시 변경'
            );
        } catch (error) {
            console.error(error);
            showAlert(error instanceof Error ? error.message : '중요 표시 변경에 실패했습니다.', 'error', '중요 표시 실패');
        }
    };

    const promoteLeadToCandidate = async (lead: FranchiseLead) => {
        const now = new Date().toISOString();
        const nextActivity: LeadActivity = {
            id: createActivityId(),
            type: '메모',
            content: '1차 유입 DB에서 가맹 희망자 목록으로 승격',
            createdAt: now,
            createdBy: user?.name || userId
        };

        try {
            await updateLeadWithPatch(lead, {
                leadStage: 'candidate',
                activityLog: [nextActivity, ...(lead.activityLog || [])]
            });
            setLeadDbLayer('candidate');
            showAlert('가맹 희망자 목록으로 승격했습니다.', 'success', '승격 완료');
        } catch (error) {
            console.error(error);
            showAlert(error instanceof Error ? error.message : '가맹 희망자 승격에 실패했습니다.', 'error', '승격 실패');
        }
    };

    const addLeadActivity = async () => {
        if (!selectedLead || !activityContent.trim()) {
            showAlert('상담 내용을 입력해주세요.', 'error', '상담 이력 추가 실패');
            return;
        }

        const nextActivity: LeadActivity = {
            id: createActivityId(),
            type: activityType,
            content: activityContent.trim(),
            createdAt: new Date().toISOString(),
            createdBy: user?.name || userId
        };

        try {
            await updateLeadWithPatch(selectedLead, {
                activityLog: [nextActivity, ...(selectedLead.activityLog || [])],
                lastContactedAt: new Date().toISOString()
            });
            setActivityContent('');
            showAlert('상담 이력을 추가했습니다.', 'success', '저장 완료');
        } catch (error) {
            console.error(error);
            showAlert(error instanceof Error ? error.message : '상담 이력 저장에 실패했습니다.', 'error', '저장 실패');
        }
    };

    const openQuickActivityModal = (lead: FranchiseLead) => {
        setQuickActivityLeadId(lead.id);
        setQuickActivityType('전화');
        setQuickActivityContent('');
    };

    const closeQuickActivityModal = () => {
        if (isQuickSaving) return;
        setQuickActivityLeadId('');
        setQuickActivityContent('');
        setQuickActivityType('전화');
    };

    const submitQuickActivity = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!quickActivityLead || !quickActivityContent.trim()) {
            showAlert('상담 내용을 입력해주세요.', 'error', '빠른 이력 추가 실패');
            return;
        }

        const now = new Date().toISOString();
        const nextActivity: LeadActivity = {
            id: createActivityId(),
            type: quickActivityType,
            content: quickActivityContent.trim(),
            createdAt: now,
            createdBy: user?.name || userId
        };

        setIsQuickSaving(true);
        try {
            await updateLeadWithPatch(quickActivityLead, {
                activityLog: [nextActivity, ...(quickActivityLead.activityLog || [])],
                lastContactedAt: now
            });
            setQuickActivityLeadId('');
            setQuickActivityContent('');
            setQuickActivityType('전화');
            showAlert('상담 이력을 빠르게 추가했습니다.', 'success', '저장 완료');
        } catch (error) {
            console.error(error);
            showAlert(error instanceof Error ? error.message : '상담 이력 저장에 실패했습니다.', 'error', '저장 실패');
        } finally {
            setIsQuickSaving(false);
        }
    };

    const applyBulkNextContact = async () => {
        if (selectedLeads.length === 0) {
            showAlert('변경할 가맹 희망자를 선택해주세요.', 'error', '일괄 변경 실패');
            return;
        }

        if (!bulkNextContactAt) {
            showAlert('적용할 다음 연락일을 선택해주세요.', 'error', '일괄 변경 실패');
            return;
        }

        const nextDate = new Date(bulkNextContactAt);
        if (Number.isNaN(nextDate.getTime())) {
            showAlert('다음 연락일 형식이 올바르지 않습니다.', 'error', '일괄 변경 실패');
            return;
        }
        const nextContactAt = nextDate.toISOString();

        setIsBulkUpdating(true);
        try {
            const now = new Date().toISOString();
            const results = await Promise.allSettled(selectedLeads.map(lead => {
                const nextActivity: LeadActivity = {
                    id: createActivityId(),
                    type: '메모',
                    content: `다음 연락일 일괄 변경: ${formatFullDateTime(nextContactAt)}`,
                    createdAt: now,
                    createdBy: user?.name || userId
                };
                return putLeadPatch(lead, {
                    nextContactAt,
                    activityLog: [nextActivity, ...(lead.activityLog || [])]
                });
            }));
            const successCount = results.filter(result => result.status === 'fulfilled').length;
            const failCount = results.length - successCount;
            await fetchLeads();
            if (successCount > 0) {
                setSelectedLeadIds([]);
                setBulkNextContactAt('');
            }
            showAlert(
                failCount > 0
                    ? `${successCount}건 적용, ${failCount}건 실패했습니다.`
                    : `${successCount}건의 다음 연락일을 변경했습니다.`,
                failCount > 0 ? 'info' : 'success',
                '일괄 변경 완료'
            );
        } catch (error) {
            console.error(error);
            showAlert(error instanceof Error ? error.message : '다음 연락일 일괄 변경에 실패했습니다.', 'error', '일괄 변경 실패');
        } finally {
            setIsBulkUpdating(false);
        }
    };

    const saveDetailNextContact = async () => {
        if (!selectedLead) return;

        try {
            await updateLeadWithPatch(selectedLead, {
                nextContactAt: detailNextContactAt ? new Date(detailNextContactAt).toISOString() : null
            });
            showAlert('다음 연락일을 저장했습니다.', 'success', '저장 완료');
        } catch (error) {
            console.error(error);
            showAlert(error instanceof Error ? error.message : '다음 연락일 저장에 실패했습니다.', 'error', '저장 실패');
        }
    };

    const saveDetailWorkflow = async () => {
        if (!selectedLead) return;

        const nextActivity: LeadActivity = {
            id: createActivityId(),
            type: '메모',
            content: `업무 정보 업데이트: ${detailWorkflow.nextAction} · ${detailWorkflow.consultationResult}`,
            createdAt: new Date().toISOString(),
            createdBy: user?.name || userId
        };

        setIsWorkflowSaving(true);
        try {
            await updateLeadWithPatch(selectedLead, {
                ...detailWorkflow,
                churnReason: detailWorkflow.churnReason.trim(),
                activityLog: [nextActivity, ...(selectedLead.activityLog || [])]
            });
            showAlert('연락 관리 정보를 저장했습니다.', 'success', '저장 완료');
        } catch (error) {
            console.error(error);
            showAlert(error instanceof Error ? error.message : '연락 관리 정보 저장에 실패했습니다.', 'error', '저장 실패');
        } finally {
            setIsWorkflowSaving(false);
        }
    };

    const linkRelatedCustomer = async (customer: RelatedCustomer) => {
        if (!selectedLead) return;

        try {
            await updateLeadWithPatch(selectedLead, {
                linkedCustomerId: customer.id,
                linkedCustomerName: customer.name,
                sourceType: selectedLead.sourceType || 'customer',
                sourceId: selectedLead.sourceId || customer.id
            });
            showAlert('기존 고객과 연결했습니다.', 'success', '연결 완료');
        } catch (error) {
            console.error(error);
            showAlert(error instanceof Error ? error.message : '고객 연결에 실패했습니다.', 'error', '연결 실패');
        }
    };

    const linkRelatedCard = async (card: RelatedBusinessCard) => {
        if (!selectedLead) return;

        try {
            await updateLeadWithPatch(selectedLead, {
                linkedBusinessCardId: card.id,
                linkedBusinessCardName: card.name,
                sourceType: selectedLead.sourceType || 'business-card',
                sourceId: selectedLead.sourceId || card.id
            });
            showAlert('기존 명함과 연결했습니다.', 'success', '연결 완료');
        } catch (error) {
            console.error(error);
            showAlert(error instanceof Error ? error.message : '명함 연결에 실패했습니다.', 'error', '연결 실패');
        }
    };

    const completeTodayTask = async (lead: FranchiseLead) => {
        const now = new Date().toISOString();
        const nextActivity: LeadActivity = {
            id: createActivityId(),
            type: '메모',
            content: '연락 관리에서 연락 완료 처리',
            createdAt: now,
            createdBy: user?.name || userId
        };

        try {
            await updateLeadWithPatch(lead, {
                lastContactedAt: now,
                nextContactAt: null,
                consultationResult: '연락 성공',
                nextAction: '미정',
                activityLog: [nextActivity, ...(lead.activityLog || [])]
            });
            showAlert('연락 완료로 처리했습니다. 다음 연락일이 필요하면 상세 패널에서 다시 지정하세요.', 'success', '처리 완료');
        } catch (error) {
            console.error(error);
            showAlert(error instanceof Error ? error.message : '연락 관리 처리에 실패했습니다.', 'error', '처리 실패');
        }
    };

    const deleteLead = async (leadId: string) => {
        if (!userId || !leadId) return;

        try {
            const response = await fetch(`/api/franchise-leads?id=${encodeURIComponent(leadId)}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requesterId: userId })
            });
            const payload = await response.json();

            if (!response.ok) {
                throw new Error(readApiError(payload));
            }

            await fetchLeads();
            showAlert('가맹 희망자가 삭제되었습니다.', 'success', '삭제 완료');
        } catch (error) {
            console.error(error);
            showAlert(error instanceof Error ? error.message : '삭제 중 오류가 발생했습니다.', 'error', '삭제 실패');
        }
    };

    return (
        <div className={styles.pageShell}>
            <FranchiseWorkspaceHero
                title="모객 DB"
                description="가맹 희망자 유입부터 상담, 검토, 계약 전환까지 본사에서 한눈에 관리합니다."
                actions={(
                    <>
                    <button className={styles.secondaryButton} onClick={() => setIsMetaPanelOpen(prev => !prev)}>
                        <Link2 size={16} />
                        Meta 연동
                    </button>
                    {canManageMeta && (
                        <button className={styles.secondaryButton} onClick={startMetaConnect} disabled={isMetaLoading}>
                            <Link2 size={16} />
                            Meta 계정 연결
                        </button>
                    )}
                    <button className={styles.secondaryButton} onClick={() => void downloadTemplate()}>
                        <Download size={16} />
                        샘플 양식
                    </button>
                    <button className={styles.secondaryButton} onClick={() => uploadInputRef.current?.click()} disabled={isUploading}>
                        <Upload size={16} />
                        {isUploading ? '업로드 중' : '엑셀 업로드'}
                    </button>
                    {uploadErrors.length > 0 && (
                        <button className={styles.secondaryButton} onClick={() => void downloadUploadErrorRows()}>
                            <Download size={16} />
                            실패 행 다운로드
                        </button>
                    )}
                    <button className={styles.primaryButton} onClick={openCreateModal}>
                        <Plus size={16} />
                        가맹 희망자 등록
                    </button>
                    <input
                        ref={uploadInputRef}
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        className={styles.hiddenInput}
                        onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) void handleUploadFile(file);
                        }}
                    />
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
                managerOptions={renderManagerOptions()}
                createdFrom={createdFrom}
                createdTo={createdTo}
                onRangeClickAction={(nextRange) => handleRangeClick(toRangeOption(nextRange))}
                onSearchTermChangeAction={setSearchTerm}
                onStatusFilterChangeAction={(status) => {
                    setStatusFilter(status);
                    if (status === '계약완료') {
                        setWorkspaceTab('contractOwners');
                        setLeadDbLayer('candidate');
                        setViewMode('table');
                    } else if (workspaceTab === 'contractOwners') {
                        setWorkspaceTab('db');
                    }
                }}
                onSourceFilterChangeAction={(source) => setSourceFilter(toSourceFilterOption(source))}
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

            <LeadWorkspaceTabs
                activeTab={workspaceTab}
                onTabChange={(tab) => {
                    setWorkspaceTab(tab);
                    if (tab === 'contractOwners') {
                        setStatusFilter('계약완료');
                        setLeadDbLayer('candidate');
                        setViewMode('table');
                    }
                }}
            />

            {isMetaPanelOpen && (
                <LeadMetaIntegrationPanel
                    metaState={metaState}
                    enabledFormCount={metaEnabledForms.length}
                    lastSyncAt={metaLastSyncAt}
                    errorCount={metaErrorCount}
                    canManageMeta={canManageMeta}
                    isMetaLoading={isMetaLoading}
                    isMetaSyncing={isMetaSyncing}
                    savingMetaFormId={savingMetaFormId}
                    renderManagerOptionsAction={renderManagerOptions}
                    onRefreshAction={fetchMetaIntegration}
                    onStartConnectAction={startMetaConnect}
                    onSyncAction={syncMetaLeads}
                    onDisconnectConnectionAction={disconnectMetaConnection}
                    onUpdateFormAction={updateMetaForm}
                    onUpdateFieldMappingAction={updateMetaFieldMapping}
                />
            )}

            {workspaceTab === 'dashboard' && (
                <LeadDashboard
                    candidateCount={candidateLeads.length}
                    rawIntakeCount={rawIntakeLeads.length}
                    activeConsultingCount={candidateLeads.filter(lead => lead.status === '상담중' || lead.status === '가맹검토').length}
                    dueContactCount={dueContactCount}
                    overdueContactCount={overdueContactCount}
                    conversionRate={conversionRate}
                    statusFilter={statusFilter}
                    stageData={stageData}
                    sourceChartData={sourceChartData}
                    managerChartData={managerChartData}
                    trendSeriesData={trendSeriesData}
                    onStatusFilterChangeAction={(status) => {
                        setStatusFilter(status);
                        if (status === '계약완료') {
                            setWorkspaceTab('contractOwners');
                            setLeadDbLayer('candidate');
                            setViewMode('table');
                        }
                    }}
                />
            )}

            {(workspaceTab === 'db' || workspaceTab === 'contractOwners') && (
                <LeadDbWorkspace
                    isLoading={isLoading}
                    workspaceVariant={workspaceTab === 'contractOwners' ? 'contractOwners' : 'default'}
                    leadDbLayer={leadDbLayer}
                    viewMode={viewMode}
                    rawIntakeCount={rawIntakeLeads.length}
                    candidateCount={candidateLeads.length}
                    listPolicyText={listPolicyText}
                    contractChecklistRefreshKey={contractChecklistRefreshKey}
                    pageSize={pageSize}
                    visibleLayerLeadCount={visibleLayerLeads.length}
                    paginatedLeads={paginatedLeads}
                    selectedLeadIds={selectedLeadIds}
                    allVisibleSelected={allVisibleSelected}
                    bulkNextContactAt={bulkNextContactAt}
                    isBulkUpdating={isBulkUpdating}
                    convertingLeadId={convertingLeadId}
                    tableFilters={tableFilters}
                    tableSort={tableSort}
                    visibleTableColumns={visibleTableColumns}
                    pipelineColumns={pipelineColumns}
                    taskQueueOptions={taskQueueOptions}
                    taskQueueFilter={taskQueueFilter}
                    taskLeads={taskLeads}
                    safeCurrentPage={safeCurrentPage}
                    totalPages={totalPages}
                    renderManagerOptions={renderManagerOptions}
                    getManagerName={getManagerName}
                    onLeadDbLayerChangeAction={setLeadDbLayer}
                    onViewModeChangeAction={setViewMode}
                    onPageSizeChangeAction={setPageSize}
                    onTableFiltersChangeAction={setTableFilters}
                    onTableSortChangeAction={setTableSort}
                    onVisibleTableColumnsChangeAction={setVisibleTableColumns}
                    onBulkNextContactAtChangeAction={setBulkNextContactAt}
                    onApplyBulkNextContactAction={() => void applyBulkNextContact()}
                    onClearSelectedAction={() => setSelectedLeadIds([])}
                    onToggleSelectAllVisibleAction={toggleSelectAllVisible}
                    onToggleSelectLeadAction={toggleSelectLead}
                    onSelectLeadAction={isContractOwnersTab ? openLeadContractChecklist : openLeadDetail}
                    onStatusChangeAction={(lead, status) => void updateLeadStatus(lead, status)}
                    onManagerChangeAction={(lead, managerId) => void updateLeadManager(lead, managerId)}
                    onTogglePriorityAction={(lead) => void toggleLeadPriority(lead)}
                    onPromoteLeadToCandidateAction={(lead) => void promoteLeadToCandidate(lead)}
                    onConvertLeadAction={(lead) => void convertLeadToCustomer(lead)}
                    onOpenQuickActivityModalAction={openQuickActivityModal}
                    onOpenEditModalAction={openEditModal}
                    onRequestDeleteAction={(lead) => setConfirmConfig({ isOpen: true, leadId: lead.id, leadName: lead.name })}
                    onPreviousPageAction={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    onNextPageAction={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    onTaskQueueFilterChangeAction={setTaskQueueFilter}
                    onCompleteTodayTaskAction={(lead) => void completeTodayTask(lead)}
                />
            )}

            {isModalOpen && (
                <LeadFormModal
                    form={form}
                    isSaving={isSaving}
                    onFormChangeAction={setForm}
                    onCloseAction={closeModal}
                    onSubmitAction={submitLead}
                    renderManagerOptionsAction={renderManagerOptions}
                />
            )}

            {quickActivityLead && (
                <LeadQuickActivityModal
                    lead={quickActivityLead}
                    activityType={quickActivityType}
                    activityContent={quickActivityContent}
                    isSaving={isQuickSaving}
                    getManagerNameAction={getManagerName}
                    onActivityTypeChangeAction={setQuickActivityType}
                    onActivityContentChangeAction={setQuickActivityContent}
                    onCloseAction={closeQuickActivityModal}
                    onSubmitAction={submitQuickActivity}
                />
            )}

            {selectedLead && (
                <LeadDetailPanel
                    lead={selectedLead}
                    mode={selectedLeadDetailMode}
                    userId={userId}
                    companyName={companyName}
                    convertingLeadId={convertingLeadId}
                    detailNextContactAt={detailNextContactAt}
                    detailWorkflow={detailWorkflow}
                    isWorkflowSaving={isWorkflowSaving}
                    selectedLocationLinks={selectedLeadLocationLinks}
                    franchiseLocations={franchiseLocations}
                    externalListings={externalListings}
                    isLocationMatchLoading={isLocationMatchLoading}
                    isLocationLinkSaving={isLocationLinkSaving}
                    activityType={activityType}
                    activityContent={activityContent}
                    relatedCustomers={relatedCustomers}
                    relatedCards={relatedCards}
                    isRelatedLoading={isRelatedLoading}
                    getManagerNameAction={getManagerName}
                    onCloseAction={closeLeadDetail}
                    onPromoteLeadToCandidateAction={promoteLeadToCandidate}
                    onStatusChangeAction={updateLeadStatus}
                    onEditAction={openEditModal}
                    onConvertLeadAction={convertLeadToCustomer}
                    onDetailNextContactAtChangeAction={setDetailNextContactAt}
                    onSaveDetailNextContactAction={saveDetailNextContact}
                    onDetailWorkflowChangeAction={setDetailWorkflow}
                    onSaveDetailWorkflowAction={saveDetailWorkflow}
                    onDisclosureEligibilityChangeAction={setSelectedDisclosureEligibility}
                    onContractChecklistSavedAction={markContractChecklistSaved}
                    onAddLocationLinkAction={addLocationLink}
                    onUpdateLocationLinkAction={updateLocationLink}
                    onRemoveLocationLinkAction={removeLocationLink}
                    onActivityTypeChangeAction={setActivityType}
                    onActivityContentChangeAction={setActivityContent}
                    onAddLeadActivityAction={addLeadActivity}
                    onLinkRelatedCustomerAction={linkRelatedCustomer}
                    onLinkRelatedCardAction={linkRelatedCard}
                />
            )}

            <AlertModal
                isOpen={alertConfig.isOpen}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
            />
            <ConfirmModal
                isOpen={confirmConfig.isOpen}
                title="가맹 희망자 삭제"
                message={`${confirmConfig.leadName} 가맹 희망자를 삭제할까요?`}
                confirmText="삭제"
                isDanger
                onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
                onConfirm={() => void deleteLead(confirmConfig.leadId)}
            />
        </div>
    );
}
