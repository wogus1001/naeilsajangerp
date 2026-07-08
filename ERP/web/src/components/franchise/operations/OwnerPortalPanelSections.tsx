"use client";

import React from 'react';
import { Copy, KeyRound, Send, UserRound } from 'lucide-react';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import {
    DEFAULT_OWNER_PORTAL_CHECKLIST_TASKS,
    getOwnerSubmissionReviewMode,
    normalizeOwnerPortalChecklistTasks,
    type OwnerPortalChecklistTask
} from '@/lib/franchise-owner-portal';
import type { FranchiseLocation } from './types';

const OWNER_PORTAL_NOTICE_PAGE_SIZE = 5;
const OWNER_PORTAL_SUBMISSION_PAGE_SIZE = 5;

export type OwnerAccount = {
    readonly id: string;
    readonly locationId: string;
    readonly loginId: string;
    readonly ownerName: string;
    readonly ownerPhone: string;
    readonly status: string;
    readonly temporaryPassword: boolean;
};

export type OwnerSubmission = {
    readonly id: string;
    readonly location_id: string;
    readonly submission_type: string;
    readonly title: string;
    readonly body: string | null;
    readonly payload: unknown;
    readonly status: string;
    readonly review_note: string | null;
    readonly created_at: string | null;
    readonly files?: readonly OwnerSubmissionFile[];
};

export type OwnerSubmissionFile = {
    readonly id: string;
    readonly file_name: string;
    readonly mime_type: string;
    readonly file_size: number | null;
    readonly public_url: string | null;
};

export type OwnerNoticeRecipient = {
    readonly ownerAccountId: string;
    readonly locationId: string;
    readonly ownerName: string;
    readonly loginId: string;
    readonly status: string;
    readonly readAt: string | null;
};

export type OwnerNotice = {
    readonly id: string;
    readonly location_id: string | null;
    readonly title: string;
    readonly body: string;
    readonly status: string | null;
    readonly created_at: string | null;
    readonly targetCount: number;
    readonly readCount: number;
    readonly unreadCount: number;
    readonly recipients: readonly OwnerNoticeRecipient[];
};

export type OwnerChecklistSetting = {
    readonly locationId: string;
    readonly locationName: string;
    readonly address: string;
    readonly status: string;
    readonly tasks: readonly OwnerPortalChecklistTask[];
};

export type OwnerPortalView = 'accounts' | 'notices' | 'checklists' | 'submissions';

export const OWNER_PORTAL_VIEWS: readonly {
    readonly key: OwnerPortalView;
    readonly label: string;
    readonly description: string;
}[] = [
    { key: 'notices', label: '공지/공문', description: '운영점 점주에게 공지를 발행합니다.' },
    { key: 'checklists', label: '체크리스트', description: '점주 운영 체크리스트를 세팅합니다.' },
    { key: 'submissions', label: '제출 처리', description: '점주 요청과 제출 건을 처리합니다.' },
    { key: 'accounts', label: '점주 계정 설정', description: '발급, 재발급, 중지 상태를 관리합니다.' }
];

type ViewTabProps = {
    readonly activeView: OwnerPortalView;
    readonly accountsCount: number;
    readonly checklistsCount: number;
    readonly noticesCount: number;
    readonly submissionsCount: number;
    readonly onChange: (view: OwnerPortalView) => void;
};

export function OwnerPortalViewTabs({ activeView, accountsCount, checklistsCount, noticesCount, submissionsCount, onChange }: ViewTabProps) {
    const countByView: Record<OwnerPortalView, string> = {
        accounts: `${accountsCount}건`,
        checklists: `${checklistsCount}건`,
        notices: `${noticesCount}건`,
        submissions: `${submissionsCount}건`
    };

    return (
        <div className={styles.ownerPortalViewTabs} role="tablist" aria-label="점주 소통 업무">
            {OWNER_PORTAL_VIEWS.map(view => {
                const isActive = activeView === view.key;
                return (
                    <button
                        key={view.key}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        className={isActive ? styles.ownerPortalViewTabActive : styles.ownerPortalViewTab}
                        onClick={() => onChange(view.key)}
                    >
                        <span>{view.label}</span>
                        <small>{countByView[view.key]}</small>
                    </button>
                );
            })}
        </div>
    );
}

type StatusMessageProps = {
    readonly message: string;
    readonly error: string;
};

