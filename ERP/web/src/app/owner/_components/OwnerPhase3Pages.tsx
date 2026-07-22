"use client";

import React from 'react';
import { BellRing, Check, Download, FileText, Paperclip, Search, Send, Trash2, Upload, X } from 'lucide-react';
import { AlertModal } from '@/components/common/AlertModal';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import type { OwnerContentType, OwnerSettlementStatus } from '@/lib/franchise-owner-phase3';
import type { OwnerReminderRow } from '@/lib/franchise-owner-reminders';
import {
    retainOwnerSettlementFilesAfterMutation,
    shouldHydrateOwnerSettlementDraft,
    type OwnerSettlementFileRow,
    type OwnerSettlementRequestRow,
    type OwnerSettlementSubmissionRow
} from '@/lib/franchise-owner-settlements';
import styles from '../owner.module.css';
import { formatOwnerDate, OwnerPortalFrame, readOwnerApiData } from './ownerPortalShared';

type AlertState = { readonly type: 'success' | 'error' | 'info'; readonly title: string; readonly message: string };
type ContentAttachment = { readonly id: string; readonly file_name: string; readonly file_size: number };
type ContentItem = {
    readonly id: string;
    readonly content_type: OwnerContentType;
    readonly category: string;
    readonly title: string;
    readonly summary: string;
    readonly body: string;
    readonly version: number;
    readonly requires_acknowledgement: boolean;
    readonly viewed_at: string | null;
    readonly acknowledged_at: string | null;
    readonly due_at: string | null;
    readonly published_at: string | null;
    readonly attachments: readonly ContentAttachment[];
};
type SettlementSubmission = OwnerSettlementSubmissionRow & { readonly files: readonly OwnerSettlementFileRow[] };
type SettlementRequest = OwnerSettlementRequestRow & { readonly submission: SettlementSubmission | null };
type DeleteIntent = { readonly fileId: string; readonly fileName: string; readonly requestId: string };
type PendingSettlementFile = { readonly clientFileId: string; readonly file: File };

const CONTENT_TYPES = [
    { value: 'all', label: '전체' },
    { value: 'education', label: '교육' },
    { value: 'manual', label: '매뉴얼' },
    { value: 'official_document', label: '공문' },
    { value: 'corrective_action', label: '시정조치' },
    { value: 'contract_document', label: '계약 문서' }
] as const;
type ContentFilter = (typeof CONTENT_TYPES)[number]['value'];
const FILE_ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.hwp,.hwpx';

function dateTime(value: string | null): string {
    return value ? new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '-';
}

function fileSize(value: number): string {
    return value < 1024 * 1024 ? `${Math.max(1, Math.round(value / 1024))}KB` : `${(value / 1024 / 1024).toFixed(1)}MB`;
}

function contentLabel(value: OwnerContentType): string {
    return CONTENT_TYPES.find(option => option.value === value)?.label || '자료';
}

function contentReceiptLabel(item: Pick<ContentItem, 'requires_acknowledgement' | 'acknowledged_at'>): string {
    if (!item.requires_acknowledgement) return '수신 확인 불필요';
    return item.acknowledged_at ? '수신 확인 완료' : '수신 확인 필요';
}

function contentReceiptClassName(item: Pick<ContentItem, 'requires_acknowledgement' | 'acknowledged_at'>): string {
    if (!item.requires_acknowledgement) return styles.receiptListOptional;
    return item.acknowledged_at ? styles.receiptListStatus : styles.receiptListPending;
}

function settlementLabel(value: OwnerSettlementStatus | 'open' | 'closed'): string {
    if (value === 'open') return '접수 중';
    if (value === 'closed') return '마감';
    if (value === 'draft') return '임시저장';
    if (value === 'submitted') return '제출 완료';
    if (value === 'rejected') return '반려';
    return '확정';
}

function caughtMessage(caught: unknown, fallback: string): string {
    return caught instanceof Error ? caught.message : fallback;
}

export function OwnerRemindersPage() {
    return <OwnerPortalFrame activeKey="reminders">{() => <Reminders />}</OwnerPortalFrame>;
}

