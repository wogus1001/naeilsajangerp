"use client";

import React from 'react';
import { CalendarCheck, FileText, ListChecks, Store } from 'lucide-react';
import { LeadContractChecklistSection } from '@/components/franchise/LeadContractChecklistSection';
import { LeadDocumentBoxSection } from '@/components/franchise/LeadDocumentBoxSection';
import type {
    ExternalPropertyListing,
    FranchiseLead,
    FranchiseLocation,
    LeadLocationLink
} from './types';
import { LeadContractStoreSection } from './LeadContractStoreSection';
import { LeadOpeningProjectSection } from './LeadOpeningProjectSection';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';

type ContractDetailTab = 'checklist' | 'documents' | 'store' | 'opening';

type LeadContractDetailTabsProps = {
    readonly lead: FranchiseLead;
    readonly userId: string;
    readonly companyName: string;
    readonly selectedLocationLinks: readonly LeadLocationLink[];
    readonly franchiseLocations: readonly FranchiseLocation[];
    readonly externalListings: readonly ExternalPropertyListing[];
    readonly isLocationMatchLoading: boolean;
    readonly onContractChecklistSavedAction: () => void;
};

export function LeadContractDetailTabs({
    lead,
    userId,
    companyName,
    selectedLocationLinks,
    franchiseLocations,
    externalListings,
    isLocationMatchLoading,
    onContractChecklistSavedAction
}: LeadContractDetailTabsProps) {
    const [activeTab, setActiveTab] = React.useState<ContractDetailTab>(
        lead.status === '계약완료' ? 'opening' : 'checklist'
    );
    const [documentRefreshKey, setDocumentRefreshKey] = React.useState(0);
    const [checklistRefreshKey, setChecklistRefreshKey] = React.useState(0);
    const canShowStoreTab = lead.status === '계약완료';

    React.useEffect(() => {
        if (!canShowStoreTab && (activeTab === 'store' || activeTab === 'opening')) setActiveTab('checklist');
    }, [activeTab, canShowStoreTab]);

    React.useEffect(() => {
        setActiveTab(lead.status === '계약완료' ? 'opening' : 'checklist');
    }, [lead.id, lead.status]);

    return (
        <div className={styles.contractChecklistOnlyContent}>
            <nav className={styles.contractDetailTabs} aria-label="계약 완료 점주 상세">
                {canShowStoreTab && (
                    <button
                        type="button"
                        className={activeTab === 'opening' ? styles.contractDetailTabActive : styles.contractDetailTab}
                        onClick={() => setActiveTab('opening')}
                    >
                        <CalendarCheck size={15} />
                        오픈 준비
                    </button>
                )}
                <button
                    type="button"
                    className={activeTab === 'checklist' ? styles.contractDetailTabActive : styles.contractDetailTab}
                    onClick={() => setActiveTab('checklist')}
                >
                    <ListChecks size={15} />
                    구비서류
                </button>
                <button
                    type="button"
                    className={activeTab === 'documents' ? styles.contractDetailTabActive : styles.contractDetailTab}
                    onClick={() => setActiveTab('documents')}
                >
                    <FileText size={15} />
                    점주 문서함
                </button>
                {canShowStoreTab && (
                    <button
                        type="button"
                        className={activeTab === 'store' ? styles.contractDetailTabActive : styles.contractDetailTab}
                        onClick={() => setActiveTab('store')}
                    >
                        <Store size={15} />
                        가맹점 정보
                    </button>
                )}
            </nav>

            {activeTab === 'checklist' && (
                <LeadContractChecklistSection
                    companyId={lead.companyId || ''}
                    leadId={lead.id}
                    userId={userId}
                    refreshKey={checklistRefreshKey}
                    onDocumentChanged={() => setDocumentRefreshKey(previous => previous + 1)}
                    onSaved={onContractChecklistSavedAction}
                />
            )}
            {activeTab === 'documents' && (
                <LeadDocumentBoxSection
                    leadId={lead.id}
                    userId={userId}
                    companyId={lead.companyId || ''}
                    leadName={lead.name}
                    refreshKey={documentRefreshKey}
                    onSaved={() => setChecklistRefreshKey(previous => previous + 1)}
                />
            )}
            {activeTab === 'store' && canShowStoreTab && (
                <LeadContractStoreSection
                    lead={lead}
                    userId={userId}
                    companyName={lead.companyName || companyName}
                    selectedLocationLinks={selectedLocationLinks}
                    franchiseLocations={franchiseLocations}
                    externalListings={externalListings}
                    isLocationMatchLoading={isLocationMatchLoading}
                />
            )}
            {activeTab === 'opening' && canShowStoreTab && (
                <LeadOpeningProjectSection
                    lead={lead}
                    userId={userId}
                    companyName={lead.companyName || companyName}
                    onOpenStoreTabAction={() => setActiveTab('store')}
                />
            )}
        </div>
    );
}
