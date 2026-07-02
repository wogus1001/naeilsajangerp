"use client";

import React from 'react';
import {
    getRequesterId,
    getStoredCompanyId,
    getStoredCompanyName,
    getStoredUser,
    isAdminStoredUser
} from '@/utils/userUtils';
import type { FranchiseVendorView } from '@/lib/franchise-vendors';
import {
    deleteVendorContract,
    fetchVendorContractEvents,
    fetchVendorContractOptions,
    fetchVendorContracts,
    openVendorContractUpload,
    runVendorContractAction,
    saveVendorContract
} from './vendorContractsApi';
import type { RenewInput } from './VendorContractDetailPanel';
import {
    EMPTY_FORM,
    buildVendorContractQueue,
    formFromContract,
    isContractInQueue,
    type ElectronicContractOption,
    type UserOption,
    type VendorContract,
    type VendorContractEvent,
    type VendorContractForm,
    type VendorContractQueueKey,
} from './vendorContractsModel';

export function useVendorContractsController() {
    const [contracts, setContracts] = React.useState<readonly VendorContract[]>([]);
    const [electronicContracts, setElectronicContracts] = React.useState<readonly ElectronicContractOption[]>([]);
    const [users, setUsers] = React.useState<readonly UserOption[]>([]);
    const [vendorMasters, setVendorMasters] = React.useState<readonly FranchiseVendorView[]>([]);
    const [form, setForm] = React.useState<VendorContractForm>(EMPTY_FORM);
    const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
    const [q, setQ] = React.useState('');
    const [category, setCategory] = React.useState('all');
    const [status, setStatus] = React.useState('all');
    const [activeQueue, setActiveQueue] = React.useState<VendorContractQueueKey>('all');
    const [selectedContractId, setSelectedContractId] = React.useState('');
    const [events, setEvents] = React.useState<readonly VendorContractEvent[]>([]);
    const [eventsLoading, setEventsLoading] = React.useState(false);
    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);
    const [schemaReady, setSchemaReady] = React.useState(true);
    const [vendorSchemaReady, setVendorSchemaReady] = React.useState(true);
    const [message, setMessage] = React.useState('');
    const [error, setError] = React.useState('');
    const [companyId, setCompanyId] = React.useState('');
    const [companyName, setCompanyName] = React.useState('');
    const [requesterId, setRequesterId] = React.useState('');

    const isEditing = Boolean(form.id);
    const selectedContract = contracts.find(contract => contract.id === selectedContractId) || null;
    const queueItems = buildVendorContractQueue(contracts);
    const visibleContracts = contracts.filter(contract => isContractInQueue(contract, activeQueue));

    const resetForm = React.useCallback(() => {
        setForm(current => ({ ...EMPTY_FORM, ownerProfileId: requesterId || current.ownerProfileId }));
        setSelectedFile(null);
    }, [requesterId]);

    const loadContracts = React.useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const data = await fetchVendorContracts({ category, companyId, q, status });
            setContracts(data.contracts);
            setSchemaReady(data.schemaReady);
        } catch (caught) {
            setContracts([]);
            setError(caught instanceof Error ? caught.message : '업체 계약함을 불러오지 못했습니다.');
        } finally {
            setLoading(false);
        }
    }, [category, companyId, q, status]);

    const loadEvents = React.useCallback(async (contractId: string) => {
        if (!contractId) {
            setEvents([]);
            return;
        }
        setEventsLoading(true);
        try {
            setEvents(await fetchVendorContractEvents(contractId));
        } catch (caught) {
            setEvents([]);
            setError(caught instanceof Error ? caught.message : '업체 계약 이력을 불러오지 못했습니다.');
        } finally {
            setEventsLoading(false);
        }
    }, []);

    const loadOptions = React.useCallback(async () => {
        const data = await fetchVendorContractOptions(companyName, companyId);
        setElectronicContracts(data.electronicContracts);
        setVendorMasters(data.vendorMasters);
        setVendorSchemaReady(data.vendorSchemaReady);
        setUsers(data.users);
    }, [companyId, companyName]);

    React.useEffect(() => {
        const user = getStoredUser();
        setRequesterId(getRequesterId(user));
        setCompanyId(getStoredCompanyId(user));
        setCompanyName(getStoredCompanyName(user));
        setQ(new URLSearchParams(window.location.search).get('q') || '');
        if (!isAdminStoredUser(user)) {
            setForm(current => ({ ...current, ownerProfileId: getRequesterId(user) }));
        }
    }, []);

    React.useEffect(() => {
        void loadContracts();
    }, [loadContracts]);

    React.useEffect(() => {
        void loadOptions();
    }, [loadOptions]);

    React.useEffect(() => {
        if (contracts.length === 0 || selectedContractId) return;
        const contractId = new URLSearchParams(window.location.search).get('contractId') || '';
        if (contractId && contracts.some(contract => contract.id === contractId)) {
            setSelectedContractId(contractId);
            void loadEvents(contractId);
        }
    }, [contracts, loadEvents, selectedContractId]);

    async function saveContract() {
        if (!companyId) {
            setError('회사 정보를 확인할 수 없습니다.');
            return;
        }
        setSaving(true);
        setError('');
        setMessage('');
        try {
            const result = await saveVendorContract({ companyId, file: selectedFile, form, isEditing });
            setMessage(result.message);
            resetForm();
            await loadContracts();
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : '업체 계약을 저장하지 못했습니다.');
        } finally {
            setSaving(false);
        }
    }

    async function deleteContract(contractId: string) {
        setSaving(true);
        setError('');
        setMessage('');
        try {
            await deleteVendorContract(contractId);
            setMessage('삭제했습니다.');
            await loadContracts();
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : '업체 계약을 삭제하지 못했습니다.');
        } finally {
            setSaving(false);
        }
    }

    async function runContractAction(body: Record<string, string>) {
        setSaving(true);
        setError('');
        setMessage('');
        try {
            const data = await runVendorContractAction(body);
            const nextSelectedId = data.nextContract?.id || data.contract?.id || body.contractId || '';
            setMessage(data.nextContract ? '갱신 처리했습니다.' : '종료 처리했습니다.');
            await loadContracts();
            setSelectedContractId(nextSelectedId);
            await loadEvents(nextSelectedId);
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : '업체 계약 상태를 변경하지 못했습니다.');
        } finally {
            setSaving(false);
        }
    }

    function renewContract(input: RenewInput) {
        if (!selectedContract) return;
        void runContractAction({
            action: 'renew',
            contractEndDate: input.contractEndDate,
            contractId: selectedContract.id,
            contractStartDate: input.contractStartDate,
            contractTitle: input.contractTitle,
            memo: input.memo,
            reason: input.reason
        });
    }

    function terminateContract(reason: string) {
        if (!selectedContract) return;
        void runContractAction({
            action: 'terminate',
            contractId: selectedContract.id,
            reason
        });
    }

    async function openUploadedContract(contractId: string) {
        try {
            await openVendorContractUpload(contractId);
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : '업로드 문서를 열지 못했습니다.');
        }
    }

    function selectContract(contract: VendorContract) {
        setSelectedContractId(contract.id);
        void loadEvents(contract.id);
    }

    return {
        activeQueue,
        category,
        deleteContract,
        electronicContracts,
        error,
        events,
        eventsLoading,
        form,
        loading,
        message,
        openUploadedContract,
        q,
        queueItems,
        renewContract,
        requesterId,
        resetForm,
        saveContract,
        saving,
        schemaReady,
        selectContract,
        selectedContract,
        selectedFile,
        setActiveQueue,
        setCategory,
        setEvents,
        setForm,
        setQ,
        setSelectedContractId,
        setSelectedFile,
        setStatus,
        status,
        terminateContract,
        users,
        vendorMasters,
        vendorSchemaReady,
        visibleContracts
    };
}