function Reminders() {
    const [filter, setFilter] = React.useState<'unacknowledged' | 'all'>('unacknowledged');
    const [rows, setRows] = React.useState<readonly OwnerReminderRow[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState('');
    const [savingId, setSavingId] = React.useState('');
    const [alert, setAlert] = React.useState<AlertState | null>(null);
    const loadSequenceRef = React.useRef(0);

    const load = React.useCallback(async () => {
        const sequence = ++loadSequenceRef.current;
        setLoading(true);
        setError('');
        try {
            const suffix = filter === 'all' ? '?status=all' : '';
            const data = await readOwnerApiData<{ readonly reminders: readonly OwnerReminderRow[] }>(await fetch(`/api/owner/reminders${suffix}`, { cache: 'no-store' }));
            if (sequence !== loadSequenceRef.current) return;
            setRows(data.reminders);
        } catch (caught) {
            if (sequence !== loadSequenceRef.current) return;
            setError(caughtMessage(caught, '리마인더를 불러오지 못했습니다.'));
        } finally {
            if (sequence === loadSequenceRef.current) setLoading(false);
        }
    }, [filter]);

    React.useEffect(() => { void load(); }, [load]);

    const acknowledge = async (id: string) => {
        setSavingId(id);
        try {
            await readOwnerApiData(await fetch('/api/owner/reminders', {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action: 'acknowledge' })
            }));
            await load();
            setAlert({ type: 'success', title: '확인 완료', message: '리마인더를 확인 처리했습니다.' });
        } catch (caught) {
            setAlert({ type: 'error', title: '확인 실패', message: caughtMessage(caught, '리마인더를 확인 처리하지 못했습니다.') });
        } finally {
            setSavingId('');
        }
    };

    return <>
        <section className={styles.panel}>
            <div className={styles.panelHeader}><div><h1>리마인더</h1><p>본사에서 보낸 운영 확인 요청을 확인합니다.</p></div><span className={styles.badge}>{rows.length}건</span></div>
            <div className={styles.panelBody}>
                <div className={styles.segmentedControl} aria-label="리마인더 보기">
                    <button type="button" className={filter === 'unacknowledged' ? styles.segmentActive : ''} onClick={() => setFilter('unacknowledged')}>미확인</button>
                    <button type="button" className={filter === 'all' ? styles.segmentActive : ''} onClick={() => setFilter('all')}>전체</button>
                </div>
                {error ? <div className={styles.error}>{error}</div> : null}
                {loading ? <div className={styles.emptyState}>리마인더를 불러오는 중입니다.</div> : null}
                {!loading && rows.length === 0 ? <div className={styles.emptyState}>{filter === 'all' ? '받은 리마인더가 없습니다.' : '확인할 리마인더가 없습니다.'}</div> : null}
                <div className={styles.phase3List}>{rows.map(row => <article className={`${styles.phase3ListItem} ${row.acknowledged_at ? styles.phase3ListItemMuted : ''}`} key={row.id}>
                    <div className={styles.phase3ItemIcon}><BellRing size={18} /></div>
                    <div className={styles.phase3ItemMain}><div className={styles.phase3ItemTitle}><strong>{row.message || '운영 확인이 필요합니다.'}</strong><span className={row.acknowledged_at ? styles.badgeMuted : styles.badge}>{row.acknowledged_at ? '확인 완료' : '미확인'}</span></div><span className={styles.itemMeta}>발송 {dateTime(row.sent_at)}{row.due_at ? ` · 기한 ${dateTime(row.due_at)}` : ''}</span></div>
                    {!row.acknowledged_at ? <button className={styles.secondaryButton} type="button" disabled={savingId === row.id} onClick={() => void acknowledge(row.id)}><Check size={15} /> 확인</button> : null}
                </article>)}</div>
            </div>
        </section>
        <AlertModal isOpen={alert !== null} type={alert?.type} title={alert?.title} message={alert?.message || ''} onClose={() => setAlert(null)} />
    </>;
}

export function OwnerResourcesPage() {
    return <OwnerPortalFrame activeKey="resources">{() => <Resources />}</OwnerPortalFrame>;
}

