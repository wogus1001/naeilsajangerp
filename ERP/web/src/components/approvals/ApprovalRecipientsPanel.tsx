'use client';

import type { ApprovalOrganization } from './approvalTypes';
import styles from './ApprovalRecipientsPanel.module.css';

type ApprovalRecipientsPanelProps = {
    readonly organization: ApprovalOrganization | null;
    readonly readerProfileIds: readonly string[];
    readonly receiverUnitIds: readonly string[];
    readonly onReaderChange: (profileIds: readonly string[]) => void;
    readonly onReceiverChange: (unitIds: readonly string[]) => void;
};

function toggleId(values: readonly string[], id: string, checked: boolean): readonly string[] {
    return checked ? [...new Set([...values, id])] : values.filter(value => value !== id);
}

export function ApprovalRecipientsPanel({
    onReaderChange,
    onReceiverChange,
    organization,
    readerProfileIds,
    receiverUnitIds
}: ApprovalRecipientsPanelProps) {
    return (
        <details className={styles.panel}>
            <summary>
                <span>참조·수신 설정</span>
                <small>{readerProfileIds.length + receiverUnitIds.length}개 선택</small>
            </summary>
            {!organization && <p className={styles.empty}>조직 정보를 불러오는 중입니다.</p>}
            {organization && (
                <div className={styles.groups}>
                    <fieldset>
                        <legend>참조자</legend>
                        <div className={styles.options}>
                            {organization.people.map(person => (
                                <label key={person.id}>
                                    <input
                                        checked={readerProfileIds.includes(person.id)}
                                        onChange={event => onReaderChange(toggleId(readerProfileIds, person.id, event.target.checked))}
                                        type="checkbox"
                                    />
                                    <span>{person.name}<small>{person.email}</small></span>
                                </label>
                            ))}
                        </div>
                    </fieldset>
                    <fieldset>
                        <legend>수신 부서</legend>
                        <div className={styles.options}>
                            {organization.units.filter(unit => unit.active).map(unit => (
                                <label key={unit.id}>
                                    <input
                                        checked={receiverUnitIds.includes(unit.id)}
                                        onChange={event => onReceiverChange(toggleId(receiverUnitIds, unit.id, event.target.checked))}
                                        type="checkbox"
                                    />
                                    <span>{unit.name}</span>
                                </label>
                            ))}
                        </div>
                    </fieldset>
                </div>
            )}
        </details>
    );
}
