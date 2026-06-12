"use client";

import {
    BriefcaseBusiness,
    CalendarClock,
    CheckCircle2,
    Link2,
    MessageSquare,
    Pencil,
    UserCheck,
    UserRound,
    X
} from 'lucide-react';
import { LeadContractChecklistSection } from '@/components/franchise/LeadContractChecklistSection';
import { LeadDisclosureSection } from '@/components/franchise/LeadDisclosureSection';
import { LeadLocationLinkSection } from '@/components/franchise/LeadLocationLinkSection';
import { LeadWorkflowSection } from '@/components/franchise/LeadWorkflowSection';
import type { DisclosureEligibility } from '@/lib/franchise-disclosure-deliveries';
import type {
    LeadLocationLink,
    LeadLocationLinkStatus,
    LeadLocationTargetType
} from '@/lib/franchise-lead-location-links';
import type { LeadWorkflowDraft } from '@/lib/franchise-lead-workflow';
import {
    FRANCHISE_LEAD_STATUSES,
    getFranchiseLeadGradeLabel,
    getFranchiseLeadStageLabel
} from '@/lib/franchise-leads';
import type { FranchiseLeadStatus } from '@/lib/franchise-leads';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import {
    formatBudget,
    formatFullDateTime,
    isDueToday,
    isPastDue,
    isRawIntakeLead
} from './utils';
import { ACTIVITY_TYPES } from './constants';
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

