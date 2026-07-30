"use client";

import React from 'react';
import { LockKeyhole, Plus } from 'lucide-react';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import {
    canEditFranchiseLeadSourceOption,
    validateFranchiseLeadSourceOptionLabel,
    type FranchiseLeadSourceOption
} from '@/lib/franchise-lead-source-options';

type LeadSourceOptionManagerProps = {
    readonly options: readonly FranchiseLeadSourceOption[];
    readonly canManage: boolean;
    readonly storageReady: boolean;
    readonly isLoading: boolean;
    readonly isSaving: boolean;
    readonly loadError: string;
    readonly onRefreshAction: () => Promise<void>;
    readonly onCreateAction: (label: string) => Promise<void>;
    readonly onUpdateAction: (
        optionId: string,
        updates: { readonly label?: string; readonly isActive?: boolean }
    ) => Promise<void>;
};

export function LeadSourceOptionManager({
    options,
    canManage,
    storageReady,
    isLoading,
    isSaving,
    loadError,
    onRefreshAction,
    onCreateAction,
    onUpdateAction
}: LeadSourceOptionManagerProps) {
    const [newLabel, setNewLabel] = React.useState('');
    const [drafts, setDrafts] = React.useState<Readonly<Record<string, string>>>({});
    const [message, setMessage] = React.useState('');

    React.useEffect(() => {
        setDrafts(Object.fromEntries(options.map(option => [option.id, option.label])));
    }, [options]);

    const editableOptions = options.filter(canEditFranchiseLeadSourceOption);
    const systemOptions = options.filter(option => !canEditFranchiseLeadSourceOption(option));
    const actionsDisabled = !canManage || !storageReady || isLoading || isSaving;

    const createOption = async () => {
        const labelResult = validateFranchiseLeadSourceOptionLabel(newLabel);
        if (!labelResult.ok) {
            setMessage(labelResult.message);
            return;
        }
        setMessage('');
        try {
            await onCreateAction(labelResult.label);
            setNewLabel('');
            setMessage('유입경로를 추가했습니다.');
        } catch (error) {
            setMessage(error instanceof Error ? error.message : '유입경로를 추가하지 못했습니다.');
        }
    };

    const saveLabel = async (option: FranchiseLeadSourceOption) => {
        const labelResult = validateFranchiseLeadSourceOptionLabel(drafts[option.id]);
        if (!labelResult.ok) {
            setMessage(labelResult.message);
            return;
        }
        if (labelResult.label === option.label) return;
        setMessage('');
        try {
            await onUpdateAction(option.id, { label: labelResult.label });
            setMessage('유입경로 이름을 저장했습니다.');
        } catch (error) {
            setMessage(error instanceof Error ? error.message : '유입경로 이름을 저장하지 못했습니다.');
        }
    };

    const toggleOption = async (option: FranchiseLeadSourceOption) => {
        setMessage('');
        try {
            await onUpdateAction(option.id, { isActive: !option.isActive });
            setMessage(option.isActive ? '유입경로를 사용 중지했습니다.' : '유입경로를 다시 사용합니다.');
        } catch (error) {
            setMessage(error instanceof Error ? error.message : '유입경로 상태를 바꾸지 못했습니다.');
        }
    };

    return (
        <section className={styles.sourceManager} aria-label="유입경로 항목 관리">
            <div className={styles.sourceManagerHeader}>
                <div>
                    <strong>유입경로 항목 관리</strong>
                    <p>직접 관리 항목은 이름을 바꾸거나 사용 중지할 수 있습니다.</p>
                </div>
                {!canManage && <span className={styles.sourcePermissionBadge}>조회만 가능</span>}
            </div>

            {isLoading ? (
                <p className={styles.sourceManagerNotice} role="status">
                    유입경로 설정을 불러오는 중입니다.
                </p>
            ) : loadError ? (
                <div className={styles.sourceManagerNotice} role="alert">
                    <span>유입경로 설정을 불러오지 못했습니다.</span>
                    <button type="button" onClick={() => void onRefreshAction()}>
                        다시 시도
                    </button>
                </div>
            ) : !storageReady && (
                <p className={styles.sourceManagerNotice}>
                    회사별 유입경로 설정을 준비 중입니다. 설정이 완료되면 항목을 수정할 수 있습니다.
                </p>
            )}

            <div className={styles.sourceAddRow}>
                <input
                    value={newLabel}
                    onChange={(event) => setNewLabel(event.target.value)}
                    placeholder="새 유입경로 이름"
                    maxLength={40}
                    disabled={actionsDisabled}
                    aria-label="새 유입경로 이름"
                />
                <button type="button" onClick={() => void createOption()} disabled={actionsDisabled}>
                    <Plus size={15} />
                    추가
                </button>
            </div>

            <div className={styles.sourceManagerGroup}>
                <div className={styles.sourceManagerGroupTitle}>
                    <strong>수정 가능한 항목</strong>
                    <span>{editableOptions.length}개</span>
                </div>
                <div className={styles.sourceOptionList}>
                    {editableOptions.map(option => (
                        <div className={styles.sourceOptionRow} key={option.id}>
                            <input
                                value={drafts[option.id] ?? option.label}
                                onChange={(event) => setDrafts(current => ({
                                    ...current,
                                    [option.id]: event.target.value
                                }))}
                                maxLength={40}
                                disabled={actionsDisabled}
                                aria-label={`${option.label} 이름`}
                            />
                            <span className={option.isActive ? styles.sourceActiveBadge : styles.sourceInactiveBadge}>
                                {option.isActive ? '사용 중' : '사용 중지'}
                            </span>
                            <div className={styles.sourceOptionActions}>
                                <button
                                    type="button"
                                    onClick={() => void saveLabel(option)}
                                    disabled={actionsDisabled || (drafts[option.id] ?? option.label) === option.label}
                                >
                                    이름 저장
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void toggleOption(option)}
                                    disabled={actionsDisabled}
                                >
                                    {option.isActive ? '사용 중지' : '다시 사용'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className={styles.sourceManagerGroup}>
                <div className={styles.sourceManagerGroupTitle}>
                    <strong>고정 항목</strong>
                    <span>{systemOptions.length}개</span>
                </div>
                <p className={styles.sourceManagerHelp}>
                    자동 수집과 다른 DB 연결에 사용되어 이름과 상태를 바꿀 수 없습니다.
                </p>
                <div className={styles.sourceSystemList}>
                    {systemOptions.map(option => (
                        <span key={option.id}>
                            <LockKeyhole size={13} />
                            {option.label}
                        </span>
                    ))}
                </div>
            </div>

            {message && <p className={styles.sourceManagerMessage} role="status">{message}</p>}
        </section>
    );
}
