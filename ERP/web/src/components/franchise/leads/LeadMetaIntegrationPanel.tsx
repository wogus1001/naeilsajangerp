"use client";

import type { ReactNode } from 'react';
import { Link2, RefreshCw } from 'lucide-react';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import { formatDateTime } from './utils';
import { META_FIELD_LABELS } from './constants';
import type { MetaConnection, MetaFieldMapping, MetaIntegrationState, MetaLeadForm } from './types';

type MetaFormUpdate = Partial<Pick<MetaLeadForm, 'enabled' | 'defaultManagerId' | 'fieldMapping'>>;

type LeadMetaIntegrationPanelProps = {
    readonly metaState: MetaIntegrationState;
    readonly enabledFormCount: number;
    readonly lastSyncAt?: string | null;
    readonly errorCount: number;
    readonly canManageMeta: boolean;
    readonly isMetaLoading: boolean;
    readonly isMetaSyncing: boolean;
    readonly savingMetaFormId: string;
    readonly renderManagerOptionsAction: (selectedManagerId?: string) => ReactNode;
    readonly onRefreshAction: () => void | Promise<void>;
    readonly onStartConnectAction: () => void;
    readonly onSyncAction: (formId?: string) => void | Promise<void>;
    readonly onDisconnectConnectionAction: (connection: MetaConnection) => void | Promise<void>;
    readonly onUpdateFormAction: (form: MetaLeadForm, updates: MetaFormUpdate) => void | Promise<void>;
    readonly onUpdateFieldMappingAction: (formId: string, key: keyof MetaFieldMapping, value: string) => void;
};

