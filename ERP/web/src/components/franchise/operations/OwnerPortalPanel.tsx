"use client";

import React from 'react';
import { getApiAuthHeaders } from '@/utils/apiAuthHeaders';
import { readApiError, unwrapApiData } from '@/utils/apiResponse';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import {
    buildOwnerPortalLoginPath,
    isOwnerChecklistCompletionSubmission,
    type OwnerNoticeAttachment,
    type OwnerPortalChecklistTask
} from '@/lib/franchise-owner-portal';
import type { FranchiseLocation } from './types';
import {
    OwnerPortalAccountsSection,
    OwnerPortalChecklistSection,
    OwnerPortalNoticeSection,
    OwnerPortalStatusMessages,
    OwnerPortalSubmissionsSection,
    OwnerPortalViewTabs,
    type OwnerAccount,
    type OwnerChecklistSetting,
    type OwnerNotice,
    type OwnerPortalView,
    type OwnerSubmission
} from './OwnerPortalPanelSections';

type OwnerPortalPanelProps = {
    readonly userId: string;
    readonly companyName: string;
    readonly locations: readonly FranchiseLocation[];
    readonly selectedLocationId?: string;
};

type JsonRequestInit = {
    readonly method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    readonly body?: string;
    readonly headers?: Record<string, string>;
};

type ChecklistSaveResult = {
    readonly ok: boolean;
    readonly issueKey?: string;
};

type NoticeAttachmentUploadResponse = {
    readonly attachment: OwnerNoticeAttachment;
};

async function requestJson<T>(url: string, init?: JsonRequestInit): Promise<T> {
    const headers = await getApiAuthHeaders(init?.headers);
    const response = await fetch(url, { ...init, headers, cache: 'no-store' });
    const payload: unknown = await response.json();
    if (!response.ok) throw new Error(readApiError(payload));
    return unwrapApiData<T>(payload);
}

function countChecklistIssues(checklists: readonly OwnerChecklistSetting[]): number {
    const keys = new Set<string>();
    checklists.forEach(checklist => {
        if (checklist.issues && checklist.issues.length > 0) {
            checklist.issues.forEach(issue => keys.add(issue.id));
            return;
        }
        if (checklist.tasks.length > 0) {
            keys.add(JSON.stringify(checklist.tasks.map(task => ({
                id: task.id,
                title: task.title,
                memo: task.memo
            }))));
        }
    });
    return keys.size;
}

