"use client";

import React from 'react';
import {
    addLeadActivityLogEntry,
    removeLeadActivityLogEntry,
    updateLeadActivityLogEntry
} from './leadActivityLog';
import { createActivityId } from './utils';
import type { FranchiseLead, LeadActivity, LeadActivityType } from './types';

type LeadAlertType = 'success' | 'error' | 'info';

type UseLeadActivityLogParams = {
    readonly leads: readonly FranchiseLead[];
    readonly selectedLead: FranchiseLead | null;
    readonly userId: string;
    readonly userName?: string;
    readonly onLeadPatchAction: (lead: FranchiseLead, patch: Record<string, unknown>) => Promise<FranchiseLead | null>;
    readonly showAlertAction: (message: string, type?: LeadAlertType, title?: string) => void;
};

type LeadActivityDraft = {
    readonly type: LeadActivityType;
    readonly content: string;
};

function createLeadActivity(draft: LeadActivityDraft, createdBy: string): LeadActivity {
    return {
        id: createActivityId(),
        type: draft.type,
        content: draft.content.trim(),
        createdAt: new Date().toISOString(),
        createdBy
    };
}

export function useLeadActivityLog({
    leads,
    selectedLead,
    userId,
    userName,
    onLeadPatchAction,
    showAlertAction
}: UseLeadActivityLogParams) {
    const [activityType, setActivityType] = React.useState<LeadActivityType>('전화');
    const [activityContent, setActivityContent] = React.useState('');
    const [quickActivityLeadId, setQuickActivityLeadId] = React.useState('');
    const [quickActivityType, setQuickActivityType] = React.useState<LeadActivityType>('전화');
    const [quickActivityContent, setQuickActivityContent] = React.useState('');
    const [isActivitySaving, setIsActivitySaving] = React.useState(false);
    const [isQuickSaving, setIsQuickSaving] = React.useState(false);

    const quickActivityLead = React.useMemo(
        () => leads.find(lead => lead.id === quickActivityLeadId) || null,
        [leads, quickActivityLeadId]
    );
    const createdBy = userName || userId;

    const addLeadActivity = async () => {
        if (!selectedLead || !activityContent.trim()) {
            showAlertAction('상담 내용을 입력해주세요.', 'error', '상담 이력 추가 실패');
            return false;
        }

        const now = new Date().toISOString();
        const nextActivity = createLeadActivity({ type: activityType, content: activityContent }, createdBy);

        setIsActivitySaving(true);
        try {
            await onLeadPatchAction(selectedLead, {
                activityLog: addLeadActivityLogEntry(selectedLead.activityLog || [], nextActivity),
                lastContactedAt: now
            });
            setActivityContent('');
            showAlertAction('상담 이력을 추가했습니다.', 'success', '저장 완료');
            return true;
        } catch (error) {
            console.error(error);
            showAlertAction(error instanceof Error ? error.message : '상담 이력 저장에 실패했습니다.', 'error', '저장 실패');
            return false;
        } finally {
            setIsActivitySaving(false);
        }
    };

    const updateLeadActivity = async (activityId: string, draft: LeadActivityDraft) => {
        if (!selectedLead || !draft.content.trim()) {
            showAlertAction('상담 내용을 입력해주세요.', 'error', '상담 이력 수정 실패');
            return false;
        }

        const currentActivities = selectedLead.activityLog || [];
        const nextActivities = updateLeadActivityLogEntry(currentActivities, activityId, draft);
        if (nextActivities === currentActivities) {
            showAlertAction('수정할 상담 이력을 찾지 못했습니다.', 'error', '수정 실패');
            return false;
        }

        setIsActivitySaving(true);
        try {
            await onLeadPatchAction(selectedLead, { activityLog: nextActivities });
            showAlertAction('상담 이력을 수정했습니다.', 'success', '수정 완료');
            return true;
        } catch (error) {
            console.error(error);
            showAlertAction(error instanceof Error ? error.message : '상담 이력 수정에 실패했습니다.', 'error', '수정 실패');
            return false;
        } finally {
            setIsActivitySaving(false);
        }
    };

    const removeLeadActivity = async (activityId: string) => {
        if (!selectedLead) return false;
        const confirmed = window.confirm('상담 이력을 삭제할까요? 삭제 후에는 복구할 수 없습니다.');
        if (!confirmed) return false;

        const currentActivities = selectedLead.activityLog || [];
        const nextActivities = removeLeadActivityLogEntry(currentActivities, activityId);
        if (nextActivities.length === currentActivities.length) {
            showAlertAction('삭제할 상담 이력을 찾지 못했습니다.', 'error', '삭제 실패');
            return false;
        }

        setIsActivitySaving(true);
        try {
            await onLeadPatchAction(selectedLead, { activityLog: nextActivities });
            showAlertAction('상담 이력을 삭제했습니다.', 'success', '삭제 완료');
            return true;
        } catch (error) {
            console.error(error);
            showAlertAction(error instanceof Error ? error.message : '상담 이력 삭제에 실패했습니다.', 'error', '삭제 실패');
            return false;
        } finally {
            setIsActivitySaving(false);
        }
    };

    const openQuickActivityModal = (lead: FranchiseLead) => {
        setQuickActivityLeadId(lead.id);
        setQuickActivityType('전화');
        setQuickActivityContent('');
    };

    const closeQuickActivityModal = () => {
        if (isQuickSaving) return;
        setQuickActivityLeadId('');
        setQuickActivityContent('');
        setQuickActivityType('전화');
    };

    const submitQuickActivity = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!quickActivityLead || !quickActivityContent.trim()) {
            showAlertAction('상담 내용을 입력해주세요.', 'error', '빠른 이력 추가 실패');
            return;
        }

        const now = new Date().toISOString();
        const nextActivity = createLeadActivity({ type: quickActivityType, content: quickActivityContent }, createdBy);

        setIsQuickSaving(true);
        try {
            await onLeadPatchAction(quickActivityLead, {
                activityLog: addLeadActivityLogEntry(quickActivityLead.activityLog || [], nextActivity),
                lastContactedAt: now
            });
            setQuickActivityLeadId('');
            setQuickActivityContent('');
            setQuickActivityType('전화');
            showAlertAction('상담 이력을 빠르게 추가했습니다.', 'success', '저장 완료');
        } catch (error) {
            console.error(error);
            showAlertAction(error instanceof Error ? error.message : '상담 이력 저장에 실패했습니다.', 'error', '저장 실패');
        } finally {
            setIsQuickSaving(false);
        }
    };

    return {
        activityType,
        activityContent,
        quickActivityLead,
        quickActivityType,
        quickActivityContent,
        isActivitySaving,
        isQuickSaving,
        setActivityType,
        setActivityContent,
        setQuickActivityType,
        setQuickActivityContent,
        addLeadActivity,
        updateLeadActivity,
        removeLeadActivity,
        openQuickActivityModal,
        closeQuickActivityModal,
        submitQuickActivity
    } as const;
}
