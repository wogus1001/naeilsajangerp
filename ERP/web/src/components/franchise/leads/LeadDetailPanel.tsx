"use client";

import { CheckCircle2 } from 'lucide-react';
import { LeadContractChecklistSection } from '@/components/franchise/LeadContractChecklistSection';
import { LeadDisclosureSection } from '@/components/franchise/LeadDisclosureSection';
import { LeadLocationLinkSection } from '@/components/franchise/LeadLocationLinkSection';
import { LeadWorkflowSection, type LeadNextContactPresetOption } from '@/components/franchise/LeadWorkflowSection';
import { LeadActivitySection } from './LeadActivitySection';
import { LeadBasicInfoSection } from './LeadBasicInfoSection';
import { LeadDetailHeader } from './LeadDetailHeader';
import { LeadDetailQuickActions } from './LeadDetailQuickActions';
import { LeadRelatedRecordsSection } from './LeadRelatedRecordsSection';
import type { LeadActivityLogDraft } from './leadActivityLog';
import type { DisclosureEligibility } from '@/lib/franchise-disclosure-deliveries';
import type {
    LeadLocationLink,
    LeadLocationLinkStatus,
    LeadLocationTargetType
} from '@/lib/franchise-lead-location-links';
import type { LeadWorkflowDraft } from '@/lib/franchise-lead-workflow';
import type { FranchiseLeadStatus } from '@/lib/franchise-leads';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import { ENABLE_LEAD_CUSTOMER_DB_LINKING } from './constants';
import { formatFullDateTime } from './utils';
import type {
    ExternalPropertyListing,
    FranchiseLead,
    FranchiseLocation,
    LeadActivityType,
    RelatedBusinessCard,
    RelatedCustomer
} from './types';

export type LeadDetailMode = 'default' | 'contractChecklist';

type AsyncVoid = void | Promise<void>;
type AsyncBoolean = boolean | Promise<boolean>;

type LeadDetailPanelProps = {
    readonly lead: FranchiseLead;
    readonly mode: LeadDetailMode;
    readonly userId: string;
    readonly companyName: string;
    readonly convertingLeadId: string;
    readonly detailNextContactAt: string;
    readonly suggestedNextContactAt: string;
    readonly nextContactPresets: readonly LeadNextContactPresetOption[];
    readonly detailWorkflow: LeadWorkflowDraft;
    readonly isWorkflowSaving: boolean;
    readonly selectedLocationLinks: readonly LeadLocationLink[];
    readonly franchiseLocations: readonly FranchiseLocation[];
    readonly externalListings: readonly ExternalPropertyListing[];
    readonly isLocationMatchLoading: boolean;
    readonly isLocationLinkSaving: boolean;
    readonly activityType: LeadActivityType;
    readonly activityContent: string;
    readonly isActivitySaving: boolean;
    readonly relatedCustomers: readonly RelatedCustomer[];
    readonly relatedCards: readonly RelatedBusinessCard[];
    readonly isRelatedLoading: boolean;
    readonly getManagerNameAction: (managerId?: string) => string;
    readonly onCloseAction: () => void;
    readonly onPromoteLeadToCandidateAction: (lead: FranchiseLead) => AsyncVoid;
    readonly onStatusChangeAction: (lead: FranchiseLead, status: FranchiseLeadStatus) => AsyncVoid;
    readonly onEditAction: (lead: FranchiseLead) => void;
    readonly onConvertLeadAction: (lead: FranchiseLead) => AsyncVoid;
    readonly onDetailNextContactAtChangeAction: (value: string) => void;
    readonly onDetailWorkflowChangeAction: (value: LeadWorkflowDraft) => void;
    readonly onSaveDetailWorkflowAction: () => AsyncVoid;
    readonly onDisclosureEligibilityChangeAction: (eligibility: DisclosureEligibility | null) => void;
    readonly onContractChecklistSavedAction: () => void;
    readonly onAddLocationLinkAction: (targetType: LeadLocationTargetType, targetId: string) => AsyncVoid;
    readonly onUpdateLocationLinkAction: (linkId: string, patch: { readonly status?: LeadLocationLinkStatus; readonly memo?: string }) => AsyncVoid;
    readonly onRemoveLocationLinkAction: (linkId: string) => AsyncVoid;
    readonly onActivityTypeChangeAction: (activityType: LeadActivityType) => void;
    readonly onActivityContentChangeAction: (content: string) => void;
    readonly onAddLeadActivityAction: () => AsyncBoolean;
    readonly onUpdateLeadActivityAction: (activityId: string, draft: LeadActivityLogDraft) => AsyncBoolean;
    readonly onDeleteLeadActivityAction: (activityId: string) => AsyncBoolean;
    readonly onLinkRelatedCustomerAction: (customer: RelatedCustomer) => AsyncVoid;
    readonly onLinkRelatedCardAction: (card: RelatedBusinessCard) => AsyncVoid;
};

