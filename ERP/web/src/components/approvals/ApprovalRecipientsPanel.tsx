'use client';

import type { ApprovalOrganization } from './approvalTypes';
import styles from './ApprovalRecipientsPanel.module.css';

type ApprovalRecipientsPanelProps = {
    readonly organization: ApprovalOrganization | null;
    readonly receiverUnitIds: readonly string[];
    readonly onReceiverChange: (unitIds: readonly string[]) => void;
};

function toggleId(values: readonly string[], id: string, checked: boolean): readonly string[] {
    return checked ? [...new Set([...values, id])] : values.filter(value => value !== id);
}

export function ApprovalRecipientsPanel({
    onReceiverChange,
    organization,
    receiverUnitIds
}: ApprovalRecipientsPanelProps) {
    return (
        <details className={styles.panel}>
            <summary>
                <span>수신 부서</span>
                <small>{receiverUnitIds.length}개 선택</small>
            </summary>
            {!organization && <p className={styles.empty}>조직 정보를 불러오는 중입니다.</p>}
            {organization && (
                <div className={styles.groups}>
                    <fieldset>
                        <legend>최종 승인 후 문서를 전달할 부서를 선택합니다.</legend>
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
