import React from 'react';
import { useAppDialog } from '@/components/common/AppDialogProvider';
import {
    addLeadActivityLogEntry,
    removeLeadActivityLogEntry,
    updateLeadActivityLogEntry
} from '@/components/franchise/leads/leadActivityLog';
import type { LeadActivityLogDraft } from '@/components/franchise/leads/leadActivityLog';
import type {
    FranchiseLead,
    LeadActivity,
    LeadActivityType
} from '@/components/franchise/leads/types';
import type { DemoActionHandler } from '../demoTypes';

type UpdateLeadAction = (
    leadId: string,
    updater: (lead: FranchiseLead) => FranchiseLead
) => void;

type UseDemoLeadDetailActivityInput = {
    readonly lead: FranchiseLead | null;
    readonly updateLeadAction: UpdateLeadAction;
    readonly onSimulate: DemoActionHandler;
    readonly actorName?: string;
};

export function useDemoLeadDetailActivity({
    lead,
    updateLeadAction,
    onSimulate,
    actorName = '김담당'
}: UseDemoLeadDetailActivityInput) {
    const { showAlert, showConfirm } = useAppDialog();
    const sequenceRef = React.useRef(0);
    const [activityType, setActivityType] = React.useState<LeadActivityType>('전화');
    const [activityContent, setActivityContent] = React.useState('');

    React.useEffect(() => {
        setActivityType('전화');
        setActivityContent('');
    }, [lead?.id]);

    const createActivity = (type: LeadActivityType, content: string): LeadActivity => {
        sequenceRef.current += 1;
        return {
            id: `demo-detail-activity-${sequenceRef.current}`,
            type,
            content,
            createdAt: new Date().toISOString(),
            createdBy: actorName
        };
    };
    const updateCurrent = (updater: (current: FranchiseLead) => FranchiseLead) => {
        if (lead) updateLeadAction(lead.id, updater);
    };
    const addActivity = async () => {
        const content = activityContent.trim();
        if (!lead || !content) {
            await showAlert({ title: '입력 확인', message: '상담 내용을 입력해주세요.', type: 'error' });
            return false;
        }
        const activity = createActivity(activityType, content);
        updateCurrent(current => ({
            ...current,
            activityLog: addLeadActivityLogEntry(current.activityLog || [], activity),
            lastContactedAt: activity.createdAt,
            updatedAt: activity.createdAt
        }));
        setActivityContent('');
        onSimulate(`${lead.name} 상세 상담 이력 추가`);
        return true;
    };
    const updateActivity = async (activityId: string, draft: LeadActivityLogDraft) => {
        if (!draft.content.trim()) {
            await showAlert({ title: '입력 확인', message: '상담 내용을 입력해주세요.', type: 'error' });
            return false;
        }
        updateCurrent(current => ({
            ...current,
            activityLog: updateLeadActivityLogEntry(current.activityLog || [], activityId, draft),
            updatedAt: new Date().toISOString()
        }));
        return true;
    };
    const deleteActivity = async (activityId: string) => {
        const accepted = await showConfirm({
            title: '상담 이력 삭제',
            message: '선택한 상담 이력을 삭제할까요?',
            confirmText: '삭제',
            isDanger: true
        });
        if (!accepted) return false;
        updateCurrent(current => ({
            ...current,
            activityLog: removeLeadActivityLogEntry(current.activityLog || [], activityId),
            updatedAt: new Date().toISOString()
        }));
        return true;
    };

    return {
        activityContent,
        activityType,
        addActivity,
        deleteActivity,
        setActivityContent,
        setActivityType,
        updateActivity
    };
}
