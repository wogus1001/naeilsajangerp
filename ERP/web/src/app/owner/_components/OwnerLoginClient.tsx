"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import styles from '../owner.module.css';

type LoginPayload = {
    readonly error?: string;
    readonly message?: string;
};

type OwnerLoginClientProps = {
    readonly initialCompanyId?: string;
};

async function readLoginPayload(response: Response): Promise<LoginPayload> {
    try {
        return await response.json() as LoginPayload;
    } catch {
        return {};
    }
}

export function OwnerLoginClient({ initialCompanyId = '' }: OwnerLoginClientProps) {
    const router = useRouter();
    const [companyId, setCompanyId] = React.useState(initialCompanyId.trim());
    const [companyName, setCompanyName] = React.useState('');
    const [loginId, setLoginId] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [error, setError] = React.useState('');
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    React.useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const linkedCompanyId = params.get('companyId')?.trim() || '';
        const linkedCompanyName = (params.get('company') || params.get('companyName') || '').trim();
        if (linkedCompanyId) setCompanyId(linkedCompanyId);
        if (linkedCompanyName) setCompanyName(linkedCompanyName);
    }, []);

    const submit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError('');
        const normalizedCompanyId = companyId.trim();
        const normalizedCompanyName = companyName.trim();
        if (!normalizedCompanyId && !normalizedCompanyName) {
            setError('본사에서 받은 점주 포털 전용 링크로 접속해주세요.');
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
                body: JSON.stringify({
                    companyId: normalizedCompanyId || undefined,
                    companyName: normalizedCompanyName || undefined,
                    loginId: loginId.trim(),
                    password
                })
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
                    <p className={styles.description}>
                        본사에서 안내한 전용 링크로 접속했습니다. 점주 아이디와 비밀번호로 로그인해주세요.
                    </p>
                    <div className={styles.fieldStack}>
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