type LeadDetailPanelProps = {
    readonly lead: FranchiseLead;
    readonly mode: LeadDetailMode;
    readonly userId: string;
    readonly companyName: string;
    readonly convertingLeadId: string;
    readonly detailNextContactAt: string;
    readonly detailWorkflow: LeadWorkflowDraft;
    readonly isWorkflowSaving: boolean;
    readonly selectedLocationLinks: readonly LeadLocationLink[];
    readonly franchiseLocations: readonly FranchiseLocation[];
    readonly externalListings: readonly ExternalPropertyListing[];
    readonly isLocationMatchLoading: boolean;
    readonly isLocationLinkSaving: boolean;
    readonly activityType: LeadActivityType;
    readonly activityContent: string;
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
    readonly onSaveDetailNextContactAction: () => AsyncVoid;
    readonly onDetailWorkflowChangeAction: (value: LeadWorkflowDraft) => void;
    readonly onSaveDetailWorkflowAction: () => AsyncVoid;
    readonly onDisclosureEligibilityChangeAction: (eligibility: DisclosureEligibility | null) => void;
    readonly onContractChecklistSavedAction: () => void;
    readonly onAddLocationLinkAction: (targetType: LeadLocationTargetType, targetId: string) => AsyncVoid;
    readonly onUpdateLocationLinkAction: (linkId: string, patch: { readonly status?: LeadLocationLinkStatus; readonly memo?: string }) => AsyncVoid;
    readonly onRemoveLocationLinkAction: (linkId: string) => AsyncVoid;
    readonly onActivityTypeChangeAction: (activityType: LeadActivityType) => void;
    readonly onActivityContentChangeAction: (content: string) => void;
    readonly onAddLeadActivityAction: () => AsyncVoid;
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
    detailWorkflow,
    isWorkflowSaving,
    selectedLocationLinks,
    franchiseLocations,
    externalListings,
    isLocationMatchLoading,
    isLocationLinkSaving,
    activityType,
    activityContent,
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
    onSaveDetailNextContactAction,
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
    onLinkRelatedCustomerAction,
    onLinkRelatedCardAction
}: LeadDetailPanelProps) {
    const isContractChecklistOnly = mode === 'contractChecklist';
    const detailTitle = isContractChecklistOnly ? '계약 전 체크' : '가맹 희망자 상세';

    return (
        <div className={styles.detailBackdrop} onClick={onCloseAction}>
            <aside
                className={`${styles.detailPanel} ${isContractChecklistOnly ? styles.contractChecklistOnlyPanel : ''}`}
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="franchise-lead-detail-title"
            >
                <div className={styles.detailHeader}>
                    <div>
                        <span className={styles.detailEyebrow}>{detailTitle}</span>
                        <h2 id="franchise-lead-detail-title">{lead.name}</h2>
                        <p>{lead.mobile || '연락처 미입력'} · {lead.source || '유입 미지정'} · 담당자 {getManagerNameAction(lead.managerId)}</p>
                    </div>
                    <button
                        className={styles.closeButton}
                        onClick={onCloseAction}
                        aria-label={`${detailTitle} 패널 닫기`}
                    >
                        <X size={20} strokeWidth={2.2} />
                    </button>
                </div>

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
                        {lead.convertedCustomerId && (
                            <div className={styles.convertedNotice}>
                                <CheckCircle2 size={16} />
                                <div>
                                    <strong>고객 DB 전환 완료</strong>
                                    <span>{lead.convertedCustomerName || lead.name} · {formatFullDateTime(lead.convertedAt)}</span>
                                </div>
                            </div>
                        )}

                        <div className={styles.detailQuickActions}>
                            {isRawIntakeLead(lead) && (
                                <button className={styles.promoteButtonLarge} onClick={() => void onPromoteLeadToCandidateAction(lead)}>
                                    가맹 희망자 승격
                                </button>
                            )}
                            <select
                                value={lead.status}
                                onChange={(event) => void onStatusChangeAction(lead, event.target.value as FranchiseLeadStatus)}
                            >
                                {FRANCHISE_LEAD_STATUSES.map(status => (
                                    <option key={status} value={status}>{status}</option>
                                ))}
                            </select>
                            <button className={styles.secondaryButton} onClick={() => onEditAction(lead)}>
                                <Pencil size={15} />
                                기본정보 수정
                            </button>
                            <button
                                className={lead.convertedCustomerId ? styles.secondaryButtonSuccess : styles.primaryButton}
                                onClick={() => void onConvertLeadAction(lead)}
                                disabled={Boolean(lead.convertedCustomerId) || convertingLeadId === lead.id}
                            >
                                <UserCheck size={15} />
                                {lead.convertedCustomerId ? '전환완료' : '고객 전환'}
                            </button>
                        </div>

                        <div className={styles.detailContentGrid}>
                            <section className={styles.detailSection}>
                                <h3><UserRound size={16} /> 기본정보</h3>
                                <div className={styles.detailInfoGrid}>
                                    <div>
                                        <span>단계</span>
                                        <strong>{getFranchiseLeadStageLabel(lead.leadStage)}</strong>
                                    </div>
                                    <div>
                                        <span>우선순위</span>
                                        <strong>{getFranchiseLeadGradeLabel(lead.grade)}</strong>
                                    </div>
                                    <div>
                                        <span>희망지역</span>
                                        <strong>{lead.desiredRegion || '-'}</strong>
                                    </div>
                                    <div>
                                        <span>담당자</span>
                                        <strong>{getManagerNameAction(lead.managerId)}</strong>
                                    </div>
                                    <div>
                                        <span>예산</span>
                                        <strong>{formatBudget(lead.budgetMin, lead.budgetMax)}</strong>
                                    </div>
                                    <div>
                                        <span>관심브랜드</span>
                                        <strong>{lead.interestedBrand || '-'}</strong>
                                    </div>
                                </div>
                                <div className={styles.detailMemo}>
                                    <span>메모</span>
                                    <p>{lead.memo || '등록된 메모가 없습니다.'}</p>
                                </div>
                            </section>

                            <section className={styles.detailSection}>
                                <h3><CalendarClock size={16} /> 다음 연락</h3>
                                <div className={styles.nextContactBox}>
                                    <input
                                        type="datetime-local"
                                        value={detailNextContactAt}
                                        onChange={(event) => onDetailNextContactAtChangeAction(event.target.value)}
                                    />
                                    <button className={styles.primaryButton} onClick={() => void onSaveDetailNextContactAction()}>
                                        저장
                                    </button>
                                </div>
                                <p className={styles.detailHint}>
                                    현재: {formatFullDateTime(lead.nextContactAt)}
                                    {isPastDue(lead.nextContactAt) ? ' · 연락 지연' : isDueToday(lead.nextContactAt) ? ' · 오늘 연락' : ''}
                                </p>
                            </section>

                            <LeadWorkflowSection
                                value={detailWorkflow}
                                isSaving={isWorkflowSaving}
                                onChange={onDetailWorkflowChangeAction}
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

                            <LeadContractChecklistSection
                                leadId={lead.id}
                                userId={userId}
                                onSaved={onContractChecklistSavedAction}
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

                            <section className={styles.detailSection}>
                                <h3><MessageSquare size={16} /> 상담 이력</h3>
                                <div className={styles.activityComposer}>
                                    <select value={activityType} onChange={(event) => onActivityTypeChangeAction(event.target.value as LeadActivityType)}>
                                        {ACTIVITY_TYPES.map(type => (
                                            <option key={type} value={type}>{type}</option>
                                        ))}
                                    </select>
                                    <textarea
                                        value={activityContent}
                                        onChange={(event) => onActivityContentChangeAction(event.target.value)}
                                        placeholder="상담 내용, 고객 반응, 다음 액션을 기록하세요."
                                    />
                                    <button className={styles.primaryButton} onClick={() => void onAddLeadActivityAction()}>
                                        이력 추가
                                    </button>
                                </div>
                                <div className={styles.timeline}>
                                    {(lead.activityLog || []).length === 0 ? (
                                        <div className={styles.emptyTimeline}>아직 상담 이력이 없습니다.</div>
                                    ) : (
                                        (lead.activityLog || []).map(activity => (
                                            <article key={activity.id} className={styles.timelineItem}>
                                                <div>
                                                    <span>{activity.type}</span>
                                                    <time>{formatFullDateTime(activity.createdAt)}</time>
                                                </div>
                                                <p>{activity.content}</p>
                                                <small>{activity.createdBy || '담당자 미상'}</small>
                                            </article>
                                        ))
                                    )}
                                </div>
                            </section>

                            <section className={styles.detailSection}>
                                <h3><Link2 size={16} /> 기존 DB 연결</h3>
                                <div className={styles.linkSummary}>
                                    <span>{lead.convertedCustomerId ? `전환: ${lead.convertedCustomerName || lead.convertedCustomerId}` : '고객 전환 전'}</span>
                                    <span>{lead.linkedCustomerId ? `고객: ${lead.linkedCustomerName || lead.linkedCustomerId}` : '고객 미연결'}</span>
                                    <span>{lead.linkedBusinessCardId ? `명함: ${lead.linkedBusinessCardName || lead.linkedBusinessCardId}` : '명함 미연결'}</span>
                                </div>
                                <div className={`${styles.conversionBox} ${lead.convertedCustomerId ? styles.conversionBoxDone : ''}`}>
                                    <div>
                                        <strong>{lead.convertedCustomerId ? '고객 DB 전환 완료' : '이 리드를 고객 DB로 전환'}</strong>
                                        <p>
                                            {lead.convertedCustomerId
                                                ? `${formatFullDateTime(lead.convertedAt)} 전환되었습니다.`
                                                : lead.linkedCustomerId
                                                    ? '이미 연결된 고객을 전환 완료로 표시합니다.'
                                                    : '같은 연락처 고객이 있으면 연결하고, 없으면 새 고객을 생성합니다.'}
                                        </p>
                                    </div>
                                    <button
                                        className={lead.convertedCustomerId ? styles.secondaryButtonSuccess : styles.primaryButton}
                                        onClick={() => void onConvertLeadAction(lead)}
                                        disabled={Boolean(lead.convertedCustomerId) || convertingLeadId === lead.id}
                                    >
                                        <UserCheck size={14} />
                                        {lead.convertedCustomerId ? '완료됨' : '전환 실행'}
                                    </button>
                                </div>

                                <div className={styles.relatedGrid}>
                                    <div className={styles.relatedColumn}>
                                        <h4><UserRound size={14} /> 고객 후보</h4>
                                        {isRelatedLoading ? (
                                            <p>검색 중...</p>
                                        ) : relatedCustomers.length === 0 ? (
                                            <p>같은 연락처의 고객이 없습니다.</p>
                                        ) : relatedCustomers.map(customer => (
                                            <article key={customer.id} className={styles.relatedItem}>
                                                <div>
                                                    <strong>{customer.name}</strong>
                                                    <span>{customer.mobile || customer.companyPhone || '-'}</span>
                                                </div>
                                                <button onClick={() => void onLinkRelatedCustomerAction(customer)}>
                                                    연결
                                                </button>
                                            </article>
                                        ))}
                                    </div>
                                    <div className={styles.relatedColumn}>
                                        <h4><BriefcaseBusiness size={14} /> 명함 후보</h4>
                                        {isRelatedLoading ? (
                                            <p>검색 중...</p>
                                        ) : relatedCards.length === 0 ? (
                                            <p>같은 연락처의 명함이 없습니다.</p>
                                        ) : relatedCards.map(card => (
                                            <article key={card.id} className={styles.relatedItem}>
                                                <div>
                                                    <strong>{card.name}</strong>
                                                    <span>{card.companyName || card.mobile || '-'}</span>
                                                </div>
                                                <button onClick={() => void onLinkRelatedCardAction(card)}>
                                                    연결
                                                </button>
                                            </article>
                                        ))}
                                    </div>
                                </div>
                            </section>
                        </div>
                    </>
                )}
            </aside>
        </div>
    );
}