export function OwnerPortalPanel({ userId, companyName, locations, selectedLocationId }: OwnerPortalPanelProps) {
    const [activeView, setActiveView] = React.useState<OwnerPortalView>('notices');
    const [accounts, setAccounts] = React.useState<OwnerAccount[]>([]);
    const [notices, setNotices] = React.useState<OwnerNotice[]>([]);
    const [submissions, setSubmissions] = React.useState<OwnerSubmission[]>([]);
    const [checklists, setChecklists] = React.useState<OwnerChecklistSetting[]>([]);
    const [locationId, setLocationId] = React.useState(selectedLocationId || locations[0]?.id || '');
    const [noticeTarget, setNoticeTarget] = React.useState<'all' | 'single'>('all');
    const [noticeLocationIds, setNoticeLocationIds] = React.useState<readonly string[]>(selectedLocationId ? [selectedLocationId] : []);
    const [loginId, setLoginId] = React.useState('');
    const [ownerName, setOwnerName] = React.useState('');
    const [ownerPhone, setOwnerPhone] = React.useState('');
    const [noticeTitle, setNoticeTitle] = React.useState('');
    const [noticeBody, setNoticeBody] = React.useState('');
    const [noticeFiles, setNoticeFiles] = React.useState<readonly File[]>([]);
    const [message, setMessage] = React.useState('');
    const [error, setError] = React.useState('');
    const [isBusy, setIsBusy] = React.useState(false);
    const companyId = locations.find(location => location.companyId)?.companyId || '';
    const ownerPortalLoginPath = React.useMemo(() => buildOwnerPortalLoginPath({
        companyId: companyId || null,
        companyName
    }), [companyId, companyName]);
    const generalSubmissionsCount = submissions.filter(submission => (
        !isOwnerChecklistCompletionSubmission(submission.submission_type)
    )).length;
    const issuedChecklistCount = countChecklistIssues(checklists);

    const load = React.useCallback(async () => {
        if (!userId) return;
        const params = new URLSearchParams({ requesterId: userId });
        if (companyName) params.set('company', companyName);
        const [accountData, noticeData, checklistData, submissionData] = await Promise.all([
            requestJson<{ readonly accounts: readonly OwnerAccount[] }>(`/api/franchise-owner-portal/accounts?${params.toString()}`),
            requestJson<{ readonly notices: readonly OwnerNotice[] }>(`/api/franchise-owner-portal/notices?${params.toString()}`),
            requestJson<{ readonly checklists: readonly OwnerChecklistSetting[] }>(`/api/franchise-owner-portal/checklists?${params.toString()}`),
            requestJson<{ readonly submissions: readonly OwnerSubmission[] }>(`/api/franchise-owner-portal/submissions?${params.toString()}`)
        ]);
        setAccounts([...accountData.accounts]);
        setNotices([...noticeData.notices]);
        setChecklists([...checklistData.checklists]);
        setSubmissions([...submissionData.submissions]);
    }, [companyName, userId]);

    React.useEffect(() => {
        void load().catch(caught => setError(caught instanceof Error ? caught.message : '점주 연동 데이터를 불러오지 못했습니다.'));
    }, [load]);

    React.useEffect(() => {
        if (selectedLocationId) setLocationId(selectedLocationId);
    }, [selectedLocationId]);

    React.useEffect(() => {
        if (selectedLocationId) setNoticeLocationIds([selectedLocationId]);
    }, [selectedLocationId]);

    const toggleNoticeLocation = (nextLocationId: string) => {
        setNoticeLocationIds(current => current.includes(nextLocationId)
            ? current.filter(id => id !== nextLocationId)
            : [...current, nextLocationId]);
    };

    const uploadNoticeAttachment = async (file: File): Promise<OwnerNoticeAttachment> => {
        const formData = new FormData();
        formData.set('file', file);
        formData.set('companyName', companyName);
        if (companyId) formData.set('companyId', companyId);
        const headers = await getApiAuthHeaders();
        const response = await fetch('/api/franchise-owner-portal/files', {
            method: 'POST',
            headers,
            body: formData,
            cache: 'no-store'
        });
        const payload: unknown = await response.json();
        if (!response.ok) throw new Error(readApiError(payload));
        return unwrapApiData<NoticeAttachmentUploadResponse>(payload).attachment;
    };

    const createAccount = async () => {
        setIsBusy(true);
        setError('');
        setMessage('');
        try {
            const data = await requestJson<{ readonly account: OwnerAccount; readonly temporaryPassword: string }>('/api/franchise-owner-portal/accounts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requesterId: userId, companyName, locationId, loginId, ownerName, ownerPhone })
            });
            setMessage(`점주 계정이 준비됐습니다. 아이디 ${data.account.loginId} / 임시 비밀번호 ${data.temporaryPassword}`);
            await load();
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : '점주 계정을 발급하지 못했습니다.');
        } finally {
            setIsBusy(false);
        }
    };

    const resetPassword = async (accountId: string) => {
        setIsBusy(true);
        setError('');
        setMessage('');
        try {
            const data = await requestJson<{ readonly temporaryPassword: string }>('/api/franchise-owner-portal/accounts', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: accountId, action: 'reset_password' })
            });
            setMessage(`임시 비밀번호가 재발급됐습니다. ${data.temporaryPassword}`);
            await load();
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : '비밀번호 재발급에 실패했습니다.');
        } finally {
            setIsBusy(false);
        }
    };

    const updateAccountStatus = async (accountId: string, action: 'activate' | 'suspend') => {
        setIsBusy(true);
        setError('');
        setMessage('');
        try {
            await requestJson('/api/franchise-owner-portal/accounts', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: accountId, action })
            });
            setMessage(action === 'activate' ? '점주 계정을 활성화했습니다.' : '점주 계정을 중지했습니다.');
            await load();
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : '점주 계정 상태를 변경하지 못했습니다.');
        } finally {
            setIsBusy(false);
        }
    };

    const publishNotice = async (): Promise<boolean> => {
        setIsBusy(true);
        setError('');
        setMessage('');
        try {
            const targetLocationIds = noticeTarget === 'single' ? noticeLocationIds : [''];
            for (const targetLocationId of targetLocationIds) {
                const attachments = noticeFiles.length > 0
                    ? await Promise.all(noticeFiles.map(file => uploadNoticeAttachment(file)))
                    : [];
                await requestJson('/api/franchise-owner-portal/notices', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        requesterId: userId,
                        companyName,
                        locationId: targetLocationId,
                        title: noticeTitle,
                        body: noticeBody,
                        attachments
                    })
                });
            }
            setNoticeTitle('');
            setNoticeBody('');
            setNoticeFiles([]);
            setMessage(noticeTarget === 'single' ? `선택한 운영점 ${targetLocationIds.length}곳에 점주 공지가 발행됐습니다.` : '전체 가맹점에 점주 공지가 발행됐습니다.');
            await load();
            return true;
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : '공지 발행에 실패했습니다.');
            return false;
        } finally {
            setIsBusy(false);
        }
    };

    const deleteNotice = async (noticeId: string): Promise<boolean> => {
        setIsBusy(true);
        setError('');
        setMessage('');
        try {
            const params = new URLSearchParams({ id: noticeId, requesterId: userId });
            if (companyName) params.set('company', companyName);
            await requestJson(`/api/franchise-owner-portal/notices?${params.toString()}`, {
                method: 'DELETE'
            });
            setMessage('점주 공지가 삭제됐습니다.');
            await load();
            return true;
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : '공지 삭제에 실패했습니다.');
            return false;
        } finally {
            setIsBusy(false);
        }
    };

    const openNoticeAttachment = async (attachment: OwnerNoticeAttachment): Promise<void> => {
        setError('');
        try {
            const params = new URLSearchParams({
                requesterId: userId,
                storagePath: attachment.storagePath
            });
            if (companyName) params.set('company', companyName);
            const data = await requestJson<{ readonly url: string }>(`/api/franchise-owner-portal/notices/attachments?${params.toString()}`);
            window.open(data.url, '_blank', 'noopener,noreferrer');
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : '첨부 파일을 열지 못했습니다.');
        }
    };

    const saveChecklists = async (locationIds: readonly string[], tasks: readonly OwnerPortalChecklistTask[]): Promise<ChecklistSaveResult> => {
        setIsBusy(true);
        setError('');
        setMessage('');
        try {
            const data = await requestJson<{ readonly checklists: readonly OwnerChecklistSetting[] }>('/api/franchise-owner-portal/checklists', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requesterId: userId, companyName, locationIds, tasks })
            });
            setChecklists(current => {
                const nextByLocationId = new Map(current.map(item => [item.locationId, item]));
                data.checklists.forEach(item => nextByLocationId.set(item.locationId, item));
                return Array.from(nextByLocationId.values());
            });
            setMessage(locationIds.length > 1
                ? `운영 체크리스트를 ${locationIds.length}개 운영점에 발송했습니다.`
                : '운영점에 운영 체크리스트를 발송했습니다.'
            );
            await load();
            return { ok: true, issueKey: data.checklists.find(checklist => checklist.issues?.[0]?.id)?.issues?.[0]?.id };
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : '운영 체크리스트를 발송하지 못했습니다.');
            return { ok: false };
        } finally {
            setIsBusy(false);
        }
    };

    const reviewSubmission = async (submissionId: string, action: 'approve' | 'reject' | 'resolve') => {
        setIsBusy(true);
        setError('');
        setMessage('');
        try {
            await requestJson('/api/franchise-owner-portal/submissions', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: submissionId, action })
            });
            setMessage('점주 제출 건을 처리했습니다.');
            await load();
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : '제출 건 처리에 실패했습니다.');
        } finally {
            setIsBusy(false);
        }
    };

    return (
        <div className={styles.ownerPortalShell}>
            <OwnerPortalViewTabs
                activeView={activeView}
                accountsCount={accounts.length}
                checklistsCount={issuedChecklistCount}
                noticesCount={notices.length}
                submissionsCount={generalSubmissionsCount}
                onChange={setActiveView}
            />
            <OwnerPortalStatusMessages message={message} error={error} />
            {activeView === 'accounts' ? (
                <OwnerPortalAccountsSection
                    locations={locations}
                    accounts={accounts}
                    ownerPortalLoginPath={ownerPortalLoginPath}
                    locationId={locationId}
                    loginId={loginId}
                    ownerName={ownerName}
                    ownerPhone={ownerPhone}
                    isBusy={isBusy}
                    onLocationChange={setLocationId}
                    onLoginIdChange={setLoginId}
                    onOwnerNameChange={setOwnerName}
                    onOwnerPhoneChange={setOwnerPhone}
                    onCreateAccount={() => void createAccount()}
                    onResetPassword={(accountId) => void resetPassword(accountId)}
                    onUpdateStatus={(accountId, action) => void updateAccountStatus(accountId, action)}
                />
            ) : null}
            {activeView === 'notices' ? (
                <OwnerPortalNoticeSection
                    locations={locations}
                    notices={notices}
                    noticeTarget={noticeTarget}
                    selectedLocationIds={noticeLocationIds}
                    noticeTitle={noticeTitle}
                    noticeBody={noticeBody}
                    isBusy={isBusy}
                    onNoticeTargetChange={setNoticeTarget}
                    onNoticeLocationToggle={toggleNoticeLocation}
                    onNoticeLocationSelectAll={() => setNoticeLocationIds(locations.map(location => location.id))}
                    onNoticeLocationClear={() => setNoticeLocationIds([])}
                    onNoticeTitleChange={setNoticeTitle}
                    onNoticeBodyChange={setNoticeBody}
                    noticeFiles={noticeFiles}
                    onNoticeFilesChange={setNoticeFiles}
                    onPublishNotice={publishNotice}
                    onDeleteNotice={deleteNotice}
                    onOpenNoticeAttachment={openNoticeAttachment}
                />
            ) : null}
            {activeView === 'checklists' ? (
                <OwnerPortalChecklistSection
                    locations={locations}
                    checklists={checklists}
                    submissions={submissions}
                    isBusy={isBusy}
                    onSaveChecklists={saveChecklists}
                />
            ) : null}
            {activeView === 'submissions' ? (
                <OwnerPortalSubmissionsSection
                    locations={locations}
                    submissions={submissions}
                    isBusy={isBusy}
                    onReviewSubmission={(submissionId, action) => void reviewSubmission(submissionId, action)}
                />
            ) : null}
        </div>
    );
}
