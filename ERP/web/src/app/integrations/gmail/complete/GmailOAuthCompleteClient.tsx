"use client";

import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import type { GmailOAuthResultMessage } from '@/lib/gmail-oauth-flow';
import styles from './page.module.css';

type Props = {
    readonly result: GmailOAuthResultMessage;
};

export function GmailOAuthCompleteClient({ result }: Props) {
    const connected = result.gmail === 'connected';

    React.useEffect(() => {
        if (!window.opener || window.opener.closed) return;
        window.opener.postMessage(result, window.location.origin);
        window.close();
    }, [result]);

    return (
        <main className={styles.page}>
            <section className={styles.panel} aria-live="polite">
                {connected ? <CheckCircle2 className={styles.successIcon} /> : <XCircle className={styles.errorIcon} />}
                <h1>{connected ? 'Gmail 연결 완료' : 'Gmail 연결 실패'}</h1>
                <p>
                    {connected
                        ? `${result.email || '선택한 계정'} 연결이 완료되었습니다.`
                        : '연결을 완료하지 못했습니다. 원래 화면에서 다시 시도해주세요.'}
                </p>
                <button type="button" onClick={() => window.close()}>창 닫기</button>
            </section>
        </main>
    );
}
