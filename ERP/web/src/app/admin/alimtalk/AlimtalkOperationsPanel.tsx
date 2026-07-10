"use client";

import React from 'react';
import { MessageSquareText } from 'lucide-react';
import type {
    AlimtalkCompanyUsageSummary,
    AlimtalkOperationsOverview,
    AlimtalkScenarioRow,
    AlimtalkSendLogRow,
    AlimtalkTemplateRow
} from '@/lib/alimtalk-operations';
import { getApiAuthHeaders } from '@/utils/apiAuthHeaders';
import { AlimtalkCompanyUsageSection } from './AlimtalkCompanyUsageSection';
import { AlimtalkLogsSection } from './AlimtalkLogsSection';
import { AlimtalkScenariosSection } from './AlimtalkScenariosSection';
import { AlimtalkTemplatesSection } from './AlimtalkTemplatesSection';
import styles from './page.module.css';

type TabKey = 'companies' | 'templates' | 'scenarios' | 'logs';

type AlimtalkOperationsResponse = {
    readonly data?: {
        readonly schemaReady?: boolean;
        readonly templates?: readonly AlimtalkTemplateRow[];
        readonly scenarios?: readonly AlimtalkScenarioRow[];
        readonly sendLogs?: readonly AlimtalkSendLogRow[];
        readonly overview?: AlimtalkOperationsOverview | null;
        readonly companyUsage?: readonly AlimtalkCompanyUsageSummary[];
    };
    readonly message?: string;
    readonly error?: string;
};

export type SaveAlimtalkPayload = {
    readonly entity: 'template' | 'scenario' | 'company';
    readonly key: string;
    readonly templateId?: string;
    readonly channelId?: string;
    readonly status?: string;
    readonly enabled?: boolean;
    readonly fallbackChannel?: string;
    readonly monthlyLimit?: number | null;
    readonly warningThreshold?: number | null;
};

async function fetchOperations(): Promise<Required<NonNullable<AlimtalkOperationsResponse['data']>>> {
    const response = await fetch('/api/admin/alimtalk-operations', {
        cache: 'no-store',
        headers: await getApiAuthHeaders()
    });
    const payload: AlimtalkOperationsResponse = await response.json();
    if (!response.ok) throw new Error(payload.message || payload.error || '알림톡 운영 정보를 불러오지 못했습니다.');
    return {
        schemaReady: payload.data?.schemaReady ?? false,
        templates: payload.data?.templates ?? [],
        scenarios: payload.data?.scenarios ?? [],
        sendLogs: payload.data?.sendLogs ?? [],
        overview: payload.data?.overview ?? null,
        companyUsage: payload.data?.companyUsage ?? []
    };
}

async function saveOperations(payload: SaveAlimtalkPayload): Promise<void> {
    const response = await fetch('/api/admin/alimtalk-operations', {
        method: 'PATCH',
        headers: await getApiAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload)
    });
    const result: AlimtalkOperationsResponse = await response.json();
    if (!response.ok) throw new Error(result.message || result.error || '알림톡 운영 설정을 저장하지 못했습니다.');
}

function SummaryCard({ label, value }: { readonly label: string; readonly value: string }) {
    return (
        <div className={styles.summaryCard}>
            <div className={styles.summaryLabel}>{label}</div>
            <div className={styles.summaryValue}>{value}</div>
        </div>
    );
}

function formatNumber(value: number): string {
    return value.toLocaleString('ko-KR');
}

export function AlimtalkOperationsPanel() {
    const [activeTab, setActiveTab] = React.useState<TabKey>('companies');
    const [data, setData] = React.useState<Awaited<ReturnType<typeof fetchOperations>> | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState('');

    const loadData = React.useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            setData(await fetchOperations());
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : '알림톡 운영 정보를 불러오지 못했습니다.');
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        void loadData();
    }, [loadData]);

    const saveAndReload = React.useCallback(async (payload: SaveAlimtalkPayload) => {
        await saveOperations(payload);
        await loadData();
    }, [loadData]);

    const overview = data?.overview;
    const tabs: readonly { readonly key: TabKey; readonly label: string }[] = [
        { key: 'companies', label: '회사별 발송량' },
        { key: 'templates', label: '템플릿 관리' },
        { key: 'scenarios', label: '시나리오 관리' },
        { key: 'logs', label: '발송 로그' }
    ];

    return (
        <section className={styles.panel}>
            <div className={styles.panelHeader}>
                <div className={styles.titleGroup}>
                    <span className={styles.titleIcon}><MessageSquareText size={18} /></span>
                    <div>
                        <h2 className={styles.panelTitle}>알림톡 운영 현황</h2>
                        <p className={styles.panelDescription}>검수 중인 템플릿과 회사별 월간 발송량을 같은 기준으로 봅니다.</p>
                    </div>
                </div>
                <button type="button" className={styles.secondaryButton} onClick={() => void loadData()} disabled={loading}>새로고침</button>
            </div>
            <div className={styles.tabs}>
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        type="button"
                        className={`${styles.tabButton} ${activeTab === tab.key ? styles.tabButtonActive : ''}`}
                        onClick={() => setActiveTab(tab.key)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
            <div className={styles.content}>
                {error && <div className={`${styles.message} ${styles.error}`}>{error}</div>}
                {!error && data?.schemaReady === false && (
                    <div className={`${styles.message} ${styles.error}`}>알림톡 운영 SQL 적용 후 사용할 수 있습니다.</div>
                )}
                {!error && data?.schemaReady !== false && (
                    <>
                        <div className={styles.summaryGrid}>
                            <SummaryCard label="월 발송" value={formatNumber(overview?.monthlySendCount ?? 0)} />
                            <SummaryCard label="월 실패" value={formatNumber(overview?.monthlyFailedCount ?? 0)} />
                            <SummaryCard label="승인 템플릿" value={formatNumber(overview?.approvedTemplateCount ?? 0)} />
                            <SummaryCard label="활성 시나리오" value={`${formatNumber(overview?.enabledScenarioCount ?? 0)} / ${formatNumber(overview?.scenarioCount ?? 0)}`} />
                            <SummaryCard label="활성 회사" value={formatNumber(overview?.enabledCompanyCount ?? 0)} />
                        </div>
                        {activeTab === 'companies' && <AlimtalkCompanyUsageSection usage={data?.companyUsage ?? []} onSave={saveAndReload} />}
                        {activeTab === 'templates' && <AlimtalkTemplatesSection templates={data?.templates ?? []} onSave={saveAndReload} />}
                        {activeTab === 'scenarios' && <AlimtalkScenariosSection scenarios={data?.scenarios ?? []} templates={data?.templates ?? []} onSave={saveAndReload} />}
                        {activeTab === 'logs' && <AlimtalkLogsSection logs={data?.sendLogs ?? []} />}
                    </>
                )}
                {loading && <div className={styles.empty}>알림톡 운영 정보를 불러오는 중입니다.</div>}
            </div>
        </section>
    );
}
