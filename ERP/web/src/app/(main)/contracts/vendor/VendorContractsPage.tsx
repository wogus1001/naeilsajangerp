"use client";

import React from 'react';
import { Plus } from 'lucide-react';
import { getApiAuthHeaders } from '@/utils/apiAuthHeaders';
import { readApiError, unwrapApiData } from '@/utils/apiResponse';
import {
    getRequesterId,
    getStoredCompanyId,
    getStoredCompanyName,
    getStoredUser,
    isAdminStoredUser
} from '@/utils/userUtils';
import {
    EMPTY_FORM,
    formFromContract,
    parseUserOptions,
    type ElectronicContractOption,
    type ElectronicContractsResponse,
    type UserOption,
    type VendorContract,
    type VendorContractForm,
    type VendorContractsResponse
} from './vendorContractsModel';
import { buildContractPayload, uploadVendorContractFile } from './vendorContractsClient';
import { VendorContractFormPanel } from './VendorContractFormPanel';
import { VendorContractFilters } from './VendorContractFilters';
import { VendorContractsTable } from './VendorContractsTable';
import styles from './vendorContracts.module.css';

export default function VendorContractsPage() {
    const [contracts, setContracts] = React.useState<readonly VendorContract[]>([]);
    const [electronicContracts, setElectronicContracts] = React.useState<readonly ElectronicContractOption[]>([]);
    const [users, setUsers] = React.useState<readonly UserOption[]>([]);
    const [form, setForm] = React.useState<VendorContractForm>(EMPTY_FORM);
    const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
    const [q, setQ] = React.useState('');
    const [category, setCategory] = React.useState('all');
    const [status, setStatus] = React.useState('all');
    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);
    const [schemaReady, setSchemaReady] = React.useState(true);
    const [message, setMessage] = React.useState('');
    const [error, setError] = React.useState('');
    const [companyId, setCompanyId] = React.useState('');
    const [companyName, setCompanyName] = React.useState('');
    const [requesterId, setRequesterId] = React.useState('');

    const isEditing = Boolean(form.id);

    const resetForm = React.useCallback(() => {
        setForm(current => ({ ...EMPTY_FORM, ownerProfileId: requesterId || current.ownerProfileId }));
        setSelectedFile(null);
    }, [requesterId]);

    const loadContracts = React.useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams({ category, q, status });
            if (companyId) params.set('companyId', companyId);
            const response = await fetch(`/api/franchise-vendor-contracts?${params.toString()}`, {
                cache: 'no-store',
                headers: await getApiAuthHeaders()
            });
            const payload = await response.json();
            if (!response.ok) throw new Error(readApiError(payload));
            const data = unwrapApiData<VendorContractsResponse>(payload);
            setContracts(data.contracts || []);
            setSchemaReady(data.schemaReady !== false);
        } catch (caught) {
            setContracts([]);
            setError(caught instanceof Error ? caught.message : '업체 계약함을 불러오지 못했습니다.');
        } finally {
            setLoading(false);
        }
    }, [category, companyId, q, status]);

    const loadOptions = React.useCallback(async () => {
        const headers = await getApiAuthHeaders();
        const [contractResponse, userResponse] = await Promise.all([
            fetch('/api/electronic-contracts?scope=company', { cache: 'no-store', headers }),
            companyName
                ? fetch(`/api/users?company=${encodeURIComponent(companyName)}`, { cache: 'no-store', headers })
                : Promise.resolve(null)
        ]);
        if (contractResponse.ok) {
            const payload = await contractResponse.json();
            const data = unwrapApiData<ElectronicContractsResponse>(payload);
            setElectronicContracts(data.contracts || []);
        }
        if (userResponse?.ok) {
            const payload: unknown = await userResponse.json();
            setUsers(parseUserOptions(payload));
        }
    }, [companyName]);

    React.useEffect(() => {
        const user = getStoredUser();
        setRequesterId(getRequesterId(user));
        setCompanyId(getStoredCompanyId(user));
        setCompanyName(getStoredCompanyName(user));
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

    async function saveContract() {
        if (!companyId) {
            setError('회사 정보를 확인할 수 없습니다.');
            return;
        }
        setSaving(true);
        setError('');
        setMessage('');
        try {
            const contractId = form.id || crypto.randomUUID();
            const uploadFields = selectedFile
                ? await uploadVendorContractFile({ companyId, contractId, file: selectedFile })
                : {};
            const nextForm = {
                ...form,
                ...uploadFields,
                documentSource: selectedFile ? 'upload' as const : form.documentSource,
                id: contractId
            };
            const response = await fetch('/api/franchise-vendor-contracts', {
                body: JSON.stringify(buildContractPayload(nextForm, companyId)),
                headers: await getApiAuthHeaders({ 'Content-Type': 'application/json' }),
                method: isEditing ? 'PATCH' : 'POST'
            });
            const payload = await response.json();
            if (!response.ok) throw new Error(readApiError(payload));
            setMessage(isEditing ? '수정했습니다.' : '등록했습니다.');
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
            const response = await fetch(`/api/franchise-vendor-contracts?id=${encodeURIComponent(contractId)}`, {
                headers: await getApiAuthHeaders(),
                method: 'DELETE'
            });
            const payload = await response.json();
            if (!response.ok) throw new Error(readApiError(payload));
            setMessage('삭제했습니다.');
            await loadContracts();
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : '업체 계약을 삭제하지 못했습니다.');
        } finally {
            setSaving(false);
        }
    }

    async function openUploadedContract(contractId: string) {
        const response = await fetch(`/api/franchise-vendor-contracts?action=open&id=${encodeURIComponent(contractId)}`, {
            cache: 'no-store',
            headers: await getApiAuthHeaders()
        });
        const payload = await response.json();
        if (!response.ok) {
            setError(readApiError(payload));
            return;
        }
        const data = unwrapApiData<{ readonly url?: string }>(payload);
        if (data.url) window.open(data.url, '_blank', 'noopener,noreferrer');
    }

    return (
        <main className={styles.container}>
            <section className={`${styles.panel} ${styles.header}`}>
                <div>
                    <h1 className={styles.title}>업체 계약함</h1>
                    <p className={styles.description}>본사와 외부 업체 간 계약 원본, 담당자, 만료일을 회사 단위로 관리합니다.</p>
                </div>
                <button className={styles.primaryButton} type="button" onClick={resetForm}>
                    <Plus size={16} />
                    신규 계약
                </button>
            </section>

            {!schemaReady && <div className={styles.notice}>업체 계약함 SQL 적용 후 사용할 수 있습니다.</div>}
            {error && <div className={styles.error}>{error}</div>}
            {message && <div className={styles.message}>{message}</div>}

            <VendorContractFilters
                category={category}
                q={q}
                status={status}
                onCategoryChange={setCategory}
                onQueryChange={setQ}
                onStatusChange={setStatus}
            />

            <section className={styles.grid}>
                <VendorContractFormPanel
                    electronicContracts={electronicContracts}
                    form={form}
                    requesterId={requesterId}
                    saving={saving}
                    selectedFile={selectedFile}
                    users={users}
                    onFileChange={setSelectedFile}
                    onFormChange={setForm}
                    onReset={resetForm}
                    onSubmit={() => void saveContract()}
                />
                <VendorContractsTable
                    contracts={contracts}
                    loading={loading}
                    saving={saving}
                    onDelete={(contractId) => void deleteContract(contractId)}
                    onEdit={(contract) => {
                        setForm(formFromContract(contract));
                        setSelectedFile(null);
                    }}
                    onOpenUpload={(contractId) => void openUploadedContract(contractId)}
                />
            </section>
        </main>
    );
}
