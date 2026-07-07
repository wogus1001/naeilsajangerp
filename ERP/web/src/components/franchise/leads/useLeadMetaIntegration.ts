"use client";

import React from 'react';
import { EMPTY_META_STATE } from './constants';
import type { MetaConnection, MetaFieldMapping, MetaIntegrationState, MetaLeadForm } from './types';
import { getApiAuthHeaders } from '@/utils/apiAuthHeaders';
import { readApiError, unwrapApiData } from '@/utils/apiResponse';

type LeadAlertType = 'success' | 'error' | 'info';

type UseLeadMetaIntegrationParams = {
    readonly userId: string;
    readonly companyName: string;
    readonly userRole?: string;
    readonly onLeadsRefreshAction: () => void | Promise<void>;
    readonly showAlertAction: (message: string, type?: LeadAlertType, title?: string) => void;
};

export function useLeadMetaIntegration({
    userId,
    companyName,
    userRole,
    onLeadsRefreshAction,
    showAlertAction
}: UseLeadMetaIntegrationParams) {
    const [metaState, setMetaState] = React.useState<MetaIntegrationState>(EMPTY_META_STATE);
    const [isMetaLoading, setIsMetaLoading] = React.useState(false);
    const [isMetaSyncing, setIsMetaSyncing] = React.useState(false);
    const [savingMetaFormId, setSavingMetaFormId] = React.useState('');
    const canManageMeta = userRole === 'admin' || userRole === 'manager';

    const fetchMetaIntegration = React.useCallback(async () => {
        if (!userId) return;

        setIsMetaLoading(true);
        try {
            const params = new URLSearchParams({ requesterId: userId });
            if (companyName) params.set('company', companyName);

            const headers = await getApiAuthHeaders();
            const response = await fetch(`/api/integrations/meta?${params.toString()}`, { cache: 'no-store', headers });
            const payload = await response.json();
            if (!response.ok) {
                throw new Error(readApiError(payload));
            }

            const data = unwrapApiData<MetaIntegrationState>(payload);
            setMetaState({
                connections: data.connections || [],
                forms: data.forms || [],
                imports: data.imports || [],
                configReady: Boolean(data.configReady)
            });
        } catch (error) {
            console.error('Failed to fetch Meta integration:', error);
            setMetaState(EMPTY_META_STATE);
        } finally {
            setIsMetaLoading(false);
        }
    }, [companyName, userId]);

    React.useEffect(() => {
        if (!userId) return;
        void fetchMetaIntegration();
    }, [fetchMetaIntegration, userId]);

    const startMetaConnect = () => {
        if (!userId) return;
        if (!metaState.configReady) {
            showAlertAction('Meta 환경변수가 아직 설정되지 않았습니다. META_APP_ID, META_APP_SECRET, META_VERIFY_TOKEN을 먼저 설정해주세요.', 'error', 'Meta 연동 설정 필요');
            return;
        }

        const params = new URLSearchParams({
            requesterId: userId,
            redirect: '/dashboard/franchise-leads'
        });
        if (companyName) params.set('company', companyName);
        window.location.href = `/api/integrations/meta/connect?${params.toString()}`;
    };

    const updateMetaFormState = (formId: string, updater: (form: MetaLeadForm) => MetaLeadForm) => {
        setMetaState(prev => ({
            ...prev,
            forms: prev.forms.map(form => form.id === formId ? updater(form) : form)
        }));
    };

    const updateMetaForm = async (form: MetaLeadForm, updates: Partial<MetaLeadForm>) => {
        if (!userId) return;

        setSavingMetaFormId(form.id);
        try {
            const headers = await getApiAuthHeaders({ 'Content-Type': 'application/json' });
            const response = await fetch('/api/integrations/meta/forms', {
                method: 'PUT',
                headers,
                body: JSON.stringify({
                    requesterId: userId,
                    id: form.id,
                    enabled: updates.enabled,
                    defaultManagerId: updates.defaultManagerId,
                    fieldMapping: updates.fieldMapping
                })
            });
            const payload = await response.json();
            if (!response.ok) {
                throw new Error(readApiError(payload));
            }

            const data = unwrapApiData<{ form: MetaLeadForm }>(payload);
            updateMetaFormState(form.id, () => data.form);
        } catch (error) {
            console.error(error);
            showAlertAction(error instanceof Error ? error.message : 'Meta Form 설정 저장에 실패했습니다.', 'error', 'Meta 설정 실패');
            await fetchMetaIntegration();
        } finally {
            setSavingMetaFormId('');
        }
    };

    const updateMetaFieldMapping = (formId: string, key: keyof MetaFieldMapping, value: string) => {
        const nextValues = value.split(',').map(item => item.trim()).filter(Boolean);
        updateMetaFormState(formId, form => ({
            ...form,
            fieldMapping: {
                ...form.fieldMapping,
                [key]: nextValues
            }
        }));
    };

    const syncMetaLeads = async (formId?: string) => {
        if (!userId) return;

        setIsMetaSyncing(true);
        try {
            const headers = await getApiAuthHeaders({ 'Content-Type': 'application/json' });
            const response = await fetch('/api/integrations/meta/sync', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    requesterId: userId,
                    formId
                })
            });
            const payload = await response.json();
            if (!response.ok) {
                throw new Error(readApiError(payload));
            }

            const result = unwrapApiData<{ stats: Record<string, number>; formCount: number; errors?: Array<{ reason: string }> }>(payload);
            await Promise.all([fetchMetaIntegration(), onLeadsRefreshAction()]);
            const stats = result.stats || {};
            showAlertAction(
                `Meta 동기화 완료\n- 신규: ${stats.created || 0}건\n- 기존 업데이트: ${stats.updated || 0}건\n- 중복: ${stats.duplicate || 0}건\n- 제외/오류: ${(stats.skipped || 0) + (stats.error || 0)}건${result.errors?.length ? `\n첫 오류: ${result.errors[0].reason}` : ''}`,
                result.errors?.length ? 'info' : 'success',
                'Meta 동기화'
            );
        } catch (error) {
            console.error(error);
            showAlertAction(error instanceof Error ? error.message : 'Meta 리드 동기화에 실패했습니다.', 'error', 'Meta 동기화 실패');
        } finally {
            setIsMetaSyncing(false);
        }
    };

    const disconnectMetaConnection = async (connection: MetaConnection) => {
        if (!userId) return;
        const confirmed = window.confirm(`${connection.metaPageName || connection.metaPageId} Meta 연결을 해제할까요? 기존 모객DB 리드는 삭제되지 않습니다.`);
        if (!confirmed) return;

        try {
            const headers = await getApiAuthHeaders({ 'Content-Type': 'application/json' });
            const response = await fetch(`/api/integrations/meta?id=${encodeURIComponent(connection.id)}`, {
                method: 'DELETE',
                headers,
                body: JSON.stringify({ requesterId: userId })
            });
            const payload = await response.json();
            if (!response.ok) {
                throw new Error(readApiError(payload));
            }

            await fetchMetaIntegration();
            showAlertAction('Meta 연결을 해제했습니다. 기존 가맹 희망자 데이터는 유지됩니다.', 'success', '연결 해제');
        } catch (error) {
            console.error(error);
            showAlertAction(error instanceof Error ? error.message : 'Meta 연결 해제에 실패했습니다.', 'error', '연결 해제 실패');
        }
    };

    return {
        canManageMeta,
        disconnectMetaConnection,
        fetchMetaIntegration,
        isMetaLoading,
        isMetaSyncing,
        metaState,
        savingMetaFormId,
        startMetaConnect,
        syncMetaLeads,
        updateMetaFieldMapping,
        updateMetaForm
    };
}
