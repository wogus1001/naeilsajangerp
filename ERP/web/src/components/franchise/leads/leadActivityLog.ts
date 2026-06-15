import type { LeadActivity, LeadActivityType } from './types';

export type LeadActivityLogDraft = {
    readonly type: LeadActivityType;
    readonly content: string;
};

export function addLeadActivityLogEntry(
    currentActivities: readonly LeadActivity[],
    activity: LeadActivity
): readonly LeadActivity[] {
    return [activity, ...currentActivities];
}

export function updateLeadActivityLogEntry(
    currentActivities: readonly LeadActivity[],
    activityId: string,
    draft: LeadActivityLogDraft
): readonly LeadActivity[] {
    const nextContent = draft.content.trim();
    if (!nextContent) return currentActivities;

    let hasUpdatedActivity = false;
    const nextActivities = currentActivities.map(activity => {
        if (activity.id !== activityId) return activity;
        hasUpdatedActivity = true;
        return {
            ...activity,
            type: draft.type,
            content: nextContent
        };
    });

    return hasUpdatedActivity ? nextActivities : currentActivities;
}

export function removeLeadActivityLogEntry(
    currentActivities: readonly LeadActivity[],
    activityId: string
): readonly LeadActivity[] {
    return currentActivities.filter(activity => activity.id !== activityId);
}
