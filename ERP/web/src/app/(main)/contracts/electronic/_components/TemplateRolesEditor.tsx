"use client";

import React from 'react';
import type { CompanyTemplateRole } from '@/lib/electronic-contracts/company-template';
import styles from './electronicContracts.module.css';

type Props = {
    readonly roles: readonly CompanyTemplateRole[];
    readonly onAddRole: () => void;
    readonly onUpdateRole: (roleKey: string, patch: Partial<CompanyTemplateRole>) => void;
};

export function TemplateRolesEditor({ roles, onAddRole, onUpdateRole }: Props) {
    return (
        <div className={styles.builderList}>
            <div className={styles.builderListHeader}>
                <strong>서명자 역할</strong>
                <button className={styles.secondaryButton} type="button" onClick={onAddRole}>역할 추가</button>
            </div>
            {roles.map(role => (
                <div className={styles.compactEditor} key={role.roleKey}>
                    <input value={role.roleKey} onChange={event => onUpdateRole(role.roleKey, { roleKey: event.target.value })} />
                    <input value={role.label} onChange={event => onUpdateRole(role.roleKey, { label: event.target.value })} />
                    <input type="number" value={role.signingOrder} onChange={event => onUpdateRole(role.roleKey, { signingOrder: Number(event.target.value) || 1 })} />
                </div>
            ))}
        </div>
    );
}
