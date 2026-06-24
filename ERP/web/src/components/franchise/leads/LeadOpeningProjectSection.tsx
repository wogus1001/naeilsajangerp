"use client";

import React from 'react';
import { CalendarCheck, ExternalLink, Save, Store } from 'lucide-react';
import {
    OPENING_PROJECT_STATUSES,
    mergeOpeningProjectTasks,
    summarizeOpeningProjectTasks
} from '@/lib/franchise-opening-projects';
import { OpeningProjectTaskList } from '../operations/OpeningProjectTaskList';
import type { FranchiseOpeningProject, OpeningProjectDraft } from '../operations/types';
import type { FranchiseLead, FranchiseLocation } from './types';
import {
    fetchContractStoreLocation,
    fetchOpeningProject,
    patchOpeningProjectTask,
    readOpeningProjectStatus,
    saveOpeningProjectDraft,
    toOpeningProjectDraft
} from './LeadOpeningProjectSection.utils';
import styles from './LeadOpeningProjectSection.module.css';

type LeadOpeningProjectSectionProps = {
    readonly lead: FranchiseLead;
    readonly userId: string;
    readonly companyName: string;
    readonly onOpenStoreTabAction: () => void;
};

export function LeadOpeningProjectSection({
    lead,
    userId,
    companyName,
    onOpenStoreTabAction
}: LeadOpeningProjectSectionProps) {
    const [storeLocation, setStoreLocation] = React.useState<FranchiseLocation | null>(null);
    const [project, setProject] = React.useState<FranchiseOpeningProject | null>(null);
    const [draft, setDraft] = React.useState<OpeningProjectDraft | null>(null);
    const [isLoading, setIsLoading] = React.useState(false);
    const [isSaving, setIsSaving] = React.useState(false);
    const [message, setMessage] = React.useState('');
    const [errorMessage, setErrorMessage] = React.useState('');

    const loadOpeningProject = React.useCallback(async () => {
        if (!userId || !lead.id) return;
        setIsLoading(true);
        setMessage('');
        setErrorMessage('');
        try {
            const nextLocation = await fetchContractStoreLocation({ leadId: lead.id, userId, companyName });
            setStoreLocation(nextLocation);
            if (!nextLocation) {
                setProject(null);
                setDraft(null);
                return;
            }
            const nextProject = await fetchOpeningProject({ locationId: nextLocation.id, userId, companyName });
            setProject(nextProject);
            setDraft(nextProject || nextLocation.status === '오픈준비'
                ? toOpeningProjectDraft(nextLocation, nextProject || undefined)
                : null);
        } catch (error) {
            setStoreLocation(null);
            setProject(null);
            setDraft(null);
            setErrorMessage(error instanceof Error ? error.message : '오픈 준비 프로젝트를 불러오지 못했습니다.');
        } finally {
            setIsLoading(false);
        }
    }, [companyName, lead.id, userId]);

    React.useEffect(() => {
        void loadOpeningProject();
    }, [loadOpeningProject]);

    const updateDraft = (patch: Partial<OpeningProjectDraft>) => {
        if (!storeLocation) return;
        setDraft(current => ({
            ...toOpeningProjectDraft(storeLocation, project || undefined),
            ...(current || {}),
            ...patch
        }));
    };

    const saveDraft = async () => {
        if (!draft || !storeLocation || storeLocation.status !== '오픈준비') return;
        setIsSaving(true);
        setMessage('');
        setErrorMessage('');
        try {
            const savedProject = await saveOpeningProjectDraft({ draft, userId, companyName });
            setProject(savedProject);
            setDraft(toOpeningProjectDraft(storeLocation, savedProject));
            setMessage(project ? '오픈 준비 프로젝트를 저장했습니다.' : '오픈 준비 프로젝트를 시작했습니다.');
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : '오픈 준비 프로젝트 저장에 실패했습니다.');
        } finally {
            setIsSaving(false);
        }
    };

    const canManageProject = storeLocation?.status === '오픈준비';
    const normalizedTasks = mergeOpeningProjectTasks(draft?.tasks);
    const summary = summarizeOpeningProjectTasks(normalizedTasks);
    const dueAttentionCount = summary.overdue + summary.dueSoon;
    const issueAttentionCount = summary.blocked + summary.reviewRequested;
    const disabled = isLoading || isSaving || !canManageProject;

    return (
        <section className={styles.section} aria-busy={isLoading}>
            <div className={styles.header}>
                <div>
                    <h3><CalendarCheck size={16} /> 오픈 준비</h3>
                    <p>계약 완료 점주를 실제 오픈일까지 프로젝트로 이어서 관리합니다.</p>
                </div>
            </div>

            {errorMessage && <div className={styles.error}>{errorMessage}</div>}
            {message && <div className={styles.message}>{message}</div>}

            {!storeLocation ? (
                <div className={styles.empty}>
                    <span>가맹점 정보 생성 후 오픈 준비 프로젝트를 시작할 수 있습니다.</span>
                    <button type="button" className={styles.primaryAction} onClick={onOpenStoreTabAction}>
                        <Store size={15} />
                        가맹점 정보로 이동
                    </button>
                </div>
            ) : (
                <>
                    <div className={styles.storeSummary}>
                        <strong>{storeLocation.name}</strong>
                        <span>{[storeLocation.brand, storeLocation.region, storeLocation.address].filter(Boolean).join(' · ') || lead.name}</span>
                    </div>

                    <div className={styles.summaryGrid}>
                        <div className={styles.metric}>
                            <span>오늘 처리</span>
                            <strong>{summary.dueToday}건</strong>
                        </div>
                        <div className={styles.metric}>
                            <span>기한 임박</span>
                            <strong>{dueAttentionCount}건</strong>
                        </div>
                        <div className={styles.metric}>
                            <span>진행 이슈</span>
                            <strong>{issueAttentionCount}건</strong>
                        </div>
                        <div className={styles.metric}>
                            <span>오픈 가능도</span>
                            <strong>{summary.progressPercent}%</strong>
                        </div>
                    </div>

                    {!canManageProject && (
                        <div className={styles.empty}>
                            <span>오픈준비 상태의 가맹점만 프로젝트를 시작하거나 수정할 수 있습니다. 현재 프로젝트는 읽기용으로 확인합니다.</span>
                        </div>
                    )}

                    {draft ? (
                        <>
                            <div className={styles.projectForm}>
                                <label className={styles.field}>
                                    프로젝트 상태
                                    <select
                                        value={draft.status}
                                        disabled={disabled}
                                        onChange={event => updateDraft({ status: readOpeningProjectStatus(event.target.value) })}
                                    >
                                        {OPENING_PROJECT_STATUSES.map(status => (
                                            <option key={status} value={status}>{status}</option>
                                        ))}
                                    </select>
                                </label>
                                <label className={styles.field}>
                                    목표 오픈일
                                    <input
                                        type="date"
                                        value={draft.targetOpenDate}
                                        disabled={disabled}
                                        onChange={event => updateDraft({ targetOpenDate: event.target.value })}
                                    />
                                </label>
                                <label className={styles.memoField}>
                                    오픈 준비 메모
                                    <textarea
                                        value={draft.memo}
                                        placeholder="오픈 준비 리스크, 본사 지원, 점주 확인사항"
                                        disabled={disabled}
                                        onChange={event => updateDraft({ memo: event.target.value })}
                                    />
                                </label>
                            </div>

                            <div className={styles.taskWrap}>
                                <strong>오픈 준비 체크리스트 <span>{summary.done}/{summary.total} 완료</span></strong>
                                <OpeningProjectTaskList
                                    tasks={normalizedTasks}
                                    disabled={disabled}
                                    onChange={(taskId, patch) => updateDraft({ tasks: patchOpeningProjectTask(normalizedTasks, taskId, patch) })}
                                />
                            </div>
                        </>
                    ) : (
                        <div className={styles.empty}>저장된 오픈 준비 프로젝트가 없습니다.</div>
                    )}

                    <div className={styles.actionRow}>
                        <a href={`/dashboard/franchise-operations?locationId=${storeLocation.id}`} className={styles.secondaryAction}>
                            <ExternalLink size={15} />
                            운영 화면 열기
                        </a>
                        {canManageProject && draft ? (
                            <button type="button" className={styles.primaryAction} onClick={() => void saveDraft()} disabled={isSaving || isLoading}>
                                <Save size={15} />
                                {isSaving ? '저장 중' : project ? '저장' : '프로젝트 시작'}
                            </button>
                        ) : null}
                    </div>
                </>
            )}
        </section>
    );
}
