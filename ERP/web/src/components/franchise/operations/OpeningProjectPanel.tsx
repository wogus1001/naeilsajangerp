"use client";

import React from 'react';
import { RefreshCw, Save, Trash2 } from 'lucide-react';
import {
    OPENING_PROJECT_STATUSES,
    buildDefaultOpeningProjectTasks,
    mergeOpeningProjectTasks,
    summarizeOpeningProjectTasks,
    updateOpeningProjectTask,
    type OpeningProjectStatus,
    type OpeningProjectTask
} from '@/lib/franchise-opening-projects';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import {
    deleteOpeningProject,
    fetchOpeningProjects,
    saveOpeningProject
} from './requests';
import type { FranchiseLocation, FranchiseOpeningProject, OpeningProjectDraft } from './types';
import { OpeningProjectTaskList } from './OpeningProjectTaskList';

type OpeningProjectPanelProps = {
    readonly userId: string;
    readonly companyName: string;
    readonly locations: readonly FranchiseLocation[];
};

function toDraft(location: FranchiseLocation, project?: FranchiseOpeningProject): OpeningProjectDraft {
    return {
        id: project?.id,
        locationId: location.id,
        status: project?.status || '준비중',
        targetOpenDate: project?.targetOpenDate || location.openedAt || '',
        memo: project?.memo || '',
        tasks: project?.tasks || buildDefaultOpeningProjectTasks()
    };
}

function patchDraftTask(
    tasks: readonly OpeningProjectTask[],
    taskId: string,
    patch: Parameters<typeof updateOpeningProjectTask>[2]
) {
    return updateOpeningProjectTask(tasks, taskId, patch);
}

