"use client";

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';
import {
    ArrowLeft,
    ArrowRight,
    BriefcaseBusiness,
    CalendarClock,
    CheckCircle2,
    Columns3,
    Download,
    FileSpreadsheet,
    ListChecks,
    Link2,
    MessageSquare,
    Pencil,
    Plus,
    RefreshCw,
    Search,
    SlidersHorizontal,
    Table2,
    Trash2,
    Upload,
    UserCheck,
    UserRound,
    X
} from 'lucide-react';
import { AlertModal } from '@/components/common/AlertModal';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import {
    DEFAULT_FRANCHISE_LEAD_STATUS,
    FRANCHISE_LEAD_GRADES,
    FRANCHISE_LEAD_SOURCES,
    FRANCHISE_LEAD_STATUSES,
    FranchiseLeadStatus,
    normalizeLeadPhone
} from '@/lib/franchise-leads';
import { readApiError, unwrapApiData } from '@/utils/apiResponse';
import styles from './page.module.css';

type FranchiseLead = {
    id: string;
    companyId?: string;
    managerId?: string;
    name: string;
    mobile: string;
    mobileNormalized?: string;
    source: string;
    status: FranchiseLeadStatus;
    grade: string;
    desiredRegion: string;
    budgetMin: number | null;
    budgetMax: number | null;
    interestedBrand: string;
    memo: string;
    nextContactAt: string | null;
    lastContactedAt: string | null;
    createdAt: string;
    updatedAt: string;
    activityLog?: LeadActivity[];
    linkedCustomerId?: string;
    linkedCustomerName?: string;
    linkedBusinessCardId?: string;
    linkedBusinessCardName?: string;
    sourceType?: string;
    sourceId?: string;
    companyName?: string;
    convertedCustomerId?: string;
    convertedCustomerName?: string;
    convertedAt?: string;
};

type LeadActivityType = '전화' | '문자' | '방문상담' | '계약검토' | '메모' | '상태변경' | '고객전환';

type LeadActivity = {
    id: string;
    type: LeadActivityType;
    content: string;
    createdAt: string;
    createdBy?: string;
};

type RelatedCustomer = {
    id: string;
    name: string;
    mobile?: string;
    companyPhone?: string;
    wantedArea?: string;
    memoInterest?: string;
};

type RelatedBusinessCard = {
    id: string;
    name: string;
    companyName?: string;
    mobile?: string;
    companyPhone1?: string;
    memo?: string;
};

type LeadSummary = {
    total: number;
    byStatus: Record<string, number>;
    bySource: Record<string, number>;
    hotCount: number;
    nextContactCount: number;
    createdByDate: Record<string, number>;
};

type LeadListResponse = {
    leads: FranchiseLead[];
    summary: LeadSummary;
    total: number;
};

type AuthUser = {
    id?: string;
    uid?: string;
    name?: string;
    role?: string;
    companyName?: string;
    companyId?: string | null;
};

type ManagerOption = {
    id: string;
    uuid?: string;
    name?: string;
    companyName?: string;
    companyId?: string | null;
    role?: string;
};

type MetaFieldMapping = {
    name: string[];
    mobile: string[];
    desiredRegion: string[];
    budget: string[];
    budgetMin: string[];
    budgetMax: string[];
    interestedBrand: string[];
    memo: string[];
};

type MetaConnection = {
    id: string;
    companyId: string;
    connectedBy?: string;
    metaPageId: string;
    metaPageName: string;
    status: string;
    lastSyncAt?: string | null;
    lastWebhookAt?: string | null;
    lastError?: string | null;
    pageCategory?: string;
    subscribeError?: string;
};

type MetaLeadForm = {
    id: string;
    companyId: string;
    connectionId: string;
    metaFormId: string;
    metaFormName: string;
    enabled: boolean;
    defaultManagerId?: string | null;
    fieldMapping: MetaFieldMapping;
    lastSyncedAt?: string | null;
    lastError?: string | null;
};

type MetaLeadImportLog = {
    id: string;
    metaLeadId: string;
    franchiseLeadId?: string | null;
    status: string;
    errorMessage?: string | null;
    receivedAt?: string | null;
    importedAt?: string | null;
};

type MetaIntegrationState = {
    connections: MetaConnection[];
    forms: MetaLeadForm[];
    imports: MetaLeadImportLog[];
    configReady: boolean;
};

type LeadFormState = {
    id?: string;
    name: string;
    mobile: string;
    source: string;
    status: FranchiseLeadStatus;
    grade: string;
    desiredRegion: string;
    budgetMin: string;
    budgetMax: string;
    interestedBrand: string;
    managerId: string;
    nextContactAt: string;
    memo: string;
};

type LeadViewMode = 'table' | 'pipeline' | 'tasks';

type UploadErrorRow = {
    row: number;
    reason: string;
    data?: Record<string, any>;
};

const EMPTY_FORM: LeadFormState = {
    name: '',
    mobile: '',
    source: '',
    status: DEFAULT_FRANCHISE_LEAD_STATUS,
    grade: '',
    desiredRegion: '',
    budgetMin: '',
    budgetMax: '',
    interestedBrand: '',
    managerId: '',
    nextContactAt: '',
    memo: ''
};

