"use client";

import React from 'react';
import { Copy, Download, KeyRound, Paperclip, Send, Trash2, UserRound, X } from 'lucide-react';
import { AlertModal } from '@/components/common/AlertModal';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { formatFranchiseFileSize } from '@/lib/franchise-file-attachments';
import { buildOwnerSubmissionSla, type OwnerSubmissionActivitySummary } from '@/lib/franchise-owner-automation';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import {
    DEFAULT_OWNER_PORTAL_CHECKLIST_TASKS,
    getOwnerSubmissionReviewMode,
    isOwnerChecklistCompletionSubmission,
    isAcceptedOwnerNoticeAttachmentFileName,
    normalizeOwnerPortalChecklistTasks,
    OWNER_NOTICE_ATTACHMENT_POLICY,
    type OwnerNoticeAttachment,
    type OwnerPortalChecklistIssue,
    type OwnerPortalChecklistTask
} from '@/lib/franchise-owner-portal';
import type { FranchiseLocation } from './types';

const OWNER_PORTAL_NOTICE_PAGE_SIZE = 5;
const OWNER_PORTAL_SUBMISSION_PAGE_SIZE = 5;
const OWNER_PORTAL_CHECKLIST_STATUS_PAGE_SIZE = 5;

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
    readonly reviewed_at: string | null;
    readonly submitted_at: string | null;
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
    readonly attachments?: readonly OwnerNoticeAttachment[];
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
    readonly issues?: readonly OwnerPortalChecklistIssue[];
};

export type OwnerPortalView = 'accounts' | 'notices' | 'checklists' | 'submissions' | 'reminders' | 'content' | 'settlements';

export const OWNER_PORTAL_VIEWS: readonly {
    readonly key: OwnerPortalView;
    readonly label: string;
    readonly description: string;
}[] = [
    { key: 'notices', label: '공지/공문', description: '운영점 점주에게 공지를 발행합니다.' },
    { key: 'checklists', label: '체크리스트', description: '점주 운영 체크리스트를 세팅합니다.' },
    { key: 'reminders', label: '리마인더', description: '미확인 업무와 자료 확인을 재안내합니다.' },
    { key: 'content', label: '자료실', description: '교육·매뉴얼·공문 자료를 배포합니다.' },
    { key: 'settlements', label: '정산/증빙', description: '정산 요청과 점주 제출을 검토합니다.' },
    { key: 'submissions', label: '제출 처리', description: '점주 요청과 제출 건을 처리합니다.' },
    { key: 'accounts', label: '점주 계정 설정', description: '발급, 재발급, 중지 상태를 관리합니다.' }
];

type ViewTabProps = {
    readonly activeView: OwnerPortalView;
    readonly accountsCount: number;
    readonly checklistsCount: number;
    readonly noticesCount: number;
    readonly submissionsCount: number;
    readonly remindersCount: number;
    readonly contentCount: number;
    readonly settlementsCount: number;
    readonly onChange: (view: OwnerPortalView) => void;
};

