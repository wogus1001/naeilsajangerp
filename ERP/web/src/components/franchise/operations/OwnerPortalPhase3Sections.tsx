"use client";

import React from 'react';
import {
    Archive,
    BellRing,
    CheckCircle2,
    Download,
    FilePlus2,
    Paperclip,
    ReceiptText,
    Send,
    Trash2,
    XCircle
} from 'lucide-react';
import { AlertModal } from '@/components/common/AlertModal';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { formatFranchiseFileSize } from '@/lib/franchise-file-attachments';
import { getApiAuthHeaders } from '@/utils/apiAuthHeaders';
import { readApiError, unwrapApiData } from '@/utils/apiResponse';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import type { FranchiseLocation } from './types';
import type { OwnerChecklistSetting, OwnerPortalView } from './OwnerPortalPanelSections';

type Phase3View = Extract<OwnerPortalView, 'reminders' | 'content' | 'settlements'>;
type ContentStatus = 'draft' | 'published' | 'archived';
type SettlementSubmissionStatus = 'draft' | 'submitted' | 'rejected' | 'confirmed';

type OwnerReminder = {
    readonly id: string;
    readonly location_id: string;
    readonly source_type: 'checklist_issue' | 'content_item';
    readonly source_id: string;
    readonly message: string;
    readonly due_at: string | null;
    readonly sent_at: string;
    readonly acknowledged_at: string | null;
};

type OwnerReminderStats = {
    readonly total: number;
    readonly acknowledged: number;
    readonly unacknowledged: number;
    readonly ownerCount: number;
};

type OwnerContentAttachment = {
    readonly id: string;
    readonly file_name: string;
    readonly file_size: number;
    readonly storage_path: string;
};

type OwnerContentItem = {
    readonly id: string;
    readonly location_id: string | null;
    readonly content_type: string;
    readonly category: string;
    readonly title: string;
    readonly summary: string;
    readonly body: string;
    readonly version: number;
    readonly status: ContentStatus;
    readonly requires_acknowledgement: boolean;
    readonly due_at: string | null;
    readonly published_at: string | null;
    readonly created_at: string;
    readonly attachments: readonly OwnerContentAttachment[];
    readonly receiptStats: {
        readonly targetCount: number;
        readonly acknowledgedCount: number;
        readonly unacknowledgedCount: number;
    };
};

type OwnerSettlementFile = {
    readonly id: string;
    readonly file_name: string;
    readonly file_size: number;
};

type OwnerSettlementRequest = {
    readonly id: string;
    readonly location_id: string | null;
    readonly title: string;
    readonly instructions: string;
    readonly period_start: string;
    readonly period_end: string;
    readonly due_at: string;
    readonly status: 'open' | 'closed';
    readonly created_at: string;
};

type OwnerSettlementSubmission = {
    readonly id: string;
    readonly request_id: string;
    readonly location_id: string;
    readonly status: SettlementSubmissionStatus;
    readonly total_amount: number | string;
    readonly note: string;
    readonly review_note: string;
    readonly submitted_at: string | null;
    readonly files: readonly OwnerSettlementFile[];
};

type Phase3Counts = {
    readonly reminders: number;
    readonly content: number;
    readonly settlements: number;
};

type Phase3Props = {
    readonly activeView: Phase3View;
    readonly userId: string;
    readonly companyId: string;
    readonly companyName: string;
    readonly locations: readonly FranchiseLocation[];
    readonly checklists: readonly OwnerChecklistSetting[];
    readonly onCountsChange: (counts: Phase3Counts) => void;
};

type JsonRequestInit = {
    readonly method?: 'DELETE' | 'GET' | 'POST' | 'PATCH';
    readonly body?: string;
    readonly headers?: Record<string, string>;
};

type AlertState = {
    readonly type: 'success' | 'error' | 'info';
    readonly title: string;
    readonly message: string;
};

type ConfirmState = {
    readonly title: string;
    readonly message: string;
    readonly confirmText: string;
    readonly isDanger: boolean;
    readonly onConfirm: () => void;
};

type ReminderSource = {
    readonly id: string;
    readonly sourceId: string;
    readonly sourceVersion: number;
    readonly sourceType: 'checklist_issue' | 'content_item';
    readonly label: string;
    readonly locationIds: readonly string[];
};

const CONTENT_TYPE_OPTIONS = [
    ['education', '교육 자료'],
    ['manual', '매뉴얼'],
    ['official_document', '공문'],
    ['corrective_action', '시정 요청'],
    ['contract_document', '계약 서류']
] as const;

const CONTENT_FILE_ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.hwp,.hwpx';

const EMPTY_REMINDER_STATS: OwnerReminderStats = { total: 0, acknowledged: 0, unacknowledged: 0, ownerCount: 0 };