function Resources() {
    const [items, setItems] = React.useState<readonly ContentItem[]>([]);
    const [selectedId, setSelectedId] = React.useState('');
    const [query, setQuery] = React.useState('');
    const [type, setType] = React.useState<ContentFilter>('all');
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState('');
    const [acknowledgingId, setAcknowledgingId] = React.useState('');
    const viewingIdsRef = React.useRef(new Set<string>());
    const [alert, setAlert] = React.useState<AlertState | null>(null);

    React.useEffect(() => {
        const load = async () => {
            try {
                const data = await readOwnerApiData<{ readonly items?: readonly ContentItem[]; readonly content?: readonly ContentItem[] }>(await fetch('/api/owner/content', { cache: 'no-store' }));
                const next = data.items || data.content || [];
                setItems(next);
                setSelectedId('');
            } catch (caught) {
                setError(caughtMessage(caught, '자료를 불러오지 못했습니다.'));
            } finally {
                setLoading(false);
            }
        };
        void load();
    }, []);

    const acknowledge = async (content: Pick<ContentItem, 'id' | 'version'>) => {
        setAcknowledgingId(content.id);
        try {
            const data = await readOwnerApiData<{ readonly receipt: { readonly acknowledged_at: string | null; readonly viewed_at: string | null } }>(await fetch('/api/owner/content', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contentId: content.id, contentVersion: content.version, action: 'acknowledge' })
            }));
            setItems(current => current.map(item => item.id === content.id && item.version === content.version ? {
                ...item,
                acknowledged_at: data.receipt.acknowledged_at,
                viewed_at: data.receipt.viewed_at
            } : item));
            setAlert({ type: 'success', title: '수신 확인 완료', message: '자료를 확인 처리했습니다.' });
        } catch (caught) {
            const message = caught instanceof Error ? caught.message : '자료를 확인 처리하지 못했습니다.';
            setAlert({ type: 'error', title: '수신 확인 실패', message });
        } finally {
            setAcknowledgingId('');
        }
    };

    const selectContent = (item: ContentItem) => {
        setSelectedId(item.id);
        const receiptKey = `${item.id}:${item.version}`;
        if (item.viewed_at || viewingIdsRef.current.has(receiptKey)) return;
        viewingIdsRef.current.add(receiptKey);
        void fetch('/api/owner/content', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contentId: item.id, contentVersion: item.version, action: 'view' })
        }).then(response => readOwnerApiData<{ readonly receipt: { readonly viewed_at: string | null } }>(response)).then(data => {
            setItems(current => current.map(row => row.id === item.id && row.version === item.version
                ? { ...row, viewed_at: data.receipt.viewed_at }
                : row));
        }).catch(() => {
            setAlert({
                type: 'error',
                title: '열람 기록 실패',
                message: '열람 기록을 저장하지 못했습니다. 네트워크를 확인한 뒤 이 자료를 다시 선택해주세요.'
            });
        }).finally(() => viewingIdsRef.current.delete(receiptKey));
    };

    const needle = query.trim().toLocaleLowerCase('ko-KR');
    const filtered = items.filter(item => (type === 'all' || item.content_type === type) && (!needle || `${item.title} ${item.summary} ${item.category}`.toLocaleLowerCase('ko-KR').includes(needle)));
    const selected = filtered.find(item => item.id === selectedId) || null;

    return <section className={styles.panel}>
        <div className={styles.panelHeader}><div><h1>자료실</h1><p>본사 교육 자료, 매뉴얼, 공문과 계약 문서를 확인합니다.</p></div><span className={styles.badge}>{filtered.length}건</span></div>
        <div className={styles.panelBody}>
            <div className={styles.resourceFilters}>
                <label className={styles.searchField}><Search size={16} /><input value={query} onChange={event => setQuery(event.currentTarget.value)} placeholder="제목, 요약, 분류 검색" aria-label="자료 검색" />{query ? <button type="button" aria-label="검색어 지우기" title="검색어 지우기" onClick={() => setQuery('')}><X size={15} /></button> : <span />}</label>
                <select className={styles.select} value={type} onChange={event => setType(event.currentTarget.value as ContentFilter)} aria-label="자료 유형">{CONTENT_TYPES.map(option => <option value={option.value} key={option.value}>{option.label}</option>)}</select>
            </div>
            {error ? <div className={styles.error}>{error}</div> : null}
            {loading ? <div className={styles.emptyState}>자료를 불러오는 중입니다.</div> : null}
            {!loading && filtered.length === 0 ? <div className={styles.emptyState}>조건에 맞는 자료가 없습니다.</div> : null}
            {filtered.length > 0 ? <div className={styles.resourceLayout}>
                <div className={styles.resourceList}>{filtered.map(item => <button className={`${styles.resourceListButton} ${selected?.id === item.id ? styles.resourceListButtonActive : ''}`} type="button" key={item.id} onClick={() => selectContent(item)}><span>{contentLabel(item.content_type)}{item.category ? ` · ${item.category}` : ''}</span><strong>{item.title}</strong><small>{item.summary || `버전 ${item.version}`}</small><em className={contentReceiptClassName(item)}>{contentReceiptLabel(item)}</em></button>)}</div>
                {selected ? <ResourceDetail item={selected} isAcknowledging={acknowledgingId === selected.id} onAcknowledge={acknowledge} /> : <div className={styles.resourceDetail}><div className={styles.emptyState}>왼쪽 목록에서 확인할 자료를 선택해주세요.</div></div>}
            </div> : null}
        </div>
        <AlertModal isOpen={alert !== null} type={alert?.type} title={alert?.title} message={alert?.message || ''} onClose={() => setAlert(null)} />
    </section>;
}