const ACTIVITY_TYPES: LeadActivityType[] = ['전화', '문자', '방문상담', '계약검토', '메모', '상태변경', '고객전환'];
const SOURCE_FILTER_OPTIONS = ['전체', ...FRANCHISE_LEAD_SOURCES] as const;
const RANGE_OPTIONS = ['7D', '30D', '3M', '전체'] as const;
const PAGE_SIZE_OPTIONS = [50, 100, 200] as const;
const EMPTY_META_STATE: MetaIntegrationState = {
    connections: [],
    forms: [],
    imports: [],
    configReady: false
};
const META_FIELD_LABELS: Array<{ key: keyof MetaFieldMapping; label: string; hint: string }> = [
    { key: 'name', label: '이름', hint: 'full_name, 이름, 성명' },
    { key: 'mobile', label: '연락처', hint: 'phone_number, 연락처, 휴대폰' },
    { key: 'desiredRegion', label: '희망지역', hint: '희망지역, 지역, area' },
    { key: 'budget', label: '예산 통합', hint: '예산, 창업예산' },
    { key: 'budgetMin', label: '예산 최소', hint: 'budget_min, 예산최소' },
    { key: 'budgetMax', label: '예산 최대', hint: 'budget_max, 예산최대' },
    { key: 'interestedBrand', label: '관심브랜드', hint: 'brand, 관심브랜드' },
    { key: 'memo', label: '메모', hint: 'memo, 문의내용, 비고' }
];
const VIEW_OPTIONS: Array<{ mode: LeadViewMode; label: string; description: string }> = [
    { mode: 'table', label: '테이블', description: '전체 필드 중심으로 확인' },
    { mode: 'pipeline', label: '파이프라인', description: '상태별 상담 흐름 관리' },
    { mode: 'tasks', label: '오늘 할 일', description: '오늘/지연 연락 우선 처리' }
];

function createEmptySummary(): LeadSummary {
    return {
        total: 0,
        byStatus: FRANCHISE_LEAD_STATUSES.reduce<Record<string, number>>((acc, status) => {
            acc[status] = 0;
            return acc;
        }, {}),
        bySource: {},
        hotCount: 0,
        nextContactCount: 0,
        createdByDate: {}
    };
}

function toDateInputValue(date: Date) {
    return date.toISOString().slice(0, 10);
}

function buildDateFromRange(range: typeof RANGE_OPTIONS[number]) {
    if (range === '전체') return '';
    const days = range === '7D' ? 7 : range === '30D' ? 30 : 90;
    const date = new Date();
    date.setDate(date.getDate() - days + 1);
    return toDateInputValue(date);
}

function formatDate(value?: string | null) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' });
}

function formatDateTime(value?: string | null) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function formatFullDateTime(value?: string | null) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatBudgetValue(value: number | null | undefined) {
    const manwonValue = toBudgetManwonValue(value);
    if (manwonValue === null) return '';
    return `${new Intl.NumberFormat('ko-KR').format(manwonValue)}만원`;
}

function formatBudget(min: number | null, max: number | null) {
    const minText = formatBudgetValue(min);
    const maxText = formatBudgetValue(max);
    if (!minText && !maxText) return '-';
    if (minText && maxText) return `${minText} ~ ${maxText}`;
    return minText || maxText;
}

function toBudgetManwonValue(value: number | null | undefined) {
    if (value === null || value === undefined) return null;
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return null;
    if (Math.abs(numericValue) > 0 && Math.abs(numericValue) < 1_000_000) {
        return Math.round(numericValue);
    }
    return Math.round(numericValue / 10_000);
}

function toBudgetInputValue(value: number | null | undefined) {
    const manwonValue = toBudgetManwonValue(value);
    return manwonValue === null ? '' : String(manwonValue);
}

function parseBudgetInputToWon(value: string) {
    const normalized = value.replace(/,/g, '').trim();
    if (!normalized) return null;
    const parsed = Number(normalized.replace(/[^\d.-]/g, ''));
    if (!Number.isFinite(parsed)) return null;
    return Math.abs(parsed) >= 1_000_000 ? parsed : parsed * 10_000;
}

function toCustomerBudgetValue(value: number | null | undefined) {
    const manwonValue = toBudgetManwonValue(value);
    return manwonValue === null ? '' : String(manwonValue);
}

function toDatetimeLocalValue(value?: string | null) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function isPastDue(value?: string | null) {
    if (!value) return false;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return false;
    return date.getTime() < Date.now();
}

function isDueToday(value?: string | null) {
    if (!value) return false;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return false;
    const today = new Date();
    return date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate();
}

function isContactActionDue(value?: string | null) {
    return isPastDue(value) || isDueToday(value);
}

function createActivityId() {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getStatusIndex(status: FranchiseLeadStatus) {
    return FRANCHISE_LEAD_STATUSES.findIndex(item => item === status);
}

function getAdjacentStatus(status: FranchiseLeadStatus, direction: 'prev' | 'next') {
    const index = getStatusIndex(status);
    if (index < 0) return null;
    const nextIndex = direction === 'next' ? index + 1 : index - 1;
    return FRANCHISE_LEAD_STATUSES[nextIndex] || null;
}

function mapLeadStatusToCustomerStatus(status: FranchiseLeadStatus) {
    if (status === '계약완료') return '계약완료';
    if (status === '계약예정') return '계약진행';
    if (status === '보류/이탈') return '계약보류';
    if (status === '문의접수') return '물건문의';
    return '물건진행';
}

function mapLeadGradeToCustomerGrade(grade: string) {
    if (grade === 'COLD') return 'manage';
    if (grade === 'HOT' || grade === 'WARM') return 'progress';
    return 'progress';
}

function mapLeadGradeToCustomerClass(grade: string) {
    if (grade === 'HOT') return 'A';
    if (grade === 'WARM') return 'B';
    if (grade === 'COLD') return 'C';
    return 'A';
}

function getLeadTaskLabel(lead: FranchiseLead) {
    if (isPastDue(lead.nextContactAt)) return '연락 지연';
    if (isDueToday(lead.nextContactAt)) return '오늘 연락';
    if (lead.grade === 'HOT') return 'HOT 리드';
    return '후속 관리';
}

function getLeadTaskRank(lead: FranchiseLead) {
    if (isPastDue(lead.nextContactAt)) return 0;
    if (isDueToday(lead.nextContactAt)) return 1;
    if (lead.grade === 'HOT') return 2;
    return 3;
}

function buildTrendData(summary: LeadSummary) {
    const items = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const key = toDateInputValue(date);
        items.push({
            date: key.slice(5),
            count: summary.createdByDate[key] || 0
        });
    }
    return items;
}

