"use client";

import React from 'react';
import { Check, ChevronDown, ChevronUp, MessageSquare, Pencil, Trash2, X } from 'lucide-react';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import { ACTIVITY_TYPES } from './constants';
import { formatFullDateTime } from './utils';
import type { LeadActivityLogDraft } from './leadActivityLog';
import type { FranchiseLead, LeadActivity, LeadActivityType } from './types';

type AsyncBoolean = boolean | Promise<boolean>;

const INITIAL_VISIBLE_ACTIVITY_COUNT = 3;

type LeadActivitySectionProps = {
    readonly lead: FranchiseLead;
    readonly activityType: LeadActivityType;
    readonly activityContent: string;
    readonly isSaving: boolean;
    readonly onActivityTypeChangeAction: (activityType: LeadActivityType) => void;
    readonly onActivityContentChangeAction: (content: string) => void;
    readonly onAddLeadActivityAction: () => AsyncBoolean;
    readonly onUpdateLeadActivityAction: (activityId: string, draft: LeadActivityLogDraft) => AsyncBoolean;
    readonly onDeleteLeadActivityAction: (activityId: string) => AsyncBoolean;
};

function parseLeadActivityType(value: string): LeadActivityType {
    return ACTIVITY_TYPES.find(type => type === value) || '전화';
}

type ActivityTimelineItemProps = {
    readonly activity: LeadActivity;
    readonly isEditing: boolean;
    readonly editType: LeadActivityType;
    readonly editContent: string;
    readonly isSaving: boolean;
    readonly onStartEditAction: (activity: LeadActivity) => void;
    readonly onEditTypeChangeAction: (type: LeadActivityType) => void;
    readonly onEditContentChangeAction: (content: string) => void;
    readonly onCancelEditAction: () => void;
    readonly onSaveEditAction: () => Promise<void>;
    readonly onDeleteAction: (activityId: string) => Promise<void>;
};