export function LeadMetaIntegrationPanel({
    metaState,
    enabledFormCount,
    lastSyncAt,
    errorCount,
    canManageMeta,
    isMetaLoading,
    isMetaSyncing,
    savingMetaFormId,
    renderManagerOptionsAction,
    onRefreshAction,
    onStartConnectAction,
    onSyncAction,
    onDisconnectConnectionAction,
    onUpdateFormAction,
    onUpdateFieldMappingAction
}: LeadMetaIntegrationPanelProps) {
    return (
        <section className={styles.metaPanel}>
            <div className={styles.metaPanelHeader}>
                <div>
                    <span className={styles.metaEyebrow}>Meta Lead Ads</span>
                    <h2>Meta 연동 설정</h2>
                    <p>각 회사의 Meta Page/Form에서 들어온 즉시양식 리드를 모객DB로 자동 등록합니다.</p>
                </div>
                <div className={styles.metaPanelActions}>
                    <button className={styles.secondaryButton} onClick={() => void onRefreshAction()} disabled={isMetaLoading}>
                        <RefreshCw size={15} />
                        {isMetaLoading ? '확인 중' : '상태 새로고침'}
                    </button>
                    {canManageMeta && (
                        <button className={styles.primaryButton} onClick={() => void onSyncAction()} disabled={isMetaSyncing || enabledFormCount === 0}>
                            <RefreshCw size={15} />
                            {isMetaSyncing ? '동기화 중' : '활성 Form 동기화'}
                        </button>
                    )}
                </div>
            </div>

            <div className={styles.metaSummaryGrid}>
                <article>
                    <span>연결 Page</span>
                    <strong>{metaState.connections.length.toLocaleString()}</strong>
                    <small>{metaState.configReady ? 'Meta 환경변수 확인됨' : '환경변수 설정 필요'}</small>
                </article>
                <article>
                    <span>활성 Form</span>
                    <strong>{enabledFormCount.toLocaleString()}</strong>
                    <small>Webhook/백필 수집 대상</small>
                </article>
                <article>
                    <span>마지막 동기화</span>
                    <strong>{formatDateTime(lastSyncAt)}</strong>
                    <small>Webhook 또는 백필 기준</small>
                </article>
                <article className={errorCount > 0 ? styles.metaSummaryError : undefined}>
                    <span>오류/주의</span>
                    <strong>{errorCount.toLocaleString()}</strong>
                    <small>연결, Form, 최근 import 기준</small>
                </article>
            </div>

            {metaState.connections.length === 0 ? (
                <div className={styles.metaEmptyBox}>
                    <strong>연결된 Meta Page가 없습니다.</strong>
                    <p>회사 Meta 관리자 계정으로 로그인하면 접근 가능한 Page와 Lead Form을 가져옵니다.</p>
                    {canManageMeta && (
                        <button className={styles.primaryButton} onClick={onStartConnectAction}>
                            <Link2 size={15} />
                            Meta 계정 연결
                        </button>
                    )}
                </div>
            ) : (
                <div className={styles.metaConnectionGrid}>
                    {metaState.connections.map(connection => (
                        <article key={connection.id} className={styles.metaConnectionCard}>
                            <div>
                                <span className={connection.status === 'connected' ? styles.metaStatusOk : styles.metaStatusWarn}>
                                    {connection.status === 'connected' ? '연결됨' : connection.status}
                                </span>
                                <h3>{connection.metaPageName || connection.metaPageId}</h3>
                                <p>Page ID {connection.metaPageId}</p>
                                {(connection.lastError || connection.subscribeError) && (
                                    <small className={styles.metaErrorText}>{connection.lastError || connection.subscribeError}</small>
                                )}
                            </div>
                            {canManageMeta && (
                                <button className={styles.textDangerButton} onClick={() => void onDisconnectConnectionAction(connection)}>
                                    연결 해제
                                </button>
                            )}
                        </article>
                    ))}
                </div>
            )}

            {metaState.forms.length > 0 && (
                <div className={styles.metaFormsList}>
                    {metaState.forms.map(form => {
                        const connection = metaState.connections.find(item => item.id === form.connectionId);
                        return (
                            <article key={form.id} className={styles.metaFormCard}>
                                <div className={styles.metaFormTop}>
                                    <div>
                                        <h3>{form.metaFormName || form.metaFormId}</h3>
                                        <p>{connection?.metaPageName || 'Meta Page'} · Form ID {form.metaFormId}</p>
                                        {form.lastError && <small className={styles.metaErrorText}>{form.lastError}</small>}
                                    </div>
                                    <label className={styles.switchLabel}>
                                        <input
                                            type="checkbox"
                                            checked={form.enabled}
                                            disabled={!canManageMeta || savingMetaFormId === form.id}
                                            onChange={(event) => void onUpdateFormAction(form, { enabled: event.target.checked })}
                                        />
                                        수집 활성화
                                    </label>
                                </div>
                                <div className={styles.metaFormControls}>
                                    <label>
                                        기본 담당자
                                        <select
                                            value={form.defaultManagerId || ''}
                                            disabled={!canManageMeta || savingMetaFormId === form.id}
                                            onChange={(event) => void onUpdateFormAction(form, { defaultManagerId: event.target.value })}
                                        >
                                            <option value="">담당자 선택</option>
                                            {renderManagerOptionsAction(form.defaultManagerId || undefined)}
                                        </select>
                                    </label>
                                    <button
                                        className={styles.secondaryButton}
                                        onClick={() => void onSyncAction(form.id)}
                                        disabled={!form.enabled || !canManageMeta || isMetaSyncing}
                                    >
                                        <RefreshCw size={14} />
                                        이 Form 동기화
                                    </button>
                                </div>
                                <div className={styles.metaMappingGrid}>
                                    {META_FIELD_LABELS.map(field => (
                                        <label key={field.key}>
                                            {field.label}
                                            <input
                                                value={(form.fieldMapping?.[field.key] || []).join(', ')}
                                                disabled={!canManageMeta || savingMetaFormId === form.id}
                                                placeholder={field.hint}
                                                onChange={(event) => onUpdateFieldMappingAction(form.id, field.key, event.target.value)}
                                            />
                                        </label>
                                    ))}
                                </div>
                                <div className={styles.metaFormFooter}>
                                    <span>마지막 동기화: {formatDateTime(form.lastSyncedAt)}</span>
                                    {canManageMeta && (
                                        <button
                                            className={styles.primaryButton}
                                            onClick={() => void onUpdateFormAction(form, { fieldMapping: form.fieldMapping })}
                                            disabled={savingMetaFormId === form.id}
                                        >
                                            {savingMetaFormId === form.id ? '저장 중' : '매핑 저장'}
                                        </button>
                                    )}
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            {metaState.imports.length > 0 && (
                <div className={styles.metaImportLog}>
                    <h3>최근 수집 로그</h3>
                    {metaState.imports.slice(0, 6).map(item => (
                        <div key={item.id}>
                            <span>{item.status}</span>
                            <strong>{item.metaLeadId}</strong>
                            <small>{item.errorMessage || formatDateTime(item.importedAt || item.receivedAt)}</small>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
