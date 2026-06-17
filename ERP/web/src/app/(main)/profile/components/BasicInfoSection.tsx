"use client";

import React from 'react';
import { AlertCircle, CheckCircle, Shield, User } from 'lucide-react';
import { CompanyLogoManager } from '@/components/company/CompanyLogoManager';
import styles from '../page.module.css';
import type { IdCheckMessage, ProfileFormData, ProfileUser } from './profileTypes';

type BasicInfoSectionProps = {
    readonly user: ProfileUser;
    readonly formData: ProfileFormData;
    readonly idCheckMessage: IdCheckMessage;
    readonly onChangeAction: (event: React.ChangeEvent<HTMLInputElement>) => void;
    readonly onCheckIdAction: () => void;
    readonly onUserChangedAction: (user: ProfileUser) => void;
};

export function BasicInfoSection({
    user,
    formData,
    idCheckMessage,
    onChangeAction,
    onCheckIdAction,
    onUserChangedAction
}: BasicInfoSectionProps) {
    return (
        <div className={styles.section}>
            <h3><User size={20} /> 기본 정보</h3>
            <div className={styles.grid}>
                <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                    <label>아이디</label>
                    <div className={styles.inputWrapper}>
                        <input
                            name="id"
                            value={formData.id}
                            onChange={onChangeAction}
                            placeholder="아이디"
                        />
                        <button
                            type="button"
                            className={styles.checkBtn}
                            onClick={onCheckIdAction}
                            disabled={formData.id === user.id}
                        >
                            중복 확인
                        </button>
                    </div>
                    {idCheckMessage && (
                        <span className={`${styles.helperText} ${idCheckMessage.type === 'success' ? styles.successText : styles.errorText}`}>
                            {idCheckMessage.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                            {idCheckMessage.text}
                        </span>
                    )}
                    {!idCheckMessage && formData.id !== user.id && (
                        <span className={`${styles.helperText} ${styles.errorText}`}>
                            <AlertCircle size={14} /> 아이디 변경 시 다시 로그인해야 합니다.
                        </span>
                    )}
                </div>

                <div className={styles.inputGroup}>
                    <label>이름</label>
                    <input
                        name="name"
                        value={formData.name}
                        onChange={onChangeAction}
                        placeholder="이름"
                    />
                </div>

                <div className={styles.inputGroup}>
                    <label>회사 로고</label>
                    <CompanyLogoManager
                        companyId={user.companyId || ''}
                        companyName={formData.companyName || user.companyName || '회사'}
                        logoUrl={user.companyLogoUrl || null}
                        onChanged={(logoUrl) => {
                            const updatedUser = { ...user, companyLogoUrl: logoUrl || '' };
                            localStorage.setItem('user', JSON.stringify(updatedUser));
                            onUserChangedAction(updatedUser);
                        }}
                    />
                </div>

                <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                    <label>직급</label>
                    <div>
                        <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 16px',
                            borderRadius: '30px',
                            backgroundColor: user.role === 'manager' ? '#e7f5ff' : '#f8f9fa',
                            color: user.role === 'manager' ? '#1971c2' : '#495057',
                            fontSize: '14px',
                            fontWeight: '700',
                            border: user.role === 'manager' ? '1px solid #d0ebff' : '1px solid #e9ecef',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.03)'
                        }}>
                            <Shield size={14} fill={user.role === 'manager' ? '#1971c2' : 'none'} />
                            {user.role === 'manager' ? '팀장 (Manager)' : '직원 (Staff)'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
