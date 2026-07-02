"use client";
import { formFromContract } from './vendorContractsModel';
import { useVendorContractsController } from './useVendorContractsController';
import { VendorContractDetailPanel } from './VendorContractDetailPanel';
import { VendorContractFilters } from './VendorContractFilters';
import { VendorContractFormPanel } from './VendorContractFormPanel';
import { VendorContractQueue } from './VendorContractQueue';
import { VendorContractsTable } from './VendorContractsTable';
import alertStyles from './vendorContractAlerts.module.css';
import styles from './vendorContracts.module.css';

export default function VendorContractsPage() {
    const controller = useVendorContractsController();

    return (
        <main className={styles.container}>
            <section className={`${styles.panel} ${styles.header}`}>
                <div>
                    <h1 className={styles.title}>업체 계약함</h1>
                    <p className={styles.description}>본사와 외부 업체 간 계약 원본, 담당자, 만료일을 회사 단위로 관리합니다.</p>
                </div>
            </section>

            {!controller.schemaReady && <div className={alertStyles.notice}>업체 계약함 SQL 적용 후 사용할 수 있습니다.</div>}
            {!controller.vendorSchemaReady && <div className={alertStyles.notice}>업체 관리 SQL 적용 후 계약 등록에서 업체 선택을 사용할 수 있습니다.</div>}
            {controller.error && <div className={alertStyles.error}>{controller.error}</div>}
            {controller.message && <div className={alertStyles.message}>{controller.message}</div>}

            <VendorContractFilters
                category={controller.category}
                q={controller.q}
                status={controller.status}
                onCategoryChange={(value) => { controller.setCategory(value); controller.setActiveQueue('all'); }}
                onQueryChange={(value) => { controller.setQ(value); controller.setActiveQueue('all'); }}
                onStatusChange={(value) => { controller.setStatus(value); controller.setActiveQueue('all'); }}
            />

            <VendorContractQueue
                activeQueue={controller.activeQueue}
                items={controller.queueItems}
                onSelect={controller.setActiveQueue}
            />

            <section className={styles.grid}>
                <div className={styles.formColumn}>
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
                        onSubmit={() => void controller.saveContract()}
                    />
                </div>
                <div className={styles.workspaceColumn}>
                    <VendorContractsTable
                        contracts={controller.visibleContracts}
                        loading={controller.loading}
                        saving={controller.saving}
                        onDelete={(contractId) => void controller.deleteContract(contractId)}
                        onDetail={controller.selectContract}
                        onEdit={(contract) => {
                            controller.setForm(formFromContract(contract));
                            controller.setSelectedFile(null);
                        }}
                        onOpenUpload={(contractId) => void controller.openUploadedContract(contractId)}
                    />
                    {controller.selectedContract && (
                        <VendorContractDetailPanel
                            contract={controller.selectedContract}
                            events={controller.events}
                            eventsLoading={controller.eventsLoading}
                            saving={controller.saving}
                            onClose={() => {
                                controller.setSelectedContractId('');
                                controller.setEvents([]);
                            }}
                            onRenew={controller.renewContract}
                            onTerminate={controller.terminateContract}
                        />
                    )}
                </div>
            </section>
        </main>
    );
}
