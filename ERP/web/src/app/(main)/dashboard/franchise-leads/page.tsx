"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import {
    BriefcaseBusiness,
    CalendarClock,
    CheckCircle2,
    Download,
    Link2,
    MessageSquare,
    Pencil,
    Plus,
    RefreshCw,
    Trash2,
    Upload,
    UserCheck,
    UserRound,
    X
} from 'lucide-react';
import { AlertModal } from '@/components/common/AlertModal';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { FranchiseWorkspaceHero } from '@/components/franchise/FranchiseWorkspaceHero';
import { LeadContractChecklistSection } from '@/components/franchise/LeadContractChecklistSection';
import { LeadDisclosureSection } from '@/components/franchise/LeadDisclosureSection';
import { LeadDashboard } from '@/components/franchise/leads/LeadDashboard';
import { LeadDbWorkspace } from '@/components/franchise/leads/LeadDbWorkspace';
import { LeadRegionMultiSelect } from '@/components/franchise/leads/LeadRegionMultiSelect';
import { LeadToolbar } from '@/components/franchise/leads/LeadToolbar';
import { LeadWorkspaceTabs, type LeadWorkspaceTab } from '@/components/franchise/leads/LeadWorkspaceTabs';
import { useLeadDerivedData } from '@/components/franchise/leads/useLeadDerivedData';
import {
    DEFAULT_FRANCHISE_LEAD_STATUS,
    FRANCHISE_LEAD_GRADES,
    FRANCHISE_LEAD_SOURCES,
    FRANCHISE_LEAD_STATUSES,
    getFranchiseLeadGradeLabel,
    getFranchiseLeadStageLabel,
    normalizeLeadPhone
} from '@/lib/franchise-leads';
import type { FranchiseLeadStatus } from '@/lib/franchise-leads';
import { LeadLocationLinkSection } from '@/components/franchise/LeadLocationLinkSection';
import { LeadWorkflowSection } from '@/components/franchise/LeadWorkflowSection';
import {
    addUniqueLeadLocationLink,
    createLeadLocationLink,
    normalizeLeadLocationLinks,
    updateLeadLocationLink
} from '@/lib/franchise-lead-location-links';
import type { LeadLocationLinkStatus, LeadLocationTargetType } from '@/lib/franchise-lead-location-links';
import {
    ACTIVITY_TYPES,
    EMPTY_FORM,
    EMPTY_META_STATE,
    META_FIELD_LABELS,
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
    ExternalPropertyListing,
    FranchiseLead,
    FranchiseLocation,
    LeadActivity,
    LeadActivityType,
    LeadDbLayer,
    LeadFormState,
    LeadListResponse,
    LeadLocationLink,
    LeadSummary,
    LeadViewMode,
    ManagerOption,
    MetaConnection,
    MetaFieldMapping,
    MetaIntegrationState,
    MetaLeadForm,
    RelatedBusinessCard,
    RelatedCustomer,
    UploadErrorRow
} from '@/components/franchise/leads/types';
import {
    buildDateFromRange,
    createActivityId,
    createEmptySummary,
    createFormFromLead,
    formatBudget,
    formatFullDateTime,
    formatDate,
    formatDateTime,
    isContactActionDue,
    isDueToday,
    isPastDue,
    isRawIntakeLead,
    mapLeadGradeToCustomerClass,
    mapLeadGradeToCustomerGrade,
    mapLeadStatusToCustomerStatus,
    parseBudgetInputToWon,
    toCustomerBudgetValue,
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

type LeadDetailMode = 'default' | 'contractChecklist';

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
    const [isUploading, setIsUploading] = React.useState(false);
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
    const [convertingLeadId, setConvertingLeadId] = React.useState('');
    const [relatedCustomers, setRelatedCustomers] = React.useState<RelatedCustomer[]>([]);
    const [relatedCards, setRelatedCards] = React.useState<RelatedBusinessCard[]>([]);
    const [franchiseLocations, setFranchiseLocations] = React.useState<FranchiseLocation[]>([]);
    const [externalListings, setExternalListings] = React.useState<ExternalPropertyListing[]>([]);
    const [isLocationMatchLoading, setIsLocationMatchLoading] = React.useState(false);
    const [isLocationLinkSaving, setIsLocationLinkSaving] = React.useState(false);
    const [managerOptions, setManagerOptions] = React.useState<ManagerOption[]>([]);
    const [managerMap, setManagerMap] = React.useState<Record<string, string>>({});
    const [uploadErrors, setUploadErrors] = React.useState<UploadErrorRow[]>([]);
    const [isRelatedLoading, setIsRelatedLoading] = React.useState(false);
    const [detailWorkflow, setDetailWorkflow] = React.useState<LeadWorkflowDraft>(EMPTY_LEAD_WORKFLOW_DRAFT);
    const [isWorkflowSaving, setIsWorkflowSaving] = React.useState(false);
    const [selectedDisclosureEligibility, setSelectedDisclosureEligibility] = React.useState<DisclosureEligibility | null>(null);
    const [metaState, setMetaState] = React.useState<MetaIntegrationState>(EMPTY_META_STATE);
    const [isMetaLoading, setIsMetaLoading] = React.useState(false);
    const [isMetaPanelOpen, setIsMetaPanelOpen] = React.useState(false);
    const [isMetaSyncing, setIsMetaSyncing] = React.useState(false);
    const [savingMetaFormId, setSavingMetaFormId] = React.useState('');
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
    const uploadInputRef = React.useRef<HTMLInputElement>(null);
    const selectedLead = React.useMemo(
        () => leads.find(lead => lead.id === selectedLeadId) || null,
        [leads, selectedLeadId]
    );
    const quickActivityLead = React.useMemo(
        () => leads.find(lead => lead.id === quickActivityLeadId) || null,
        [leads, quickActivityLeadId]
    );
    const selectedLeadLocationLinks = React.useMemo(
        () => normalizeLeadLocationLinks(selectedLead?.locationLinks),
        [selectedLead?.locationLinks]
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

    const fetchMetaIntegration = React.useCallback(async () => {
        if (!userId) return;

        setIsMetaLoading(true);
        try {
            const params = new URLSearchParams({ requesterId: userId });
            if (companyName) params.set('company', companyName);

            const response = await fetch(`/api/integrations/meta?${params.toString()}`, { cache: 'no-store' });
            const payload = await response.json();
            if (!response.ok) {
                throw new Error(readApiError(payload));
            }

            const data = unwrapApiData<MetaIntegrationState>(payload);
            setMetaState({
                connections: data.connections || [],
                forms: data.forms || [],
                imports: data.imports || [],
                configReady: Boolean(data.configReady)
            });
        } catch (error) {
            console.error('Failed to fetch Meta integration:', error);
            setMetaState(EMPTY_META_STATE);
        } finally {
            setIsMetaLoading(false);
        }
    }, [companyName, userId]);

    React.useEffect(() => {
        if (!userId) return;
        const timer = window.setTimeout(() => {
            void fetchLeads();
        }, 250);

        return () => window.clearTimeout(timer);
    }, [fetchLeads, userId]);

    React.useEffect(() => {
        if (!userId) return;
        void fetchMetaIntegration();
    }, [fetchMetaIntegration, userId]);

    React.useEffect(() => {
        if (!userId) return;

        const controller = new AbortController();
        const params = new URLSearchParams({ requesterId: userId });
        if (companyName) params.set('company', companyName);

        const listingParams = new URLSearchParams(params);
        listingParams.set('limit', '500');

        setIsLocationMatchLoading(true);
        Promise.allSettled([
            fetch(`/api/franchise-locations?${params.toString()}`, { cache: 'no-store', signal: controller.signal })
                .then(async response => {
                    const payload = await response.json();
                    if (!response.ok) throw new Error(readApiError(payload));
                    return unwrapApiData<{ locations?: FranchiseLocation[] }>(payload);
                }),
            fetch(`/api/realty/listings?${listingParams.toString()}`, { cache: 'no-store', signal: controller.signal })
                .then(async response => {
                    const payload = await response.json();
                    if (!response.ok) throw new Error(readApiError(payload));
                    return unwrapApiData<{ listings?: ExternalPropertyListing[] }>(payload);
                })
        ])
            .then(([locationResult, listingResult]) => {
                if (locationResult.status === 'fulfilled') {
                    setFranchiseLocations(locationResult.value.locations || []);
                } else {
                    console.error('Failed to fetch franchise locations for lead links:', locationResult.reason);
                    setFranchiseLocations([]);
                }

                if (listingResult.status === 'fulfilled') {
                    setExternalListings(listingResult.value.listings || []);
                } else {
                    console.error('Failed to fetch external listings for lead links:', listingResult.reason);
                    setExternalListings([]);
                }
            })
            .catch(error => {
                if (error instanceof DOMException && error.name === 'AbortError') return;
                console.error('Failed to fetch lead location link targets:', error);
                setFranchiseLocations([]);
                setExternalListings([]);
            })
            .finally(() => {
                if (!controller.signal.aborted) setIsLocationMatchLoading(false);
            });

        return () => controller.abort();
    }, [companyName, userId]);

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

    const canManageMeta = user?.role === 'admin' || user?.role === 'manager';
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

    const showAlert = (message: string, type: 'success' | 'error' | 'info' = 'info', title = '알림') => {
        setAlertConfig({ isOpen: true, title, message, type });
    };

    const startMetaConnect = () => {
        if (!userId) return;
        if (!metaState.configReady) {
            showAlert('Meta 환경변수가 아직 설정되지 않았습니다. META_APP_ID, META_APP_SECRET, META_VERIFY_TOKEN을 먼저 설정해주세요.', 'error', 'Meta 연동 설정 필요');
            return;
        }

        const params = new URLSearchParams({
            requesterId: userId,
            redirect: '/dashboard/franchise-leads'
        });
        if (companyName) params.set('company', companyName);
        window.location.href = `/api/integrations/meta/connect?${params.toString()}`;
    };

    const updateMetaFormState = (formId: string, updater: (form: MetaLeadForm) => MetaLeadForm) => {
        setMetaState(prev => ({
            ...prev,
            forms: prev.forms.map(form => form.id === formId ? updater(form) : form)
        }));
    };

    const updateMetaForm = async (form: MetaLeadForm, updates: Partial<MetaLeadForm>) => {
        if (!userId) return;

        setSavingMetaFormId(form.id);
        try {
            const response = await fetch('/api/integrations/meta/forms', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    requesterId: userId,
                    id: form.id,
                    enabled: updates.enabled,
                    defaultManagerId: updates.defaultManagerId,
                    fieldMapping: updates.fieldMapping
                })
            });
            const payload = await response.json();
            if (!response.ok) {
                throw new Error(readApiError(payload));
            }

            const data = unwrapApiData<{ form: MetaLeadForm }>(payload);
            updateMetaFormState(form.id, () => data.form);
        } catch (error) {
            console.error(error);
            showAlert(error instanceof Error ? error.message : 'Meta Form 설정 저장에 실패했습니다.', 'error', 'Meta 설정 실패');
            await fetchMetaIntegration();
        } finally {
            setSavingMetaFormId('');
        }
    };

    const updateMetaFieldMapping = (formId: string, key: keyof MetaFieldMapping, value: string) => {
        const nextValues = value.split(',').map(item => item.trim()).filter(Boolean);
        updateMetaFormState(formId, form => ({
            ...form,
            fieldMapping: {
                ...form.fieldMapping,
                [key]: nextValues
            }
        }));
    };

    const syncMetaLeads = async (formId?: string) => {
        if (!userId) return;

        setIsMetaSyncing(true);
        try {
            const response = await fetch('/api/integrations/meta/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    requesterId: userId,
                    formId
                })
            });
            const payload = await response.json();
            if (!response.ok) {
                throw new Error(readApiError(payload));
            }

            const result = unwrapApiData<{ stats: Record<string, number>; formCount: number; errors?: Array<{ reason: string }> }>(payload);
            await Promise.all([fetchMetaIntegration(), fetchLeads()]);
            const stats = result.stats || {};
            showAlert(
                `Meta 동기화 완료\n- 신규: ${stats.created || 0}건\n- 기존 업데이트: ${stats.updated || 0}건\n- 중복: ${stats.duplicate || 0}건\n- 제외/오류: ${(stats.skipped || 0) + (stats.error || 0)}건${result.errors?.length ? `\n첫 오류: ${result.errors[0].reason}` : ''}`,
                result.errors?.length ? 'info' : 'success',
                'Meta 동기화'
            );
        } catch (error) {
            console.error(error);
            showAlert(error instanceof Error ? error.message : 'Meta 리드 동기화에 실패했습니다.', 'error', 'Meta 동기화 실패');
        } finally {
            setIsMetaSyncing(false);
        }
    };

    const disconnectMetaConnection = async (connection: MetaConnection) => {
        if (!userId) return;
        const confirmed = window.confirm(`${connection.metaPageName || connection.metaPageId} Meta 연결을 해제할까요? 기존 모객DB 리드는 삭제되지 않습니다.`);
        if (!confirmed) return;

        try {
            const response = await fetch(`/api/integrations/meta?id=${encodeURIComponent(connection.id)}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requesterId: userId })
            });
            const payload = await response.json();
            if (!response.ok) {
                throw new Error(readApiError(payload));
            }

            await fetchMetaIntegration();
            showAlert('Meta 연결을 해제했습니다. 기존 가맹 희망자 데이터는 유지됩니다.', 'success', '연결 해제');
        } catch (error) {
            console.error(error);
            showAlert(error instanceof Error ? error.message : 'Meta 연결 해제에 실패했습니다.', 'error', '연결 해제 실패');
        }
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

    const getLinkTargetName = (targetType: LeadLocationTargetType, targetId: string) => {
        if (targetType === 'franchise_location') {
            return franchiseLocations.find(location => location.id === targetId)?.name || '출점 후보지';
        }
        const listing = externalListings.find(item => item.id === targetId);
        return listing?.title || listing?.address || '외부 상가';
    };

    const saveLocationLinks = async (links: readonly LeadLocationLink[], activityContent: string) => {
        if (!selectedLead) return;

        const nextActivity: LeadActivity = {
            id: createActivityId(),
            type: '메모',
            content: activityContent,
            createdAt: new Date().toISOString(),
            createdBy: user?.name || userId
        };

        setIsLocationLinkSaving(true);
        try {
            await updateLeadWithPatch(selectedLead, {
                locationLinks: links,
                activityLog: [nextActivity, ...(selectedLead.activityLog || [])]
            });
        } finally {
            setIsLocationLinkSaving(false);
        }
    };

    const addLocationLink = async (targetType: LeadLocationTargetType, targetId: string) => {
        if (!selectedLead) return;
        const currentLinks = normalizeLeadLocationLinks(selectedLead.locationLinks);
        const targetName = getLinkTargetName(targetType, targetId);
        const nextLink = createLeadLocationLink({
            id: createActivityId(),
            targetType,
            targetId,
            createdAt: new Date().toISOString(),
            createdBy: user?.name || userId
        });

        try {
            const nextLinks = addUniqueLeadLocationLink(currentLinks, nextLink);
            if (nextLinks.length === currentLinks.length) {
                showAlert('이미 연결된 후보지입니다.', 'info', '중복 연결');
                return;
            }

            await saveLocationLinks(nextLinks, `후보지 연결: ${targetName}`);
            showAlert('가맹 희망자에 후보지를 연결했습니다.', 'success', '연결 완료');
        } catch (error) {
            console.error(error);
            showAlert(error instanceof Error ? error.message : '후보지 연결에 실패했습니다.', 'error', '연결 실패');
        }
    };

    const updateLocationLink = async (
        linkId: string,
        patch: { readonly status?: LeadLocationLinkStatus; readonly memo?: string }
    ) => {
        if (!selectedLead) return;
        const currentLinks = normalizeLeadLocationLinks(selectedLead.locationLinks);
        const targetLink = currentLinks.find(link => link.id === linkId);
        if (!targetLink) return;

        const nextLinks = updateLeadLocationLink(currentLinks, linkId, {
            ...patch,
            updatedAt: new Date().toISOString()
        });
        const targetName = getLinkTargetName(targetLink.targetType, targetLink.targetId);
        const activityContent = patch.status
            ? `후보지 상태 변경: ${targetName} · ${patch.status}`
            : `후보지 메모 업데이트: ${targetName}`;

        try {
            await saveLocationLinks(nextLinks, activityContent);
            showAlert('후보지 연결 정보를 저장했습니다.', 'success', '저장 완료');
        } catch (error) {
            console.error(error);
            showAlert(error instanceof Error ? error.message : '후보지 연결 정보 저장에 실패했습니다.', 'error', '저장 실패');
        }
    };

    const removeLocationLink = async (linkId: string) => {
        if (!selectedLead) return;
        const currentLinks = normalizeLeadLocationLinks(selectedLead.locationLinks);
        const targetLink = currentLinks.find(link => link.id === linkId);
        if (!targetLink) return;

        const targetName = getLinkTargetName(targetLink.targetType, targetLink.targetId);
        const nextLinks = currentLinks.filter(link => link.id !== linkId);

        try {
            await saveLocationLinks(nextLinks, `후보지 연결 삭제: ${targetName}`);
            showAlert('후보지 연결을 삭제했습니다.', 'success', '삭제 완료');
        } catch (error) {
            console.error(error);
            showAlert(error instanceof Error ? error.message : '후보지 연결 삭제에 실패했습니다.', 'error', '삭제 실패');
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

    const findExistingCustomerForLead = async (lead: FranchiseLead) => {
        const normalizedPhone = normalizeLeadPhone(lead.mobile);
        if (!normalizedPhone || normalizedPhone.length < 4) return null;

        const params = new URLSearchParams({
            requesterId: userId,
            search: normalizedPhone,
            limit: 'all'
        });
        const targetCompanyName = lead.companyName || companyName;
        if (targetCompanyName) params.set('company', targetCompanyName);

        const response = await fetch(`/api/customers?${params.toString()}`, { cache: 'no-store' });
        const payload = await response.json();
        if (!response.ok) throw new Error(readApiError(payload));

        const customers = unwrapApiData<RelatedCustomer[]>(payload) || [];
        return customers.find(customer => {
            return normalizeLeadPhone(customer.mobile) === normalizedPhone ||
                normalizeLeadPhone(customer.companyPhone) === normalizedPhone;
        }) || null;
    };

    const markLeadConverted = async (lead: FranchiseLead, customer: { id: string; name?: string }, message: string) => {
        const now = new Date().toISOString();
        const nextActivity: LeadActivity = {
            id: createActivityId(),
            type: '고객전환',
            content: message,
            createdAt: now,
            createdBy: user?.name || userId
        };

        await updateLeadWithPatch(lead, {
            convertedCustomerId: customer.id,
            convertedCustomerName: customer.name || lead.name,
            convertedAt: now,
            lastContactedAt: now,
            nextContactAt: null,
            linkedCustomerId: lead.linkedCustomerId || customer.id,
            linkedCustomerName: lead.linkedCustomerName || customer.name || lead.name,
            activityLog: [nextActivity, ...(lead.activityLog || [])]
        });
    };

    const convertLeadToCustomer = async (lead: FranchiseLead) => {
        if (!userId) return;
        if (lead.convertedCustomerId) {
            showAlert('이미 고객 DB로 전환된 리드입니다.', 'info', '전환 완료');
            openCustomerDetail(lead.convertedCustomerId);
            return;
        }

        setConvertingLeadId(lead.id);
        try {
            if (lead.linkedCustomerId) {
                await markLeadConverted(
                    lead,
                    { id: lead.linkedCustomerId, name: lead.linkedCustomerName || lead.name },
                    `기존 연결 고객(${lead.linkedCustomerName || lead.name})을 전환 완료로 표시`
                );
                showAlert('기존 연결 고객을 전환 완료로 표시했습니다.', 'success', '고객 전환 완료');
                openCustomerDetail(lead.linkedCustomerId);
                return;
            }

            const existingCustomer = await findExistingCustomerForLead(lead);
            if (existingCustomer) {
                await markLeadConverted(
                    lead,
                    { id: existingCustomer.id, name: existingCustomer.name },
                    `동일 연락처 기존 고객(${existingCustomer.name})과 연결 후 전환 완료`
                );
                showAlert('같은 연락처의 기존 고객과 연결하고 전환 완료 처리했습니다.', 'success', '고객 전환 완료');
                openCustomerDetail(existingCustomer.id);
                return;
            }

            const memoLines = [
                '[모객DB 전환]',
                `전환일시: ${formatFullDateTime(new Date().toISOString())}`,
                `모객상태: ${lead.status}`,
                `유입경로: ${lead.source || '-'}`,
                `관심브랜드: ${lead.interestedBrand || '-'}`,
                `희망지역: ${lead.desiredRegion || '-'}`,
                `예산: ${formatBudget(lead.budgetMin, lead.budgetMax)}`,
                lead.memo ? `메모: ${lead.memo}` : ''
            ].filter(Boolean);

            const customerResponse = await fetch('/api/customers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    requesterId: userId,
                    managerId: lead.managerId || userId,
                    companyName: lead.companyName || companyName,
                    companyId: lead.companyId,
                    name: lead.name,
                    gender: 'M',
                    grade: mapLeadGradeToCustomerGrade(lead.grade),
                    class: mapLeadGradeToCustomerClass(lead.grade),
                    status: mapLeadStatusToCustomerStatus(lead.status),
                    feature: lead.interestedBrand ? `프랜차이즈 관심: ${lead.interestedBrand}` : '모객DB 전환 고객',
                    address: lead.desiredRegion || '',
                    mobile: lead.mobile || '',
                    companyPhone: '',
                    memoInterest: memoLines.join('\n'),
                    memoHistory: memoLines.join('\n'),
                    progressSteps: lead.status === '계약예정' || lead.status === '계약완료' ? ['계약상황'] : ['상담중'],
                    wantedArea: lead.desiredRegion || '',
                    wantedFeature: lead.memo || '',
                    wantedItem: lead.interestedBrand || '',
                    wantedIndustry: '프랜차이즈',
                    wantedDepositMin: toCustomerBudgetValue(lead.budgetMin),
                    wantedDepositMax: toCustomerBudgetValue(lead.budgetMax),
                    sourceType: 'franchise-lead',
                    sourceId: lead.id,
                    franchiseLeadId: lead.id
                })
            });
            const customerPayload = await customerResponse.json();
            if (!customerResponse.ok) throw new Error(readApiError(customerPayload));

            const customer = unwrapApiData<RelatedCustomer>(customerPayload);
            if (!customer?.id) throw new Error('고객 생성 결과를 확인하지 못했습니다.');

            await markLeadConverted(
                lead,
                { id: customer.id, name: customer.name || lead.name },
                `신규 고객(${customer.name || lead.name})으로 전환`
            );
            showAlert('고객 DB로 전환했습니다.', 'success', '고객 전환 완료');
            openCustomerDetail(customer.id);
        } catch (error) {
            console.error(error);
            showAlert(error instanceof Error ? error.message : '고객 전환에 실패했습니다.', 'error', '고객 전환 실패');
        } finally {
            setConvertingLeadId('');
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

    const handleUploadFile = async (file: File) => {
        if (!userId) return;

        setIsUploading(true);
        setUploadErrors([]);
        try {
            const XLSX = await import('xlsx');
            const buffer = await file.arrayBuffer();
            const workbook = XLSX.read(buffer, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });

            if (rows.length === 0) {
                showAlert('업로드할 행이 없습니다.', 'error', '엑셀 업로드 실패');
                return;
            }

            const response = await fetch('/api/franchise-leads/batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rows,
                    meta: {
                        requesterId: userId,
                        managerId: userId,
                        companyName
                    }
                })
            });
            const payload = await response.json();

            if (!response.ok) {
                throw new Error(readApiError(payload));
            }

            const result = unwrapApiData<{ created: number; updated: number; skipped: number; errors?: UploadErrorRow[] }>(payload);
            const nextUploadErrors = result.errors || [];
            setUploadErrors(nextUploadErrors);
            await fetchLeads();
            showAlert(
                `신규 ${result.created}건, 업데이트 ${result.updated}건, 제외 ${result.skipped}건 처리했습니다.${nextUploadErrors.length > 0 ? `\n실패 행은 상단의 다운로드 버튼으로 확인할 수 있습니다.\n첫 오류: ${nextUploadErrors[0].row}행 - ${nextUploadErrors[0].reason}` : ''}`,
                result.skipped > 0 ? 'info' : 'success',
                '엑셀 업로드 완료'
            );
        } catch (error) {
            console.error(error);
            showAlert(error instanceof Error ? error.message : '엑셀 업로드 중 오류가 발생했습니다.', 'error', '엑셀 업로드 실패');
        } finally {
            setIsUploading(false);
            if (uploadInputRef.current) uploadInputRef.current.value = '';
        }
    };

    const downloadUploadErrorRows = async () => {
        if (uploadErrors.length === 0) {
            showAlert('다운로드할 실패 행이 없습니다.', 'info');
            return;
        }

        const XLSX = await import('xlsx');
        const originalKeys = Array.from(new Set(
            uploadErrors.flatMap(error => Object.keys(error.data || {}))
        )).filter(key => key !== '행번호' && key !== '오류사유');
        const exportRows = uploadErrors.map(error => ({
            ...(error.data || {}),
            행번호: error.row,
            오류사유: error.reason
        }));
        const worksheet = XLSX.utils.json_to_sheet(exportRows, { header: ['행번호', '오류사유', ...originalKeys] });
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, '실패행');
        XLSX.writeFile(workbook, 'franchise-leads-upload-errors.xlsx');
    };

    const downloadTemplate = async () => {
        const XLSX = await import('xlsx');
        const worksheet = XLSX.utils.json_to_sheet([
            {
                이름: '홍길동',
                연락처: '010-1234-5678',
                유입경로: '랜딩페이지',
                상태: '문의접수',
                등급: '중요',
                희망지역: '서울 강남구',
                '창업예산(만원)': '10000~20000',
                관심브랜드: '미카도',
                담당자: user?.name || '',
                다음연락일: '2026-06-10',
                메모: '첫 상담 요청'
            }
        ]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, '모객DB');
        XLSX.writeFile(workbook, 'franchise-leads-template.xlsx');
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
                <section className={styles.metaPanel}>
                    <div className={styles.metaPanelHeader}>
                        <div>
                            <span className={styles.metaEyebrow}>Meta Lead Ads</span>
                            <h2>Meta 연동 설정</h2>
                            <p>각 회사의 Meta Page/Form에서 들어온 즉시양식 리드를 모객DB로 자동 등록합니다.</p>
                        </div>
                        <div className={styles.metaPanelActions}>
                            <button className={styles.secondaryButton} onClick={() => void fetchMetaIntegration()} disabled={isMetaLoading}>
                                <RefreshCw size={15} />
                                {isMetaLoading ? '확인 중' : '상태 새로고침'}
                            </button>
                            {canManageMeta && (
                                <button className={styles.primaryButton} onClick={() => void syncMetaLeads()} disabled={isMetaSyncing || metaEnabledForms.length === 0}>
                                    <RefreshCw size={15} />
                                    {isMetaSyncing ? '동기화 중' : '활성 Form 동기화'}
                                </button>
                            )}
                        </div>
                    </div>

                    <div className={styles.metaSummaryGrid}>
                        <article>
                            <span>연결 Page</span>
                            <strong>{metaState.connections.length.toLocaleString()}</strong>
                            <small>{metaState.configReady ? 'Meta 환경변수 확인됨' : '환경변수 설정 필요'}</small>
                        </article>
                        <article>
                            <span>활성 Form</span>
                            <strong>{metaEnabledForms.length.toLocaleString()}</strong>
                            <small>Webhook/백필 수집 대상</small>
                        </article>
                        <article>
                            <span>마지막 동기화</span>
                            <strong>{formatDateTime(metaLastSyncAt)}</strong>
                            <small>Webhook 또는 백필 기준</small>
                        </article>
                        <article className={metaErrorCount > 0 ? styles.metaSummaryError : undefined}>
                            <span>오류/주의</span>
                            <strong>{metaErrorCount.toLocaleString()}</strong>
                            <small>연결, Form, 최근 import 기준</small>
                        </article>
                    </div>

                    {metaState.connections.length === 0 ? (
                        <div className={styles.metaEmptyBox}>
                            <strong>연결된 Meta Page가 없습니다.</strong>
                            <p>회사 Meta 관리자 계정으로 로그인하면 접근 가능한 Page와 Lead Form을 가져옵니다.</p>
                            {canManageMeta && (
                                <button className={styles.primaryButton} onClick={startMetaConnect}>
                                    <Link2 size={15} />
                                    Meta 계정 연결
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className={styles.metaConnectionGrid}>
                            {metaState.connections.map(connection => (
                                <article key={connection.id} className={styles.metaConnectionCard}>
                                    <div>
                                        <span className={connection.status === 'connected' ? styles.metaStatusOk : styles.metaStatusWarn}>
                                            {connection.status === 'connected' ? '연결됨' : connection.status}
                                        </span>
                                        <h3>{connection.metaPageName || connection.metaPageId}</h3>
                                        <p>Page ID {connection.metaPageId}</p>
                                        {(connection.lastError || connection.subscribeError) && (
                                            <small className={styles.metaErrorText}>{connection.lastError || connection.subscribeError}</small>
                                        )}
                                    </div>
                                    {canManageMeta && (
                                        <button className={styles.textDangerButton} onClick={() => void disconnectMetaConnection(connection)}>
                                            연결 해제
                                        </button>
                                    )}
                                </article>
                            ))}
                        </div>
                    )}

                    {metaState.forms.length > 0 && (
                        <div className={styles.metaFormsList}>
                            {metaState.forms.map(form => {
                                const connection = metaState.connections.find(item => item.id === form.connectionId);
                                return (
                                    <article key={form.id} className={styles.metaFormCard}>
                                        <div className={styles.metaFormTop}>
                                            <div>
                                                <h3>{form.metaFormName || form.metaFormId}</h3>
                                                <p>{connection?.metaPageName || 'Meta Page'} · Form ID {form.metaFormId}</p>
                                                {form.lastError && <small className={styles.metaErrorText}>{form.lastError}</small>}
                                            </div>
                                            <label className={styles.switchLabel}>
                                                <input
                                                    type="checkbox"
                                                    checked={form.enabled}
                                                    disabled={!canManageMeta || savingMetaFormId === form.id}
                                                    onChange={(event) => void updateMetaForm(form, { enabled: event.target.checked })}
                                                />
                                                수집 활성화
                                            </label>
                                        </div>
                                        <div className={styles.metaFormControls}>
                                            <label>
                                                기본 담당자
                                                <select
                                                    value={form.defaultManagerId || ''}
                                                    disabled={!canManageMeta || savingMetaFormId === form.id}
                                                    onChange={(event) => void updateMetaForm(form, { defaultManagerId: event.target.value })}
                                                >
                                                    <option value="">담당자 선택</option>
                                                    {renderManagerOptions(form.defaultManagerId || undefined)}
                                                </select>
                                            </label>
                                            <button
                                                className={styles.secondaryButton}
                                                onClick={() => void syncMetaLeads(form.id)}
                                                disabled={!form.enabled || !canManageMeta || isMetaSyncing}
                                            >
                                                <RefreshCw size={14} />
                                                이 Form 동기화
                                            </button>
                                        </div>
                                        <div className={styles.metaMappingGrid}>
                                            {META_FIELD_LABELS.map(field => (
                                                <label key={field.key}>
                                                    {field.label}
                                                    <input
                                                        value={(form.fieldMapping?.[field.key] || []).join(', ')}
                                                        disabled={!canManageMeta || savingMetaFormId === form.id}
                                                        placeholder={field.hint}
                                                        onChange={(event) => updateMetaFieldMapping(form.id, field.key, event.target.value)}
                                                    />
                                                </label>
                                            ))}
                                        </div>
                                        <div className={styles.metaFormFooter}>
                                            <span>마지막 동기화: {formatDateTime(form.lastSyncedAt)}</span>
                                            {canManageMeta && (
                                                <button
                                                    className={styles.primaryButton}
                                                    onClick={() => void updateMetaForm(form, { fieldMapping: form.fieldMapping })}
                                                    disabled={savingMetaFormId === form.id}
                                                >
                                                    {savingMetaFormId === form.id ? '저장 중' : '매핑 저장'}
                                                </button>
                                            )}
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}

                    {metaState.imports.length > 0 && (
                        <div className={styles.metaImportLog}>
                            <h3>최근 수집 로그</h3>
                            {metaState.imports.slice(0, 6).map(item => (
                                <div key={item.id}>
                                    <span>{item.status}</span>
                                    <strong>{item.metaLeadId}</strong>
                                    <small>{item.errorMessage || formatDateTime(item.importedAt || item.receivedAt)}</small>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
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
                <div className={styles.modalBackdrop}>
                    <form className={styles.modalCard} onSubmit={submitLead} role="dialog" aria-modal="true" aria-labelledby="franchise-lead-modal-title">
                        <div className={styles.modalHeader}>
                            <div>
                                <h2 id="franchise-lead-modal-title">{form.id ? '가맹 희망자 수정' : '가맹 희망자 등록'}</h2>
                                <p>본사 모객 DB에 필요한 중요 정보만 빠르게 기록합니다.</p>
                            </div>
                            <button type="button" onClick={closeModal} className={styles.closeButton} aria-label={`${form.id ? '가맹 희망자 수정' : '가맹 희망자 등록'} 닫기`}>
                                <X size={20} strokeWidth={2.2} />
                            </button>
                        </div>

                        <div className={styles.formGrid}>
                            <label>
                                가맹 희망자명 *
                                <input value={form.name} onChange={(event) => setForm(prev => ({ ...prev, name: event.target.value }))} placeholder="홍길동" />
                            </label>
                            <label>
                                연락처
                                <input
                                    value={form.mobile}
                                    onChange={(event) => setForm(prev => ({ ...prev, mobile: formatLeadPhoneInput(event.target.value) }))}
                                    placeholder="010-0000-0000"
                                    inputMode="numeric"
                                    autoComplete="tel"
                                />
                            </label>
                            <label>
                                상태
                                <select value={form.status} onChange={(event) => setForm(prev => ({ ...prev, status: event.target.value as FranchiseLeadStatus }))}>
                                    {FRANCHISE_LEAD_STATUSES.map(status => (
                                        <option key={status} value={status}>{status}</option>
                                    ))}
                                </select>
                            </label>
                            <label>
                                등급
                                <select value={form.grade} onChange={(event) => setForm(prev => ({ ...prev, grade: event.target.value }))}>
                                    <option value="">미지정</option>
                                    {FRANCHISE_LEAD_GRADES.map(grade => (
                                        <option key={grade} value={grade}>{getFranchiseLeadGradeLabel(grade)}</option>
                                    ))}
                                </select>
                            </label>
                            <label>
                                유입경로
                                <select value={form.source} onChange={(event) => setForm(prev => ({ ...prev, source: event.target.value }))}>
                                    <option value="">미지정</option>
                                    {FRANCHISE_LEAD_SOURCES.map(source => (
                                        <option key={source} value={source}>{source}</option>
                                    ))}
                                </select>
                            </label>
                            <div className={styles.formField}>
                                <span>희망지역</span>
                                <LeadRegionMultiSelect
                                    value={form.desiredRegion}
                                    onChangeAction={(desiredRegion) => setForm(prev => ({ ...prev, desiredRegion }))}
                                />
                            </div>
                            <label>
                                예산 최소(만원)
                                <input value={form.budgetMin} onChange={(event) => setForm(prev => ({ ...prev, budgetMin: event.target.value }))} placeholder="10000" />
                            </label>
                            <label>
                                예산 최대(만원)
                                <input value={form.budgetMax} onChange={(event) => setForm(prev => ({ ...prev, budgetMax: event.target.value }))} placeholder="20000" />
                            </label>
                            <label>
                                관심브랜드
                                <input value={form.interestedBrand} onChange={(event) => setForm(prev => ({ ...prev, interestedBrand: event.target.value }))} placeholder="미카도" />
                            </label>
                            <label>
                                담당자
                                <select value={form.managerId} onChange={(event) => setForm(prev => ({ ...prev, managerId: event.target.value }))}>
                                    {renderManagerOptions(form.managerId)}
                                </select>
                            </label>
                            <label>
                                다음 연락일
                                <input type="datetime-local" value={form.nextContactAt} onChange={(event) => setForm(prev => ({ ...prev, nextContactAt: event.target.value }))} />
                            </label>
                        </div>

                        <label className={styles.memoLabel}>
                            메모
                            <textarea value={form.memo} onChange={(event) => setForm(prev => ({ ...prev, memo: event.target.value }))} placeholder="상담 내용, 관심 조건, 후속 액션을 기록하세요." />
                        </label>

                        <div className={styles.modalActions}>
                            <button type="button" className={styles.secondaryButton} onClick={closeModal}>취소</button>
                            <button type="submit" className={styles.primaryButton} disabled={isSaving}>
                                {isSaving ? '저장 중' : '저장'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {quickActivityLead && (
                <div className={styles.modalBackdrop}>
                    <form className={`${styles.modalCard} ${styles.quickModalCard}`} onSubmit={submitQuickActivity}>
                        <div className={styles.modalHeader}>
                            <div>
                                <h2>상담 이력 빠른 추가</h2>
                                <p>{quickActivityLead.name} · {quickActivityLead.mobile || '연락처 미입력'} · 담당자 {getManagerName(quickActivityLead.managerId)}</p>
                            </div>
                            <button type="button" onClick={closeQuickActivityModal} className={styles.closeButton} aria-label="빠른 활동 기록 닫기">
                                <X size={20} strokeWidth={2.2} />
                            </button>
                        </div>
                        <div className={styles.quickActivityBody}>
                            <label>
                                이력 유형
                                <select value={quickActivityType} onChange={(event) => setQuickActivityType(event.target.value as LeadActivityType)}>
                                    {ACTIVITY_TYPES.filter(type => type !== '상태변경' && type !== '고객전환').map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </label>
                            <label>
                                상담 내용
                                <textarea
                                    value={quickActivityContent}
                                    onChange={(event) => setQuickActivityContent(event.target.value)}
                                    placeholder="통화 결과, 고객 반응, 다음 액션을 짧게 기록하세요."
                                    autoFocus
                                />
                            </label>
                        </div>
                        <div className={styles.modalActions}>
                            <button type="button" className={styles.secondaryButton} onClick={closeQuickActivityModal} disabled={isQuickSaving}>취소</button>
                            <button type="submit" className={styles.primaryButton} disabled={isQuickSaving}>
                                {isQuickSaving ? '저장 중' : '이력 추가'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {selectedLead && (
                <div className={styles.detailBackdrop} onClick={closeLeadDetail}>
                    <aside
                        className={`${styles.detailPanel} ${selectedLeadDetailMode === 'contractChecklist' ? styles.contractChecklistOnlyPanel : ''}`}
                        onClick={(event) => event.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="franchise-lead-detail-title"
                    >
                        <div className={styles.detailHeader}>
                            <div>
                                <span className={styles.detailEyebrow}>{selectedLeadDetailMode === 'contractChecklist' ? '계약 전 체크' : '가맹 희망자 상세'}</span>
                                <h2 id="franchise-lead-detail-title">{selectedLead.name}</h2>
                                <p>{selectedLead.mobile || '연락처 미입력'} · {selectedLead.source || '유입 미지정'} · 담당자 {getManagerName(selectedLead.managerId)}</p>
                            </div>
                            <button
                                className={styles.closeButton}
                                onClick={closeLeadDetail}
                                aria-label={selectedLeadDetailMode === 'contractChecklist' ? '계약 전 체크 패널 닫기' : '상세 패널 닫기'}
                            >
                                <X size={20} strokeWidth={2.2} />
                            </button>
                        </div>

                        {selectedLeadDetailMode === 'contractChecklist' ? (
                            <div className={styles.contractChecklistOnlyContent}>
                                <LeadContractChecklistSection
                                    leadId={selectedLead.id}
                                    userId={userId}
                                    onSaved={markContractChecklistSaved}
                                />
                            </div>
                        ) : (
                            <>
                        {selectedLead.convertedCustomerId && (
                            <div className={styles.convertedNotice}>
                                <CheckCircle2 size={16} />
                                <div>
                                    <strong>고객 DB 전환 완료</strong>
                                    <span>{selectedLead.convertedCustomerName || selectedLead.name} · {formatFullDateTime(selectedLead.convertedAt)}</span>
                                </div>
                            </div>
                        )}

                        <div className={styles.detailQuickActions}>
                            {isRawIntakeLead(selectedLead) && (
                                <button className={styles.promoteButtonLarge} onClick={() => void promoteLeadToCandidate(selectedLead)}>
                                    가맹 희망자 승격
                                </button>
                            )}
                            <select
                                value={selectedLead.status}
                                onChange={(event) => void updateLeadStatus(selectedLead, event.target.value as FranchiseLeadStatus)}
                            >
                                {FRANCHISE_LEAD_STATUSES.map(status => (
                                    <option key={status} value={status}>{status}</option>
                                ))}
                            </select>
                            <button className={styles.secondaryButton} onClick={() => openEditModal(selectedLead)}>
                                <Pencil size={15} />
                                기본정보 수정
                            </button>
                            <button
                                className={selectedLead.convertedCustomerId ? styles.secondaryButtonSuccess : styles.primaryButton}
                                onClick={() => void convertLeadToCustomer(selectedLead)}
                                disabled={Boolean(selectedLead.convertedCustomerId) || convertingLeadId === selectedLead.id}
                            >
                                <UserCheck size={15} />
                                {selectedLead.convertedCustomerId ? '전환완료' : '고객 전환'}
                            </button>
                        </div>

                        <div className={styles.detailContentGrid}>
                            <section className={styles.detailSection}>
                                <h3><UserRound size={16} /> 기본정보</h3>
                                <div className={styles.detailInfoGrid}>
                                    <div>
                                        <span>단계</span>
                                        <strong>{getFranchiseLeadStageLabel(selectedLead.leadStage)}</strong>
                                    </div>
                                    <div>
                                        <span>우선순위</span>
                                        <strong>{getFranchiseLeadGradeLabel(selectedLead.grade)}</strong>
                                    </div>
                                    <div>
                                        <span>희망지역</span>
                                        <strong>{selectedLead.desiredRegion || '-'}</strong>
                                    </div>
                                    <div>
                                        <span>담당자</span>
                                        <strong>{getManagerName(selectedLead.managerId)}</strong>
                                    </div>
                                    <div>
                                        <span>예산</span>
                                        <strong>{formatBudget(selectedLead.budgetMin, selectedLead.budgetMax)}</strong>
                                    </div>
                                    <div>
                                        <span>관심브랜드</span>
                                        <strong>{selectedLead.interestedBrand || '-'}</strong>
                                    </div>
                                </div>
                                <div className={styles.detailMemo}>
                                    <span>메모</span>
                                    <p>{selectedLead.memo || '등록된 메모가 없습니다.'}</p>
                                </div>
                            </section>

                            <section className={styles.detailSection}>
                                <h3><CalendarClock size={16} /> 다음 연락</h3>
                                <div className={styles.nextContactBox}>
                                    <input
                                        type="datetime-local"
                                        value={detailNextContactAt}
                                        onChange={(event) => setDetailNextContactAt(event.target.value)}
                                    />
                                    <button className={styles.primaryButton} onClick={() => void saveDetailNextContact()}>
                                        저장
                                    </button>
                                </div>
                                <p className={styles.detailHint}>
                                    현재: {formatFullDateTime(selectedLead.nextContactAt)}
                                    {isPastDue(selectedLead.nextContactAt) ? ' · 연락 지연' : isDueToday(selectedLead.nextContactAt) ? ' · 오늘 연락' : ''}
                                </p>
                            </section>

                            <LeadWorkflowSection
                                value={detailWorkflow}
                                isSaving={isWorkflowSaving}
                                onChange={setDetailWorkflow}
                                onSave={() => void saveDetailWorkflow()}
                            />

                            <LeadDisclosureSection
                                leadId={selectedLead.id}
                                userId={userId}
                                companyId={selectedLead.companyId}
                                companyName={selectedLead.companyName || companyName}
                                leadName={selectedLead.name}
                                leadContact={selectedLead.mobile}
                                interestedBrand={selectedLead.interestedBrand}
                                onEligibilityChange={setSelectedDisclosureEligibility}
                            />

                            <LeadContractChecklistSection
                                leadId={selectedLead.id}
                                userId={userId}
                                onSaved={markContractChecklistSaved}
                            />

                            <LeadLocationLinkSection
                                links={selectedLeadLocationLinks}
                                locations={franchiseLocations}
                                externalListings={externalListings}
                                isLoading={isLocationMatchLoading}
                                isSaving={isLocationLinkSaving}
                                onAddLinkAction={(targetType, targetId) => void addLocationLink(targetType, targetId)}
                                onUpdateLinkAction={(linkId, patch) => void updateLocationLink(linkId, patch)}
                                onRemoveLinkAction={(linkId) => void removeLocationLink(linkId)}
                            />

                            <section className={styles.detailSection}>
                                <h3><MessageSquare size={16} /> 상담 이력</h3>
                                <div className={styles.activityComposer}>
                                    <select value={activityType} onChange={(event) => setActivityType(event.target.value as LeadActivityType)}>
                                        {ACTIVITY_TYPES.map(type => (
                                            <option key={type} value={type}>{type}</option>
                                        ))}
                                    </select>
                                    <textarea
                                        value={activityContent}
                                        onChange={(event) => setActivityContent(event.target.value)}
                                        placeholder="상담 내용, 고객 반응, 다음 액션을 기록하세요."
                                    />
                                    <button className={styles.primaryButton} onClick={() => void addLeadActivity()}>
                                        이력 추가
                                    </button>
                                </div>
                                <div className={styles.timeline}>
                                    {(selectedLead.activityLog || []).length === 0 ? (
                                        <div className={styles.emptyTimeline}>아직 상담 이력이 없습니다.</div>
                                    ) : (
                                        (selectedLead.activityLog || []).map(activity => (
                                            <article key={activity.id} className={styles.timelineItem}>
                                                <div>
                                                    <span>{activity.type}</span>
                                                    <time>{formatFullDateTime(activity.createdAt)}</time>
                                                </div>
                                                <p>{activity.content}</p>
                                                <small>{activity.createdBy || '담당자 미상'}</small>
                                            </article>
                                        ))
                                    )}
                                </div>
                            </section>

                            <section className={styles.detailSection}>
                                <h3><Link2 size={16} /> 기존 DB 연결</h3>
                                <div className={styles.linkSummary}>
                                    <span>{selectedLead.convertedCustomerId ? `전환: ${selectedLead.convertedCustomerName || selectedLead.convertedCustomerId}` : '고객 전환 전'}</span>
                                    <span>{selectedLead.linkedCustomerId ? `고객: ${selectedLead.linkedCustomerName || selectedLead.linkedCustomerId}` : '고객 미연결'}</span>
                                    <span>{selectedLead.linkedBusinessCardId ? `명함: ${selectedLead.linkedBusinessCardName || selectedLead.linkedBusinessCardId}` : '명함 미연결'}</span>
                                </div>
                                <div className={`${styles.conversionBox} ${selectedLead.convertedCustomerId ? styles.conversionBoxDone : ''}`}>
                                    <div>
                                        <strong>{selectedLead.convertedCustomerId ? '고객 DB 전환 완료' : '이 리드를 고객 DB로 전환'}</strong>
                                        <p>
                                            {selectedLead.convertedCustomerId
                                                ? `${formatFullDateTime(selectedLead.convertedAt)} 전환되었습니다.`
                                                : selectedLead.linkedCustomerId
                                                    ? '이미 연결된 고객을 전환 완료로 표시합니다.'
                                                    : '같은 연락처 고객이 있으면 연결하고, 없으면 새 고객을 생성합니다.'}
                                        </p>
                                    </div>
                                    <button
                                        className={selectedLead.convertedCustomerId ? styles.secondaryButtonSuccess : styles.primaryButton}
                                        onClick={() => void convertLeadToCustomer(selectedLead)}
                                        disabled={Boolean(selectedLead.convertedCustomerId) || convertingLeadId === selectedLead.id}
                                    >
                                        <UserCheck size={14} />
                                        {selectedLead.convertedCustomerId ? '완료됨' : '전환 실행'}
                                    </button>
                                </div>

                                <div className={styles.relatedGrid}>
                                    <div className={styles.relatedColumn}>
                                        <h4><UserRound size={14} /> 고객 후보</h4>
                                        {isRelatedLoading ? (
                                            <p>검색 중...</p>
                                        ) : relatedCustomers.length === 0 ? (
                                            <p>같은 연락처의 고객이 없습니다.</p>
                                        ) : relatedCustomers.map(customer => (
                                            <article key={customer.id} className={styles.relatedItem}>
                                                <div>
                                                    <strong>{customer.name}</strong>
                                                    <span>{customer.mobile || customer.companyPhone || '-'}</span>
                                                </div>
                                                <button onClick={() => void linkRelatedCustomer(customer)}>
                                                    연결
                                                </button>
                                            </article>
                                        ))}
                                    </div>
                                    <div className={styles.relatedColumn}>
                                        <h4><BriefcaseBusiness size={14} /> 명함 후보</h4>
                                        {isRelatedLoading ? (
                                            <p>검색 중...</p>
                                        ) : relatedCards.length === 0 ? (
                                            <p>같은 연락처의 명함이 없습니다.</p>
                                        ) : relatedCards.map(card => (
                                            <article key={card.id} className={styles.relatedItem}>
                                                <div>
                                                    <strong>{card.name}</strong>
                                                    <span>{card.companyName || card.mobile || '-'}</span>
                                                </div>
                                                <button onClick={() => void linkRelatedCard(card)}>
                                                    연결
                                                </button>
                                            </article>
                                        ))}
                                    </div>
                                </div>
                            </section>
                        </div>
                            </>
                        )}
                    </aside>
                </div>
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