function ActivityTimelineItem({
    activity,
    isEditing,
    editType,
    editContent,
    isSaving,
    onStartEditAction,
    onEditTypeChangeAction,
    onEditContentChangeAction,
    onCancelEditAction,
    onSaveEditAction,
    onDeleteAction
}: ActivityTimelineItemProps) {
    if (isEditing) {
        return (
            <article className={`${styles.timelineItem} ${styles.timelineItemEditing}`}>
                <div className={styles.timelineEditGrid}>
                    <select value={editType} onChange={(event) => onEditTypeChangeAction(parseLeadActivityType(event.target.value))}>
                        {ACTIVITY_TYPES.map(type => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>
                    <textarea
                        value={editContent}
                        onChange={(event) => onEditContentChangeAction(event.target.value)}
                        placeholder="수정할 상담 내용을 입력하세요."
                    />
                </div>
                <div className={styles.timelineEditActions}>
                    <button type="button" className={styles.secondaryButton} onClick={onCancelEditAction} disabled={isSaving}>
                        <X size={14} /> 취소
                    </button>
                    <button type="button" className={styles.primaryButton} onClick={() => void onSaveEditAction()} disabled={isSaving}>
                        <Check size={14} /> {isSaving ? '저장 중' : '저장'}
                    </button>
                </div>
            </article>
        );
    }

    return (
        <article className={styles.timelineItem}>
            <div className={styles.timelineItemHeader}>
                <div className={styles.timelineItemMeta}>
                    <span>{activity.type}</span>
                    <time>{formatFullDateTime(activity.createdAt)}</time>
                </div>
                <div className={styles.timelineItemActions}>
                    <button type="button" onClick={() => onStartEditAction(activity)} disabled={isSaving} aria-label="상담 이력 수정">
                        <Pencil size={14} /> 수정
                    </button>
                    <button type="button" onClick={() => void onDeleteAction(activity.id)} disabled={isSaving} aria-label="상담 이력 삭제">
                        <Trash2 size={14} /> 삭제
                    </button>
                </div>
            </div>
            <p>{activity.content}</p>
            <small>{activity.createdBy || '담당자 미상'}</small>
        </article>
    );
}

export function LeadActivitySection({
    lead,
    activityType,
    activityContent,
    isSaving,
    onActivityTypeChangeAction,
    onActivityContentChangeAction,
    onAddLeadActivityAction,
    onUpdateLeadActivityAction,
    onDeleteLeadActivityAction
}: LeadActivitySectionProps) {
    const activities = lead.activityLog || [];
    const [isExpanded, setIsExpanded] = React.useState(false);
    const [editingActivityId, setEditingActivityId] = React.useState('');
    const [editType, setEditType] = React.useState<LeadActivityType>('전화');
    const [editContent, setEditContent] = React.useState('');
    const hasHiddenActivities = activities.length > INITIAL_VISIBLE_ACTIVITY_COUNT;
    const visibleActivities = isExpanded ? activities : activities.slice(0, INITIAL_VISIBLE_ACTIVITY_COUNT);

    React.useEffect(() => {
        setIsExpanded(false);
        setEditingActivityId('');
        setEditContent('');
        setEditType('전화');
    }, [lead.id]);

    const startEdit = (activity: LeadActivity) => {
        setEditingActivityId(activity.id);
        setEditType(activity.type);
        setEditContent(activity.content);
    };

    const cancelEdit = () => {
        setEditingActivityId('');
        setEditContent('');
        setEditType('전화');
    };

    const saveEdit = async () => {
        if (!editingActivityId) return;
        const didSave = await onUpdateLeadActivityAction(editingActivityId, {
            type: editType,
            content: editContent
        });
        if (didSave) cancelEdit();
    };

    const deleteActivity = async (activityId: string) => {
        const didDelete = await onDeleteLeadActivityAction(activityId);
        if (didDelete && editingActivityId === activityId) cancelEdit();
    };

    return (
        <section className={styles.detailSection} aria-label="가맹 희망자 상담 이력">
            <div className={styles.detailSectionTitleRow}>
                <h3><MessageSquare size={16} /> 상담 이력</h3>
                {activities.length > 0 && (
                    <span>{activities.length.toLocaleString('ko-KR')}건</span>
                )}
            </div>
            <div className={styles.activityComposer}>
                <select value={activityType} onChange={(event) => onActivityTypeChangeAction(parseLeadActivityType(event.target.value))}>
                    {ACTIVITY_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                    ))}
                </select>
                <textarea
                    value={activityContent}
                    onChange={(event) => onActivityContentChangeAction(event.target.value)}
                    placeholder="상담 내용, 고객 반응, 다음 액션을 기록하세요."
                />
                <button className={styles.primaryButton} onClick={() => void onAddLeadActivityAction()} disabled={isSaving}>
                    {isSaving ? '저장 중' : '이력 추가'}
                </button>
            </div>
            <div className={styles.timeline}>
                {activities.length === 0 ? (
                    <div className={styles.emptyTimeline}>아직 상담 이력이 없습니다.</div>
                ) : (
                    visibleActivities.map(activity => (
                        <ActivityTimelineItem
                            key={activity.id}
                            activity={activity}
                            isEditing={editingActivityId === activity.id}
                            editType={editType}
                            editContent={editContent}
                            isSaving={isSaving}
                            onStartEditAction={startEdit}
                            onEditTypeChangeAction={setEditType}
                            onEditContentChangeAction={setEditContent}
                            onCancelEditAction={cancelEdit}
                            onSaveEditAction={saveEdit}
                            onDeleteAction={deleteActivity}
                        />
                    ))
                )}
            </div>
            {hasHiddenActivities && (
                <button type="button" className={styles.timelineToggleButton} onClick={() => setIsExpanded(prev => !prev)}>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    {isExpanded ? '최근 3건만 보기' : `전체 이력 ${activities.length.toLocaleString('ko-KR')}건 보기`}
                </button>
            )}
        </section>
    );
}
