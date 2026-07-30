"use client";

import React from 'react';
import { useAppDialog } from '@/components/common/AppDialogProvider';
import { areMetaFieldMappingsEqual, assignMetaQuestion } from '@/lib/meta-lead-field-mapping';
import type { MetaFieldKey, MetaFieldMapping } from '@/lib/meta-lead-field-mapping';
import { EMPTY_META_STATE } from './constants';
import type { MetaConnection, MetaFormOperation, MetaIntegrationState, MetaLeadForm } from './types';
import { requestMetaAuthorizationUrl } from './metaIntegrationRequests';
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
    const { showConfirm } = useAppDialog();
    const [metaState, setMetaState] = React.useState<MetaIntegrationState>(EMPTY_META_STATE);
    const [isMetaLoading, setIsMetaLoading] = React.useState(false);
    const [isMetaSyncing, setIsMetaSyncing] = React.useState(false);
    const [savingMetaFormId, setSavingMetaFormId] = React.useState('');
    const [savingMetaFormOperation, setSavingMetaFormOperation] = React.useState<MetaFormOperation | null>(null);
    const [dirtyMetaFormIds, setDirtyMetaFormIds] = React.useState<ReadonlySet<string>>(new Set());
    const dirtyMetaFormIdsRef = React.useRef<ReadonlySet<string>>(new Set());
    const persistedMappingsRef = React.useRef<Map<string, MetaFieldMapping>>(new Map());
    const canManageMeta = userRole === 'admin' || userRole === 'manager';

    const setMappingDirty = (formId: string, dirty: boolean) => {
        const next = new Set(dirtyMetaFormIdsRef.current);
        if (dirty) next.add(formId);
        else next.delete(formId);
        dirtyMetaFormIdsRef.current = next;
        setDirtyMetaFormIds(next);
    };

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
            const incomingForms = data.forms || [];
            incomingForms.forEach(form => {
                if (!dirtyMetaFormIdsRef.current.has(form.id)) {
                    persistedMappingsRef.current.set(form.id, form.fieldMapping);
                }
            });
            setMetaState(previous => ({
                connections: data.connections || [],
                forms: incomingForms.map(incomingForm => {
                    if (!dirtyMetaFormIdsRef.current.has(incomingForm.id)) return incomingForm;
                    const localForm = previous.forms.find(form => form.id === incomingForm.id);
                    return localForm
                        ? { ...incomingForm, fieldMapping: localForm.fieldMapping }
                        : incomingForm;
                }),
                imports: data.imports || [],
                configReady: Boolean(data.configReady)
            }));
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown Meta integration error';
            console.error('Failed to fetch Meta integration:', message);
            showAlertAction('Meta 연동 상태를 새로고침하지 못했습니다. 현재 화면의 변경사항은 유지됩니다.', 'error', '상태 새로고침 실패');
        } finally {
            setIsMetaLoading(false);
        }
    }, [companyName, showAlertAction, userId]);

    React.useEffect(() => {
        if (!userId) return;
        void fetchMetaIntegration();
    }, [fetchMetaIntegration, userId]);

    const startMetaConnect = async () => {
        if (!userId) return;
        if (!metaState.configReady) {
            showAlertAction('Meta 환경변수가 아직 설정되지 않았습니다. META_APP_ID, META_APP_SECRET, META_VERIFY_TOKEN을 먼저 설정해주세요.', 'error', 'Meta 연동 설정 필요');
            return;
        }

        try {
            const authorizationUrl = await requestMetaAuthorizationUrl({
                requesterId: userId,
                companyName,
                redirectPath: '/dashboard/franchise-leads'
            });
            window.location.href = authorizationUrl;
        } catch (error) {
            console.error(error);
            showAlertAction(error instanceof Error ? error.message : 'Meta 계정 연결을 시작하지 못했습니다.', 'error', 'Meta 연결 실패');
        }
    };

    const updateMetaFormState = (formId: string, updater: (form: MetaLeadForm) => MetaLeadForm) => {
        setMetaState(prev => ({
            ...prev,
            forms: prev.forms.map(form => form.id === formId ? updater(form) : form)
        }));
    };

    const updateMetaForm = async (form: MetaLeadForm, updates: Partial<MetaLeadForm>) => {
        if (!userId) return;

        const operation: MetaFormOperation = (
            updates.fieldMapping !== undefined &&
            updates.enabled === undefined &&
            updates.defaultManagerId === undefined
        ) ? 'mapping' : 'settings';
        setSavingMetaFormId(form.id);
        setSavingMetaFormOperation(operation);
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
            updateMetaFormState(form.id, currentForm => ({
                ...data.form,
                fieldMapping: updates.fieldMapping === undefined
                    ? currentForm.fieldMapping
                    : data.form.fieldMapping
            }));
            if (updates.fieldMapping !== undefined) {
                persistedMappingsRef.current.set(form.id, data.form.fieldMapping);
                setMappingDirty(form.id, false);
            }
            if (operation === 'mapping') {
                showAlertAction('신청 항목 연결을 저장했습니다.', 'success', '연결 저장');
            }
        } catch (error) {
            console.error(error);
            showAlertAction(error instanceof Error ? error.message : 'Meta 양식 설정을 저장하지 못했습니다.', 'error', 'Meta 설정 실패');
        } finally {
            setSavingMetaFormId('');
            setSavingMetaFormOperation(null);
        }
    };

    const updateMetaQuestionMapping = (formId: string, sourceKey: string, target: MetaFieldKey | null) => {
        const form = metaState.forms.find(candidate => candidate.id === formId);
        if (!form) return;
        const persistedMapping = persistedMappingsRef.current.get(formId) || form.fieldMapping;
        if (!persistedMappingsRef.current.has(formId)) {
            persistedMappingsRef.current.set(formId, persistedMapping);
        }
        const nextMapping = assignMetaQuestion(form.fieldMapping, sourceKey, target);
        updateMetaFormState(formId, currentForm => ({
            ...currentForm,
            fieldMapping: nextMapping
        }));
        setMappingDirty(formId, !areMetaFieldMappingsEqual(nextMapping, persistedMapping));
    };

    const replaceMetaQuestionMapping = (formId: string, mapping: MetaFieldMapping) => {
        const form = metaState.forms.find(candidate => candidate.id === formId);
        if (!form) return;
        const persistedMapping = persistedMappingsRef.current.get(formId) || form.fieldMapping;
        if (!persistedMappingsRef.current.has(formId)) {
            persistedMappingsRef.current.set(formId, persistedMapping);
        }
        updateMetaFormState(formId, currentForm => ({
            ...currentForm,
            fieldMapping: mapping
        }));
        setMappingDirty(formId, !areMetaFieldMappingsEqual(mapping, persistedMapping));
    };

    const refreshMetaFormQuestions = async (form: MetaLeadForm) => {
        if (!userId) return;

        setSavingMetaFormId(form.id);
        setSavingMetaFormOperation('questions');
        try {
            const headers = await getApiAuthHeaders({ 'Content-Type': 'application/json' });
            const response = await fetch('/api/integrations/meta/forms', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    requesterId: userId,
                    id: form.id
                })
            });
            const payload = await response.json();
            if (!response.ok) {
                throw new Error(readApiError(payload));
            }

            const data = unwrapApiData<{ form: MetaLeadForm }>(payload);
            updateMetaFormState(form.id, currentForm => ({
                ...data.form,
                fieldMapping: currentForm.fieldMapping
            }));
            showAlertAction('Meta 신청 항목을 새로 불러왔습니다.', 'success', '신청 양식 확인');
        } catch (error) {
            console.error(error);
            showAlertAction(error instanceof Error ? error.message : 'Meta 신청 항목을 불러오지 못했습니다.', 'error', '신청 양식 확인 실패');
        } finally {
            setSavingMetaFormId('');
            setSavingMetaFormOperation(null);
        }
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
                    formId,
                    companyName
                })
            });
            const payload = await response.json();
            if (!response.ok) {
                throw new Error(readApiError(payload));
            }

            const result = unwrapApiData<{
                stats: Record<string, number>;
                formCount: number;
                errors?: Array<{ code: 'CONNECTION_UNAVAILABLE' | 'LEAD_FETCH_FAILED' }>;
            }>(payload);
            await Promise.all([fetchMetaIntegration(), onLeadsRefreshAction()]);
            const stats = result.stats || {};
            const firstErrorCode = result.errors?.[0]?.code;
            const errorGuidance = firstErrorCode === 'CONNECTION_UNAVAILABLE'
                ? '\nMeta 계정 연결을 확인한 뒤 다시 시도해주세요.'
                : firstErrorCode === 'LEAD_FETCH_FAILED'
                    ? '\nMeta 양식 조회 권한을 확인한 뒤 다시 시도해주세요.'
                    : '';
            showAlertAction(
                `Meta 동기화 완료\n- 신규: ${stats.created || 0}건\n- 기존 업데이트: ${stats.updated || 0}건\n- 중복: ${stats.duplicate || 0}건\n- 제외/오류: ${(stats.skipped || 0) + (stats.error || 0)}건${errorGuidance}`,
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
        const confirmed = await showConfirm({
            message: `${connection.metaPageName || connection.metaPageId} Meta 연결을 해제할까요? 기존 모객DB 리드는 삭제되지 않습니다.`,
            title: 'Meta 연결 해제',
            confirmText: '연결 해제',
            isDanger: true
        });
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
        dirtyMetaFormIds,
        refreshMetaFormQuestions,
        replaceMetaQuestionMapping,
        savingMetaFormId,
        savingMetaFormOperation,
        startMetaConnect,
        syncMetaLeads,
        updateMetaQuestionMapping,
        updateMetaForm
    };
}