function ResourceDetail({ item, isAcknowledging, onAcknowledge }: { readonly item: ContentItem; readonly isAcknowledging: boolean; readonly onAcknowledge: (item: Pick<ContentItem, 'id' | 'version'>) => Promise<void> }) {
    const receiptClassName = !item.requires_acknowledgement ? styles.receiptStatusOptional : item.acknowledged_at ? styles.receiptStatusDone : styles.receiptStatusRequired;
    return <article className={styles.resourceDetail}>
        <div className={styles.resourceDetailHeader}><div><span className={styles.badge}>{contentLabel(item.content_type)}</span><h2>{item.title}</h2><p>{item.summary}</p></div><span className={styles.itemMeta}>버전 {item.version} · {formatOwnerDate(item.published_at)}</span></div>
        {item.due_at ? <div className={styles.warning}>확인 기한 {dateTime(item.due_at)}</div> : null}
        <div className={`${styles.receiptStatus} ${receiptClassName}`} aria-live="polite"><div><strong>{contentReceiptLabel(item)}</strong><span>{!item.requires_acknowledgement ? '이 자료는 별도 수신 확인이 필요하지 않습니다.' : item.acknowledged_at ? `${dateTime(item.acknowledged_at)} 확인 처리했습니다.` : '내용을 확인한 뒤 수신 확인을 처리해주세요.'}</span></div>{item.requires_acknowledgement && !item.acknowledged_at ? <button className={styles.secondaryButton} type="button" disabled={isAcknowledging} onClick={() => void onAcknowledge(item)}><Check size={15} /> {isAcknowledging ? '처리 중' : '확인 처리'}</button> : null}</div>
        <div className={styles.resourceBody}>{item.body || '본문 내용이 없습니다.'}</div>
        {item.attachments.length > 0 ? <div className={styles.attachmentList}><strong>첨부 파일</strong>{item.attachments.map(file => <a className={styles.attachmentRow} href={`/api/owner/content/attachments?fileId=${encodeURIComponent(file.id)}`} key={file.id}><FileText size={17} /><span>{file.file_name}</span><small>{fileSize(file.file_size)}</small><Download size={16} /></a>)}</div> : null}
    </article>;
}

export function OwnerSettlementsPage() {
    return <OwnerPortalFrame activeKey="settlements">{() => <Settlements />}</OwnerPortalFrame>;
}

