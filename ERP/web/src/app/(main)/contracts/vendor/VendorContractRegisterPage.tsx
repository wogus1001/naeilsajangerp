"use client";

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { formFromContract } from './vendorContractsModel';
import { useVendorContractsController } from './useVendorContractsController';
import { VendorContractFormPanel } from './VendorContractFormPanel';
import alertStyles from './vendorContractAlerts.module.css';
import styles from './vendorContracts.module.css';

export function VendorContractRegisterPage() {
    const router = useRouter();
    const controller = useVendorContractsController();
    const [contractId, setContractId] = React.useState('');
    const initializedContractId = React.useRef('');

    React.useEffect(() => {
        setContractId(new URLSearchParams(window.location.search).get('contractId') || '');
    }, []);

    React.useEffect(() => {
        if (!contractId || initializedContractId.current === contractId) return;
        const contract = controller.contracts.find(item => item.id === contractId);
        if (!contract) return;

        controller.setForm(formFromContract(contract));
        controller.setSelectedFile(null);
        initializedContractId.current = contractId;
    }, [contractId, controller.contracts, controller.setForm, controller.setSelectedFile]);

    const isEditMode = Boolean(contractId);
    const isEditContractMissing = isEditMode
        && !controller.loading
        && !controller.contracts.some(contract => contract.id === contractId);

    async function handleSubmit() {
        const saved = await controller.saveContract();
        if (saved) {
            router.push('/contracts/vendor');
        }
    }

    return (
        <main className={styles.container}>
            <section className={`${styles.panel} ${styles.header}`}>
                <div>
                    <h1 className={styles.title}>{isEditMode ? '업체 계약 수정' : '업체 계약 등록'}</h1>
                    <p className={styles.description}>
                        업체를 선택하거나 직접 입력해 계약 원본, 담당자, 만료일을 등록합니다.
                    </p>
                </div>
                <div className={styles.headerActions}>
                    <Link className={styles.secondaryButton} href="/contracts/vendor">
                        <ArrowLeft size={16} />
                        목록으로
                    </Link>
                </div>
            </section>

            {!controller.schemaReady && <div className={alertStyles.notice}>업체 계약함 SQL 적용 후 사용할 수 있습니다.</div>}
            {!controller.vendorSchemaReady && <div className={alertStyles.notice}>업체 관리 SQL 적용 후 계약 등록에서 업체 선택을 사용할 수 있습니다.</div>}
            {isEditContractMissing && <div className={alertStyles.notice}>수정할 계약을 찾지 못했습니다. 목록에서 다시 선택해 주세요.</div>}
            {controller.error && <div className={alertStyles.error}>{controller.error}</div>}
            {controller.message && <div className={alertStyles.message}>{controller.message}</div>}

            <section className={styles.formPage}>
                <VendorContractFormPanel
                    electronicContracts={controller.electronicContracts}
                    form={controller.form}
                    requesterId={controller.requesterId}
                    saving={controller.saving}
                    selectedFile={controller.selectedFile}
                    users={controller.users}
                    vendorMasters={controller.vendorMasters}
                    onFileChange={controller.setSelectedFile}
                    onFormChange={controller.setForm}
                    onReset={controller.resetForm}
                    onSubmit={() => void handleSubmit()}
                />
            </section>
        </main>
    );
}
