"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import styles from '../owner.module.css';

type LoginPayload = {
    readonly error?: string;
    readonly message?: string;
};

async function readLoginPayload(response: Response): Promise<LoginPayload> {
    try {
        return await response.json() as LoginPayload;
    } catch {
        return {};
    }
}

export default function OwnerLoginPage() {
    const router = useRouter();
    const [companyName, setCompanyName] = React.useState('');
    const [loginId, setLoginId] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [error, setError] = React.useState('');
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const submit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError('');
        if (!companyName.trim()) {
            setError('회사명을 입력해주세요.');
            return;
        }
        if (!loginId.trim() || !password.trim()) {
            setError('아이디와 비밀번호를 입력해주세요.');
            return;
        }
        setIsSubmitting(true);
        try {
            const response = await fetch('/api/owner/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ companyName, loginId, password })
            });
            const payload = await readLoginPayload(response);
            if (!response.ok) throw new Error(payload.message || payload.error || '로그인에 실패했습니다.');
            router.replace('/owner/dashboard');
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : '로그인에 실패했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className={styles.ownerShell}>
            <div className={styles.loginWrap}>
                <form className={styles.loginPanel} onSubmit={submit}>
                    <div className={styles.brandMark}>FC</div>
                    <h1 className={styles.title}>점주 포털</h1>
                    <p className={styles.description}>본사에서 안내한 회사명과 점주 아이디로 내 매장 공지, 체크리스트, 문의를 확인합니다.</p>
                    <div className={styles.fieldStack}>
                        <label className={styles.field}>
                            회사명
                            <input
                                className={styles.input}
                                value={companyName}
                                onChange={event => setCompanyName(event.currentTarget.value)}
                                autoComplete="organization"
                            />
                        </label>
                        <label className={styles.field}>
                            아이디
                            <input className={styles.input} value={loginId} onChange={event => setLoginId(event.currentTarget.value)} autoComplete="username" />
                        </label>
                        <label className={styles.field}>
                            비밀번호
                            <input className={styles.input} type="password" value={password} onChange={event => setPassword(event.currentTarget.value)} autoComplete="current-password" />
                        </label>
                        {error ? <div className={styles.error}>{error}</div> : null}
                        <button className={styles.button} type="submit" disabled={isSubmitting}>
                            {isSubmitting ? '로그인 중' : '로그인'}
                        </button>
                    </div>
                </form>
            </div>
        </main>
    );
}