function Settlements() {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const hydratedRequestIdRef = React.useRef('');
    const [requests, setRequests] = React.useState<readonly SettlementRequest[]>([]);
    const [selectedId, setSelectedId] = React.useState('');
    const [amount, setAmount] = React.useState('');
    const [note, setNote] = React.useState('');
    const [files, setFiles] = React.useState<readonly PendingSettlementFile[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState('');
    const [alert, setAlert] = React.useState<AlertState | null>(null);
    const [deleteIntent, setDeleteIntent] = React.useState<DeleteIntent | null>(null);
    const [deletingFileId, setDeletingFileId] = React.useState('');

    const load = React.useCallback(async () => {
        setLoading(true);
        try {
            const data = await readOwnerApiData<{ readonly requests: readonly SettlementRequest[] }>(await fetch('/api/owner/settlements', { cache: 'no-store' }));
            setRequests(data.requests);
            setSelectedId(current => current || data.requests[0]?.id || '');
        } catch (caught) {
            setError(caughtMessage(caught, '정산 요청을 불러오지 못했습니다.'));
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => { void load(); }, [load]);
    const selected = requests.find(request => request.id === selectedId) || requests[0] || null;
    React.useEffect(() => {
        const nextRequestId = selected?.id || '';
        if (!shouldHydrateOwnerSettlementDraft(hydratedRequestIdRef.current, nextRequestId)) return;
        hydratedRequestIdRef.current = nextRequestId;
        setAmount(selected ? String(selected.submission?.total_amount ?? '') : '');
        setNote(selected?.submission?.note || '');
        setFiles([]);
    }, [selected]);
    const mutable = Boolean(selected && selected.status === 'open' && (!selected.submission || selected.submission.status === 'draft' || selected.submission.status === 'rejected'));

    const upload = async (submissionId: string) => {
        for (const pending of files) {
            const form = new FormData();
            form.set('submissionId', submissionId);
            form.set('clientFileId', pending.clientFileId);
            form.set('file', pending.file);
            await readOwnerApiData(await fetch('/api/owner/settlements/files', { method: 'POST', body: form }));
            setFiles(current => current.filter(file => file.clientFileId !== pending.clientFileId));
        }
    };

    const deleteSettlementFile = async (intent: DeleteIntent) => {
        setDeletingFileId(intent.fileId);
        try {
            await readOwnerApiData(await fetch(`/api/owner/settlements/files?fileId=${encodeURIComponent(intent.fileId)}`, {
                method: 'DELETE'
            }));
            setRequests(current => current.map(request => request.id === intent.requestId && request.submission ? {
                ...request,
                submission: { ...request.submission, files: request.submission.files.filter(file => file.id !== intent.fileId) }
            } : request));
            setDeleteIntent(null);
            setAlert({ type: 'success', title: '파일 삭제 완료', message: `${intent.fileName} 증빙 파일을 삭제했습니다.` });
        } catch (caught) {
            const message = caught instanceof Error ? caught.message : '증빙 파일을 삭제하지 못했습니다.';
            setAlert({ type: 'error', title: '파일 삭제 실패', message });
        } finally {
            setDeletingFileId('');
        }
    };

    const mutate = async (action: 'save' | 'submit') => {
        if (!selected) return;
        setSaving(true);
        setError('');
        try {
            let mutation = await readOwnerApiData<{
                readonly scheduleSyncRequired: boolean;
                readonly submission: OwnerSettlementSubmissionRow;
            }>(await fetch('/api/owner/settlements', {
                method: selected.submission ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    requestId: selected.id,
                    action: files.length ? 'save' : action,
                    totalAmount: amount,
                    note,
                    expectedUpdatedAt: selected.submission?.updated_at ?? null
                })
            }));
            setRequests(current => current.map(request => request.id === selected.id
                ? {
                    ...request,
                    submission: retainOwnerSettlementFilesAfterMutation(
                        mutation.submission,
                        request.submission?.files || []
                    )
                }
                : request));
            if (files.length) await upload(mutation.submission.id);
            if (action === 'submit' && files.length) mutation = await readOwnerApiData(await fetch('/api/owner/settlements', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    requestId: selected.id,
                    action: 'submit',
                    totalAmount: amount,
                    note,
                    expectedUpdatedAt: mutation.submission.updated_at
                })
            }));
            setFiles([]);
            await load();
            setAlert(mutation.scheduleSyncRequired
                ? { type: 'info', title: '제출 완료', message: '정산 자료는 제출됐습니다. 본사 일정 연결은 자동으로 다시 시도합니다.' }
                : { type: 'success', title: action === 'submit' ? '제출 완료' : '임시저장 완료', message: action === 'submit' ? '정산 자료를 본사에 제출했습니다.' : '작성 중인 정산 내용과 첨부 파일을 저장했습니다.' });
        } catch (caught) {
            const message = caughtMessage(caught, '정산을 저장하지 못했습니다.');
            setError(message);
            setAlert({ type: 'error', title: '처리 실패', message });
        } finally {
            setSaving(false);
        }
    };

    return <>
        <section className={styles.panel}>
            <div className={styles.panelHeader}><div><h1>정산 제출</h1><p>본사 정산 요청별 금액과 증빙 파일을 제출합니다.</p></div><span className={styles.badge}>{requests.length}건</span></div>
            <div className={styles.panelBody}>
                {error ? <div className={styles.error}>{error}</div> : null}
                {loading ? <div className={styles.emptyState}>정산 요청을 불러오는 중입니다.</div> : null}
                {!loading && requests.length === 0 ? <div className={styles.emptyState}>도착한 정산 요청이 없습니다.</div> : null}
                {selected ? <div className={styles.settlementLayout}>
                    <div className={styles.settlementRequestList}>{requests.map(request => <button className={`${styles.settlementRequestButton} ${selected.id === request.id ? styles.settlementRequestButtonActive : ''}`} type="button" key={request.id} onClick={() => setSelectedId(request.id)}><span>{formatOwnerDate(request.period_start)} - {formatOwnerDate(request.period_end)}</span><strong>{request.title}</strong><small>기한 {dateTime(request.due_at)}</small><em>{settlementLabel(request.submission?.status || request.status)}</em></button>)}</div>
                    <div className={styles.settlementEditor}>
                        <div className={styles.settlementEditorHeader}><div><h2>{selected.title}</h2><p>{selected.instructions || '정산 금액과 증빙 파일을 확인해 제출해주세요.'}</p></div><span className={selected.submission?.status === 'rejected' ? styles.badgeDanger : styles.badgeMuted}>{settlementLabel(selected.submission?.status || selected.status)}</span></div>
                        {selected.submission?.status === 'rejected' ? <div className={styles.rejectedNotice}><strong>반려 사유</strong><p>{selected.submission.review_note || '본사에 반려 사유를 문의해주세요.'}</p></div> : null}
                        <label className={styles.field}>정산 금액<div className={styles.amountField}><input className={styles.input} inputMode="decimal" value={amount} disabled={!mutable} onChange={event => setAmount(event.currentTarget.value)} placeholder="0" /><span>원</span></div></label>
                        <label className={styles.field}>전달 메모<textarea className={styles.textarea} value={note} disabled={!mutable} onChange={event => setNote(event.currentTarget.value)} placeholder="정산 관련 참고사항을 입력하세요." /></label>
                        <div className={styles.settlementFiles}>
                            <div className={styles.fileUploadHeader}><div><strong>증빙 파일</strong><span>이미지, PDF, 오피스 문서 · 파일당 10MB · 최대 10개</span></div>{mutable ? <button className={styles.secondaryButton} type="button" onClick={() => inputRef.current?.click()}><Upload size={15} /> 파일 선택</button> : null}</div>
                            <input ref={inputRef} className={styles.fileInput} type="file" accept={FILE_ACCEPT} multiple onChange={event => { const selectedFiles = Array.from(event.currentTarget.files || []); setFiles(current => { const available = Math.max(0, 10 - (selected.submission?.files.length || 0) - current.length); return [...current, ...selectedFiles.slice(0, available).map(file => ({ clientFileId: crypto.randomUUID(), file }))]; }); event.currentTarget.value = ''; }} />
                            {selected.submission?.files.map(file => <div className={styles.settlementFileRow} key={file.id}><a className={styles.attachmentRow} href={`/api/owner/settlements/files?fileId=${encodeURIComponent(file.id)}`}><Paperclip size={16} /><span>{file.file_name}</span><small>{fileSize(file.file_size)}</small><Download size={16} /></a>{mutable ? <button className={styles.fileDeleteButton} type="button" disabled={deletingFileId === file.id} aria-label={`${file.file_name} 삭제`} title="증빙 파일 삭제" onClick={() => setDeleteIntent({ fileId: file.id, fileName: file.file_name, requestId: selected.id })}><Trash2 size={16} /></button> : null}</div>)}
                            {files.map(pending => <div className={styles.pendingFileRow} key={pending.clientFileId}><Paperclip size={16} /><span>{pending.file.name}</span><small>{fileSize(pending.file.size)}</small><button type="button" aria-label={`${pending.file.name} 제거`} title="선택 파일 제거" onClick={() => setFiles(current => current.filter(file => file.clientFileId !== pending.clientFileId))}><X size={15} /></button></div>)}
                            {!selected.submission?.files.length && files.length === 0 ? <div className={styles.fileEmpty}>첨부된 증빙 파일이 없습니다.</div> : null}
                        </div>
                        {mutable ? <div className={styles.actionRow}><button className={styles.secondaryButton} type="button" disabled={saving} onClick={() => void mutate('save')}>임시저장</button><button className={styles.button} type="button" disabled={saving} onClick={() => void mutate('submit')}><Send size={15} /> 본사 제출</button></div> : null}
                    </div>
                </div> : null}
            </div>
        </section>
        <ConfirmModal
            isOpen={deleteIntent !== null}
            title="증빙 파일을 삭제할까요?"
            message={deleteIntent ? `${deleteIntent.fileName} 파일을 삭제합니다. 삭제 후에는 복구할 수 없습니다.` : ''}
            confirmText="삭제"
            cancelText="취소"
            isDanger
            onClose={() => setDeleteIntent(null)}
            onConfirm={() => { if (deleteIntent) void deleteSettlementFile(deleteIntent); }}
        />
        <AlertModal isOpen={alert !== null} type={alert?.type} title={alert?.title} message={alert?.message || ''} onClose={() => setAlert(null)} />
    </>;
}
