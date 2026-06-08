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
import { Download, FileSpreadsheet, Plus, RefreshCw, Search, SlidersHorizontal, Trash2, Upload, X } from 'lucide-react';
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

const SOURCE_FILTER_OPTIONS = ['전체', ...FRANCHISE_LEAD_SOURCES] as const;
const RANGE_OPTIONS = ['7D', '30D', '3M', '전체'] as const;

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
    const [createdFrom, setCreatedFrom] = React.useState(() => buildDateFromRange('30D'));
    const [createdTo, setCreatedTo] = React.useState('');
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
            const response = await fetch('/api/franchise-leads', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: lead.id,
                    requesterId: userId,
                    status
                })
            });
            const payload = await response.json();

            if (!response.ok) {
                throw new Error(readApiError(payload));
            }

            await fetchLeads();
        } catch (error) {
            console.error(error);
            showAlert(error instanceof Error ? error.message : '상태 변경에 실패했습니다.', 'error', '상태 변경 실패');
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
                <article className={styles.kpiCard}>
                    <span>계약 전환율</span>
                    <strong>{conversionRate}%</strong>
                    <small>계약예정/완료 기준</small>
                </article>
                <article className={styles.kpiCardAccent}>
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
                        <h2>후보자 목록</h2>
                        <p>{searchTerm.trim() ? '검색 중에는 전체 데이터 범위에서 결과를 불러옵니다.' : '기본 목록은 최근 500건 기준으로 표시합니다.'}</p>
                    </div>
                    <div className={styles.tableMeta}>
                        <FileSpreadsheet size={16} />
                        {isLoading ? '불러오는 중' : `${leads.length.toLocaleString()}건 표시`}
                    </div>
                </div>
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
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={10} className={styles.emptyRow}>모객 DB를 불러오고 있습니다.</td>
                                </tr>
                            ) : leads.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className={styles.emptyRow}>조건에 맞는 후보자가 없습니다.</td>
                                </tr>
                            ) : leads.map(lead => (
                                <tr key={lead.id}>
                                    <td>
                                        <button className={styles.nameButton} onClick={() => openEditModal(lead)}>
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
                                    <td>{formatDateTime(lead.nextContactAt)}</td>
                                    <td className={styles.memoCell}>{lead.memo || '-'}</td>
                                    <td>
                                        <button
                                            className={styles.iconButtonDanger}
                                            onClick={() => setConfirmConfig({ isOpen: true, leadId: lead.id, leadName: lead.name })}
                                            aria-label={`${lead.name} 삭제`}
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
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