async function requestJson<T>(url: string, init?: JsonRequestInit): Promise<T> {
    const headers = await getApiAuthHeaders(init?.headers);
    const response = await fetch(url, { ...init, headers, cache: 'no-store' });
    const payload: unknown = await response.json();
    if (!response.ok) throw new Error(readApiError(payload));
    return unwrapApiData<T>(payload);
}

function formatDate(value: string | null): string {
    if (!value) return '-';
    return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeZone: 'Asia/Seoul' }).format(new Date(value));
}

function toDateTimeLocal(value: string | null): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function formatMoney(value: number | string): string {
    const amount = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(amount) ? `${new Intl.NumberFormat('ko-KR').format(amount)}원` : '-';
}

function locationName(locations: readonly FranchiseLocation[], locationId: string | null): string {
    if (!locationId) return '전체 운영점';
    return locations.find(location => location.id === locationId)?.name || '운영점';
}

function contentTypeLabel(value: string): string {
    return CONTENT_TYPE_OPTIONS.find(([key]) => key === value)?.[1] || '자료';
}

function contentStatusLabel(value: ContentStatus): string {
    if (value === 'published') return '게시 중';
    if (value === 'archived') return '보관';
    return '초안';
}

function submissionStatusLabel(value: SettlementSubmissionStatus): string {
    if (value === 'submitted') return '검토 대기';
    if (value === 'rejected') return '반려';
    if (value === 'confirmed') return '확정';
    return '작성 중';
}

