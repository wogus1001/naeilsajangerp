"use client";

import type { CompanyTemplateRole } from '@/lib/electronic-contracts/company-template';
import {
    normalizeSignerContact,
    signerContactPolicyMessage,
    signerOrderLabel,
    type SignerDeliveryMethod,
    type SignerParticipantIssueMap,
    type SignerParticipantInput
} from './signerParticipantModel';
import styles from './electronicContracts.module.css';

type Props = {
    readonly roles: readonly CompanyTemplateRole[];
    readonly participants: Readonly<Record<string, SignerParticipantInput>>;
    readonly issues?: SignerParticipantIssueMap;
    readonly onChange: (
        roleKey: string,
        patch: Partial<Pick<SignerParticipantInput, 'name' | 'contact' | 'deliveryMethod'>>
    ) => void;
};

const DELIVERY_OPTIONS: readonly { readonly value: SignerDeliveryMethod; readonly label: string }[] = [
    { value: 'email', label: '이메일 전송' },
    { value: 'kakao', label: '카카오톡 전송' }
];

function contactPlaceholder(method: SignerDeliveryMethod): string {
    return method === 'kakao' ? "'-' 없이 숫자만 입력" : '이메일 주소';
}

export function CompanyTemplateSignerParticipants({ roles, participants, issues = {}, onChange }: Props) {
    return (
        <div className={styles.signerStack}>
            {roles.map(role => {
                const participant = participants[role.roleKey] || {
                    roleKey: role.roleKey,
                    name: '',
                    contact: '',
                    deliveryMethod: 'email'
                };
                const roleIssues = issues[role.roleKey] || {};
                const orderLabel = signerOrderLabel(role.signingOrder);
                return (
                    <article className={styles.signerCard} key={role.roleKey}>
                        <div className={styles.signerCardHeader}>
                            <span className={styles.signerOrderBadge}>{role.signingOrder}</span>
                            <div>
                                <strong>{orderLabel} 서명 참여자</strong>
                                <span>{role.label}</span>
                            </div>
                        </div>
                        <label className={styles.signerInput}>
                            <span>이름 또는 회사명{role.required ? ' *' : ''}</span>
                            <input
                                value={participant.name}
                                onChange={event => onChange(role.roleKey, { name: event.target.value })}
                                placeholder="이름 또는 회사명"
                                aria-invalid={Boolean(roleIssues.name)}
                                aria-required={role.required}
                            />
                            {roleIssues.name && <em className={styles.signerInputError}>{roleIssues.name}</em>}
                        </label>
                        <label className={styles.signerInput}>
                            <span>{participant.deliveryMethod === 'kakao' ? '휴대폰 번호' : '이메일 주소'}{role.required ? ' *' : ''}</span>
                            <input
                                value={participant.contact}
                                onChange={event => onChange(role.roleKey, {
                                    contact: normalizeSignerContact(participant.deliveryMethod, event.target.value)
                                })}
                                placeholder={contactPlaceholder(participant.deliveryMethod)}
                                inputMode={participant.deliveryMethod === 'kakao' ? 'numeric' : 'email'}
                                type={participant.deliveryMethod === 'kakao' ? 'tel' : 'text'}
                                maxLength={participant.deliveryMethod === 'kakao' ? 11 : undefined}
                                aria-invalid={Boolean(roleIssues.contact)}
                                aria-required={role.required}
                            />
                            <em className={roleIssues.contact ? styles.signerInputError : styles.signerInputPolicy}>
                                {roleIssues.contact || signerContactPolicyMessage(participant.deliveryMethod)}
                            </em>
                        </label>
                        <div className={styles.signerDeliveryTabs} role="tablist" aria-label={`${role.label} 전송 방식`}>
                            {DELIVERY_OPTIONS.map(option => (
                                <button
                                    className={participant.deliveryMethod === option.value ? styles.signerDeliveryTabActive : styles.signerDeliveryTab}
                                    key={option.value}
                                    type="button"
                                    role="tab"
                                    aria-selected={participant.deliveryMethod === option.value}
                                    onClick={() => onChange(role.roleKey, {
                                        deliveryMethod: option.value,
                                        contact: normalizeSignerContact(option.value, participant.contact)
                                    })}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </article>
                );
            })}
        </div>
    );
}
