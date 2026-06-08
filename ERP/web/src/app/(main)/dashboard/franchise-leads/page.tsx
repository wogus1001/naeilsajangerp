"use client";

import React from 'react';
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
    if (value === null || value === undefined) return '';
    return new Intl.NumberFormat('ko-KR').format(value);
}

function formatBudget(min: number | null, max: number | null) {
    const minText = formatBudgetValue(min);
    const maxText = formatBudgetValue(max);
    if (!minText && !maxText) return '-';
    if (minText && maxText) return `${minText} ~ ${maxText}`;
    return minText || maxText;
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
        budgetMin: lead.budgetMin === null || lead.budgetMin === undefined ? '' : String(lead.budgetMin),
        budgetMax: lead.budgetMax === null || lead.budgetMax === undefined ? '' : String(lead.budgetMax),
        interestedBrand: lead.interestedBrand || '',
        managerId: lead.managerId || '',
        nextContactAt: toDatetimeLocalValue(lead.nextContactAt),
        memo: lead.memo || ''
    };
}

export default function FranchiseLeadsPage() {
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
    const [range, setRange] = React.useState<typeof RANGE_OPTIONS[number]>('30D');
    const [viewMode, setViewMode] = React.useState<LeadViewMode>('table');
    const [createdFrom, setCreatedFrom] = React.useState(() => buildDateFromRange('30D'));
    const [createdTo, setCreatedTo] = React.useState('');
    const [selectedLeadId, setSelectedLeadId] = React.useState('');
    const [activityType, setActivityType] = React.useState<LeadActivityType>('전화');
    const [activityContent, setActivityContent] = React.useState('');
    const [detailNextContactAt, setDetailNextContactAt] = React.useState('');
    const [convertingLeadId, setConvertingLeadId] = React.useState('');
    const [relatedCustomers, setRelatedCustomers] = React.useState<RelatedCustomer[]>([]);
    const [relatedCards, setRelatedCards] = React.useState<RelatedBusinessCard[]>([]);
    const [isRelatedLoading, setIsRelatedLoading] = React.useState(false);
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
    }, [companyName, createdFrom, createdTo, searchTerm, sourceFilter, statusFilter, userId]);

    React.useEffect(() => {
        if (!userId) return;
        const timer = window.setTimeout(() => {
            void fetchLeads();
        }, 250);

        return () => window.clearTimeout(timer);
    }, [fetchLeads, userId]);

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
    const trendData = buildTrendData(summary);
    const contractReadyCount = (summary.byStatus?.['계약예정'] || 0) + (summary.byStatus?.['계약완료'] || 0);
    const conversionRate = summary.total > 0 ? Math.round((contractReadyCount / summary.total) * 1000) / 10 : 0;
    const activeFollowupLeads = leads.filter(lead => !lead.convertedCustomerId && lead.status !== '계약완료' && lead.status !== '보류/이탈');
    const dueContactCount = activeFollowupLeads.filter(lead => isContactActionDue(lead.nextContactAt)).length;
    const overdueContactCount = activeFollowupLeads.filter(lead => isPastDue(lead.nextContactAt)).length;
    const linkedLeadCount = leads.filter(lead => lead.linkedCustomerId || lead.linkedBusinessCardId).length;
    const convertedLeadCount = leads.filter(lead => lead.convertedCustomerId).length;
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

    const showAlert = (message: string, type: 'success' | 'error' | 'info' = 'info', title = '알림') => {
        setAlertConfig({ isOpen: true, title, message, type });
    };

    const openCreateModal = () => {
        setForm({ ...EMPTY_FORM, managerId: userId });
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

    const updateLeadWithPatch = async (lead: FranchiseLead, patch: Record<string, unknown>) => {
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
        await fetchLeads();
        return data.lead || null;
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
                    wantedDepositMin: lead.budgetMin,
                    wantedDepositMax: lead.budgetMax,
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

            const result = unwrapApiData<{ created: number; updated: number; skipped: number; errors: Array<{ row: number; reason: string }> }>(payload);
            await fetchLeads();
            showAlert(
                `신규 ${result.created}건, 업데이트 ${result.updated}건, 제외 ${result.skipped}건 처리했습니다.${result.errors.length > 0 ? `\n첫 오류: ${result.errors[0].row}행 - ${result.errors[0].reason}` : ''}`,
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
                창업예산: '100000000~200000000',
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
                    <div className={styles.eyebrow}>Franchise Growth Console</div>
                    <h1>모객 DB</h1>
                    <p>가맹 희망자 유입부터 상담, 검토, 계약 전환까지 본사에서 한눈에 관리합니다.</p>
                </div>
                <div className={styles.heroActions}>
                    <button className={styles.secondaryButton} onClick={() => void fetchLeads()} disabled={isLoading}>
                        <RefreshCw size={16} />
                        새로고침
                    </button>
                    <button className={styles.secondaryButton} onClick={() => void downloadTemplate()}>
                        <Download size={16} />
                        샘플 양식
                    </button>
                    <button className={styles.secondaryButton} onClick={() => uploadInputRef.current?.click()} disabled={isUploading}>
                        <Upload size={16} />
                        {isUploading ? '업로드 중' : '엑셀 업로드'}
                    </button>
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
                <article className={styles.kpiCard}>
                    <span>기존 DB 연결</span>
                    <strong>{linkedLeadCount.toLocaleString()}</strong>
                    <small>고객/명함과 연결된 리드</small>
                </article>
                <article className={styles.kpiCard}>
                    <span>고객 전환</span>
                    <strong>{convertedLeadCount.toLocaleString()}</strong>
                    <small>고객 DB로 전환 완료</small>
                </article>
            </section>

            <section className={styles.analyticsGrid}>
                <article className={styles.panelWide}>
                    <div className={styles.panelHeader}>
                        <div>
                            <h2>모객 파이프라인</h2>
                            <p>상태별 후보자 분포와 병목 구간을 확인합니다.</p>
                        </div>
                        <span>{FRANCHISE_LEAD_STATUSES.length}-step Funnel</span>
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
                        <ResponsiveContainer width="100%" height={230}>
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
                                    : searchTerm.trim() ? '검색 중에는 전체 데이터 범위에서 결과를 불러옵니다.' : '기본 목록은 최근 500건 기준으로 표시합니다.'}
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
                        <div className={styles.tableMeta}>
                            <FileSpreadsheet size={16} />
                            {isLoading ? '불러오는 중' : `${leads.length.toLocaleString()}건 표시`}
                        </div>
                    </div>
                </div>
                {viewMode === 'table' && (
                    <div className={styles.tableScroll}>
                        <table className={styles.leadTable}>
                            <thead>
                                <tr>
                                    <th>후보자</th>
                                    <th>연락처</th>
                                    <th>상태</th>
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
                                        <td colSpan={11} className={styles.emptyRow}>모객 DB를 불러오고 있습니다.</td>
                                    </tr>
                                ) : leads.length === 0 ? (
                                    <tr>
                                        <td colSpan={11} className={styles.emptyRow}>조건에 맞는 후보자가 없습니다.</td>
                                    </tr>
                                ) : leads.map(lead => (
                                    <tr key={lead.id}>
                                        <td>
                                            <button className={styles.nameButton} onClick={() => setSelectedLeadId(lead.id)}>
                                                <strong>{lead.name}</strong>
                                                <span>{formatDate(lead.createdAt)} 등록</span>
                                            </button>
                                        </td>
                                        <td>
                                            <span className={styles.phone}>{lead.mobile || '-'}</span>
                                            {normalizeLeadPhone(lead.mobile).length > 0 && <small>{normalizeLeadPhone(lead.mobile)}</small>}
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
                                        <td>{lead.source || '-'}</td>
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
                                                {lead.convertedCustomerId && <span className={styles.convertedBadge}>전환</span>}
                                                {lead.linkedCustomerId && <span>고객</span>}
                                                {lead.linkedBusinessCardId && <span>명함</span>}
                                                {!lead.convertedCustomerId && !lead.linkedCustomerId && !lead.linkedBusinessCardId && <small>-</small>}
                                            </div>
                                        </td>
                                        <td>
                                            <div className={styles.rowActions}>
                                                <button
                                                    className={lead.convertedCustomerId ? styles.iconButtonSuccess : styles.iconButton}
                                                    onClick={() => void convertLeadToCustomer(lead)}
                                                    disabled={Boolean(lead.convertedCustomerId) || convertingLeadId === lead.id}
                                                    aria-label={`${lead.name} 고객 전환`}
                                                >
                                                    <UserCheck size={15} />
                                                </button>
                                                <button
                                                    className={styles.iconButton}
                                                    onClick={() => openEditModal(lead)}
                                                    aria-label={`${lead.name} 수정`}
                                                >
                                                    <Pencil size={15} />
                                                </button>
                                                <button
                                                    className={styles.iconButtonDanger}
                                                    onClick={() => setConfirmConfig({ isOpen: true, leadId: lead.id, leadName: lead.name })}
                                                    aria-label={`${lead.name} 삭제`}
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
                                예산 최소
                                <input value={form.budgetMin} onChange={(event) => setForm(prev => ({ ...prev, budgetMin: event.target.value }))} placeholder="100000000" />
                            </label>
                            <label>
                                예산 최대
                                <input value={form.budgetMax} onChange={(event) => setForm(prev => ({ ...prev, budgetMax: event.target.value }))} placeholder="200000000" />
                            </label>
                            <label>
                                관심브랜드
                                <input value={form.interestedBrand} onChange={(event) => setForm(prev => ({ ...prev, interestedBrand: event.target.value }))} placeholder="미카도" />
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

            {selectedLead && (
                <div className={styles.detailBackdrop} onClick={() => setSelectedLeadId('')}>
                    <aside className={styles.detailPanel} onClick={(event) => event.stopPropagation()}>
                        <div className={styles.detailHeader}>
                            <div>
                                <span className={styles.detailEyebrow}>Lead Detail</span>
                                <h2>{selectedLead.name}</h2>
                                <p>{selectedLead.mobile || '연락처 미입력'} · {selectedLead.source || '유입 미지정'}</p>
                            </div>
                            <button className={styles.closeButton} onClick={() => setSelectedLeadId('')} aria-label="상세 패널 닫기">
                                <X size={18} />
                            </button>
                        </div>

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
                            <div className={styles.conversionBox}>
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
