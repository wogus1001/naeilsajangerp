import React from 'react';
import { assignMetaQuestion, suggestMetaFieldMapping } from '@/lib/meta-lead-field-mapping';
import type { MetaFieldKey, MetaFieldMapping } from '@/lib/meta-lead-field-mapping';
import type {
    MetaConnection,
    MetaIntegrationState,
    MetaLeadForm
} from '@/components/franchise/leads/types';
import type { DemoActionHandler } from '../demoTypes';
import { DEMO_LEAD_MANAGERS } from './DemoLeadSampleData';

const DEMO_META_CONNECTION: MetaConnection = {
    id: 'demo-meta-connection',
    companyId: 'demo-company',
    connectedBy: 'demo-manager-1',
    metaPageId: '600785779791577',
    metaPageName: '내일사장',
    status: 'connected',
    lastSyncAt: '2026-08-04T08:09:00+09:00',
    lastWebhookAt: '2026-08-04T08:09:00+09:00',
    pageCategory: '프랜차이즈'
};

const DEMO_META_QUESTIONS = [
    { id: 'q-name', key: 'full_name', label: '성함을 기입해 주세요.', type: 'FULL_NAME', options: [] },
    { id: 'q-mobile', key: 'phone_number', label: '연락 가능한 전화번호를 기입해 주세요.', type: 'PHONE', options: [] },
    { id: 'q-region', key: 'desired_region', label: '창업을 원하시는 지역은?', type: 'CUSTOM', options: [] },
    { id: 'q-budget', key: 'startup_budget', label: '예상 창업 예산을 선택해 주세요.', type: 'MULTIPLE_CHOICE', options: [
        { key: 'under_10000', label: '1억원 미만' },
        { key: 'over_10000', label: '1억원 이상' }
    ] }
] as const;

const INITIAL_META_FORM: MetaLeadForm = {
    id: 'demo-meta-form',
    companyId: 'demo-company',
    connectionId: DEMO_META_CONNECTION.id,
    metaFormId: '2013444619184356',
    metaFormName: 'OMAD_202505',
    enabled: true,
    defaultManagerId: DEMO_LEAD_MANAGERS[0]?.id || '',
    fieldMapping: suggestMetaFieldMapping(DEMO_META_QUESTIONS),
    questions: DEMO_META_QUESTIONS,
    lastSyncedAt: '2026-08-04T08:09:00+09:00'
};

export function useDemoMetaIntegration(onSimulate: DemoActionHandler) {
    const [metaState, setMetaState] = React.useState<MetaIntegrationState>({
        connections: [DEMO_META_CONNECTION],
        forms: [INITIAL_META_FORM],
        imports: [{
            id: 'demo-meta-import',
            metaLeadId: 'demo-lead-20260804',
            franchiseLeadId: 'demo-lead-raw-1',
            status: 'success',
            receivedAt: '2026-08-04T08:08:00+09:00',
            importedAt: '2026-08-04T08:09:00+09:00'
        }],
        configReady: true
    });
    const [dirtyMetaFormIds, setDirtyMetaFormIds] = React.useState<ReadonlySet<string>>(new Set());

    const updateFormState = (formId: string, updater: (form: MetaLeadForm) => MetaLeadForm) => {
        setMetaState(current => ({
            ...current,
            forms: current.forms.map(form => form.id === formId ? updater(form) : form)
        }));
    };
    const replaceQuestionMapping = (formId: string, mapping: MetaFieldMapping) => {
        updateFormState(formId, form => ({ ...form, fieldMapping: mapping }));
        setDirtyMetaFormIds(current => new Set(current).add(formId));
    };
    const updateQuestionMapping = (formId: string, sourceKey: string, target: MetaFieldKey | null) => {
        updateFormState(formId, form => ({
            ...form,
            fieldMapping: assignMetaQuestion(form.fieldMapping, sourceKey, target)
        }));
        setDirtyMetaFormIds(current => new Set(current).add(formId));
    };
    const updateForm = (
        form: MetaLeadForm,
        updates: Partial<Pick<MetaLeadForm, 'enabled' | 'defaultManagerId' | 'fieldMapping'>>
    ) => {
        updateFormState(form.id, current => ({ ...current, ...updates }));
        if (updates.fieldMapping) {
            setDirtyMetaFormIds(current => {
                const next = new Set(current);
                next.delete(form.id);
                return next;
            });
            onSimulate('Meta 신청 항목 연결을 샘플로 저장했습니다.');
        } else {
            onSimulate('Meta 신청 양식 설정을 샘플로 변경했습니다.');
        }
    };

    return {
        metaState,
        enabledFormCount: metaState.forms.filter(form => form.enabled).length,
        lastSyncAt: metaState.forms[0]?.lastSyncedAt || null,
        errorCount: 0,
        dirtyMetaFormIds,
        renderManagerOptions: () => (
            <>
                {DEMO_LEAD_MANAGERS.map(manager => (
                    <option key={manager.id} value={manager.id}>{manager.label}</option>
                ))}
            </>
        ),
        refresh: () => onSimulate('Meta 계정 연결 상태를 샘플로 확인했습니다.'),
        startConnect: () => onSimulate('Meta 계정 연결 화면은 실제 서비스와 같은 위치에서 확인합니다.'),
        sync: () => onSimulate('Meta 신청 내역을 샘플로 가져왔습니다.'),
        disconnect: (connection: MetaConnection) => {
            setMetaState(current => ({
                ...current,
                connections: current.connections.filter(item => item.id !== connection.id),
                forms: current.forms.filter(form => form.connectionId !== connection.id)
            }));
            onSimulate('Meta 페이지 연결을 샘플로 해제했습니다.');
        },
        refreshQuestions: () => onSimulate('Meta 신청 질문을 샘플로 다시 불러왔습니다.'),
        replaceQuestionMapping,
        updateForm,
        updateQuestionMapping
    };
}