export function OwnerPortalStatusMessages({ message, error }: StatusMessageProps) {
    if (!message && !error) return null;
    return (
        <>
            {message ? (
                <div className={styles.ownerPortalNotice}>
                    {message}
                    <button type="button" onClick={() => void navigator.clipboard?.writeText(message)}>
                        <Copy size={13} /> 복사
                    </button>
                </div>
            ) : null}
            {error ? <div className={styles.ownerPortalError}>{error}</div> : null}
        </>
    );
}

function formatDate(value: string | null): string {
    if (!value) return '-';
    return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium' }).format(new Date(value));
}

function formatDateTime(value: string | null): string {
    if (!value) return '-';
    return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function getLocationName(locations: readonly FranchiseLocation[], locationId: string): string {
    return locations.find(location => location.id === locationId)?.name || '운영점';
}

function getSubmissionStatusLabel(status: string): string {
    if (status === 'approved') return '승인';
    if (status === 'rejected') return '반려';
    if (status === 'resolved') return '처리 완료';
    return '접수';
}

function getSubmissionTypeLabel(type: string): string {
    if (type === 'store_info') return '매장 정보';
    if (type === 'opening_task_completion') return '운영 체크리스트';
    if (type === 'facility_request') return '시설/고장 문의';
    if (type === 'general_request') return '일반 문의';
    return '기타 제출';
}

function isPendingOwnerSubmission(submission: OwnerSubmission): boolean {
    return getOwnerSubmissionReviewMode(submission.submission_type, submission.status) !== 'none';
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readTextField(record: Record<string, unknown>, key: string): string {
    const value = record[key];
    return typeof value === 'string' ? value.trim() : '';
}

function getSubmissionPayloadTitle(submission: OwnerSubmission): string {
    if (!isRecord(submission.payload)) return '';
    return readTextField(submission.payload, 'title') || readTextField(submission.payload, 'taskTitle');
}

function getSubmissionDetailRows(submission: OwnerSubmission): readonly { readonly label: string; readonly value: string }[] {
    const payload = isRecord(submission.payload) ? submission.payload : {};
    if (submission.submission_type === 'facility_request' || submission.submission_type === 'general_request') {
        return [
            { label: '문의 제목', value: getSubmissionPayloadTitle(submission) || submission.title },
            { label: '문의 내용', value: submission.body?.trim() || '내용 없음' }
        ];
    }
    if (submission.submission_type === 'opening_task_completion') {
        return [
            { label: '체크리스트 항목', value: readTextField(payload, 'taskTitle') || readTextField(payload, 'taskId') || '항목 미확인' },
            { label: '요청 메모', value: submission.body?.trim() || '메모 없음' }
        ];
    }
    if (submission.submission_type === 'store_info') {
        const fields = [
            ['사업자등록번호', 'businessNumber'],
            ['대표자명', 'representativeName'],
            ['연락처', 'contactPhone'],
            ['보증금', 'deposit'],
            ['월세', 'monthlyRent'],
            ['관리비', 'maintenanceFee'],
            ['평수', 'storeArea'],
            ['테이블 수', 'tableCount'],
            ['좌석 수', 'seatCount'],
            ['비고', 'memo']
        ] as const;
        return fields
            .map(([label, key]) => ({ label, value: readTextField(payload, key) }))
            .filter(row => row.value.length > 0);
    }
    return [{ label: '제출 내용', value: submission.body?.trim() || submission.review_note?.trim() || '내용 없음' }];
}

type AccountSectionProps = {
    readonly locations: readonly FranchiseLocation[];
    readonly accounts: readonly OwnerAccount[];
    readonly locationId: string;
    readonly loginId: string;
    readonly ownerName: string;
    readonly ownerPhone: string;
    readonly isBusy: boolean;
    readonly onLocationChange: (locationId: string) => void;
    readonly onLoginIdChange: (value: string) => void;
    readonly onOwnerNameChange: (value: string) => void;
    readonly onOwnerPhoneChange: (value: string) => void;
    readonly onCreateAccount: () => void;
    readonly onResetPassword: (accountId: string) => void;
    readonly onUpdateStatus: (accountId: string, action: 'activate' | 'suspend') => void;
};

export function OwnerPortalAccountsSection(props: AccountSectionProps) {
    return (
        <section className={styles.ownerPortalPanel}>
            <div className={styles.locationMasterHeader}>
                <div>
                    <h3>점주 계정 관리</h3>
                    <p>운영점별 계정을 발급하고, 비밀번호 재발급과 중지 상태를 관리합니다.</p>
                </div>
            </div>
            <div className={styles.ownerPortalSplit}>
                <div className={styles.ownerPortalSubPanel}>
                    <div className={styles.ownerPortalSubHeader}>
                        <strong>신규 계정 발급</strong>
                        <span>아이디를 비워두면 자동 생성됩니다.</span>
                    </div>
                    <div className={styles.ownerPortalForm}>
                        <label className={styles.locationSortControl}>
                            운영점
                            <select value={props.locationId} onChange={event => props.onLocationChange(event.currentTarget.value)}>
                                {props.locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}
                            </select>
                        </label>
                        <input className={styles.locationListSearch} value={props.loginId} placeholder="점주 아이디 직접 입력 또는 자동 생성" onChange={event => props.onLoginIdChange(event.currentTarget.value)} />
                        <input className={styles.locationListSearch} value={props.ownerName} placeholder="점주명" onChange={event => props.onOwnerNameChange(event.currentTarget.value)} />
                        <input className={styles.locationListSearch} value={props.ownerPhone} placeholder="점주 연락처" onChange={event => props.onOwnerPhoneChange(event.currentTarget.value)} />
                        <button className={styles.primarySmallButton} type="button" disabled={props.isBusy || !props.locationId} onClick={props.onCreateAccount}>
                            <UserRound size={14} /> 계정 생성
                        </button>
                    </div>
                </div>
                <div className={styles.ownerPortalSubPanel}>
                    <div className={styles.ownerPortalSubHeader}>
                        <strong>점주 계정 목록</strong>
                        <span>활성/중지 상태와 임시 비밀번호 여부를 확인합니다.</span>
                    </div>
                    <div className={`${styles.locationList} ${styles.ownerPortalSectionList}`}>
                        {props.accounts.length === 0 ? <div className={styles.locationEmpty}>발급된 점주 계정이 없습니다.</div> : null}
                        {props.accounts.map(account => (
                            <article className={`${styles.locationItem} ${styles.ownerPortalListItem}`} key={account.id}>
                                <div className={styles.locationItemMain}>
                                    <strong>{getLocationName(props.locations, account.locationId)}</strong>
                                    <span>{account.loginId} · {account.ownerName || '점주명 미입력'} · {account.status}</span>
                                    <small>{account.temporaryPassword ? '임시 비밀번호 사용 중' : '비밀번호 변경 완료'}</small>
                                </div>
                                <div className={styles.locationItemActions}>
                                    <button type="button" disabled={props.isBusy} onClick={() => props.onResetPassword(account.id)}><KeyRound size={13} /> 재발급</button>
                                    <button
                                        type="button"
                                        disabled={props.isBusy}
                                        onClick={() => props.onUpdateStatus(account.id, account.status === 'active' ? 'suspend' : 'activate')}
                                    >
                                        {account.status === 'active' ? '중지' : '활성'}
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

type NoticeSectionProps = {
    readonly locations: readonly FranchiseLocation[];
    readonly notices: readonly OwnerNotice[];
    readonly noticeTarget: 'all' | 'single';
    readonly selectedLocationIds: readonly string[];
    readonly noticeTitle: string;
    readonly noticeBody: string;
    readonly isBusy: boolean;
    readonly onNoticeTargetChange: (target: 'all' | 'single') => void;
    readonly onNoticeLocationToggle: (locationId: string) => void;
    readonly onNoticeLocationSelectAll: () => void;
    readonly onNoticeLocationClear: () => void;
    readonly onNoticeTitleChange: (value: string) => void;
    readonly onNoticeBodyChange: (value: string) => void;
    readonly onPublishNotice: () => void;
};

export function OwnerPortalNoticeSection(props: NoticeSectionProps) {
    const [noticeView, setNoticeView] = React.useState<'publish' | 'reads'>('publish');
    const [noticePage, setNoticePage] = React.useState(1);
    const noticePageCount = Math.max(1, Math.ceil(props.notices.length / OWNER_PORTAL_NOTICE_PAGE_SIZE));
    const safeNoticePage = Math.min(noticePage, noticePageCount);
    const pagedNotices = props.notices.slice((safeNoticePage - 1) * OWNER_PORTAL_NOTICE_PAGE_SIZE, safeNoticePage * OWNER_PORTAL_NOTICE_PAGE_SIZE);

    React.useEffect(() => {
        setNoticePage(currentPage => Math.min(currentPage, Math.max(1, Math.ceil(props.notices.length / OWNER_PORTAL_NOTICE_PAGE_SIZE))));
    }, [props.notices.length]);

    return (
        <section className={styles.ownerPortalPanel}>
            <div className={styles.locationMasterHeader}>
                <div>
                    <h3>공지/공문</h3>
                    <p>점주 공지를 발행하고 읽음 현황을 확인합니다.</p>
                </div>
            </div>
            <div className={styles.ownerPortalInlineTabs} role="tablist" aria-label="공지 업무">
                <button
                    type="button"
                    role="tab"
                    aria-selected={noticeView === 'publish'}
                    className={noticeView === 'publish' ? styles.ownerPortalInlineTabActive : styles.ownerPortalInlineTab}
                    onClick={() => setNoticeView('publish')}
                >
                    공지 발행
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={noticeView === 'reads'}
                    className={noticeView === 'reads' ? styles.ownerPortalInlineTabActive : styles.ownerPortalInlineTab}
                    onClick={() => setNoticeView('reads')}
                >
                    읽음 현황 <span>{props.notices.length}건</span>
                </button>
            </div>
            {noticeView === 'publish' ? (
                <div className={styles.ownerPortalForm}>
                    <div className={styles.ownerPortalTargetControl} role="radiogroup" aria-label="공지 발송 대상">
                        <button
                            type="button"
                            className={props.noticeTarget === 'all' ? styles.ownerPortalTargetActive : styles.ownerPortalTargetButton}
                            onClick={() => props.onNoticeTargetChange('all')}
                        >
                            전체 가맹점
                        </button>
                        <button
                            type="button"
                            className={props.noticeTarget === 'single' ? styles.ownerPortalTargetActive : styles.ownerPortalTargetButton}
                            onClick={() => props.onNoticeTargetChange('single')}
                        >
                            개별 가맹점
                        </button>
                    </div>
                    {props.noticeTarget === 'single' ? (
                        <div className={styles.ownerPortalLocationPicker}>
                            <div className={styles.ownerPortalLocationPickerHeader}>
                                <strong>발송 운영점</strong>
                                <div>
                                    <button type="button" onClick={props.onNoticeLocationSelectAll}>전체 선택</button>
                                    <button type="button" onClick={props.onNoticeLocationClear}>선택 해제</button>
                                </div>
                            </div>
                            <div className={styles.ownerPortalLocationOptions}>
                                {props.locations.map(location => (
                                    <label key={location.id}>
                                        <input
                                            type="checkbox"
                                            checked={props.selectedLocationIds.includes(location.id)}
                                            onChange={() => props.onNoticeLocationToggle(location.id)}
                                        />
                                        <span>{location.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    ) : null}
                    <input className={styles.locationListSearch} value={props.noticeTitle} placeholder="공지 제목" onChange={event => props.onNoticeTitleChange(event.currentTarget.value)} />
                    <textarea className={styles.ownerPortalTextarea} value={props.noticeBody} placeholder="공지 내용" onChange={event => props.onNoticeBodyChange(event.currentTarget.value)} />
                    <button
                        className={styles.primarySmallButton}
                        type="button"
                        disabled={props.isBusy || !props.noticeTitle || !props.noticeBody || (props.noticeTarget === 'single' && props.selectedLocationIds.length === 0)}
                        onClick={props.onPublishNotice}
                    >
                        <Send size={14} /> 공지 발행
                    </button>
                </div>
            ) : (
                <div className={styles.ownerPortalNoticeList}>
                    <div className={styles.ownerPortalSubHeader}>
                        <strong>공지별 읽음 현황</strong>
                        <span>발행한 공지마다 대상 점주의 읽음 여부를 확인합니다.</span>
                    </div>
                    {props.notices.length === 0 ? <div className={styles.locationEmpty}>발행한 공지가 없습니다.</div> : null}
                    {pagedNotices.map(notice => (
                        <article className={`${styles.locationItem} ${styles.ownerPortalListItem}`} key={notice.id}>
                            <div className={styles.locationItemMain}>
                                <strong>{notice.title}</strong>
                                <span>{notice.location_id ? getLocationName(props.locations, notice.location_id) : '전체 가맹점'} · {formatDate(notice.created_at)}</span>
                                <small>{notice.body}</small>
                                <div className={styles.ownerPortalReadMeter}>
                                    <span>읽음 {notice.readCount}/{notice.targetCount}</span>
                                    <span>{notice.unreadCount}명 미확인</span>
                                </div>
                                <details className={styles.ownerPortalRecipientDetails}>
                                    <summary>점주별 읽음 내역 보기</summary>
                                    {notice.recipients.length === 0 ? (
                                        <div className={styles.locationEmpty}>대상 점주 계정이 없습니다.</div>
                                    ) : (
                                        <div className={styles.ownerPortalRecipientGrid}>
                                            {notice.recipients.map(recipient => (
                                                <div className={styles.ownerPortalRecipientItem} key={recipient.ownerAccountId}>
                                                    <div>
                                                        <strong>{recipient.ownerName}</strong>
                                                        <span>{getLocationName(props.locations, recipient.locationId)} · {recipient.loginId}</span>
                                                    </div>
                                                    <span className={recipient.readAt ? styles.ownerPortalRecipientRead : styles.ownerPortalRecipientUnread}>
                                                        {recipient.readAt ? `읽음 ${formatDateTime(recipient.readAt)}` : '미확인'}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </details>
                            </div>
                        </article>
                    ))}
                    {props.notices.length > 0 ? (
                        <div className={styles.ownerPortalPagination}>
                            <span>총 {props.notices.length}건</span>
                            <div>
                                <button type="button" disabled={safeNoticePage <= 1} onClick={() => setNoticePage(page => Math.max(1, page - 1))}>이전</button>
                                <strong>{safeNoticePage} / {noticePageCount}</strong>
                                <button type="button" disabled={safeNoticePage >= noticePageCount} onClick={() => setNoticePage(page => Math.min(noticePageCount, page + 1))}>다음</button>
                            </div>
                        </div>
                    ) : null}
                </div>
            )}
        </section>
    );
}

type ChecklistSectionProps = {
    readonly locations: readonly FranchiseLocation[];
    readonly checklists: readonly OwnerChecklistSetting[];
    readonly isBusy: boolean;
    readonly onSaveChecklists: (locationIds: readonly string[], tasks: readonly OwnerPortalChecklistTask[]) => void;
};

function makeChecklistTaskId(index: number): string {
    return `owner-checklist-draft-${index + 1}`;
}

function getSavedChecklistTasksForLocation(
    checklists: readonly OwnerChecklistSetting[],
    locationId: string
): readonly OwnerPortalChecklistTask[] {
    return checklists.find(checklist => checklist.locationId === locationId)?.tasks || [];
}

function getChecklistTasksForEditing(
    checklists: readonly OwnerChecklistSetting[],
    locationId: string
): readonly OwnerPortalChecklistTask[] {
    const savedTasks = getSavedChecklistTasksForLocation(checklists, locationId);
    return savedTasks.length > 0 ? savedTasks : DEFAULT_OWNER_PORTAL_CHECKLIST_TASKS;
}

export function OwnerPortalChecklistSection({ locations, checklists, isBusy, onSaveChecklists }: ChecklistSectionProps) {
    const [targetMode, setTargetMode] = React.useState<'all' | 'single'>('all');
    const [selectedLocationId, setSelectedLocationId] = React.useState(locations[0]?.id || '');
    const [draftTasks, setDraftTasks] = React.useState<readonly OwnerPortalChecklistTask[]>(DEFAULT_OWNER_PORTAL_CHECKLIST_TASKS);

    React.useEffect(() => {
        if (targetMode === 'single' && selectedLocationId) {
            setDraftTasks(getChecklistTasksForEditing(checklists, selectedLocationId));
        }
        if (targetMode === 'all') {
            setDraftTasks(DEFAULT_OWNER_PORTAL_CHECKLIST_TASKS);
        }
    }, [checklists, selectedLocationId, targetMode]);

    const updateTask = (taskId: string, patch: Partial<Pick<OwnerPortalChecklistTask, 'title' | 'memo'>>) => {
        setDraftTasks(currentTasks => currentTasks.map(task => (
            task.id === taskId ? { ...task, ...patch } : task
        )));
    };

    const removeTask = (taskId: string) => {
        setDraftTasks(currentTasks => currentTasks.filter(task => task.id !== taskId));
    };

    const addTask = () => {
        setDraftTasks(currentTasks => [
            ...currentTasks,
            { id: makeChecklistTaskId(currentTasks.length), title: '', memo: '' }
        ]);
    };

    const targetLocationIds = targetMode === 'all'
        ? locations.map(location => location.id)
        : [selectedLocationId].filter(Boolean);
    const normalizedDraftTasks = normalizeOwnerPortalChecklistTasks(draftTasks);

    return (
        <section className={styles.ownerPortalPanel}>
            <div className={styles.locationMasterHeader}>
                <div>
                    <h3>체크리스트</h3>
                    <p>오픈 이후 점주가 주기적으로 확인할 운영 체크리스트를 세팅합니다.</p>
                </div>
            </div>
            <div className={styles.ownerPortalChecklistPublisher}>
                <div>
                    <strong>체크리스트 적용 대상</strong>
                    <span>전체 가맹점에 공통 적용하거나, 개별 운영점만 따로 수정할 수 있습니다.</span>
                </div>
                <div className={styles.ownerPortalTargetControl} role="radiogroup" aria-label="체크리스트 적용 대상">
                    <button
                        type="button"
                        className={targetMode === 'all' ? styles.ownerPortalTargetActive : styles.ownerPortalTargetButton}
                        onClick={() => setTargetMode('all')}
                    >
                        전체 가맹점
                    </button>
                    <button
                        type="button"
                        className={targetMode === 'single' ? styles.ownerPortalTargetActive : styles.ownerPortalTargetButton}
                        onClick={() => setTargetMode('single')}
                    >
                        개별 가맹점
                    </button>
                </div>
                {targetMode === 'single' ? (
                    <label className={styles.locationSortControl}>
                        운영점
                        <select value={selectedLocationId} onChange={event => setSelectedLocationId(event.currentTarget.value)}>
                            {locations.map(location => (
                                <option key={location.id} value={location.id}>{location.name}</option>
                            ))}
                        </select>
                    </label>
                ) : null}
            </div>
            <div className={styles.ownerPortalChecklistManager}>
                <div className={styles.ownerPortalSubHeader}>
                    <strong>체크리스트 항목</strong>
                    <span>점주 포털의 운영 체크리스트 화면에 표시되는 항목입니다.</span>
                </div>
                <div className={styles.ownerPortalChecklistList}>
                    {draftTasks.map((task, index) => (
                        <div className={styles.ownerPortalChecklistTaskRow} key={task.id}>
                            <span>{String(index + 1).padStart(2, '0')}</span>
                            <div className={styles.ownerPortalChecklistTaskFields}>
                                <input
                                    className={styles.locationListSearch}
                                    value={task.title}
                                    placeholder="체크리스트 항목명"
                                    onChange={event => updateTask(task.id, { title: event.currentTarget.value })}
                                />
                                <textarea
                                    className={styles.ownerPortalTextarea}
                                    value={task.memo}
                                    placeholder="점주에게 보여줄 안내 문구"
                                    onChange={event => updateTask(task.id, { memo: event.currentTarget.value })}
                                />
                            </div>
                            <button type="button" className={styles.dangerOutlineButton} onClick={() => removeTask(task.id)}>
                                삭제
                            </button>
                        </div>
                    ))}
                </div>
                <div className={styles.ownerPortalChecklistActions}>
                    <button type="button" className={styles.secondaryButton} onClick={() => setDraftTasks(DEFAULT_OWNER_PORTAL_CHECKLIST_TASKS)}>
                        기본 항목 불러오기
                    </button>
                    <button type="button" className={styles.secondaryButton} onClick={addTask}>
                        항목 추가
                    </button>
                    <button
                        type="button"
                        className={styles.primarySmallButton}
                        disabled={isBusy || targetLocationIds.length === 0 || normalizedDraftTasks.length === 0}
                        onClick={() => onSaveChecklists(targetLocationIds, normalizedDraftTasks)}
                    >
                        체크리스트 저장
                    </button>
                </div>
            </div>
            <div className={styles.ownerPortalChecklistManager}>
                <div className={styles.ownerPortalSubHeader}>
                    <strong>운영점별 세팅 현황</strong>
                    <span>각 운영점에 저장된 점주 운영 체크리스트 항목 수를 확인합니다.</span>
                </div>
                <div className={`${styles.locationList} ${styles.ownerPortalSectionList}`}>
                    {locations.map(location => {
                        const tasks = getSavedChecklistTasksForLocation(checklists, location.id);
                        const taskSummary = tasks.length > 0 ? tasks.map(task => task.title).join(', ') : '저장된 체크리스트 없음';
                        return (
                            <article className={`${styles.locationItem} ${styles.ownerPortalListItem}`} key={location.id}>
                                <div className={styles.locationItemMain}>
                                    <strong>{location.name}</strong>
                                    <span>{location.address || location.region || '주소 미입력'} · {tasks.length}개 항목</span>
                                    <small>{taskSummary}</small>
                                </div>
                                <div className={styles.locationItemActions}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setTargetMode('single');
                                            setSelectedLocationId(location.id);
                                        }}
                                    >
                                        수정
                                    </button>
                                </div>
                            </article>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

type SubmissionSectionProps = {
    readonly locations: readonly FranchiseLocation[];
    readonly submissions: readonly OwnerSubmission[];
    readonly isBusy: boolean;
    readonly onReviewSubmission: (submissionId: string, action: 'approve' | 'reject' | 'resolve') => void;
};

export function OwnerPortalSubmissionsSection({
    locations,
    submissions,
    isBusy,
    onReviewSubmission
}: SubmissionSectionProps) {
    const [submissionView, setSubmissionView] = React.useState<'pending' | 'completed'>('pending');
    const [submissionTypeFilter, setSubmissionTypeFilter] = React.useState('all');
    const [submissionStatusFilter, setSubmissionStatusFilter] = React.useState('all');
    const [submissionSearch, setSubmissionSearch] = React.useState('');
    const [submissionPage, setSubmissionPage] = React.useState(1);
    const pendingSubmissions = submissions.filter(isPendingOwnerSubmission);
    const completedSubmissions = submissions.filter(submission => !isPendingOwnerSubmission(submission));
    const baseSubmissions = submissionView === 'pending' ? pendingSubmissions : completedSubmissions;
    const normalizedSearch = submissionSearch.trim().toLowerCase();
    const filteredSubmissions = baseSubmissions.filter(submission => {
        const typeMatches = submissionTypeFilter === 'all' || submission.submission_type === submissionTypeFilter;
        const statusMatches = submissionStatusFilter === 'all' || submission.status === submissionStatusFilter;
        const textMatches = !normalizedSearch || [
            submission.title,
            submission.body || '',
            getSubmissionPayloadTitle(submission),
            getLocationName(locations, submission.location_id)
        ].some(value => value.toLowerCase().includes(normalizedSearch));
        return typeMatches && statusMatches && textMatches;
    });
    const submissionPageCount = Math.max(1, Math.ceil(filteredSubmissions.length / OWNER_PORTAL_SUBMISSION_PAGE_SIZE));
    const safeSubmissionPage = Math.min(submissionPage, submissionPageCount);
    const visibleSubmissions = filteredSubmissions.slice(
        (safeSubmissionPage - 1) * OWNER_PORTAL_SUBMISSION_PAGE_SIZE,
        safeSubmissionPage * OWNER_PORTAL_SUBMISSION_PAGE_SIZE
    );

    React.useEffect(() => {
        setSubmissionPage(1);
    }, [submissionView, submissionTypeFilter, submissionStatusFilter, submissionSearch]);

    React.useEffect(() => {
        setSubmissionPage(currentPage => Math.min(currentPage, Math.max(1, Math.ceil(filteredSubmissions.length / OWNER_PORTAL_SUBMISSION_PAGE_SIZE))));
    }, [filteredSubmissions.length]);

    return (
        <section className={styles.ownerPortalPanel}>
            <div className={styles.locationMasterHeader}>
                <div>
                    <h3>점주 제출 처리</h3>
                    <p>점주가 남긴 매장 정보, 체크리스트 완료 요청, 시설 문의 내역을 확인하고 처리합니다.</p>
                </div>
            </div>
            <div className={styles.ownerPortalInlineTabs} role="tablist" aria-label="점주 제출 처리 상태">
                <button
                    type="button"
                    role="tab"
                    aria-selected={submissionView === 'pending'}
                    className={submissionView === 'pending' ? styles.ownerPortalInlineTabActive : styles.ownerPortalInlineTab}
                    onClick={() => setSubmissionView('pending')}
                >
                    처리 필요 <span>{pendingSubmissions.length}건</span>
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={submissionView === 'completed'}
                    className={submissionView === 'completed' ? styles.ownerPortalInlineTabActive : styles.ownerPortalInlineTab}
                    onClick={() => setSubmissionView('completed')}
                >
                    처리 완료 <span>{completedSubmissions.length}건</span>
                </button>
            </div>
            <div className={styles.ownerPortalFilterBar}>
                <input
                    className={styles.locationListSearch}
                    value={submissionSearch}
                    placeholder="운영점, 제목, 내용 검색"
                    onChange={event => setSubmissionSearch(event.currentTarget.value)}
                />
                <select value={submissionTypeFilter} onChange={event => setSubmissionTypeFilter(event.currentTarget.value)}>
                    <option value="all">전체 유형</option>
                    <option value="store_info">매장 정보</option>
                    <option value="opening_task_completion">운영 체크리스트</option>
                    <option value="facility_request">시설/고장 문의</option>
                    <option value="general_request">일반 문의</option>
                </select>
                <select value={submissionStatusFilter} onChange={event => setSubmissionStatusFilter(event.currentTarget.value)}>
                    <option value="all">전체 상태</option>
                    <option value="submitted">접수</option>
                    <option value="resolved">처리 완료</option>
                    <option value="approved">승인</option>
                    <option value="rejected">반려</option>
                </select>
            </div>
            <div className={`${styles.locationList} ${styles.ownerPortalSectionList}`}>
                {visibleSubmissions.length === 0 ? (
                    <div className={styles.locationEmpty}>
                        {submissionView === 'pending' ? '처리할 점주 제출 건이 없습니다.' : '처리 완료된 제출 건이 없습니다.'}
                    </div>
                ) : null}
                {visibleSubmissions.map(submission => {
                    const reviewMode = getOwnerSubmissionReviewMode(submission.submission_type, submission.status);
                    const payloadTitle = getSubmissionPayloadTitle(submission);
                    const detailRows = getSubmissionDetailRows(submission);
                    return (
                        <article className={`${styles.locationItem} ${styles.ownerPortalListItem}`} key={submission.id}>
                            <div className={styles.locationItemMain}>
                                <strong>{submission.title}</strong>
                                <span>{getLocationName(locations, submission.location_id)} · {getSubmissionTypeLabel(submission.submission_type)} · {getSubmissionStatusLabel(submission.status)} · {formatDate(submission.created_at)}</span>
                                {payloadTitle ? <small>{payloadTitle}</small> : null}
                                <details className={styles.ownerPortalSubmissionDetails}>
                                    <summary>내용 확인</summary>
                                    <div className={styles.ownerPortalSubmissionDetailGrid}>
                                        {detailRows.map(row => (
                                            <div className={styles.ownerPortalSubmissionDetailItem} key={`${submission.id}-${row.label}`}>
                                                <strong>{row.label}</strong>
                                                <span>{row.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </details>
                                {submission.files && submission.files.length > 0 ? (
                                    <div className={styles.ownerPortalSubmissionDetailGrid}>
                                        <div className={styles.ownerPortalSubmissionDetailItem}>
                                            <strong>첨부 파일</strong>
                                            <span>{submission.files.length}개</span>
                                        </div>
                                    </div>
                                ) : null}
                                {submission.files && submission.files.length > 0 ? (
                                    <div className={styles.ownerPortalFileStrip}>
                                        {submission.files.map(file => file.public_url && file.mime_type.startsWith('image/') ? (
                                            <a className={styles.ownerPortalFileLink} href={file.public_url} key={file.id} target="_blank" rel="noreferrer">
                                                <img src={file.public_url} alt={file.file_name} />
                                                <span>{file.file_name}</span>
                                            </a>
                                        ) : (
                                            <span className={styles.ownerPortalFileFallback} key={file.id}>{file.file_name}</span>
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                            <div className={styles.locationItemActions}>
                                {reviewMode === 'approval' ? (
                                    <>
                                        <button type="button" disabled={isBusy} onClick={() => onReviewSubmission(submission.id, 'approve')}>승인</button>
                                        <button type="button" disabled={isBusy} onClick={() => onReviewSubmission(submission.id, 'reject')}>반려</button>
                                    </>
                                ) : null}
                                {reviewMode === 'resolution' ? (
                                    <button type="button" disabled={isBusy} onClick={() => onReviewSubmission(submission.id, 'resolve')}>처리 완료</button>
                                ) : null}
                                {reviewMode === 'acknowledge' ? (
                                    <button type="button" disabled={isBusy} onClick={() => onReviewSubmission(submission.id, 'resolve')}>확인 처리</button>
                                ) : null}
                            </div>
                        </article>
                    );
                })}
                    {filteredSubmissions.length > 0 ? (
                        <div className={styles.ownerPortalPagination}>
                            <span>총 {filteredSubmissions.length}건</span>
                            <div>
                                <button type="button" disabled={safeSubmissionPage <= 1} onClick={() => setSubmissionPage(page => Math.max(1, page - 1))}>이전</button>
                                <strong>{safeSubmissionPage} / {submissionPageCount}</strong>
                                <button type="button" disabled={safeSubmissionPage >= submissionPageCount} onClick={() => setSubmissionPage(page => Math.min(submissionPageCount, page + 1))}>다음</button>
                            </div>
                        </div>
                    ) : null}
            </div>
        </section>
    );
}
