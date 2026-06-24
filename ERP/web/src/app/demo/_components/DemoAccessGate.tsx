'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';
import { LockKeyhole } from 'lucide-react';
import { useRouter } from 'next/navigation';
import styles from '../demo.module.css';

type DemoAccessGateProps = {
    readonly configured: boolean;
    readonly returnTo: string;
};

export function DemoAccessGate({ configured, returnTo }: DemoAccessGateProps) {
    const router = useRouter();
    const [id, setId] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState(configured ? '' : '데모 접근 설정이 필요합니다.');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!configured) return;

        setIsSubmitting(true);
        setMessage('');

        try {
            const response = await fetch('/api/demo/access', {
                body: JSON.stringify({ id, password }),
                headers: { 'Content-Type': 'application/json' },
                method: 'POST'
            });

            if (!response.ok) {
                setMessage(response.status === 503
                    ? '데모 접근 설정이 필요합니다.'
                    : '아이디 또는 비밀번호가 일치하지 않습니다.');
                return;
            }

            router.replace(returnTo);
            router.refresh();
        } catch (error) {
            if (!(error instanceof Error)) throw error;
            setMessage('데모 로그인 중 오류가 발생했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className={styles.demoAccessPage}>
            <section className={styles.demoAccessCard} aria-labelledby="demo-access-title">
                <div className={styles.demoAccessIcon} aria-hidden="true">
                    <LockKeyhole size={22} />
                </div>
                <span className={styles.kicker}>제품 데모</span>
                <h1 id="demo-access-title">데모 접근</h1>
                <p>전달받은 아이디와 비밀번호를 입력하면 샘플 데이터 화면을 확인할 수 있습니다.</p>
                <form className={styles.demoAccessForm} onSubmit={handleSubmit}>
                    <label>
                        <span>아이디</span>
                        <input
                            autoComplete="username"
                            disabled={!configured || isSubmitting}
                            onChange={(event) => setId(event.target.value)}
                            placeholder="아이디를 입력하세요"
                            type="text"
                            value={id}
                        />
                    </label>
                    <label>
                        <span>비밀번호</span>
                        <input
                            autoComplete="current-password"
                            disabled={!configured || isSubmitting}
                            onChange={(event) => setPassword(event.target.value)}
                            placeholder="비밀번호를 입력하세요"
                            type="password"
                            value={password}
                        />
                    </label>
                    {message && <p className={styles.demoAccessError}>{message}</p>}
                    <button type="submit" disabled={!configured || isSubmitting}>
                        {isSubmitting ? '확인 중...' : '데모 입장'}
                    </button>
                </form>
            </section>
        </main>
    );
}
