'use client';

import React from 'react';
import { fetchApprovalInbox } from './approvalApi';
import type { ApprovalDocumentSummary, ApprovalInboxCriteria, ApprovalInboxFilter } from './approvalTypes';

export function useApprovalInbox(filter: ApprovalInboxFilter, criteria: ApprovalInboxCriteria, pageSize = 20) {
    const { from, query, status, to } = criteria;
    const [documents, setDocuments] = React.useState<readonly ApprovalDocumentSummary[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState('');
    const [total, setTotal] = React.useState(0);
    const [page, setPage] = React.useState(1);
    const requestSequence = React.useRef(0);

    const reload = React.useCallback(async () => {
        const requestId = requestSequence.current + 1;
        requestSequence.current = requestId;
        setLoading(true);
        setError('');
        try {
            const result = await fetchApprovalInbox(filter, page, pageSize, { from, query, status, to });
            if (requestId !== requestSequence.current) return;
            setDocuments(result.documents);
            setTotal(result.total);
        } catch (caught) {
            if (requestId !== requestSequence.current) return;
            setDocuments([]);
            setTotal(0);
            setError(caught instanceof Error ? caught.message : '결재 문서를 불러오지 못했습니다.');
        } finally {
            if (requestId === requestSequence.current) setLoading(false);
        }
    }, [filter, from, page, pageSize, query, status, to]);

    React.useEffect(() => { setPage(1); }, [filter, from, query, status, to]);

    React.useEffect(() => {
        void reload();
    }, [reload]);

    React.useEffect(() => () => {
        requestSequence.current += 1;
    }, []);

    return { documents, error, loading, page, pageCount: Math.max(1, Math.ceil(total / pageSize)), reload, setPage, total };
}
