"use client";

import React from 'react';
import { getApiAuthHeaders } from '@/utils/apiAuthHeaders';
import {
    FRANCHISE_SCHEDULES_API_PATH,
    parseFranchiseScheduleAssignees,
    parseFranchiseScheduleItems
} from './franchiseScheduleViewModel';
import type {
    FranchiseScheduleAssignee,
    FranchiseScheduleItem,
    FranchiseScheduleLoadState
} from './franchiseScheduleViewModel';

type ScheduleLoadFailure = {
    readonly state: FranchiseScheduleLoadState;
    readonly message: string;
};

export function getFranchiseScheduleFailure(status: number): ScheduleLoadFailure {
    if (status === 424) return { state: 'needs-sql', message: '프랜차이즈 일정 SQL 등록 필요: prepare migration 적용 후 다시 시도하세요.' };
    if (status === 403) return { state: 'forbidden', message: '가맹 운영 일정 접근 권한이 없습니다.' };
    return { state: 'error', message: '일정 목록을 불러오지 못했습니다.' };
}

export function useFranchiseScheduleData(monthDate: Date) {
    const [items, setItems] = React.useState<readonly FranchiseScheduleItem[]>([]);
    const [assignees, setAssignees] = React.useState<readonly FranchiseScheduleAssignee[]>([]);
    const [assigneesLoading, setAssigneesLoading] = React.useState(true);
    const [assigneesError, setAssigneesError] = React.useState('');
    const [state, setState] = React.useState<FranchiseScheduleLoadState>('loading');
    const [message, setMessage] = React.useState('');

    const reloadSchedules = React.useCallback(async () => {
        setState('loading');
        setMessage('');
        const params = new URLSearchParams();
        params.set('from', `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}-01`);
        params.set('to', `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 2).padStart(2, '0')}-07`);
        const response = await fetch(`${FRANCHISE_SCHEDULES_API_PATH}?${params.toString()}`, {
            cache: 'no-store',
            headers: await getApiAuthHeaders()
        });
        if (!response.ok) {
            const failure = getFranchiseScheduleFailure(response.status);
            setState(failure.state);
            setMessage(failure.message);
            setItems([]);
            return;
        }
        setItems(parseFranchiseScheduleItems(await response.json()));
        setState('ready');
    }, [monthDate]);

    React.useEffect(() => {
        void reloadSchedules().catch(() => {
            setState('error');
            setMessage('일정 목록을 불러오지 못했습니다.');
        });
    }, [reloadSchedules]);

    React.useEffect(() => {
        const loadAssignees = async () => {
            setAssigneesLoading(true);
            setAssigneesError('');
            const response = await fetch(`${FRANCHISE_SCHEDULES_API_PATH}?view=assignees`, {
                cache: 'no-store',
                headers: await getApiAuthHeaders()
            });
            if (!response.ok) {
                setAssigneesError('담당자 목록을 불러오지 못했습니다.');
                setAssigneesLoading(false);
                return;
            }
            setAssignees(parseFranchiseScheduleAssignees(await response.json()));
            setAssigneesLoading(false);
        };
        void loadAssignees().catch(() => {
            setAssigneesError('담당자 목록을 불러오지 못했습니다.');
            setAssigneesLoading(false);
        });
    }, []);

    const assigneeNames = new Map(assignees.map(assignee => [assignee.id, assignee.name]));
    const namedItems = items.map(item => ({
        ...item,
        assigneeName: assigneeNames.get(item.assigneeProfileId) || item.assigneeName
    }));

    return { items: namedItems, assignees, assigneesLoading, assigneesError, state, message, reloadSchedules };
}