export function OpeningProjectPanel({ userId, companyName, locations }: OpeningProjectPanelProps) {
    const openingLocations = React.useMemo(
        () => locations.filter(location => location.status === '오픈준비'),
        [locations]
    );
    const [projects, setProjects] = React.useState<FranchiseOpeningProject[]>([]);
    const [drafts, setDrafts] = React.useState<Record<string, OpeningProjectDraft>>({});
    const [errorMessage, setErrorMessage] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);
    const [savingLocationId, setSavingLocationId] = React.useState('');
    const [deletingProjectId, setDeletingProjectId] = React.useState('');

    const fetchProjects = React.useCallback(async () => {
        if (!userId) return;
        setIsLoading(true);
        setErrorMessage('');
        try {
            const nextProjects = await fetchOpeningProjects({ userId, companyName });
            setProjects(nextProjects);
            setDrafts(() => {
                const nextDrafts: Record<string, OpeningProjectDraft> = {};
                openingLocations.forEach(location => {
                    const project = nextProjects.find(item => item.locationId === location.id);
                    nextDrafts[location.id] = toDraft(location, project);
                });
                return nextDrafts;
            });
        } catch (error) {
            console.warn('Failed to fetch opening projects:', error);
            const message = error instanceof Error && !error.message.includes('Failed to fetch')
                ? error.message
                : '오픈 준비 프로젝트 데이터를 불러오지 못했습니다. SQL migration 적용 후 다시 확인해주세요.';
            setErrorMessage(message);
        } finally {
            setIsLoading(false);
        }
    }, [companyName, openingLocations, userId]);

    React.useEffect(() => {
        void fetchProjects();
    }, [fetchProjects]);

    const projectByLocationId = React.useMemo(() => new Map(projects.map(project => [project.locationId, project])), [projects]);

    const updateDraft = (location: FranchiseLocation, patch: Partial<OpeningProjectDraft>) => {
        const project = projectByLocationId.get(location.id);
        setDrafts(current => ({
            ...current,
            [location.id]: { ...toDraft(location, project), ...current[location.id], ...patch }
        }));
    };

    const saveDraft = async (location: FranchiseLocation) => {
        if (!userId) return;
        setSavingLocationId(location.id);
        try {
            const project = await saveOpeningProject({
                userId,
                companyName,
                draft: drafts[location.id] || toDraft(location, projectByLocationId.get(location.id))
            });
            setProjects(current => [project, ...current.filter(item => item.id !== project.id)]);
            setDrafts(current => ({ ...current, [location.id]: toDraft(location, project) }));
        } catch (error) {
            window.alert(error instanceof Error ? error.message : '오픈 준비 프로젝트 저장 중 오류가 발생했습니다.');
        } finally {
            setSavingLocationId('');
        }
    };

    const deleteProject = async (location: FranchiseLocation, project: FranchiseOpeningProject) => {
        const confirmed = window.confirm(`${location.name} 오픈 준비 프로젝트를 삭제할까요? 가맹점 마스터는 삭제되지 않습니다.`);
        if (!confirmed) return;
        setDeletingProjectId(project.id);
        try {
            await deleteOpeningProject({ userId, companyName, projectId: project.id });
            setProjects(current => current.filter(item => item.id !== project.id));
            setDrafts(current => ({ ...current, [location.id]: toDraft(location) }));
        } catch (error) {
            window.alert(error instanceof Error ? error.message : '오픈 준비 프로젝트 삭제 중 오류가 발생했습니다.');
        } finally {
            setDeletingProjectId('');
        }
    };

    return (
        <div className={styles.locationMasterPanel}>
            <div className={styles.locationMasterHeader}>
                <div>
                    <h3>오픈 준비 프로젝트</h3>
                    <p>오픈준비 상태의 운영점을 계약부터 오픈일까지 checklist로 추적합니다.</p>
                </div>
                <button className={styles.secondaryButton} onClick={() => void fetchProjects()} disabled={isLoading}>
                    <RefreshCw size={14} />
                    {isLoading ? '불러오는 중' : '프로젝트 새로고침'}
                </button>
            </div>

            <div className={styles.openingProjectList}>
                {errorMessage ? (
                    <div className={styles.locationEmpty}>{errorMessage}</div>
                ) : null}
                {openingLocations.length === 0 ? (
                    <div className={styles.locationEmpty}>오픈준비 상태의 가맹점이 없습니다.</div>
                ) : openingLocations.map(location => {
                    const project = projectByLocationId.get(location.id);
                    const draft = drafts[location.id] || toDraft(location, project);
                    const summary = summarizeOpeningProjectTasks(draft.tasks);
                    const disabled = savingLocationId === location.id || deletingProjectId === project?.id;
                    return (
                        <article key={location.id} className={styles.openingProjectCard}>
                            <div className={styles.openingProjectHeader}>
                                <div>
                                    <strong>{location.name}</strong>
                                    <span>{location.region || location.address || '주소 미입력'}</span>
                                </div>
                                <span className={styles.openingProgress}>{summary.progressPercent}%</span>
                            </div>
                            <div className={styles.openingProjectMeta}>
                                <select
                                    value={draft.status}
                                    disabled={disabled}
                                    onChange={event => updateDraft(location, { status: event.target.value as OpeningProjectStatus })}
                                >
                                    {OPENING_PROJECT_STATUSES.map(status => (
                                        <option key={status} value={status}>{status}</option>
                                    ))}
                                </select>
                                <input
                                    type="date"
                                    value={draft.targetOpenDate}
                                    disabled={disabled}
                                    onChange={event => updateDraft(location, { targetOpenDate: event.target.value })}
                                />
                                <span>완료 {summary.done}/{summary.total}</span>
                                <span>이슈 {summary.blocked}</span>
                                <span>기한임박 {summary.dueSoon}</span>
                            </div>
                            <textarea
                                value={draft.memo}
                                placeholder="오픈 준비 메모"
                                disabled={disabled}
                                onChange={event => updateDraft(location, { memo: event.target.value })}
                            />
                            <OpeningProjectTaskList
                                tasks={mergeOpeningProjectTasks(draft.tasks)}
                                disabled={disabled}
                                onChange={(taskId, patch) => updateDraft(location, { tasks: patchDraftTask(draft.tasks, taskId, patch) })}
                            />
                            <div className={styles.openingProjectActions}>
                                <button className={styles.primaryButton} onClick={() => void saveDraft(location)} disabled={disabled}>
                                    <Save size={14} />
                                    {savingLocationId === location.id ? '저장 중' : project ? '프로젝트 저장' : '프로젝트 시작'}
                                </button>
                                {project ? (
                                    <button
                                        className={styles.secondaryButton}
                                        onClick={() => void deleteProject(location, project)}
                                        disabled={disabled}
                                    >
                                        <Trash2 size={14} />
                                        삭제
                                    </button>
                                ) : null}
                            </div>
                        </article>
                    );
                })}
            </div>
        </div>
    );
}