export function OwnerPortalPhase3Sections({
    activeView,
    userId,
    companyId,
    companyName,
    locations,
    checklists,
    onCountsChange
}: Phase3Props) {
    const [reminders, setReminders] = React.useState<readonly OwnerReminder[]>([]);
    const [reminderStats, setReminderStats] = React.useState<OwnerReminderStats>(EMPTY_REMINDER_STATS);
    const [contentItems, setContentItems] = React.useState<readonly OwnerContentItem[]>([]);
    const [settlementRequests, setSettlementRequests] = React.useState<readonly OwnerSettlementRequest[]>([]);
    const [settlementSubmissions, setSettlementSubmissions] = React.useState<readonly OwnerSettlementSubmission[]>([]);
    const [isBusy, setIsBusy] = React.useState(false);
    const [alert, setAlert] = React.useState<AlertState | null>(null);
    const [confirm, setConfirm] = React.useState<ConfirmState | null>(null);

    const [reminderSourceId, setReminderSourceId] = React.useState('');
    const [reminderLocationIds, setReminderLocationIds] = React.useState<readonly string[]>([]);
    const [reminderMessage, setReminderMessage] = React.useState('');
    const [reminderDueAt, setReminderDueAt] = React.useState('');
    const reminderRequestRef = React.useRef<{ readonly fingerprint: string; readonly key: string } | null>(null);

    const [contentType, setContentType] = React.useState('education');
    const [contentLocationId, setContentLocationId] = React.useState('');
    const [contentCategory, setContentCategory] = React.useState('');
    const [contentTitle, setContentTitle] = React.useState('');
    const [contentSummary, setContentSummary] = React.useState('');
    const [contentBody, setContentBody] = React.useState('');
    const [contentDueAt, setContentDueAt] = React.useState('');
    const [contentRequiresAck, setContentRequiresAck] = React.useState(false);
    const [contentFiles, setContentFiles] = React.useState<readonly File[]>([]);
    const [editingContentId, setEditingContentId] = React.useState('');
    const [editingContentVersion, setEditingContentVersion] = React.useState<number | null>(null);

    const [settlementLocationId, setSettlementLocationId] = React.useState('');
    const [settlementTitle, setSettlementTitle] = React.useState('');
    const [settlementInstructions, setSettlementInstructions] = React.useState('');
    const [periodStart, setPeriodStart] = React.useState('');
    const [periodEnd, setPeriodEnd] = React.useState('');
    const [settlementDueAt, setSettlementDueAt] = React.useState('');
    const settlementRequestKeyRef = React.useRef(crypto.randomUUID());
    const [reviewNotes, setReviewNotes] = React.useState<Readonly<Record<string, string>>>({});

    const companyParams = React.useMemo(() => {
        const params = new URLSearchParams({ requesterId: userId });
        if (companyId) params.set('companyId', companyId);
        if (companyName) params.set('company', companyName);
        return params;
    }, [companyId, companyName, userId]);

    const load = React.useCallback(async () => {
        const query = companyParams.toString();
        const [reminderData, contentData, settlementData] = await Promise.all([
            requestJson<{ readonly reminders: readonly OwnerReminder[]; readonly stats: OwnerReminderStats }>(`/api/franchise-owner-portal/reminders?${query}`),
            requestJson<{ readonly items: readonly OwnerContentItem[] }>(`/api/franchise-owner-portal/content?${query}`),
            requestJson<{ readonly requests: readonly OwnerSettlementRequest[]; readonly submissions: readonly OwnerSettlementSubmission[] }>(`/api/franchise-owner-portal/settlements?${query}`)
        ]);
        setReminders(reminderData.reminders);
        setReminderStats(reminderData.stats);
        setContentItems(contentData.items);
        setSettlementRequests(settlementData.requests);
        setSettlementSubmissions(settlementData.submissions);
        onCountsChange({
            reminders: reminderData.stats.unacknowledged,
            content: contentData.items.filter(item => item.status !== 'archived').length,
            settlements: settlementData.submissions.filter(item => item.status === 'submitted').length
        });
    }, [companyParams, onCountsChange]);

    React.useEffect(() => {
        void load().catch(caught => setAlert({
            type: 'error',
            title: '3단계 데이터 조회 실패',
            message: caught instanceof Error ? caught.message : '점주 포털 3단계 데이터를 불러오지 못했습니다.'
        }));
    }, [load]);

    const reminderSources = React.useMemo<readonly ReminderSource[]>(() => {
        const checklistSources = checklists.flatMap(checklist => (checklist.issues || []).map(issue => ({
            id: `checklist_issue:${issue.id}:${checklist.locationId}`,
            sourceId: issue.id,
            sourceVersion: 1,
            sourceType: 'checklist_issue' as const,
            label: `체크리스트 · ${checklist.locationName} · ${issue.tasks.map(task => task.title).join(', ') || '확인 요청'}`,
            locationIds: [checklist.locationId]
        })));
        const contentSources = contentItems.filter(item => item.status === 'published').map(item => ({
            id: `content_item:${item.id}:${item.version}`,
            sourceId: item.id,
            sourceVersion: item.version,
            sourceType: 'content_item' as const,
            label: `자료 · ${item.title}`,
            locationIds: item.location_id ? [item.location_id] : locations.map(location => location.id)
        }));
        return [...checklistSources, ...contentSources];
    }, [checklists, contentItems, locations]);

    const selectedReminderSource = reminderSources.find(source => source.id === reminderSourceId);

    const selectReminderSource = (sourceId: string) => {
        const source = reminderSources.find(item => item.id === sourceId);
        setReminderSourceId(sourceId);
        setReminderLocationIds(source?.locationIds.length === 1 ? source.locationIds : []);
    };

    const toggleReminderLocation = (locationId: string) => {
        setReminderLocationIds(current => current.includes(locationId)
            ? current.filter(id => id !== locationId)
            : [...current, locationId]);
    };

    const runAction = async (
        action: () => Promise<{ readonly warning?: string } | void>,
        successMessage: string
    ) => {
        setIsBusy(true);
        try {
            const result = await action();
            await load();
            setAlert(result?.warning
                ? { type: 'info', title: '처리 완료', message: result.warning }
                : { type: 'success', title: '처리 완료', message: successMessage });
        } catch (caught) {
            setAlert({
                type: 'error',
                title: '처리 실패',
                message: caught instanceof Error ? caught.message : '요청을 처리하지 못했습니다.'
            });
        } finally {
            setIsBusy(false);
        }
    };

    const createReminder = () => {
        if (!selectedReminderSource || reminderLocationIds.length === 0) {
            setAlert({ type: 'info', title: '대상 확인', message: '원본 업무와 리마인더를 받을 운영점을 선택해주세요.' });
            return;
        }
        void runAction(async () => {
            const reminderPayload = {
                sourceType: selectedReminderSource.sourceType,
                sourceId: selectedReminderSource.sourceId,
                sourceVersion: selectedReminderSource.sourceVersion,
                locationIds: reminderLocationIds,
                reminderKind: 'manual',
                message: reminderMessage,
                dueAt: reminderDueAt || null
            };
            const fingerprint = JSON.stringify(reminderPayload);
            const requestKey = reminderRequestRef.current?.fingerprint === fingerprint
                ? reminderRequestRef.current.key
                : crypto.randomUUID();
            reminderRequestRef.current = { fingerprint, key: requestKey };
            await requestJson('/api/franchise-owner-portal/reminders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    requesterId: userId,
                    companyId,
                    companyName,
                    ...reminderPayload,
                    requestIdempotencyKey: requestKey
                })
            });
            reminderRequestRef.current = null;
            setReminderMessage('');
            setReminderDueAt('');
        }, '선택한 운영점에 리마인더를 등록했습니다.');
    };

    const uploadContentFile = async (contentId: string, expectedVersion: number, file: File): Promise<number> => {
        const formData = new FormData();
        formData.set('file', file);
        formData.set('contentId', contentId);
        formData.set('expectedVersion', String(expectedVersion));
        formData.set('companyId', companyId);
        formData.set('companyName', companyName);
        const headers = await getApiAuthHeaders();
        const response = await fetch('/api/franchise-owner-portal/content/attachments', { method: 'POST', headers, body: formData, cache: 'no-store' });
        const payload: unknown = await response.json();
        if (!response.ok) throw new Error(readApiError(payload));
        return unwrapApiData<{ readonly contentVersion: number }>(payload).contentVersion;
    };

    const createContent = () => {
        if (!contentTitle.trim()) {
            setAlert({ type: 'info', title: '제목 확인', message: '자료 제목을 입력해주세요.' });
            return;
        }
        if ((contentType === 'corrective_action' || contentType === 'contract_document') && !contentLocationId) {
            setAlert({ type: 'info', title: '운영점 확인', message: '시정 요청과 계약 서류는 대상 운영점을 선택해주세요.' });
            return;
        }
        void runAction(async () => {
            const data = await requestJson<{ readonly item: OwnerContentItem }>('/api/franchise-owner-portal/content', {
                method: editingContentId ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    requesterId: userId,
                    companyId,
                    companyName,
                    contentId: editingContentId || undefined,
                    expectedVersion: editingContentId ? editingContentVersion : undefined,
                    action: editingContentId ? 'update' : undefined,
                    locationId: contentLocationId || null,
                    contentType,
                    category: contentCategory,
                    title: contentTitle,
                    summary: contentSummary,
                    body: contentBody,
                    requiresAcknowledgement: contentRequiresAck,
                    dueAt: contentDueAt || null
                })
            });
            let contentVersion = data.item.version;
            setEditingContentId(data.item.id);
            setEditingContentVersion(contentVersion);
            for (const file of contentFiles) {
                contentVersion = await uploadContentFile(data.item.id, contentVersion, file);
                setEditingContentVersion(contentVersion);
                setContentFiles(current => current.filter(selectedFile => selectedFile !== file));
            }
            setContentCategory('');
            setContentTitle('');
            setContentSummary('');
            setContentBody('');
            setContentDueAt('');
            setContentRequiresAck(false);
            setContentFiles([]);
            setEditingContentId('');
            setEditingContentVersion(null);
        }, editingContentId ? '자료를 수정하고 새 버전으로 반영했습니다.' : '자료 초안과 첨부 파일을 저장했습니다.');
    };

    const startContentEdit = (item: OwnerContentItem) => {
        setEditingContentId(item.id);
        setEditingContentVersion(item.version);
        setContentType(item.content_type);
        setContentLocationId(item.location_id || '');
        setContentCategory(item.category);
        setContentTitle(item.title);
        setContentSummary(item.summary);
        setContentBody(item.body);
        setContentDueAt(toDateTimeLocal(item.due_at));
        setContentRequiresAck(item.requires_acknowledgement);
        setContentFiles([]);
    };

    const cancelContentEdit = () => {
        setEditingContentId('');
        setEditingContentVersion(null);
        setContentCategory('');
        setContentTitle('');
        setContentSummary('');
        setContentBody('');
        setContentDueAt('');
        setContentRequiresAck(false);
        setContentFiles([]);
    };

    const selectContentFiles = (fileList: FileList | null) => {
        const selectedFiles = Array.from(fileList || []);
        if (selectedFiles.length > 10) {
            setAlert({ type: 'info', title: '첨부 개수 확인', message: '첨부 파일은 한 자료에 최대 10개까지 등록할 수 있습니다.' });
        }
        setContentFiles(selectedFiles.slice(0, 10));
    };

    const updateContentStatus = (item: OwnerContentItem, action: 'publish' | 'archive') => {
        setConfirm({
            title: action === 'publish' ? '자료 게시' : '자료 보관',
            message: action === 'publish'
                ? `"${item.title}"을(를) 점주 자료실에 게시할까요?`
                : `"${item.title}"을(를) 보관 처리할까요?`,
            confirmText: action === 'publish' ? '게시' : '보관',
            isDanger: action === 'archive',
            onConfirm: () => void runAction(async () => {
                await requestJson('/api/franchise-owner-portal/content', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ requesterId: userId, companyId, companyName, contentId: item.id, expectedVersion: item.version, action })
                });
            }, action === 'publish' ? '자료를 게시했습니다.' : '자료를 보관 처리했습니다.')
        });
    };

    const openContentFile = async (attachment: OwnerContentAttachment) => {
        try {
            const params = new URLSearchParams(companyParams);
            params.set('fileId', attachment.id);
            const data = await requestJson<{ readonly url: string }>(`/api/franchise-owner-portal/content/attachments?${params.toString()}`);
            window.open(data.url, '_blank', 'noopener,noreferrer');
        } catch (caught) {
            setAlert({ type: 'error', title: '파일 열기 실패', message: caught instanceof Error ? caught.message : '파일을 열지 못했습니다.' });
        }
    };

    const deleteContentFile = (item: OwnerContentItem, attachment: OwnerContentAttachment) => {
        setConfirm({
            title: '첨부 파일 삭제',
            message: `"${attachment.file_name}"을 현재 자료에서 삭제할까요? 이미 게시된 이전 버전의 파일은 이력 보존을 위해 유지됩니다.`,
            confirmText: '삭제',
            isDanger: true,
            onConfirm: () => void runAction(async () => {
                const params = new URLSearchParams(companyParams);
                params.set('attachmentId', attachment.id);
                params.set('expectedVersion', String(item.version));
                await requestJson(`/api/franchise-owner-portal/content/attachments?${params.toString()}`, { method: 'DELETE' });
            }, '첨부 파일을 현재 자료에서 삭제했습니다.')
        });
    };

    const createSettlement = () => {
        if (!settlementTitle.trim() || !periodStart || !periodEnd || !settlementDueAt) {
            setAlert({ type: 'info', title: '필수 항목 확인', message: '제목, 정산 기간, 제출 기한을 입력해주세요.' });
            return;
        }
        void runAction(async () => {
            await requestJson('/api/franchise-owner-portal/settlements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    requesterId: userId,
                    companyId,
                    companyName,
                    locationId: settlementLocationId || null,
                    title: settlementTitle,
                    instructions: settlementInstructions,
                    periodStart,
                    periodEnd,
                    dueAt: settlementDueAt,
                    requestIdempotencyKey: settlementRequestKeyRef.current
                })
            });
            settlementRequestKeyRef.current = crypto.randomUUID();
            setSettlementTitle('');
            setSettlementInstructions('');
            setPeriodStart('');
            setPeriodEnd('');
            setSettlementDueAt('');
        }, '정산·증빙 제출 요청을 등록했습니다.');
    };

    const closeSettlement = (request: OwnerSettlementRequest) => {
        setConfirm({
            title: '정산 요청 마감',
            message: `"${request.title}"의 추가 제출을 마감할까요?`,
            confirmText: '마감',
            isDanger: true,
            onConfirm: () => void runAction(async () => {
                await requestJson('/api/franchise-owner-portal/settlements', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ requesterId: userId, companyId, companyName, requestId: request.id, action: 'close' })
                });
            }, '정산 요청을 마감했습니다.')
        });
    };

    const reviewSettlement = (submission: OwnerSettlementSubmission, action: 'confirm' | 'reject') => {
        const reviewNote = reviewNotes[submission.id]?.trim() || '';
        if (action === 'reject' && !reviewNote) {
            setAlert({ type: 'info', title: '반려 사유 확인', message: '점주가 보완할 수 있도록 반려 사유를 입력해주세요.' });
            return;
        }
        setConfirm({
            title: action === 'confirm' ? '정산 확정' : '정산 반려',
            message: action === 'confirm' ? '제출 금액과 증빙을 확인하고 정산을 확정할까요?' : '입력한 사유로 점주에게 보완을 요청할까요?',
            confirmText: action === 'confirm' ? '확정' : '반려',
            isDanger: action === 'reject',
            onConfirm: () => void runAction(async () => {
                const result = await requestJson<{ readonly scheduleSyncRequired: boolean }>('/api/franchise-owner-portal/settlements', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ requesterId: userId, companyId, companyName, submissionId: submission.id, action, reviewNote })
                });
                return result.scheduleSyncRequired
                    ? { warning: `${action === 'confirm' ? '정산 확정' : '정산 반려'}은 완료됐습니다. 일정 연결은 자동으로 다시 시도합니다.` }
                    : undefined;
            }, action === 'confirm' ? '정산을 확정했습니다.' : '정산을 반려했습니다.')
        });
    };

    const openSettlementFile = async (file: OwnerSettlementFile) => {
        try {
            const params = new URLSearchParams(companyParams);
            params.set('fileId', file.id);
            const data = await requestJson<{ readonly url: string }>(`/api/franchise-owner-portal/settlements/files?${params.toString()}`);
            window.open(data.url, '_blank', 'noopener,noreferrer');
        } catch (caught) {
            setAlert({ type: 'error', title: '파일 열기 실패', message: caught instanceof Error ? caught.message : '증빙 파일을 열지 못했습니다.' });
        }
    };

    return (
        <>
            {activeView === 'reminders' ? (
                <section className={styles.ownerPortalPanel}>
                    <div className={styles.locationMasterHeader}>
                        <div><h3>리마인더</h3><p>체크리스트 이슈와 게시 자료를 기준으로 점주에게 재안내합니다.</p></div>
                    </div>
                    <div className={styles.ownerPhase3Summary}>
                        <div><span>미확인</span><strong>{reminderStats.unacknowledged}</strong></div>
                        <div><span>확인 완료</span><strong>{reminderStats.acknowledged}</strong></div>
                        <div><span>대상 점주</span><strong>{reminderStats.ownerCount}</strong></div>
                    </div>
                    <div className={styles.ownerPortalSplit}>
                        <div className={styles.ownerPortalSubPanel}>
                            <div className={styles.ownerPortalSubHeader}><strong>리마인더 등록</strong><span>원본을 선택하면 발송 가능한 운영점을 확인할 수 있습니다.</span></div>
                            <div className={styles.ownerPhase3Form}>
                                <label>원본 업무<select value={reminderSourceId} onChange={event => selectReminderSource(event.currentTarget.value)}><option value="">원본 선택</option>{reminderSources.map(source => <option key={source.id} value={source.id}>{source.label}</option>)}</select></label>
                                <div className={styles.ownerPortalLocationPicker}>
                                    <div className={styles.ownerPortalLocationPickerHeader}><strong>대상 운영점</strong>{selectedReminderSource?.locationIds.length !== 1 ? <div><button type="button" onClick={() => setReminderLocationIds(selectedReminderSource?.locationIds || [])}>전체</button><button type="button" onClick={() => setReminderLocationIds([])}>해제</button></div> : null}</div>
                                    <div className={styles.ownerPortalLocationOptions}>{(selectedReminderSource?.locationIds || []).map(id => <label key={id}><input type="checkbox" checked={reminderLocationIds.includes(id)} onChange={() => toggleReminderLocation(id)} /><span>{locationName(locations, id)}</span></label>)}</div>
                                </div>
                                <label>안내 문구<textarea className={styles.ownerPortalTextarea} value={reminderMessage} placeholder="비워두면 원본 제목으로 안내합니다." onChange={event => setReminderMessage(event.currentTarget.value)} /></label>
                                <label>확인 기한<input type="datetime-local" value={reminderDueAt} onChange={event => setReminderDueAt(event.currentTarget.value)} /></label>
                                <button className={styles.primarySmallButton} type="button" disabled={isBusy} onClick={createReminder}><BellRing size={14} /> 리마인더 등록</button>
                            </div>
                        </div>
                        <div className={styles.ownerPortalSubPanel}>
                            <div className={styles.ownerPortalSubHeader}><strong>발송 현황</strong><span>점주별 확인 여부를 최신순으로 보여줍니다.</span></div>
                            <div className={styles.ownerPhase3List}>{reminders.length === 0 ? <div className={styles.locationEmpty}>등록된 리마인더가 없습니다.</div> : reminders.map(reminder => <article className={styles.ownerPhase3Item} key={reminder.id}><div className={styles.ownerPhase3ItemHeader}><div><strong>{reminder.message || '확인 요청'}</strong><span>{locationName(locations, reminder.location_id)} · {formatDate(reminder.sent_at)}</span></div><span className={reminder.acknowledged_at ? styles.ownerPortalSuccessPill : styles.ownerPortalWarningPill}>{reminder.acknowledged_at ? '확인 완료' : '미확인'}</span></div><small>확인 기한 {formatDate(reminder.due_at)}</small></article>)}</div>
                        </div>
                    </div>
                </section>
            ) : null}

            {activeView === 'content' ? (
                <section className={styles.ownerPortalPanel}>
                    <div className={styles.locationMasterHeader}><div><h3>자료실</h3><p>교육 자료, 매뉴얼, 공문을 초안으로 준비하고 점주에게 게시합니다.</p></div></div>
                    <div className={styles.ownerPortalSplit}>
                        <div className={styles.ownerPortalSubPanel}>
                            <div className={styles.ownerPortalSubHeader}><strong>{editingContentId ? '자료 수정' : '자료 초안 등록'}</strong><span>{editingContentId ? '게시 중인 자료를 수정하면 새 버전으로 반영됩니다.' : '첨부 파일은 자료와 함께 비공개 저장소에 보관됩니다.'}</span></div>
                            <div className={styles.ownerPhase3Form}>
                                <div className={styles.ownerPhase3FormRow}><label>자료 유형<select value={contentType} onChange={event => setContentType(event.currentTarget.value)}>{CONTENT_TYPE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>대상 운영점<select value={contentLocationId} onChange={event => setContentLocationId(event.currentTarget.value)}><option value="">전체 운영점</option>{locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label></div>
                                <label>분류<input value={contentCategory} placeholder="예: 위생, 서비스, 정책" onChange={event => setContentCategory(event.currentTarget.value)} /></label>
                                <label>제목<input value={contentTitle} onChange={event => setContentTitle(event.currentTarget.value)} /></label>
                                <label>요약<input value={contentSummary} onChange={event => setContentSummary(event.currentTarget.value)} /></label>
                                <label>본문<textarea className={styles.ownerPortalTextarea} value={contentBody} onChange={event => setContentBody(event.currentTarget.value)} /></label>
                                <div className={styles.ownerPhase3FormRow}><label>확인 기한<input type="datetime-local" value={contentDueAt} onChange={event => setContentDueAt(event.currentTarget.value)} /></label><label className={styles.ownerPhase3Check}><input type="checkbox" checked={contentRequiresAck} onChange={event => setContentRequiresAck(event.currentTarget.checked)} />점주 확인 필수</label></div>
                                <label className={styles.ownerPhase3FileButton}><Paperclip size={14} /> 첨부 파일 선택<input type="file" accept={CONTENT_FILE_ACCEPT} multiple onChange={event => selectContentFiles(event.currentTarget.files)} /></label>
                                {contentFiles.length > 0 ? <div className={styles.ownerPhase3SelectedFiles}>{contentFiles.map(file => <span key={`${file.name}-${file.lastModified}`}>{file.name}</span>)}</div> : null}
                                <div className={styles.ownerPhase3Actions}>{editingContentId ? <button type="button" disabled={isBusy} onClick={cancelContentEdit}>취소</button> : null}<button className={styles.primarySmallButton} type="button" disabled={isBusy} onClick={createContent}><FilePlus2 size={14} /> {editingContentId ? '수정 저장' : '초안 저장'}</button></div>
                            </div>
                        </div>
                        <div className={styles.ownerPortalSubPanel}>
                            <div className={styles.ownerPortalSubHeader}><strong>자료 목록</strong><span>초안을 게시하거나 이용이 끝난 자료를 보관합니다.</span></div>
                            <div className={styles.ownerPhase3List}>{contentItems.length === 0 ? <div className={styles.locationEmpty}>등록된 자료가 없습니다.</div> : contentItems.map(item => <article className={styles.ownerPhase3Item} key={item.id}><div className={styles.ownerPhase3ItemHeader}><div><strong>{item.title}</strong><span>{contentTypeLabel(item.content_type)} · {locationName(locations, item.location_id)} · v{item.version}</span></div><span className={item.status === 'published' ? styles.ownerPortalSuccessPill : item.status === 'draft' ? styles.ownerPortalWarningPill : styles.ownerPortalMutedAction}>{contentStatusLabel(item.status)}</span></div>{item.summary ? <p>{item.summary}</p> : null}<div className={styles.ownerPhase3Meta}><span>확인 기한 {formatDate(item.due_at)}</span><span>첨부 {item.attachments.length}건</span>{item.requires_acknowledgement ? <span>확인 {item.receiptStats.acknowledgedCount}/{item.receiptStats.targetCount}명</span> : <span>확인 불필요</span>}</div>{item.attachments.length > 0 ? <div className={styles.ownerPortalFileStrip}>{item.attachments.map(file => <span className={styles.ownerPortalFileGroup} key={file.id}><button className={styles.ownerPortalFileLink} type="button" onClick={() => void openContentFile(file)}><Download size={13} /><span>{file.file_name}</span></button>{item.status !== 'archived' ? <button className={styles.ownerPortalFileDelete} aria-label={`${file.file_name} 삭제`} title="첨부 삭제" type="button" disabled={isBusy} onClick={() => deleteContentFile(item, file)}><Trash2 size={13} /></button> : null}</span>)}</div> : null}<div className={styles.ownerPhase3Actions}>{item.status !== 'archived' ? <button type="button" disabled={isBusy} onClick={() => startContentEdit(item)}>수정</button> : null}{item.status === 'draft' ? <button type="button" disabled={isBusy} onClick={() => updateContentStatus(item, 'publish')}><Send size={13} /> 게시</button> : null}{item.status !== 'archived' ? <button type="button" disabled={isBusy} onClick={() => updateContentStatus(item, 'archive')}><Archive size={13} /> 보관</button> : null}</div></article>)}</div>
                        </div>
                    </div>
                </section>
            ) : null}

            {activeView === 'settlements' ? (
                <section className={styles.ownerPortalPanel}>
                    <div className={styles.locationMasterHeader}><div><h3>정산/증빙</h3><p>운영점에 정산 제출을 요청하고 금액과 증빙 파일을 검토합니다.</p></div></div>
                    <div className={styles.ownerPortalSplit}>
                        <div className={styles.ownerPortalSubPanel}>
                            <div className={styles.ownerPortalSubHeader}><strong>정산 요청 등록</strong><span>전체 또는 특정 운영점에 제출 기한을 안내합니다.</span></div>
                            <div className={styles.ownerPhase3Form}>
                                <label>대상 운영점<select value={settlementLocationId} onChange={event => setSettlementLocationId(event.currentTarget.value)}><option value="">전체 운영점</option>{locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
                                <label>요청 제목<input value={settlementTitle} onChange={event => setSettlementTitle(event.currentTarget.value)} /></label>
                                <div className={styles.ownerPhase3FormRow}><label>정산 시작일<input type="date" value={periodStart} onChange={event => setPeriodStart(event.currentTarget.value)} /></label><label>정산 종료일<input type="date" value={periodEnd} onChange={event => setPeriodEnd(event.currentTarget.value)} /></label></div>
                                <label>제출 기한<input type="datetime-local" value={settlementDueAt} onChange={event => setSettlementDueAt(event.currentTarget.value)} /></label>
                                <label>안내 사항<textarea className={styles.ownerPortalTextarea} value={settlementInstructions} onChange={event => setSettlementInstructions(event.currentTarget.value)} /></label>
                                <button className={styles.primarySmallButton} type="button" disabled={isBusy} onClick={createSettlement}><ReceiptText size={14} /> 제출 요청</button>
                            </div>
                            <div className={styles.ownerPhase3CompactList}>{settlementRequests.map(request => <article key={request.id}><div><strong>{request.title}</strong><span>{locationName(locations, request.location_id)} · {request.period_start}~{request.period_end}</span></div>{request.status === 'open' ? <button type="button" disabled={isBusy} onClick={() => closeSettlement(request)}>마감</button> : <span className={styles.ownerPortalMutedAction}>마감</span>}</article>)}</div>
                        </div>
                        <div className={styles.ownerPortalSubPanel}>
                            <div className={styles.ownerPortalSubHeader}><strong>제출 검토</strong><span>제출된 금액과 증빙을 확인한 후 확정 또는 반려합니다.</span></div>
                            <div className={styles.ownerPhase3List}>{settlementSubmissions.length === 0 ? <div className={styles.locationEmpty}>아직 제출된 정산이 없습니다.</div> : settlementSubmissions.map(submission => { const request = settlementRequests.find(item => item.id === submission.request_id); return <article className={styles.ownerPhase3Item} key={submission.id}><div className={styles.ownerPhase3ItemHeader}><div><strong>{request?.title || '정산 제출'}</strong><span>{locationName(locations, submission.location_id)} · {formatDate(submission.submitted_at)}</span></div><span className={submission.status === 'confirmed' ? styles.ownerPortalSuccessPill : submission.status === 'submitted' ? styles.ownerPortalWarningPill : styles.ownerPortalMutedAction}>{submissionStatusLabel(submission.status)}</span></div><div className={styles.ownerPhase3Amount}>{formatMoney(submission.total_amount)}</div>{submission.note ? <p>{submission.note}</p> : null}{submission.files.length > 0 ? <div className={styles.ownerPortalFileStrip}>{submission.files.map(file => <button className={styles.ownerPortalFileLink} type="button" key={file.id} onClick={() => void openSettlementFile(file)}><Download size={13} /><span>{file.file_name} · {formatFranchiseFileSize(file.file_size)}</span></button>)}</div> : <small>첨부된 증빙이 없습니다.</small>}{submission.status === 'submitted' ? <><label className={styles.ownerPhase3ReviewNote}>검토 메모<textarea value={reviewNotes[submission.id] || ''} placeholder="반려 시 사유를 필수로 입력하세요." onChange={event => setReviewNotes(current => ({ ...current, [submission.id]: event.currentTarget.value }))} /></label><div className={styles.ownerPhase3Actions}><button type="button" disabled={isBusy} onClick={() => reviewSettlement(submission, 'confirm')}><CheckCircle2 size={13} /> 확정</button><button type="button" disabled={isBusy} onClick={() => reviewSettlement(submission, 'reject')}><XCircle size={13} /> 반려</button></div></> : null}</article>; })}</div>
                        </div>
                    </div>
                </section>
            ) : null}

            <ConfirmModal isOpen={confirm !== null} title={confirm?.title} message={confirm?.message || ''} confirmText={confirm?.confirmText} isDanger={confirm?.isDanger} onClose={() => setConfirm(null)} onConfirm={() => confirm?.onConfirm()} />
            <AlertModal isOpen={alert !== null} title={alert?.title} message={alert?.message || ''} type={alert?.type} onClose={() => setAlert(null)} />
        </>
    );
}
