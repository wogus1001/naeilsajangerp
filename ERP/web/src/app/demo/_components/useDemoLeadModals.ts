import React from 'react';
import { useAppDialog } from '@/components/common/AppDialogProvider';
import { LeadFormModal } from '@/components/franchise/leads/LeadFormModal';
import { LeadQuickActivityModal } from '@/components/franchise/leads/LeadQuickActivityModal';
import { EMPTY_FORM } from '@/components/franchise/leads/constants';
import type {
    FranchiseLead,
    LeadActivity,
    LeadActivityType
} from '@/components/franchise/leads/types';
import { createFormFromLead } from '@/components/franchise/leads/utils';
import {
    DEFAULT_FRANCHISE_LEAD_SOURCE_OPTIONS,
    validateFranchiseLeadSourceOptionLabel
} from '@/lib/franchise-lead-source-options';
import type { DemoActionHandler } from '../demoTypes';
import { saveDemoLeadForm } from './DemoLeadState';

type UpdateLeadAction = (
    leadId: string,
    updater: (lead: FranchiseLead) => FranchiseLead
) => void;

type UseDemoLeadModalsInput = {
    readonly leads: readonly FranchiseLead[];
    readonly setLeads: React.Dispatch<React.SetStateAction<readonly FranchiseLead[]>>;
    readonly updateLeadAction: UpdateLeadAction;
    readonly clearSelectedLeadAction: (leadId: string) => void;
    readonly getManagerNameAction: (managerId?: string) => string;
    readonly renderManagerOptionsAction: (selectedManagerId?: string) => React.ReactNode;
    readonly onSimulate: DemoActionHandler;
};

export function useDemoLeadModals({
    leads,
    setLeads,
    updateLeadAction,
    clearSelectedLeadAction,
    getManagerNameAction,
    renderManagerOptionsAction,
    onSimulate
}: UseDemoLeadModalsInput) {
    const { showAlert, showConfirm } = useAppDialog();
    const sequenceRef = React.useRef(0);
    const [form, setForm] = React.useState(EMPTY_FORM);
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [quickLeadId, setQuickLeadId] = React.useState('');
    const [quickType, setQuickType] = React.useState<LeadActivityType>('전화');
    const [quickContent, setQuickContent] = React.useState('');
    const [sourceOptions, setSourceOptions] = React.useState(DEFAULT_FRANCHISE_LEAD_SOURCE_OPTIONS);
    const quickLead = leads.find(lead => lead.id === quickLeadId) || null;

    const openCreateModal = () => {
        setForm({ ...EMPTY_FORM, managerId: 'manager-kim' });
        setIsFormOpen(true);
    };

    const openEditModal = (lead: FranchiseLead) => {
        setForm(createFormFromLead(lead));
        setIsFormOpen(true);
    };

    const submitForm: React.FormEventHandler<HTMLFormElement> = event => {
        event.preventDefault();
        if (!form.name.trim()) {
            void showAlert({
                title: '입력 확인',
                message: '가맹 희망자명을 입력해주세요.',
                type: 'error'
            });
            return;
        }
        sequenceRef.current += 1;
        const result = saveDemoLeadForm(
            leads,
            form,
            `demo-created-${sequenceRef.current}`,
            new Date().toISOString()
        );
        setLeads(result.leads);
        setIsFormOpen(false);
        setForm(EMPTY_FORM);
        onSimulate(`${result.lead.name} 모객 DB 저장`);
        void showAlert({ title: '저장 완료', message: '모객 DB가 저장되었습니다.', type: 'success' });
    };

    const openQuickActivityModal = (lead: FranchiseLead) => {
        setQuickLeadId(lead.id);
        setQuickType('전화');
        setQuickContent('');
    };

    const closeQuickActivityModal = () => {
        setQuickLeadId('');
        setQuickContent('');
    };

    const submitQuickActivity: React.FormEventHandler<HTMLFormElement> = event => {
        event.preventDefault();
        if (!quickLead || !quickContent.trim()) {
            void showAlert({ title: '입력 확인', message: '상담 내용을 입력해주세요.', type: 'error' });
            return;
        }
        sequenceRef.current += 1;
        const activity: LeadActivity = {
            id: `demo-activity-${sequenceRef.current}`,
            type: quickType,
            content: quickContent.trim(),
            createdAt: new Date().toISOString(),
            createdBy: '김담당'
        };
        updateLeadAction(quickLead.id, lead => ({
            ...lead,
            lastContactedAt: activity.createdAt,
            activityLog: [activity, ...(lead.activityLog || [])],
            updatedAt: activity.createdAt
        }));
        onSimulate(`${quickLead.name} 상담 이력 추가`);
        closeQuickActivityModal();
    };

    const requestDelete = async (lead: FranchiseLead) => {
        const accepted = await showConfirm({
            title: '가맹 희망자 삭제',
            message: `${lead.name} 가맹 희망자를 삭제할까요?`,
            confirmText: '삭제',
            isDanger: true
        });
        if (!accepted) return;
        setLeads(current => current.filter(item => item.id !== lead.id));
        clearSelectedLeadAction(lead.id);
        onSimulate(`${lead.name} 삭제`);
    };

    const createSourceOption = async (value: string) => {
        const validation = validateFranchiseLeadSourceOptionLabel(value);
        if (!validation.ok) {
            await showAlert({ title: '입력 확인', message: validation.message, type: 'error' });
            return;
        }
        sequenceRef.current += 1;
        setSourceOptions(current => [...current, {
            id: `demo-source-${sequenceRef.current}`,
            companyId: 'demo-company',
            code: validation.label,
            label: validation.label,
            kind: 'custom',
            isActive: true,
            sortOrder: (current.length + 1) * 10,
            persisted: true
        }]);
    };

    const updateSourceOption: React.ComponentProps<typeof LeadFormModal>['onUpdateSourceOptionAction'] = async (optionId, updates) => {
        setSourceOptions(current => current.map(option => (
            option.id === optionId ? { ...option, ...updates } : option
        )));
    };

    const formModalProps: React.ComponentProps<typeof LeadFormModal> | null = isFormOpen ? {
        form,
        isSaving: false,
        onFormChangeAction: setForm,
        onCloseAction: () => setIsFormOpen(false),
        onSubmitAction: submitForm,
        renderManagerOptionsAction,
        sourceOptions,
        canManageSourceOptions: true,
        isSourceOptionStorageReady: true,
        isSourceOptionLoading: false,
        isSourceOptionSaving: false,
        sourceOptionError: '',
        onRefreshSourceOptionsAction: async () => {
            await showAlert('데모 유입경로가 최신 상태입니다.');
        },
        onCreateSourceOptionAction: createSourceOption,
        onUpdateSourceOptionAction: updateSourceOption
    } : null;

    const quickActivityModalProps: React.ComponentProps<typeof LeadQuickActivityModal> | null = quickLead ? {
        lead: quickLead,
        activityType: quickType,
        activityContent: quickContent,
        isSaving: false,
        getManagerNameAction,
        onActivityTypeChangeAction: setQuickType,
        onActivityContentChangeAction: setQuickContent,
        onCloseAction: closeQuickActivityModal,
        onSubmitAction: submitQuickActivity
    } : null;

    return {
        formModalProps,
        openCreateModal,
        openEditModal,
        openQuickActivityModal,
        quickActivityModalProps,
        requestDelete
    };
}