export function OwnerPortalViewTabs({ activeView, accountsCount, checklistsCount, noticesCount, submissionsCount, remindersCount, contentCount, settlementsCount, onChange }: ViewTabProps) {
    const countByView: Record<OwnerPortalView, string> = {
        accounts: `${accountsCount}건`,
        checklists: `${checklistsCount}건`,
        notices: `${noticesCount}건`,
        submissions: `${submissionsCount}건`,
        reminders: `${remindersCount}건`,
        content: `${contentCount}건`,
        settlements: `${settlementsCount}건`
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
    return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Seoul' }).format(new Date(value));
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
    readonly ownerPortalLoginPath: string;
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
    const [origin, setOrigin] = React.useState('');
    const [isCopied, setIsCopied] = React.useState(false);
    const ownerPortalLoginUrl = origin ? `${origin}${props.ownerPortalLoginPath}` : props.ownerPortalLoginPath;

    React.useEffect(() => {
        setOrigin(window.location.origin);
    }, []);

    const copyOwnerPortalLoginUrl = async () => {
        await navigator.clipboard.writeText(ownerPortalLoginUrl);
        setIsCopied(true);
        window.setTimeout(() => setIsCopied(false), 1600);
    };

    return (
        <section className={styles.ownerPortalPanel} aria-label="점주 계정 관리">
            <div className={styles.locationMasterHeader}>
                <div>
                    <h3>점주 계정 관리</h3>
                    <p>운영점별 계정을 발급하고, 비밀번호 재발급과 중지 상태를 관리합니다.</p>
                </div>
            </div>
            <div className={styles.ownerPortalLinkCard}>
                <div className={styles.ownerPortalLinkCopy}>
                    <div>
                        <strong>회사별 점주 포털 단축 링크</strong>
                        <span>이 회사 점주는 아래 전용 링크에서 아이디와 비밀번호만 입력해 로그인합니다.</span>
                    </div>
                    <button type="button" onClick={() => void copyOwnerPortalLoginUrl()}>
                        <Copy size={13} /> {isCopied ? '복사됨' : '링크 복사'}
                    </button>
                </div>
                <input readOnly value={ownerPortalLoginUrl} aria-label="회사별 점주 포털 단축 링크" />
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
    readonly noticeFiles: readonly File[];
    readonly isBusy: boolean;
    readonly onNoticeTargetChange: (target: 'all' | 'single') => void;
    readonly onNoticeLocationToggle: (locationId: string) => void;
    readonly onNoticeLocationSelectAll: () => void;
    readonly onNoticeLocationClear: () => void;
    readonly onNoticeTitleChange: (value: string) => void;
    readonly onNoticeBodyChange: (value: string) => void;
    readonly onNoticeFilesChange: (files: readonly File[]) => void;
    readonly onPublishNotice: () => Promise<boolean>;
    readonly onDeleteNotice: (noticeId: string) => Promise<boolean>;
    readonly onOpenNoticeAttachment: (attachment: OwnerNoticeAttachment) => Promise<void>;
};

type NoticePublishRequest = {
    readonly title: string;
    readonly targetLabel: string;
    readonly targetCount: number;
    readonly attachmentCount: number;
};

type NoticeDeleteRequest = {
    readonly id: string;
    readonly title: string;
};

export function OwnerPortalNoticeSection(props: NoticeSectionProps) {
    const [noticeView, setNoticeView] = React.useState<'publish' | 'reads'>('publish');
    const [noticePage, setNoticePage] = React.useState(1);
    const [noticePublishRequest, setNoticePublishRequest] = React.useState<NoticePublishRequest | null>(null);
    const [noticeDeleteRequest, setNoticeDeleteRequest] = React.useState<NoticeDeleteRequest | null>(null);
    const [fileSelectionError, setFileSelectionError] = React.useState('');
    const [successAlertTitle, setSuccessAlertTitle] = React.useState('');
    const [successAlertMessage, setSuccessAlertMessage] = React.useState('');
    const noticeFileInputRef = React.useRef<HTMLInputElement | null>(null);
    const noticePageCount = Math.max(1, Math.ceil(props.notices.length / OWNER_PORTAL_NOTICE_PAGE_SIZE));
    const safeNoticePage = Math.min(noticePage, noticePageCount);
    const pagedNotices = props.notices.slice((safeNoticePage - 1) * OWNER_PORTAL_NOTICE_PAGE_SIZE, safeNoticePage * OWNER_PORTAL_NOTICE_PAGE_SIZE);
    const publishTargetCount = props.noticeTarget === 'single' ? props.selectedLocationIds.length : props.locations.length;
    const publishTargetLabel = props.noticeTarget === 'single'
        ? `${props.selectedLocationIds.length}개 선택 운영점`
        : '전체 가맹점';

    React.useEffect(() => {
        setNoticePage(currentPage => Math.min(currentPage, Math.max(1, Math.ceil(props.notices.length / OWNER_PORTAL_NOTICE_PAGE_SIZE))));
    }, [props.notices.length]);

    const requestNoticePublish = () => {
        if (!props.noticeTitle || !props.noticeBody || (props.noticeTarget === 'single' && props.selectedLocationIds.length === 0)) return;
        setNoticePublishRequest({
            title: props.noticeTitle,
            targetLabel: publishTargetLabel,
            targetCount: publishTargetCount,
            attachmentCount: props.noticeFiles.length
        });
    };

    const addNoticeFiles = (fileList: FileList | null) => {
        const incomingFiles = Array.from(fileList || []);
        if (incomingFiles.length === 0) return;
        const remainingCount = OWNER_NOTICE_ATTACHMENT_POLICY.maxFiles - props.noticeFiles.length;
        if (remainingCount <= 0) {
            setFileSelectionError(`첨부 파일은 최대 ${OWNER_NOTICE_ATTACHMENT_POLICY.maxFiles}개까지 등록할 수 있습니다.`);
            return;
        }
        const validFiles = incomingFiles
            .filter(file => (
                isAcceptedOwnerNoticeAttachmentFileName(file.name)
                && file.size <= OWNER_NOTICE_ATTACHMENT_POLICY.maxFileSizeBytes
            ))
            .slice(0, remainingCount);
        setFileSelectionError(validFiles.length === incomingFiles.length
            ? ''
            : `첨부는 이미지/PDF/문서 파일만, 파일당 ${formatFranchiseFileSize(OWNER_NOTICE_ATTACHMENT_POLICY.maxFileSizeBytes)} 이하로 등록해주세요.`
        );
        props.onNoticeFilesChange([...props.noticeFiles, ...validFiles]);
        if (noticeFileInputRef.current) noticeFileInputRef.current.value = '';
    };

    const removeNoticeFile = (index: number) => {
        props.onNoticeFilesChange(props.noticeFiles.filter((_, fileIndex) => fileIndex !== index));
        if (noticeFileInputRef.current) noticeFileInputRef.current.value = '';
    };

    const confirmNoticePublish = async () => {
        if (!noticePublishRequest) return;
        const published = await props.onPublishNotice();
        if (!published) return;
        const targetLabel = noticePublishRequest.targetCount > 0
            ? `${noticePublishRequest.targetLabel}에`
            : `${noticePublishRequest.targetLabel} 대상으로`;
        setNoticeView('reads');
        setSuccessAlertTitle('공지 발행 완료');
        setSuccessAlertMessage(`점주 공지를 ${targetLabel} 발행했습니다.${noticePublishRequest.attachmentCount > 0 ? `\n첨부 파일 ${noticePublishRequest.attachmentCount}개도 함께 전달됐습니다.` : ''}\n읽음 현황에서 점주별 확인 상태를 볼 수 있습니다.`);
    };

    const confirmNoticeDelete = async () => {
        if (!noticeDeleteRequest) return;
        const deleted = await props.onDeleteNotice(noticeDeleteRequest.id);
        if (!deleted) return;
        setSuccessAlertTitle('공지 삭제 완료');
        setSuccessAlertMessage('점주 공지를 삭제했습니다.\n점주 포털 공지 목록에서도 더 이상 보이지 않습니다.');
    };

    return (
        <>
            <section className={styles.ownerPortalPanel} aria-label="점주 공지 관리">
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
                        <div className={styles.ownerPortalAttachmentBox}>
                            <div className={styles.ownerPortalAttachmentHeader}>
                                <div>
                                    <strong>첨부 파일</strong>
                                    <span>이미지, PDF, 문서 파일을 점주 포털 공지에 함께 표시합니다.</span>
                                </div>
                                <button type="button" onClick={() => noticeFileInputRef.current?.click()} disabled={props.isBusy}>
                                    <Paperclip size={14} /> 파일 선택
                                </button>
                            </div>
                            <input
                                ref={noticeFileInputRef}
                                className={styles.ownerPortalHiddenFileInput}
                                type="file"
                                accept={OWNER_NOTICE_ATTACHMENT_POLICY.accept}
                                multiple
                                onChange={event => addNoticeFiles(event.currentTarget.files)}
                            />
                            <p>파일당 {formatFranchiseFileSize(OWNER_NOTICE_ATTACHMENT_POLICY.maxFileSizeBytes)} · 최대 {OWNER_NOTICE_ATTACHMENT_POLICY.maxFiles}개</p>
                            {fileSelectionError ? <div className={styles.ownerPortalError}>{fileSelectionError}</div> : null}
                            {props.noticeFiles.length > 0 ? (
                                <div className={styles.ownerPortalAttachmentList}>
                                    {props.noticeFiles.map((file, index) => (
                                        <div className={styles.ownerPortalAttachmentItem} key={`${file.name}-${file.size}-${file.lastModified}-${index}`}>
                                            <div>
                                                <strong>{file.name}</strong>
                                                <span>{formatFranchiseFileSize(file.size)}</span>
                                            </div>
                                            <button type="button" aria-label={`${file.name} 제거`} onClick={() => removeNoticeFile(index)} disabled={props.isBusy}>
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                        <button
                            className={styles.primarySmallButton}
                            type="button"
                            disabled={props.isBusy || !props.noticeTitle || !props.noticeBody || (props.noticeTarget === 'single' && props.selectedLocationIds.length === 0)}
                            onClick={requestNoticePublish}
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
                                    {notice.attachments && notice.attachments.length > 0 ? (
                                        <div className={styles.ownerPortalFileStrip}>
                                            {notice.attachments.map(attachment => (
                                                <button
                                                    className={styles.ownerPortalFileLink}
                                                    type="button"
                                                    key={`${attachment.storagePath}-${attachment.name}`}
                                                    onClick={() => {
                                                        void props.onOpenNoticeAttachment(attachment);
                                                    }}
                                                >
                                                    <Download size={13} />
                                                    <span>{attachment.name}</span>
                                                    <small>{formatFranchiseFileSize(attachment.size)}</small>
                                                </button>
                                            ))}
                                        </div>
                                    ) : null}
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
                                <div className={styles.locationItemActions}>
                                    <button
                                        type="button"
                                        className={styles.locationDeleteButton}
                                        disabled={props.isBusy}
                                        onClick={() => setNoticeDeleteRequest({ id: notice.id, title: notice.title })}
                                    >
                                        <Trash2 size={13} /> 삭제
                                    </button>
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
            <ConfirmModal
                isOpen={noticePublishRequest !== null}
                title="점주 공지를 발행할까요?"
                message={noticePublishRequest
                    ? `${noticePublishRequest.targetLabel}에 공지를 발행합니다.\n제목: ${noticePublishRequest.title}${noticePublishRequest.attachmentCount > 0 ? `\n첨부: ${noticePublishRequest.attachmentCount}개` : ''}`
                    : ''}
                confirmText="발행하기"
                cancelText="취소"
                onClose={() => setNoticePublishRequest(null)}
                onConfirm={() => {
                    void confirmNoticePublish();
                }}
            />
            <ConfirmModal
                isOpen={noticeDeleteRequest !== null}
                title="점주 공지를 삭제할까요?"
                message={noticeDeleteRequest
                    ? `삭제하면 본사 읽음 현황과 점주 포털 공지 목록에서 함께 사라집니다.\n제목: ${noticeDeleteRequest.title}`
                    : ''}
                confirmText="삭제하기"
                cancelText="취소"
                isDanger
                onClose={() => setNoticeDeleteRequest(null)}
                onConfirm={() => {
                    void confirmNoticeDelete();
                }}
            />
            <AlertModal
                isOpen={successAlertMessage.length > 0}
                type="success"
                title={successAlertTitle || '공지 처리 완료'}
                message={successAlertMessage}
                buttonText="확인"
                onClose={() => {
                    setSuccessAlertTitle('');
                    setSuccessAlertMessage('');
                }}
            />
        </>
    );
}

type ChecklistSectionProps = {
    readonly locations: readonly FranchiseLocation[];
    readonly checklists: readonly OwnerChecklistSetting[];
    readonly submissions: readonly OwnerSubmission[];
    readonly isBusy: boolean;
    readonly initialView?: 'status';
    readonly onSaveChecklists: (locationIds: readonly string[], tasks: readonly OwnerPortalChecklistTask[]) => Promise<ChecklistSaveResult>;
};

type ChecklistSaveResult = {
    readonly ok: boolean;
    readonly issueKey?: string;
};

type ChecklistSendRequest = {
    readonly locationIds: readonly string[];
    readonly tasks: readonly OwnerPortalChecklistTask[];
    readonly targetLabel: string;
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

type ChecklistLocationStatus = {
    readonly location: FranchiseLocation;
    readonly completedCount: number;
    readonly totalCount: number;
    readonly isComplete: boolean;
};

type ChecklistIssueGroup = {
    readonly key: string;
    readonly title: string;
    readonly issuedAt: string | null;
    readonly tasks: readonly OwnerPortalChecklistTask[];
    readonly locations: readonly ChecklistLocationStatus[];
    readonly completedCount: number;
    readonly pendingCount: number;
};

function getChecklistSubmissionTaskId(submission: OwnerSubmission): string {
    if (!isRecord(submission.payload)) return '';
    return readTextField(submission.payload, 'taskId');
}

function isChecklistCompletionAccepted(submission: OwnerSubmission): boolean {
    return isOwnerChecklistCompletionSubmission(submission.submission_type) && submission.status !== 'rejected';
}

function buildCompletedChecklistTaskIdsByLocation(submissions: readonly OwnerSubmission[]): ReadonlyMap<string, ReadonlySet<string>> {
    const completed = new Map<string, Set<string>>();
    submissions.filter(isChecklistCompletionAccepted).forEach(submission => {
        const taskId = getChecklistSubmissionTaskId(submission);
        if (!taskId) return;
        const current = completed.get(submission.location_id) || new Set<string>();
        current.add(taskId);
        completed.set(submission.location_id, current);
    });
    return completed;
}

function buildChecklistIssueKey(tasks: readonly OwnerPortalChecklistTask[]): string {
    return JSON.stringify(tasks.map(task => ({
        id: task.id,
        title: task.title,
        memo: task.memo
    })));
}

function getChecklistIssueEntries(checklist: OwnerChecklistSetting): readonly OwnerPortalChecklistIssue[] {
    if (checklist.issues && checklist.issues.length > 0) return checklist.issues;
    if (checklist.tasks.length === 0) return [];
    return [{
        id: buildChecklistIssueKey(checklist.tasks),
        issuedAt: null,
        tasks: checklist.tasks
    }];
}

function buildChecklistIssueTitle(tasks: readonly OwnerPortalChecklistTask[]): string {
    if (tasks.length === 0) return '체크리스트';
    if (tasks.length === 1) return tasks[0]?.title || '체크리스트';
    return `${tasks[0]?.title || '체크리스트'} 외 ${tasks.length - 1}개`;
}

function buildChecklistIssueGroups(
    locations: readonly FranchiseLocation[],
    checklists: readonly OwnerChecklistSetting[],
    submissions: readonly OwnerSubmission[]
): readonly ChecklistIssueGroup[] {
    const completedTaskIdsByLocation = buildCompletedChecklistTaskIdsByLocation(submissions);
    const locationsById = new Map(locations.map(location => [location.id, location]));
    const groups = new Map<string, {
        readonly issuedAt: string | null;
        readonly tasks: readonly OwnerPortalChecklistTask[];
        readonly locations: ChecklistLocationStatus[];
    }>();

    checklists.forEach(checklist => {
        const location = locationsById.get(checklist.locationId);
        if (!location) return;
        const completedTaskIds = completedTaskIdsByLocation.get(checklist.locationId) || new Set<string>();
        getChecklistIssueEntries(checklist).forEach(issue => {
            if (issue.tasks.length === 0) return;
            const completedCount = issue.tasks.filter(task => completedTaskIds.has(task.id)).length;
            const current = groups.get(issue.id) || { issuedAt: issue.issuedAt, tasks: issue.tasks, locations: [] };
            current.locations.push({
                location,
                completedCount,
                totalCount: issue.tasks.length,
                isComplete: issue.tasks.length > 0 && completedCount >= issue.tasks.length
            });
            groups.set(issue.id, current);
        });
    });

    return Array.from(groups.entries()).map(([key, group]) => {
        const completedCount = group.locations.filter(location => location.isComplete).length;
        return {
            key,
            title: buildChecklistIssueTitle(group.tasks),
            issuedAt: group.issuedAt,
            tasks: group.tasks,
            locations: group.locations,
            completedCount,
            pendingCount: group.locations.length - completedCount
        };
    }).sort((left, right) => {
        const leftIssuedAt = left.issuedAt || '';
        const rightIssuedAt = right.issuedAt || '';
        return rightIssuedAt.localeCompare(leftIssuedAt);
    });
}

export function OwnerPortalChecklistSection({ locations, checklists, submissions, isBusy, initialView, onSaveChecklists }: ChecklistSectionProps) {
    const [checklistView, setChecklistView] = React.useState<'issue' | 'status'>(initialView || 'issue');
    const [targetMode, setTargetMode] = React.useState<'all' | 'selected'>('all');
    const [locationPickerId, setLocationPickerId] = React.useState(locations[0]?.id || '');
    const [selectedLocationIds, setSelectedLocationIds] = React.useState<readonly string[]>([]);
    const [draftTasks, setDraftTasks] = React.useState<readonly OwnerPortalChecklistTask[]>(DEFAULT_OWNER_PORTAL_CHECKLIST_TASKS);
    const [statusSearch, setStatusSearch] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState('all');
    const [statusPage, setStatusPage] = React.useState(1);
    const [sendRequest, setSendRequest] = React.useState<ChecklistSendRequest | null>(null);
    const [successAlertMessage, setSuccessAlertMessage] = React.useState('');
    const [expandedIssueKey, setExpandedIssueKey] = React.useState('');
    const savedChecklistCount = checklists.filter(checklist => checklist.tasks.length > 0).length;
    const selectedLocations = locations.filter(location => selectedLocationIds.includes(location.id));
    const selectableLocations = locations.filter(location => !selectedLocationIds.includes(location.id));
    const issueGroups = buildChecklistIssueGroups(locations, checklists, submissions);
    const effectiveLocationPickerId = selectableLocations.some(location => location.id === locationPickerId)
        ? locationPickerId
        : selectableLocations[0]?.id || '';
    const selectedLocationSummary = selectedLocations.length > 0 ? `${selectedLocations.length}개 운영점` : '운영점 미선택';

    React.useEffect(() => {
        if (initialView) setChecklistView(initialView);
    }, [initialView]);

    React.useEffect(() => {
        const locationIds = new Set(locations.map(location => location.id));
        setSelectedLocationIds(currentIds => {
            const nextIds = currentIds.filter(locationId => locationIds.has(locationId));
            return nextIds.length === currentIds.length ? currentIds : nextIds;
        });
        if (!locationPickerId && locations[0]) {
            setLocationPickerId(locations[0].id);
        }
        if (locationPickerId && !locationIds.has(locationPickerId)) {
            setLocationPickerId(locations[0]?.id || '');
        }
    }, [locationPickerId, locations]);

    const changeTargetMode = (mode: 'all' | 'selected') => {
        setTargetMode(mode);
        if (mode === 'all') {
            setDraftTasks(DEFAULT_OWNER_PORTAL_CHECKLIST_TASKS);
        }
    };

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

    const addSelectedLocation = () => {
        if (!effectiveLocationPickerId || selectedLocationIds.includes(effectiveLocationPickerId)) return;
        const nextPickerId = locations.find(location => (
            location.id !== effectiveLocationPickerId && !selectedLocationIds.includes(location.id)
        ))?.id;
        setTargetMode('selected');
        setSelectedLocationIds(currentIds => [...currentIds, effectiveLocationPickerId]);
        if (nextPickerId) setLocationPickerId(nextPickerId);
    };

    const removeSelectedLocation = (locationId: string) => {
        setSelectedLocationIds(currentIds => currentIds.filter(currentId => currentId !== locationId));
    };

    const targetLocationIds = targetMode === 'all'
        ? locations.map(location => location.id)
        : selectedLocationIds;
    const normalizedDraftTasks = normalizeOwnerPortalChecklistTasks(draftTasks);
    const totalIssuedLocations = issueGroups.reduce((sum, group) => sum + group.locations.length, 0);
    const normalizedStatusSearch = statusSearch.trim().toLowerCase();
    const filteredIssueGroups = issueGroups.filter(group => {
        const statusMatches = statusFilter === 'all'
            || (statusFilter === 'complete' && group.pendingCount === 0)
            || (statusFilter === 'incomplete' && group.pendingCount > 0);
        const textMatches = !normalizedStatusSearch || [
            group.title,
            ...group.tasks.map(task => `${task.title} ${task.memo}`),
            ...group.locations.map(locationStatus => locationStatus.location.name)
        ].some(value => value.toLowerCase().includes(normalizedStatusSearch));
        return statusMatches && textMatches;
    });
    const statusPageCount = Math.max(1, Math.ceil(filteredIssueGroups.length / OWNER_PORTAL_CHECKLIST_STATUS_PAGE_SIZE));
    const safeStatusPage = Math.min(statusPage, statusPageCount);
    const visibleIssueGroups = filteredIssueGroups.slice(
        (safeStatusPage - 1) * OWNER_PORTAL_CHECKLIST_STATUS_PAGE_SIZE,
        safeStatusPage * OWNER_PORTAL_CHECKLIST_STATUS_PAGE_SIZE
    );
    const expandedIssueIndex = expandedIssueKey
        ? filteredIssueGroups.findIndex(group => group.key === expandedIssueKey)
        : -1;

    React.useEffect(() => {
        setStatusPage(1);
    }, [statusSearch, statusFilter]);

    React.useEffect(() => {
        setStatusPage(currentPage => Math.min(currentPage, Math.max(1, Math.ceil(filteredIssueGroups.length / OWNER_PORTAL_CHECKLIST_STATUS_PAGE_SIZE))));
    }, [filteredIssueGroups.length]);

    React.useEffect(() => {
        if (expandedIssueIndex < 0) return;
        setStatusPage(Math.floor(expandedIssueIndex / OWNER_PORTAL_CHECKLIST_STATUS_PAGE_SIZE) + 1);
    }, [expandedIssueIndex]);

    const requestChecklistSend = () => {
        if (targetLocationIds.length === 0 || normalizedDraftTasks.length === 0) return;
        setSendRequest({
            locationIds: targetLocationIds,
            tasks: normalizedDraftTasks,
            targetLabel: targetMode === 'all'
                ? `${targetLocationIds.length}개 전체 가맹점`
                : `${targetLocationIds.length}개 선택 운영점`
        });
    };

    const confirmChecklistSend = async () => {
        if (!sendRequest) return;
        const result = await onSaveChecklists(sendRequest.locationIds, sendRequest.tasks);
        if (!result.ok) return;
        const sentMessage = `운영 체크리스트를 ${sendRequest.locationIds.length}개 운영점에 발송했습니다.`;
        setStatusSearch('');
        setStatusFilter('all');
        setStatusPage(1);
        setExpandedIssueKey(result.issueKey || buildChecklistIssueKey(sendRequest.tasks));
        setChecklistView('status');
        setSuccessAlertMessage(`${sentMessage}\n발송 현황에서 가맹점별 완료 요청 상태를 확인할 수 있습니다.`);
    };

    return (
        <>
            <section className={styles.ownerPortalPanel}>
                <div className={styles.locationMasterHeader}>
                    <div>
                        <h3>체크리스트</h3>
                        <p>공지처럼 대상 운영점에 운영 체크리스트를 발송하고 완료 현황을 확인합니다.</p>
                    </div>
                </div>
                <div className={styles.ownerPortalInlineTabs} role="tablist" aria-label="운영 체크리스트 관리">
                    <button
                        type="button"
                        role="tab"
                        aria-selected={checklistView === 'issue'}
                        className={checklistView === 'issue' ? styles.ownerPortalInlineTabActive : styles.ownerPortalInlineTab}
                        onClick={() => setChecklistView('issue')}
                    >
                        체크리스트 발송
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={checklistView === 'status'}
                        className={checklistView === 'status' ? styles.ownerPortalInlineTabActive : styles.ownerPortalInlineTab}
                        onClick={() => setChecklistView('status')}
                    >
                        발송 현황 <span>{issueGroups.length}건</span>
                    </button>
                </div>
                {checklistView === 'issue' ? (
                    <>
                        <div className={styles.ownerPortalChecklistSummary}>
                            <div>
                                <span>발송 대상</span>
                                <strong>{targetMode === 'all' ? '전체 가맹점' : selectedLocationSummary}</strong>
                            </div>
                            <div>
                                <span>현재 발송 현황</span>
                                <strong>{savedChecklistCount}/{locations.length}</strong>
                            </div>
                        </div>
                        <div className={styles.ownerPortalChecklistWorkspace}>
                            <div className={styles.ownerPortalChecklistScope}>
                                <div className={styles.ownerPortalSubHeader}>
                                    <strong>1. 발송 대상 선택</strong>
                                    <span>공지처럼 전체 가맹점 또는 선택한 운영점에 한 번에 전달합니다.</span>
                                </div>
                                <div className={styles.ownerPortalChecklistScopeBody}>
                                    <div className={styles.ownerPortalTargetControl} role="radiogroup" aria-label="체크리스트 적용 대상">
                                        <button
                                            type="button"
                                            className={targetMode === 'all' ? styles.ownerPortalTargetActive : styles.ownerPortalTargetButton}
                                            onClick={() => changeTargetMode('all')}
                                        >
                                            전체 가맹점
                                        </button>
                                        <button
                                            type="button"
                                            className={targetMode === 'selected' ? styles.ownerPortalTargetActive : styles.ownerPortalTargetButton}
                                            onClick={() => changeTargetMode('selected')}
                                        >
                                            개별 가맹점
                                        </button>
                                    </div>
                                    {targetMode === 'selected' ? (
                                        <div className={styles.ownerPortalChecklistPicker}>
                                            <label className={styles.locationSortControl}>
                                                운영점
                                                <select value={effectiveLocationPickerId} onChange={event => setLocationPickerId(event.currentTarget.value)}>
                                                    {selectableLocations.map(location => (
                                                        <option key={location.id} value={location.id}>{location.name}</option>
                                                    ))}
                                                </select>
                                            </label>
                                            <button
                                                type="button"
                                                className={styles.secondaryButton}
                                                disabled={!effectiveLocationPickerId || selectableLocations.length === 0}
                                                onClick={addSelectedLocation}
                                            >
                                                운영점 추가
                                            </button>
                                        </div>
                                    ) : (
                                        <div className={styles.ownerPortalChecklistHint}>
                                            현재 항목을 {locations.length}개 운영점 점주 포털에 발송합니다.
                                        </div>
                                    )}
                                </div>
                                {targetMode === 'selected' ? (
                                    <div className={styles.ownerPortalChecklistStatus}>
                                        <div className={styles.ownerPortalSubHeader}>
                                            <strong>발송 대상 운영점</strong>
                                            <span>추가한 운영점에 현재 체크리스트를 한 번에 발송합니다.</span>
                                        </div>
                                        <div className={styles.ownerPortalChecklistSelectedList}>
                                            {selectedLocations.length > 0 ? selectedLocations.map(location => {
                                                const tasks = getSavedChecklistTasksForLocation(checklists, location.id);
                                                return (
                                                    <div className={styles.ownerPortalChecklistSelectedItem} key={location.id}>
                                                        <div>
                                                            <strong>{location.name}</strong>
                                                            <span>{tasks.length > 0 ? `기존 ${tasks.length}개 항목` : '저장된 항목 없음'}</span>
                                                        </div>
                                                        <button type="button" onClick={() => removeSelectedLocation(location.id)}>
                                                            제외
                                                        </button>
                                                    </div>
                                                );
                                            }) : (
                                                <div className={styles.ownerPortalChecklistHint}>
                                                    운영점을 추가하면 이 목록에 쌓이고, 발송 버튼 한 번으로 모두 반영됩니다.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                            <div className={styles.ownerPortalChecklistEditor}>
                                <div className={styles.ownerPortalSubHeader}>
                                    <strong>2. 발송할 항목 작성</strong>
                                    <span>점주 포털에 표시될 체크 항목과 안내 문구를 정리합니다.</span>
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
                                        onClick={requestChecklistSend}
                                    >
                                        {targetMode === 'all' ? '전체 가맹점 발송' : `${targetLocationIds.length}개 운영점 발송`}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                ) : null}
                {checklistView === 'status' ? (
                    <div className={styles.ownerPortalChecklistRequests}>
                        <div className={styles.ownerPortalSubHeader}>
                            <strong>체크리스트별 발송 현황</strong>
                            <span>공지처럼 발송 건을 목록으로 확인하고, 각 가맹점의 완료 요청 상태를 비교합니다.</span>
                        </div>
                        <div className={styles.ownerPortalFilterBar}>
                            <input
                                className={styles.locationListSearch}
                                value={statusSearch}
                                placeholder="체크리스트명, 운영점, 항목 검색"
                                onChange={event => setStatusSearch(event.currentTarget.value)}
                            />
                            <select value={statusFilter} onChange={event => setStatusFilter(event.currentTarget.value)}>
                                <option value="all">전체 현황</option>
                                <option value="incomplete">미완료 있음</option>
                                <option value="complete">전체 완료</option>
                            </select>
                        </div>
                        <div className={`${styles.locationList} ${styles.ownerPortalSectionList}`}>
                            {visibleIssueGroups.length === 0 ? (
                                <div className={styles.locationEmpty}>발송된 체크리스트가 없습니다.</div>
                            ) : null}
                            {visibleIssueGroups.map(group => {
                                return (
                                    <article className={`${styles.locationItem} ${styles.ownerPortalListItem}`} key={group.key}>
                                        <div className={styles.locationItemMain}>
                                            <strong>{group.title}</strong>
                                            <span>{group.issuedAt ? `발송 ${formatDateTime(group.issuedAt)} · ` : ''}대상 {group.locations.length}개 운영점 · 항목 {group.tasks.length}개</span>
                                            <small>{group.tasks.map(task => task.title).join(', ')}</small>
                                            <div className={styles.ownerPortalReadMeter}>
                                                <span>완료 {group.completedCount}/{group.locations.length}</span>
                                                <span>{group.pendingCount}개 미완료</span>
                                            </div>
                                            <details className={styles.ownerPortalSubmissionDetails}>
                                                <summary>가맹점별 현황 보기</summary>
                                                <div className={styles.ownerPortalChecklistStoreGrid}>
                                                    {group.locations.map(locationStatus => (
                                                        <div className={styles.ownerPortalChecklistStoreStatus} key={`${group.key}-${locationStatus.location.id}`}>
                                                            <div>
                                                                <strong>{locationStatus.location.name}</strong>
                                                                <span>{locationStatus.completedCount}/{locationStatus.totalCount} 완료 요청</span>
                                                            </div>
                                                            <small className={locationStatus.isComplete ? styles.ownerPortalSuccessPill : styles.ownerPortalWarningPill}>
                                                                {locationStatus.isComplete ? '완료' : '미완료'}
                                                            </small>
                                                        </div>
                                                    ))}
                                                </div>
                                            </details>
                                        </div>
                                        <div className={styles.locationItemActions}>
                                            <span className={group.pendingCount > 0 ? styles.ownerPortalMutedAction : styles.ownerPortalSuccessPill}>
                                                {group.pendingCount > 0 ? '진행 중' : '전체 완료'}
                                            </span>
                                        </div>
                                    </article>
                                );
                            })}
                            {filteredIssueGroups.length > 0 ? (
                                <div className={styles.ownerPortalPagination}>
                                    <span>총 {filteredIssueGroups.length}건 · 발송 운영점 {totalIssuedLocations}개</span>
                                    <div>
                                        <button type="button" disabled={safeStatusPage <= 1} onClick={() => setStatusPage(page => Math.max(1, page - 1))}>이전</button>
                                        <strong>{safeStatusPage} / {statusPageCount}</strong>
                                        <button type="button" disabled={safeStatusPage >= statusPageCount} onClick={() => setStatusPage(page => Math.min(statusPageCount, page + 1))}>다음</button>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </div>
                ) : null}
            </section>
            <ConfirmModal
                isOpen={sendRequest !== null}
                title="운영 체크리스트를 발송할까요?"
                message={sendRequest
                    ? `${sendRequest.targetLabel}에 ${sendRequest.tasks.length}개 체크 항목을 발송합니다.\n발송 후 점주 포털에 바로 표시됩니다.`
                    : ''}
                confirmText="발송하기"
                cancelText="취소"
                onClose={() => setSendRequest(null)}
                onConfirm={() => {
                    void confirmChecklistSend();
                }}
            />
            <AlertModal
                isOpen={successAlertMessage.length > 0}
                type="success"
                title="체크리스트 발송 완료"
                message={successAlertMessage}
                buttonText="확인"
                onClose={() => setSuccessAlertMessage('')}
            />
        </>
    );
}
type SubmissionSectionProps = {
    readonly activitySummary: OwnerSubmissionActivitySummary;
    readonly locations: readonly FranchiseLocation[];
    readonly submissions: readonly OwnerSubmission[];
    readonly selectedSubmissionId?: string;
    readonly isBusy: boolean;
    readonly onReviewSubmission: (submissionId: string, action: 'approve' | 'reject' | 'resolve') => void;
};

export function OwnerPortalSubmissionsSection({
    activitySummary,
    locations,
    submissions,
    selectedSubmissionId,
    isBusy,
    onReviewSubmission
}: SubmissionSectionProps) {
    const [submissionView, setSubmissionView] = React.useState<'pending' | 'completed'>('pending');
    const [submissionTypeFilter, setSubmissionTypeFilter] = React.useState('all');
    const [submissionStatusFilter, setSubmissionStatusFilter] = React.useState('all');
    const [submissionSearch, setSubmissionSearch] = React.useState('');
    const [submissionPage, setSubmissionPage] = React.useState(1);
    const generalSubmissions = submissions.filter(submission => (
        !isOwnerChecklistCompletionSubmission(submission.submission_type)
    ));
    const pendingSubmissions = generalSubmissions.filter(isPendingOwnerSubmission);
    const completedSubmissions = generalSubmissions.filter(submission => !isPendingOwnerSubmission(submission));
    const selectedSubmission = generalSubmissions.find(submission => submission.id === selectedSubmissionId);
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
    const selectedSubmissionIndex = selectedSubmissionId
        ? filteredSubmissions.findIndex(submission => submission.id === selectedSubmissionId)
        : -1;
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

    React.useEffect(() => {
        if (!selectedSubmission) return;
        setSubmissionView(isPendingOwnerSubmission(selectedSubmission) ? 'pending' : 'completed');
        setSubmissionTypeFilter('all');
        setSubmissionStatusFilter('all');
        setSubmissionSearch('');
    }, [selectedSubmission]);

    React.useEffect(() => {
        if (selectedSubmissionIndex < 0) return;
        setSubmissionPage(Math.floor(selectedSubmissionIndex / OWNER_PORTAL_SUBMISSION_PAGE_SIZE) + 1);
    }, [selectedSubmissionIndex]);

    return (
        <section className={styles.ownerPortalPanel}>
            <div className={styles.locationMasterHeader}>
                <div>
                    <h3>점주 제출 처리</h3>
                    <p>점주가 남긴 매장 정보, 시설 문의, 일반 문의 내역을 확인하고 처리합니다.</p>
                </div>
            </div>
            <div className={styles.ownerPortalSubmissionSummary}>
                <div>
                    <span>처리 필요</span>
                    <strong>{activitySummary.pendingCount}건</strong>
                </div>
                <div>
                    <span>24시간 초과</span>
                    <strong>{activitySummary.overdueCount}건</strong>
                </div>
                <div>
                    <span>최근 7일 처리</span>
                    <strong>{activitySummary.completedLast7Days}건</strong>
                </div>
                <div>
                    <span>평균 처리시간</span>
                    <strong>{activitySummary.averageResolutionHours === null ? '-' : `${activitySummary.averageResolutionHours}시간`}</strong>
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
                    const submissionSla = buildOwnerSubmissionSla({
                        createdAt: submission.submitted_at || submission.created_at,
                        reviewedAt: submission.reviewed_at,
                        status: submission.status,
                        submissionType: submission.submission_type
                    });
                    const payloadTitle = getSubmissionPayloadTitle(submission);
                    const detailRows = getSubmissionDetailRows(submission);
                    return (
                        <article
                            aria-current={submission.id === selectedSubmissionId ? 'true' : undefined}
                            className={`${styles.locationItem} ${styles.ownerPortalListItem} ${submission.id === selectedSubmissionId ? styles.ownerPortalFocusedSubmission : ''}`}
                            key={submission.id}
                        >
                            <div className={styles.locationItemMain}>
                                <strong>{submission.title}</strong>
                                <span>{getLocationName(locations, submission.location_id)} · {getSubmissionTypeLabel(submission.submission_type)} · {getSubmissionStatusLabel(submission.status)} · {formatDate(submission.created_at)}</span>
                                {submissionSla && reviewMode !== 'none' ? (
                                    <small className={submissionSla.isOverdue ? styles.ownerPortalSubmissionSlaOverdue : styles.ownerPortalSubmissionSla}>
                                        {submissionSla.isOverdue ? '처리 기한 초과' : `처리 기한 ${formatDateTime(submissionSla.dueAt)}`}
                                    </small>
                                ) : null}
                                {payloadTitle ? <small>{payloadTitle}</small> : null}
                                <details className={styles.ownerPortalSubmissionDetails} open={submission.id === selectedSubmissionId}>
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
