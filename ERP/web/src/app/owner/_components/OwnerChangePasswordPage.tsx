"use client";

import React from 'react';
import styles from '../owner.module.css';
import { OwnerPortalFrame, readOwnerApiData } from './ownerPortalShared';

export function OwnerChangePasswordPage() {
    return (
        <OwnerPortalFrame activeKey="password">
            {() => <OwnerChangePasswordContent />}
        </OwnerPortalFrame>
    );
}

function OwnerChangePasswordContent() {
    const [currentPassword, setCurrentPassword] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [confirmPassword, setConfirmPassword] = React.useState('');
    const [message, setMessage] = React.useState('');
    const [error, setError] = React.useState('');
    const [isSaving, setIsSaving] = React.useState(false);

    const changePassword = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setMessage('');
        setError('');
        if (password !== confirmPassword) {
            setError('새 비밀번호와 확인 값이 다릅니다.');
            return;
        }
        setIsSaving(true);
        try {
            await readOwnerApiData(await fetch('/api/owner/auth/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword, password })
            }));
            setCurrentPassword('');
            setPassword('');
            setConfirmPassword('');
            setMessage('비밀번호가 변경됐습니다.');
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : '비밀번호 변경에 실패했습니다.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <section className={styles.panel}>
            <div className={styles.panelHeader}>
                <div>
                    <h1>비밀번호 변경</h1>
                    <p>본사에서 발급한 임시 비밀번호를 안전한 비밀번호로 변경합니다.</p>
                </div>
            </div>
            <form className={styles.panelBody} onSubmit={changePassword}>
                {message ? <div className={styles.success}>{message}</div> : null}
                {error ? <div className={styles.error}>{error}</div> : null}
                <label className={styles.field}>
                    현재 비밀번호
                    <input
                        className={styles.input}
                        type="password"
                        value={currentPassword}
                        onChange={event => setCurrentPassword(event.currentTarget.value)}
                        autoComplete="current-password"
                    />
                </label>
                <label className={styles.field}>
                    새 비밀번호
                    <input
                        className={styles.input}
                        type="password"
                        value={password}
                        onChange={event => setPassword(event.currentTarget.value)}
                        autoComplete="new-password"
                    />
                </label>
                <label className={styles.field}>
                    새 비밀번호 확인
                    <input
                        className={styles.input}
                        type="password"
                        value={confirmPassword}
                        onChange={event => setConfirmPassword(event.currentTarget.value)}
                        autoComplete="new-password"
                    />
                </label>
                <button className={styles.button} type="submit" disabled={isSaving}>
                    비밀번호 변경
                </button>
            </form>
        </section>
    );
}
