"use client";

import React from 'react';
import { Lock } from 'lucide-react';
import styles from '../page.module.css';
import type { ProfileFormData } from './profileTypes';

type PasswordSectionProps = {
    readonly formData: ProfileFormData;
    readonly onChangeAction: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

export function PasswordSection({ formData, onChangeAction }: PasswordSectionProps) {
    return (
        <div className={styles.section}>
            <h3><Lock size={20} /> 비밀번호 변경</h3>
            <p className={styles.sectionDesc}>비밀번호를 변경하려면 현재 비밀번호와 새 비밀번호를 입력하세요.</p>

            <div className={styles.grid}>
                <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                    <label>현재 비밀번호</label>
                    <input
                        type="password"
                        name="oldPassword"
                        value={formData.oldPassword}
                        onChange={onChangeAction}
                        placeholder="현재 비밀번호를 입력하세요"
                    />
                </div>

                <div className={styles.inputGroup}>
                    <label>새 비밀번호</label>
                    <input
                        type="password"
                        name="newPassword"
                        value={formData.newPassword}
                        onChange={onChangeAction}
                        placeholder="새 비밀번호 (6자 이상)"
                    />
                </div>

                <div className={styles.inputGroup}>
                    <label>새 비밀번호 확인</label>
                    <input
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={onChangeAction}
                        placeholder="새 비밀번호를 한번 더 입력하세요"
                    />
                </div>
            </div>
        </div>
    );
}
