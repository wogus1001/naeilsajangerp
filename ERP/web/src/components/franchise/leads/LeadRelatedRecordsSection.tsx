"use client";

import {
    BriefcaseBusiness,
    Link2,
    UserCheck,
    UserRound
} from 'lucide-react';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import { ENABLE_LEAD_CUSTOMER_DB_LINKING } from './constants';
import { formatFullDateTime } from './utils';
import type {
    FranchiseLead,
    RelatedBusinessCard,
    RelatedCustomer
} from './types';

type AsyncVoid = void | Promise<void>;

type LeadRelatedRecordsSectionProps = {
    readonly lead: FranchiseLead;
    readonly convertingLeadId: string;
    readonly relatedCustomers: readonly RelatedCustomer[];
    readonly relatedCards: readonly RelatedBusinessCard[];
    readonly isRelatedLoading: boolean;
    readonly onConvertLeadAction: (lead: FranchiseLead) => AsyncVoid;
    readonly onLinkRelatedCustomerAction: (customer: RelatedCustomer) => AsyncVoid;
    readonly onLinkRelatedCardAction: (card: RelatedBusinessCard) => AsyncVoid;
};

export function LeadRelatedRecordsSection({
    lead,
    convertingLeadId,
    relatedCustomers,
    relatedCards,
    isRelatedLoading,
    onConvertLeadAction,
    onLinkRelatedCustomerAction,
    onLinkRelatedCardAction
}: LeadRelatedRecordsSectionProps) {
    if (!ENABLE_LEAD_CUSTOMER_DB_LINKING) return null;

    return (
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
    );
}
