"use client";

import React from 'react';
import { startCompanyTemplateSignEmbedding } from './companyTemplatesClient';
import styles from './electronicContracts.module.css';

type Props = {
    readonly templateId: string;
    readonly versionId: string;
    readonly contractId: string;
    readonly onContractIdChange: (contractId: string) => void;
};

export function CompanyTemplateSignEmbedding({
    templateId,
    versionId,
    contractId,
    onContractIdChange
}: Props) {
    const requestedRef = React.useRef(false);
    const [embeddingUrl, setEmbeddingUrl] = React.useState('');
    const [error, setError] = React.useState('');

    React.useEffect(() => {
        if (requestedRef.current || !versionId) return;
        requestedRef.current = true;
        setError('');

        startCompanyTemplateSignEmbedding({ templateId, versionId, contractId })
            .then(result => {
                onContractIdChange(result.contractId);
                setEmbeddingUrl(result.url);
            })
            .catch(caught => {
                setError(caught instanceof Error ? caught.message : '전자계약 화면을 열지 못했습니다.');
            });
    }, [contractId, onContractIdChange, templateId, versionId]);

    if (!versionId) {
        return <div className={styles.inlineNotice}>사용 가능한 템플릿 버전이 없습니다.</div>;
    }

    if (error) return <div className={styles.error}>{error}</div>;

    if (!embeddingUrl) {
        return (
            <section className={styles.embeddingPanel}>
                <div className={styles.empty}>전자계약 작성 화면을 여는 중입니다.</div>
            </section>
        );
    }

    return (
        <section className={styles.embeddingPanel}>
            <iframe
                className={styles.embeddingFrame}
                src={embeddingUrl}
                title="전자계약 작성"
                allow="clipboard-read; clipboard-write"
            />
        </section>
    );
}
