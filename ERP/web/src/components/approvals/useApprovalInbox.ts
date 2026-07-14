'use client';

import React from 'react';
import { fetchApprovalInbox } from './approvalApi';
import type { ApprovalDocumentSummary, ApprovalInboxFilter } from './approvalTypes';

export function useApprovalInbox(filter: ApprovalInboxFilter, pageSize = 20) {
    const [documents, setDocuments] = React.useState<readonly ApprovalDocumentSummary[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState('');
    const [total, setTotal] = React.useState(0);
    const [page, setPage] = React.useState(1);

    const reload = React.useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const result = await fetchApprovalInbox(filter, page, pageSize);
            setDocuments(result.documents);
            setTotal(result.total);
        } catch (caught) {
            setDocuments([]);
            setTotal(0);
            setError(caught instanceof Error ? caught.message : '결재 문서를 불러오지 못했습니다.');
        } finally {
            setLoading(false);
        }
    }, [filter, page, pageSize]);

    React.useEffect(() => { setPage(1); }, [filter]);

    React.useEffect(() => {
        void reload();
    }, [reload]);

    return { documents, error, loading, page, pageCount: Math.max(1, Math.ceil(total / pageSize)), reload, setPage, total };
}