export function LeadDetailPanel({
    lead,
    mode,
    userId,
    companyName,
    convertingLeadId,
    detailNextContactAt,
    suggestedNextContactAt,
    nextContactPresets,
    detailWorkflow,
    isWorkflowSaving,
    selectedLocationLinks,
    franchiseLocations,
    externalListings,
    isLocationMatchLoading,
    isLocationLinkSaving,
    activityType,
    activityContent,
    isActivitySaving,
    relatedCustomers,
    relatedCards,
    isRelatedLoading,
    getManagerNameAction,
    onCloseAction,
    onPromoteLeadToCandidateAction,
    onStatusChangeAction,
    onEditAction,
    onConvertLeadAction,
    onDetailNextContactAtChangeAction,
    onDetailWorkflowChangeAction,
    onSaveDetailWorkflowAction,
    onDisclosureEligibilityChangeAction,
    onContractChecklistSavedAction,
    onAddLocationLinkAction,
    onUpdateLocationLinkAction,
    onRemoveLocationLinkAction,
    onActivityTypeChangeAction,
    onActivityContentChangeAction,
    onAddLeadActivityAction,
    onUpdateLeadActivityAction,
    onDeleteLeadActivityAction,
    onLinkRelatedCustomerAction,
    onLinkRelatedCardAction
}: LeadDetailPanelProps) {
    const isContractChecklistOnly = mode === 'contractChecklist';
    const detailTitle = isContractChecklistOnly ? '계약 전 체크' : '가맹 희망자 상세';
    const managerName = getManagerNameAction(lead.managerId);

    return (
        <div className={styles.detailBackdrop} onClick={onCloseAction}>
            <aside
                className={`${styles.detailPanel} ${isContractChecklistOnly ? styles.contractChecklistOnlyPanel : ''}`}
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="franchise-lead-detail-title"
            >
                <LeadDetailHeader
                    lead={lead}
                    detailTitle={detailTitle}
                    managerName={managerName}
                    onCloseAction={onCloseAction}
                />

                {isContractChecklistOnly ? (
                    <div className={styles.contractChecklistOnlyContent}>
                        <LeadContractChecklistSection
                            leadId={lead.id}
                            userId={userId}
                            onSaved={onContractChecklistSavedAction}
                        />
                    </div>
                ) : (
                    <>
                        {ENABLE_LEAD_CUSTOMER_DB_LINKING && lead.convertedCustomerId && (
                            <div className={styles.convertedNotice}>
                                <CheckCircle2 size={16} />
                                <div>
                                    <strong>고객 DB 전환 완료</strong>
                                    <span>{lead.convertedCustomerName || lead.name} · {formatFullDateTime(lead.convertedAt)}</span>
                                </div>
                            </div>
                        )}

                        <LeadDetailQuickActions
                            lead={lead}
                            convertingLeadId={convertingLeadId}
                            onPromoteLeadToCandidateAction={onPromoteLeadToCandidateAction}
                            onStatusChangeAction={onStatusChangeAction}
                            onEditAction={onEditAction}
                            onConvertLeadAction={onConvertLeadAction}
                        />

                        <div className={styles.detailContentGrid}>
                            <LeadBasicInfoSection lead={lead} managerName={managerName} />

                            <LeadActivitySection
                                lead={lead}
                                activityType={activityType}
                                activityContent={activityContent}
                                isSaving={isActivitySaving}
                                onActivityTypeChangeAction={onActivityTypeChangeAction}
                                onActivityContentChangeAction={onActivityContentChangeAction}
                                onAddLeadActivityAction={onAddLeadActivityAction}
                                onUpdateLeadActivityAction={onUpdateLeadActivityAction}
                                onDeleteLeadActivityAction={onDeleteLeadActivityAction}
                            />

                            <LeadWorkflowSection
                                value={detailWorkflow}
                                isSaving={isWorkflowSaving}
                                currentNextContactAt={lead.nextContactAt}
                                nextContactValue={detailNextContactAt}
                                suggestedNextContactValue={suggestedNextContactAt}
                                nextContactPresets={nextContactPresets}
                                onChange={onDetailWorkflowChangeAction}
                                onNextContactChange={onDetailNextContactAtChangeAction}
                                onSave={() => void onSaveDetailWorkflowAction()}
                            />

                            <LeadDisclosureSection
                                leadId={lead.id}
                                userId={userId}
                                companyId={lead.companyId}
                                companyName={lead.companyName || companyName}
                                leadName={lead.name}
                                leadContact={lead.mobile}
                                interestedBrand={lead.interestedBrand}
                                onEligibilityChange={onDisclosureEligibilityChangeAction}
                            />

                            <LeadLocationLinkSection
                                links={selectedLocationLinks}
                                locations={franchiseLocations}
                                externalListings={externalListings}
                                isLoading={isLocationMatchLoading}
                                isSaving={isLocationLinkSaving}
                                onAddLinkAction={(targetType, targetId) => void onAddLocationLinkAction(targetType, targetId)}
                                onUpdateLinkAction={(linkId, patch) => void onUpdateLocationLinkAction(linkId, patch)}
                                onRemoveLinkAction={(linkId) => void onRemoveLocationLinkAction(linkId)}
                            />

                            <LeadRelatedRecordsSection
                                lead={lead}
                                convertingLeadId={convertingLeadId}
                                relatedCustomers={relatedCustomers}
                                relatedCards={relatedCards}
                                isRelatedLoading={isRelatedLoading}
                                onConvertLeadAction={onConvertLeadAction}
                                onLinkRelatedCustomerAction={onLinkRelatedCustomerAction}
                                onLinkRelatedCardAction={onLinkRelatedCardAction}
                            />
                        </div>
                    </>
                )}
            </aside>
        </div>
    );
}