function createFormFromLead(lead: FranchiseLead): LeadFormState {
    return {
        id: lead.id,
        name: lead.name || '',
        mobile: lead.mobile || '',
        source: lead.source || '',
        status: lead.status || DEFAULT_FRANCHISE_LEAD_STATUS,
        grade: lead.grade || '',
        desiredRegion: lead.desiredRegion || '',
        budgetMin: toBudgetInputValue(lead.budgetMin),
        budgetMax: toBudgetInputValue(lead.budgetMax),
        interestedBrand: lead.interestedBrand || '',
        managerId: lead.managerId || '',
        nextContactAt: toDatetimeLocalValue(lead.nextContactAt),
        memo: lead.memo || ''
    };
}

export default function FranchiseLeadsPage() {
    const router = useRouter();
    const [user, setUser] = React.useState<AuthUser | null>(null);
    const [userId, setUserId] = React.useState('');
    const [companyName, setCompanyName] = React.useState('');
    const [leads, setLeads] = React.useState<FranchiseLead[]>([]);
    const [summary, setSummary] = React.useState<LeadSummary>(createEmptySummary);
    const [total, setTotal] = React.useState(0);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSaving, setIsSaving] = React.useState(false);
    const [isUploading, setIsUploading] = React.useState(false);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState<'전체' | FranchiseLeadStatus>('전체');
    const [sourceFilter, setSourceFilter] = React.useState<typeof SOURCE_FILTER_OPTIONS[number]>('전체');
    const [managerFilter, setManagerFilter] = React.useState('전체');
    const [range, setRange] = React.useState<typeof RANGE_OPTIONS[number]>('30D');
    const [viewMode, setViewMode] = React.useState<LeadViewMode>('table');
    const [pageSize, setPageSize] = React.useState<typeof PAGE_SIZE_OPTIONS[number]>(50);
    const [currentPage, setCurrentPage] = React.useState(1);
    const [createdFrom, setCreatedFrom] = React.useState(() => buildDateFromRange('30D'));
    const [createdTo, setCreatedTo] = React.useState('');
    const [selectedLeadId, setSelectedLeadId] = React.useState('');
    const [selectedLeadIds, setSelectedLeadIds] = React.useState<string[]>([]);
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
    const [managerOptions, setManagerOptions] = React.useState<ManagerOption[]>([]);
    const [managerMap, setManagerMap] = React.useState<Record<string, string>>({});
    const [uploadErrors, setUploadErrors] = React.useState<UploadErrorRow[]>([]);
    const [isRelatedLoading, setIsRelatedLoading] = React.useState(false);
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
            setLeads(data.leads || []);
            setSummary(data.summary || createEmptySummary());
            setTotal(data.total || 0);
        } catch (error) {
            console.error(error);
            setLeads([]);
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
        setCurrentPage(1);
    }, [createdFrom, createdTo, managerFilter, pageSize, searchTerm, sourceFilter, statusFilter]);

    React.useEffect(() => {
        setSelectedLeadIds([]);
    }, [createdFrom, createdTo, currentPage, managerFilter, pageSize, searchTerm, sourceFilter, statusFilter]);

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
            setRelatedCustomers([]);
            setRelatedCards([]);
            return;
        }

        setDetailNextContactAt(toDatetimeLocalValue(selectedLead.nextContactAt));
    }, [selectedLead]);

    React.useEffect(() => {
        if (!selectedLead || !userId) return;

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
    }, [companyName, selectedLead, userId]);

    const stageData = FRANCHISE_LEAD_STATUSES.map(status => ({
        status,
        count: summary.byStatus?.[status] || 0
    }));
    const maxStageCount = Math.max(1, ...stageData.map(item => item.count));
    const sourceChartData = Object.entries(summary.bySource || {})
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);
    const metaEnabledForms = metaState.forms.filter(form => form.enabled);
    const metaErrorCount = metaState.connections.filter(connection => connection.lastError || connection.subscribeError).length +
        metaState.forms.filter(form => form.lastError).length +
        metaState.imports.filter(item => item.status === 'error').length;
    const metaLastSyncAt = [
        ...metaState.connections.map(connection => connection.lastSyncAt || connection.lastWebhookAt || ''),
        ...metaState.forms.map(form => form.lastSyncedAt || '')
    ].filter(Boolean).sort().at(-1) || null;
    const canManageMeta = user?.role === 'admin' || user?.role === 'manager';
    const trendData = buildTrendData(summary);
    const contractReadyCount = (summary.byStatus?.['계약예정'] || 0) + (summary.byStatus?.['계약완료'] || 0);
    const conversionRate = summary.total > 0 ? Math.round((contractReadyCount / summary.total) * 1000) / 10 : 0;
    const activeFollowupLeads = leads.filter(lead => !lead.convertedCustomerId && lead.status !== '계약완료' && lead.status !== '보류/이탈');
    const dueContactCount = activeFollowupLeads.filter(lead => isContactActionDue(lead.nextContactAt)).length;
    const overdueContactCount = activeFollowupLeads.filter(lead => isPastDue(lead.nextContactAt)).length;
    const pipelineColumns = FRANCHISE_LEAD_STATUSES.map(status => ({
        status,
        leads: leads.filter(lead => lead.status === status)
    }));
    const taskLeads = [...activeFollowupLeads]
        .filter(lead => isContactActionDue(lead.nextContactAt) || lead.grade === 'HOT')
        .sort((a, b) => {
            const rankDiff = getLeadTaskRank(a) - getLeadTaskRank(b);
            if (rankDiff !== 0) return rankDiff;
            const aTime = a.nextContactAt ? new Date(a.nextContactAt).getTime() : Number.MAX_SAFE_INTEGER;
            const bTime = b.nextContactAt ? new Date(b.nextContactAt).getTime() : Number.MAX_SAFE_INTEGER;
            return aTime - bTime;
        });
    const listPolicyText = searchTerm.trim()
        ? `검색 중에는 전체 데이터 범위에서 찾고, 화면에는 ${pageSize}건씩 표시합니다.`
        : `기본 조회: 최신 500건 · 화면 표시: ${pageSize}건씩 · 검색 시 전체 범위 조회`;
    const totalPages = Math.max(1, Math.ceil(leads.length / pageSize));
    const safeCurrentPage = Math.min(currentPage, totalPages);
    const pageStartIndex = leads.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize;
    const pageEndIndex = Math.min(pageStartIndex + pageSize, leads.length);
    const paginatedLeads = React.useMemo(
        () => leads.slice(pageStartIndex, pageEndIndex),
        [leads, pageEndIndex, pageStartIndex]
    );
    const selectedLeadSet = React.useMemo(() => new Set(selectedLeadIds), [selectedLeadIds]);
    const selectedLeads = React.useMemo(
        () => paginatedLeads.filter(lead => selectedLeadSet.has(lead.id)),
        [paginatedLeads, selectedLeadSet]
    );
    const allVisibleSelected = paginatedLeads.length > 0 && paginatedLeads.every(lead => selectedLeadSet.has(lead.id));
    const pageRangeText = leads.length === 0
        ? '0건 표시'
        : `전체 ${leads.length.toLocaleString()}건 중 ${(pageStartIndex + 1).toLocaleString()}-${pageEndIndex.toLocaleString()}건 표시`;

    React.useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const getManagerName = (managerId?: string) => {
        if (!managerId) return '-';
        return managerMap[managerId] || managerId;
    };

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

    const isMyManagerFilterActive = Boolean(defaultManagerId && managerFilter === defaultManagerId);

    const toggleMyLeadsOnly = () => {
        if (!defaultManagerId) return;
        setManagerFilter(prev => prev === defaultManagerId ? '전체' : defaultManagerId);
    };

    const toggleSelectAllVisible = (checked: boolean) => {
        setSelectedLeadIds(checked ? paginatedLeads.map(lead => lead.id) : []);
    };

    const toggleSelectLead = (leadId: string, checked: boolean) => {
        setSelectedLeadIds(prev => {
            if (checked) return prev.includes(leadId) ? prev : [...prev, leadId];
            return prev.filter(id => id !== leadId);
        });
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
            showAlert('Meta 연결을 해제했습니다. 기존 후보자 데이터는 유지됩니다.', 'success', '연결 해제');
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
        setForm(createFormFromLead(lead));
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
            showAlert('후보자명을 입력해주세요.', 'error');
            return;
        }

        setIsSaving(true);
        try {
            const body = {
                ...form,
                requesterId: userId,
                companyName,
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
                data.deduplicated ? '같은 연락처의 기존 후보자를 업데이트했습니다.' : '모객 DB가 저장되었습니다.',
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
            showAlert('변경할 후보자를 선택해주세요.', 'error', '일괄 변경 실패');
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
            content: '오늘 할 일에서 연락 완료 처리',
            createdAt: now,
            createdBy: user?.name || userId
        };

        try {
            await updateLeadWithPatch(lead, {
                lastContactedAt: now,
                nextContactAt: null,
                activityLog: [nextActivity, ...(lead.activityLog || [])]
            });
            showAlert('오늘 연락 완료로 처리했습니다. 다음 연락일이 필요하면 상세 패널에서 다시 지정하세요.', 'success', '처리 완료');
        } catch (error) {
            console.error(error);
            showAlert(error instanceof Error ? error.message : '오늘 할 일 처리에 실패했습니다.', 'error', '처리 실패');
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
            showAlert('후보자가 삭제되었습니다.', 'success', '삭제 완료');
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
                등급: 'HOT',
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
            <section className={styles.hero}>
                <div>
                    <h1>모객 DB</h1>
                    <p>가맹 희망자 유입부터 상담, 검토, 계약 전환까지 본사에서 한눈에 관리합니다.</p>
                </div>
                <div className={styles.heroActions}>
                    <button
                        className={styles.secondaryButton}
                        onClick={() => {
                            void fetchLeads();
                        }}
                        disabled={isLoading}
                    >
                        <RefreshCw size={16} />
                        새로고침
                    </button>
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
                        후보자 등록
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
                </div>
            </section>

            <nav className={styles.franchiseTabs} aria-label="모객 DB 하위 메뉴">
                <Link href="/dashboard/franchise-leads" className={styles.franchiseTabActive}>
                    후보자 관리
                </Link>
                <Link href="/dashboard/franchise-leads/market-insights">
                    출점 후보지
                </Link>
            </nav>

            <section className={styles.toolbar}>
                <div className={styles.rangeGroup} aria-label="기간 필터">
                    {RANGE_OPTIONS.map(option => (
                        <button
                            key={option}
                            className={range === option ? styles.rangeButtonActive : styles.rangeButton}
                            onClick={() => handleRangeClick(option)}
                        >
                            {option}
                        </button>
                    ))}
                </div>
                <div className={styles.searchBox}>
                    <Search size={16} />
                    <input
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="이름, 연락처, 브랜드, 지역, 메모 검색"
                    />
                    {searchTerm && (
                        <button onClick={() => setSearchTerm('')} aria-label="검색어 지우기">
                            <X size={14} />
                        </button>
                    )}
                </div>
                <div className={styles.filterGroup}>
                    <SlidersHorizontal size={16} />
                    <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as '전체' | FranchiseLeadStatus)}>
                        <option value="전체">전체 상태</option>
                        {FRANCHISE_LEAD_STATUSES.map(status => (
                            <option key={status} value={status}>{status}</option>
                        ))}
                    </select>
                    <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value as typeof SOURCE_FILTER_OPTIONS[number])}>
                        {SOURCE_FILTER_OPTIONS.map(source => (
                            <option key={source} value={source}>{source === '전체' ? '전체 유입' : source}</option>
                        ))}
                    </select>
                    <select value={managerFilter} onChange={(event) => setManagerFilter(event.target.value)}>
                        <option value="전체">전체 담당자</option>
                        {renderManagerOptions()}
                    </select>
                    <button
                        type="button"
                        className={isMyManagerFilterActive ? styles.quickFilterButtonActive : styles.quickFilterButton}
                        onClick={toggleMyLeadsOnly}
                        disabled={!defaultManagerId}
                    >
                        <UserRound size={14} />
                        내 담당만
                    </button>
                    <input
                        type="date"
                        value={createdFrom}
                        onChange={(event) => {
                            setRange('전체');
                            setCreatedFrom(event.target.value);
                        }}
                    />
                    <input
                        type="date"
                        value={createdTo}
                        onChange={(event) => {
                            setRange('전체');
                            setCreatedTo(event.target.value);
                        }}
                    />
                </div>
            </section>

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

            <section className={styles.kpiGrid}>
                <article className={styles.kpiCard}>
                    <span>총 후보자</span>
                    <strong>{summary.total.toLocaleString()}</strong>
                    <small>현재 조건 기준 {total.toLocaleString()}건</small>
                </article>
                <article className={styles.kpiCard}>
                    <span>상담 진행</span>
                    <strong>{((summary.byStatus?.['상담중'] || 0) + (summary.byStatus?.['가맹검토'] || 0)).toLocaleString()}</strong>
                    <small>상담중 + 가맹검토</small>
                </article>
                <article className={styles.kpiCardAccent}>
                    <span>오늘 연락</span>
                    <strong>{dueContactCount.toLocaleString()}</strong>
                    <small>오늘이거나 이미 지난 연락</small>
                </article>
                <article className={styles.kpiCard}>
                    <span>연락 지연</span>
                    <strong>{overdueContactCount.toLocaleString()}</strong>
                    <small>다음 연락일이 지난 후보</small>
                </article>
                <article className={styles.kpiCard}>
                    <span>계약 전환율</span>
                    <strong>{conversionRate}%</strong>
                    <small>계약예정/완료 기준</small>
                </article>
                <article className={styles.kpiCard}>
                    <span>HOT 리드</span>
                    <strong>{summary.hotCount.toLocaleString()}</strong>
                    <small>빠른 연락 필요 후보</small>
                </article>
            </section>

            <section className={styles.analyticsGrid}>
                <article className={styles.panelWide}>
                    <div className={styles.panelHeader}>
                        <div>
                            <h2>모객 파이프라인</h2>
                            <p>상태별 후보자 분포와 병목 구간을 확인합니다.</p>
                        </div>
                        {statusFilter !== '전체' && (
                            <button className={styles.clearStageButton} onClick={() => setStatusFilter('전체')}>
                                전체 보기
                            </button>
                        )}
                    </div>
                    <div className={styles.stageStrip}>
                        {stageData.map((item, index) => (
                            <button
                                key={item.status}
                                className={statusFilter === item.status ? styles.stageCardActive : styles.stageCard}
                                onClick={() => setStatusFilter(statusFilter === item.status ? '전체' : item.status)}
                            >
                                <span>{index + 1}. {item.status}</span>
                                <strong>{item.count.toLocaleString()}</strong>
                                <div className={styles.stageBarTrack}>
                                    <div className={styles.stageBarFill} style={{ width: `${Math.max(4, (item.count / maxStageCount) * 100)}%` }} />
                                </div>
                            </button>
                        ))}
                    </div>
                    <div className={styles.chartBox}>
                        <ResponsiveContainer width="100%" height={180}>
                            <BarChart data={stageData}>
                                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e5e7eb" />
                                <XAxis dataKey="status" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                                <Tooltip cursor={{ fill: '#f3f4f6' }} />
                                <Bar dataKey="count" fill="#6d5dfc" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </article>

                <article className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <div>
                            <h2>유입 경로</h2>
                            <p>채널별 모객 볼륨</p>
                        </div>
                    </div>
                    <div className={styles.chartBoxSmall}>
                        {sourceChartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={230}>
                                <BarChart data={sourceChartData} layout="vertical" margin={{ left: 12, right: 12 }}>
                                    <CartesianGrid strokeDasharray="4 4" horizontal={false} stroke="#e5e7eb" />
                                    <XAxis type="number" allowDecimals={false} hide />
                                    <YAxis dataKey="source" type="category" width={78} tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                                    <Tooltip cursor={{ fill: '#f3f4f6' }} />
                                    <Bar dataKey="count" fill="#ff725e" radius={[0, 8, 8, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className={styles.emptyChart}>유입 데이터가 없습니다.</div>
                        )}
                    </div>
                </article>

                <article className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <div>
                            <h2>최근 7일 유입</h2>
                            <p>신규 후보자 등록 추이</p>
                        </div>
                    </div>
                    <div className={styles.chartBoxSmall}>
                        <ResponsiveContainer width="100%" height={230}>
                            <LineChart data={trendData}>
                                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e5e7eb" />
                                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                                <Tooltip />
                                <Line type="monotone" dataKey="count" stroke="#18a999" strokeWidth={3} dot={{ r: 3 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </article>
            </section>

            <section className={styles.tablePanel}>
                <div className={styles.tableHeader}>
                    <div>
                        <h2>{viewMode === 'pipeline' ? '상태별 파이프라인' : viewMode === 'tasks' ? '오늘 할 일' : '후보자 목록'}</h2>
                        <p>
                            {viewMode === 'pipeline'
                                ? '상태별 카드에서 상담 흐름을 빠르게 이동합니다.'
                                : viewMode === 'tasks'
                                    ? '오늘 연락하거나 이미 지연된 리드를 우선 처리합니다.'
                                    : listPolicyText}
                        </p>
                    </div>
                    <div className={styles.tableHeaderActions}>
                        <div className={styles.viewTabs} aria-label="모객 DB 보기 전환">
                            {VIEW_OPTIONS.map(option => (
                                <button
                                    key={option.mode}
                                    className={viewMode === option.mode ? styles.viewTabActive : styles.viewTab}
                                    onClick={() => setViewMode(option.mode)}
                                    title={option.description}
                                >
                                    {option.mode === 'table' && <Table2 size={14} />}
                                    {option.mode === 'pipeline' && <Columns3 size={14} />}
                                    {option.mode === 'tasks' && <ListChecks size={14} />}
                                    {option.label}
                                </button>
                            ))}
                        </div>
                        {viewMode === 'table' && (
                            <div className={styles.actionLegend} aria-label="목록 액션 아이콘 설명">
                                <span><UserCheck size={13} /> 고객전환</span>
                                <span><MessageSquare size={13} /> 이력추가</span>
                                <span><Pencil size={13} /> 수정</span>
                                <span><Trash2 size={13} /> 삭제</span>
                            </div>
                        )}
                        {viewMode === 'table' && (
                            <label className={styles.pageSizeControl}>
                                표시
                                <select
                                    value={pageSize}
                                    onChange={(event) => setPageSize(Number(event.target.value) as typeof PAGE_SIZE_OPTIONS[number])}
                                >
                                    {PAGE_SIZE_OPTIONS.map(option => (
                                        <option key={option} value={option}>{option}건</option>
                                    ))}
                                </select>
                            </label>
                        )}
                        <div className={styles.tableMeta}>
                            <FileSpreadsheet size={16} />
                            {isLoading ? '불러오는 중' : pageRangeText}
                        </div>
                    </div>
                </div>
                {viewMode === 'table' && (
                    <>
                    {selectedLeadIds.length > 0 && (
                        <div className={styles.bulkBar}>
                            <div>
                                <strong>{selectedLeadIds.length.toLocaleString()}건 선택</strong>
                                <span>선택한 후보자의 다음 연락일을 한 번에 지정합니다.</span>
                            </div>
                            <input
                                type="datetime-local"
                                value={bulkNextContactAt}
                                onChange={(event) => setBulkNextContactAt(event.target.value)}
                            />
                            <button className={styles.primaryButton} onClick={() => void applyBulkNextContact()} disabled={isBulkUpdating}>
                                <CalendarClock size={15} />
                                {isBulkUpdating ? '적용 중' : '연락일 적용'}
                            </button>
                            <button className={styles.secondaryButton} onClick={() => setSelectedLeadIds([])} disabled={isBulkUpdating}>
                                선택 해제
                            </button>
                        </div>
                    )}
                    <div className={styles.tableScroll}>
                        <table className={styles.leadTable}>
                            <colgroup>
                                <col className={styles.colCheck} />
                                <col className={styles.colCandidate} />
                                <col className={styles.colPhone} />
                                <col className={styles.colStatus} />
                                <col className={styles.colManager} />
                                <col className={styles.colSource} />
                                <col className={styles.colRegion} />
                                <col className={styles.colBudget} />
                                <col className={styles.colBrand} />
                                <col className={styles.colNextContact} />
                                <col className={styles.colMemo} />
                                <col className={styles.colLink} />
                                <col className={styles.colActions} />
                            </colgroup>
                            <thead>
                                <tr>
                                    <th className={styles.checkboxCell}>
                                        <input
                                            type="checkbox"
                                            checked={allVisibleSelected}
                                            onChange={(event) => toggleSelectAllVisible(event.target.checked)}
                                            disabled={paginatedLeads.length === 0 || isLoading}
                                            aria-label="현재 페이지 전체 선택"
                                        />
                                    </th>
                                    <th>후보자</th>
                                    <th>연락처</th>
                                    <th>상태</th>
                                    <th>담당자</th>
                                    <th>유입</th>
                                    <th>희망지역</th>
                                    <th>예산</th>
                                    <th>브랜드</th>
                                    <th>다음 연락</th>
                                    <th>메모</th>
                                    <th>연결</th>
                                    <th />
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={13} className={styles.emptyRow}>모객 DB를 불러오고 있습니다.</td>
                                    </tr>
                                ) : leads.length === 0 ? (
                                    <tr>
                                        <td colSpan={13} className={styles.emptyRow}>조건에 맞는 후보자가 없습니다.</td>
                                    </tr>
                                ) : paginatedLeads.map(lead => (
                                    <tr key={lead.id}>
                                        <td className={styles.checkboxCell}>
                                            <input
                                                type="checkbox"
                                                checked={selectedLeadSet.has(lead.id)}
                                                onChange={(event) => toggleSelectLead(lead.id, event.target.checked)}
                                                aria-label={`${lead.name} 선택`}
                                            />
                                        </td>
                                        <td>
                                            <button className={styles.nameButton} onClick={() => setSelectedLeadId(lead.id)}>
                                                <strong>{lead.name}</strong>
                                                <span>{formatDate(lead.createdAt)} 등록</span>
                                            </button>
                                        </td>
                                        <td>
                                            <span className={styles.phone}>{lead.mobile || '-'}</span>
                                        </td>
                                        <td>
                                            <select
                                                className={styles.statusSelect}
                                                value={lead.status}
                                                onChange={(event) => void updateLeadStatus(lead, event.target.value as FranchiseLeadStatus)}
                                            >
                                                {FRANCHISE_LEAD_STATUSES.map(status => (
                                                    <option key={status} value={status}>{status}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td>
                                            <select
                                                className={styles.managerSelect}
                                                value={lead.managerId || ''}
                                                onChange={(event) => void updateLeadManager(lead, event.target.value)}
                                            >
                                                <option value="">담당자 선택</option>
                                                {renderManagerOptions(lead.managerId)}
                                            </select>
                                        </td>
                                        <td>
                                            {lead.sourceType === 'meta-lead-ad' || lead.source === 'Meta Lead Ads' ? (
                                                <span className={styles.metaSourceBadge}>Meta Lead Ads</span>
                                            ) : (
                                                lead.source || '-'
                                            )}
                                        </td>
                                        <td>{lead.desiredRegion || '-'}</td>
                                        <td>{formatBudget(lead.budgetMin, lead.budgetMax)}</td>
                                        <td>{lead.interestedBrand || '-'}</td>
                                        <td>
                                            <span className={isPastDue(lead.nextContactAt) ? styles.dueBadgeDanger : isDueToday(lead.nextContactAt) ? styles.dueBadge : undefined}>
                                                {formatDateTime(lead.nextContactAt)}
                                            </span>
                                        </td>
                                        <td className={styles.memoCell}>{lead.memo || '-'}</td>
                                        <td>
                                            <div className={styles.linkBadges}>
                                                {lead.linkedCustomerId && <span>고객</span>}
                                                {lead.linkedBusinessCardId && <span>명함</span>}
                                                {!lead.linkedCustomerId && !lead.linkedBusinessCardId && <small>-</small>}
                                            </div>
                                        </td>
                                        <td>
                                            <div className={styles.rowActions}>
                                                {lead.convertedCustomerId ? (
                                                    <span className={styles.convertedActionPill} title="고객 DB 전환 완료">
                                                        <CheckCircle2 size={14} />
                                                        완료
                                                    </span>
                                                ) : (
                                                    <button
                                                        className={styles.iconButton}
                                                        onClick={() => void convertLeadToCustomer(lead)}
                                                        disabled={convertingLeadId === lead.id}
                                                        aria-label={`${lead.name} 고객 전환`}
                                                        title="고객 DB로 전환"
                                                    >
                                                        <UserCheck size={15} />
                                                    </button>
                                                )}
                                                <button
                                                    className={styles.iconButton}
                                                    onClick={() => openQuickActivityModal(lead)}
                                                    aria-label={`${lead.name} 상담 이력 추가`}
                                                    title="상담 이력 빠른 추가"
                                                >
                                                    <MessageSquare size={15} />
                                                </button>
                                                <button
                                                    className={styles.iconButton}
                                                    onClick={() => openEditModal(lead)}
                                                    aria-label={`${lead.name} 수정`}
                                                    title="기본정보 수정"
                                                >
                                                    <Pencil size={15} />
                                                </button>
                                                <button
                                                    className={styles.iconButtonDanger}
                                                    onClick={() => setConfirmConfig({ isOpen: true, leadId: lead.id, leadName: lead.name })}
                                                    aria-label={`${lead.name} 삭제`}
                                                    title="후보자 삭제"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {leads.length > 0 && (
                        <div className={styles.paginationBar}>
                            <span>{pageRangeText}</span>
                            <div className={styles.paginationControls}>
                                <button
                                    type="button"
                                    className={styles.paginationButton}
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={safeCurrentPage <= 1}
                                >
                                    이전
                                </button>
                                <strong>{safeCurrentPage.toLocaleString()} / {totalPages.toLocaleString()}</strong>
                                <button
                                    type="button"
                                    className={styles.paginationButton}
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={safeCurrentPage >= totalPages}
                                >
                                    다음
                                </button>
                            </div>
                        </div>
                    )}
                    </>
                )}
                {viewMode === 'pipeline' && (
                    <div className={styles.pipelineBoard}>
                        {isLoading ? (
                            <div className={styles.boardEmpty}>파이프라인을 불러오고 있습니다.</div>
                        ) : pipelineColumns.map(column => (
                            <section key={column.status} className={styles.pipelineColumn}>
                                <div className={styles.pipelineColumnHeader}>
                                    <strong>{column.status}</strong>
                                    <span>{column.leads.length.toLocaleString()}</span>
                                </div>
                                <div className={styles.pipelineCardList}>
                                    {column.leads.length === 0 ? (
                                        <div className={styles.pipelineEmpty}>해당 상태의 리드가 없습니다.</div>
                                    ) : column.leads.map(lead => {
                                        const prevStatus = getAdjacentStatus(lead.status, 'prev');
                                        const nextStatus = getAdjacentStatus(lead.status, 'next');

                                        return (
                                            <article key={lead.id} className={styles.pipelineCard}>
                                                <button className={styles.pipelineCardMain} onClick={() => setSelectedLeadId(lead.id)}>
                                                    <span className={styles.pipelineName}>{lead.name}</span>
                                                    <span className={styles.pipelinePhone}>{lead.mobile || '연락처 미입력'}</span>
                                                    <span className={styles.pipelineMeta}>{lead.interestedBrand || '브랜드 미지정'} · {lead.desiredRegion || '지역 미지정'}</span>
                                                    <span className={styles.pipelineMeta}>담당자 {getManagerName(lead.managerId)}</span>
                                                </button>
                                                <div className={styles.pipelineCardFooter}>
                                                    <span className={lead.grade === 'HOT' ? styles.hotBadge : styles.pipelineBadge}>{lead.grade || '미지정'}</span>
                                                    {lead.convertedCustomerId && <span className={styles.convertedBadge}>전환완료</span>}
                                                    {isPastDue(lead.nextContactAt) && <span className={styles.dueBadgeDanger}>지연</span>}
                                                    {isDueToday(lead.nextContactAt) && !isPastDue(lead.nextContactAt) && <span className={styles.dueBadge}>오늘</span>}
                                                </div>
                                                <div className={styles.pipelineActions}>
                                                    <button
                                                        className={styles.miniButton}
                                                        disabled={!prevStatus}
                                                        onClick={() => prevStatus && void updateLeadStatus(lead, prevStatus)}
                                                    >
                                                        <ArrowLeft size={13} />
                                                        이전
                                                    </button>
                                                    <button
                                                        className={styles.miniButton}
                                                        disabled={!nextStatus}
                                                        onClick={() => nextStatus && void updateLeadStatus(lead, nextStatus)}
                                                    >
                                                        다음
                                                        <ArrowRight size={13} />
                                                    </button>
                                                    <button
                                                        className={styles.miniButtonStrong}
                                                        disabled={Boolean(lead.convertedCustomerId) || convertingLeadId === lead.id}
                                                        onClick={() => void convertLeadToCustomer(lead)}
                                                    >
                                                        <UserCheck size={13} />
                                                        고객전환
                                                    </button>
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                            </section>
                        ))}
                    </div>
                )}

                {viewMode === 'tasks' && (
                    <div className={styles.taskBoard}>
                        {isLoading ? (
                            <div className={styles.boardEmpty}>오늘 할 일을 불러오고 있습니다.</div>
                        ) : taskLeads.length === 0 ? (
                            <div className={styles.boardEmpty}>
                                <CheckCircle2 size={28} />
                                오늘 처리할 연락 또는 HOT 리드가 없습니다.
                            </div>
                        ) : taskLeads.map(lead => (
                            <article key={lead.id} className={styles.taskCard}>
                                <div className={styles.taskCardMain}>
                                    <span className={getLeadTaskRank(lead) === 0 ? styles.taskLabelDanger : styles.taskLabel}>
                                        {getLeadTaskLabel(lead)}
                                    </span>
                                    <button onClick={() => setSelectedLeadId(lead.id)}>
                                        <strong>{lead.name}</strong>
                                        <span>{lead.mobile || '연락처 미입력'}</span>
                                    </button>
                                </div>
                                <div className={styles.taskInfoGrid}>
                                    <div>
                                        <span>상태</span>
                                        <strong>{lead.status}</strong>
                                    </div>
                                    <div>
                                        <span>담당자</span>
                                        <strong>{getManagerName(lead.managerId)}</strong>
                                    </div>
                                    <div>
                                        <span>다음 연락</span>
                                        <strong>{formatDateTime(lead.nextContactAt)}</strong>
                                    </div>
                                    <div>
                                        <span>관심브랜드</span>
                                        <strong>{lead.interestedBrand || '-'}</strong>
                                    </div>
                                    <div>
                                        <span>희망지역</span>
                                        <strong>{lead.desiredRegion || '-'}</strong>
                                    </div>
                                </div>
                                <p>{lead.memo || '등록된 메모가 없습니다.'}</p>
                                <div className={styles.taskActions}>
                                    <button className={styles.secondaryButton} onClick={() => setSelectedLeadId(lead.id)}>
                                        상세 보기
                                    </button>
                                    <button className={styles.secondaryButton} onClick={() => void completeTodayTask(lead)}>
                                        연락 완료
                                    </button>
                                    <button
                                        className={styles.primaryButton}
                                        disabled={Boolean(lead.convertedCustomerId) || convertingLeadId === lead.id}
                                        onClick={() => void convertLeadToCustomer(lead)}
                                    >
                                        고객 전환
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>

            {isModalOpen && (
                <div className={styles.modalBackdrop}>
                    <form className={styles.modalCard} onSubmit={submitLead}>
                        <div className={styles.modalHeader}>
                            <div>
                                <h2>{form.id ? '후보자 수정' : '후보자 등록'}</h2>
                                <p>본사 모객 DB에 필요한 핵심 정보만 빠르게 기록합니다.</p>
                            </div>
                            <button type="button" onClick={closeModal} className={styles.closeButton}>
                                <X size={18} />
                            </button>
                        </div>

                        <div className={styles.formGrid}>
                            <label>
                                후보자명 *
                                <input value={form.name} onChange={(event) => setForm(prev => ({ ...prev, name: event.target.value }))} placeholder="홍길동" />
                            </label>
                            <label>
                                연락처
                                <input value={form.mobile} onChange={(event) => setForm(prev => ({ ...prev, mobile: event.target.value }))} placeholder="010-0000-0000" />
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
                                        <option key={grade} value={grade}>{grade}</option>
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
                            <label>
                                희망지역
                                <input value={form.desiredRegion} onChange={(event) => setForm(prev => ({ ...prev, desiredRegion: event.target.value }))} placeholder="서울 강남구" />
                            </label>
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
                            <button type="button" onClick={closeQuickActivityModal} className={styles.closeButton}>
                                <X size={18} />
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
                <div className={styles.detailBackdrop} onClick={() => setSelectedLeadId('')}>
                    <aside className={styles.detailPanel} onClick={(event) => event.stopPropagation()}>
                        <div className={styles.detailHeader}>
                            <div>
                                <span className={styles.detailEyebrow}>후보자 상세</span>
                                <h2>{selectedLead.name}</h2>
                                <p>{selectedLead.mobile || '연락처 미입력'} · {selectedLead.source || '유입 미지정'} · 담당자 {getManagerName(selectedLead.managerId)}</p>
                            </div>
                            <button className={styles.closeButton} onClick={() => setSelectedLeadId('')} aria-label="상세 패널 닫기">
                                <X size={18} />
                            </button>
                        </div>

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

                        <section className={styles.detailSection}>
                            <h3><UserRound size={16} /> 기본정보</h3>
                            <div className={styles.detailInfoGrid}>
                                <div>
                                    <span>등급</span>
                                    <strong>{selectedLead.grade || '-'}</strong>
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
                title="후보자 삭제"
                message={`${confirmConfig.leadName} 후보자를 삭제할까요?`}
                confirmText="삭제"
                isDanger
                onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
                onConfirm={() => void deleteLead(confirmConfig.leadId)}
            />
        </div>
    );
}
