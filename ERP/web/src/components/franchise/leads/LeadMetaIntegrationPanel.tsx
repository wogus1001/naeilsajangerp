"use client";

import type { ReactNode } from 'react';
import { ChevronDown, Link2, RefreshCw } from 'lucide-react';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import { formatDateTime } from './utils';
import { META_FIELD_LABELS } from './constants';
import { getMetaIssueGuidance, META_CONNECTION_STATUS_LABELS, META_IMPORT_STATUS_LABELS } from './metaIntegrationGuidance';
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
        <section id="meta-integration-panel" className={styles.metaPanel}>
            <div className={styles.metaPanelHeader}>
                <div>
                    <span className={styles.metaEyebrow}>Meta 잠재고객 광고</span>
                    <h2>Meta 연동 설정</h2>
                    <p>Meta 계정을 연결하고 수집할 신청 양식을 켜면 새 신청 정보를 모객 DB에 자동 등록합니다.</p>
                </div>
                <div className={styles.metaPanelActions}>
                    {canManageMeta && (
                        <button className={styles.secondaryButton} onClick={onStartConnectAction} disabled={isMetaLoading}>
                            <Link2 size={15} />
                            Meta 계정 연결
                        </button>
                    )}
                    <button className={styles.secondaryButton} onClick={() => void onRefreshAction()} disabled={isMetaLoading}>
                        <RefreshCw size={15} />
                        {isMetaLoading ? '확인 중' : '연결 상태 확인'}
                    </button>
                    {canManageMeta && (
                        <button className={styles.primaryButton} onClick={() => void onSyncAction()} disabled={isMetaSyncing || enabledFormCount === 0}>
                            <RefreshCw size={15} />
                            {isMetaSyncing ? '가져오는 중' : '신청 내역 가져오기'}
                        </button>
                    )}
                </div>
            </div>

            <div className={styles.metaSummaryGrid}>
                <article>
                    <span>연결된 페이지</span>
                    <strong>{metaState.connections.length.toLocaleString()}</strong>
                    <small>{metaState.configReady ? 'Meta 연동 준비 완료' : 'Meta 연동 준비 필요'}</small>
                </article>
                <article>
                    <span>수집 중인 양식</span>
                    <strong>{enabledFormCount.toLocaleString()}</strong>
                    <small>새 신청 자동 등록</small>
                </article>
                <article>
                    <span>최근 수집</span>
                    <strong>{formatDateTime(lastSyncAt)}</strong>
                    <small>최근 수집 시각</small>
                </article>
                <article className={errorCount > 0 ? styles.metaSummaryError : undefined}>
                    <span>확인 필요</span>
                    <strong>{errorCount.toLocaleString()}</strong>
                    <small>연결 및 최근 수집 상태</small>
                </article>
            </div>

            {metaState.connections.length === 0 ? (
                <div className={styles.metaEmptyBox}>
                    <div>
                        <strong>연결된 Meta 페이지가 없습니다.</strong>
                        <p>회사 Meta 관리자 계정을 연결한 뒤 수집할 신청 양식을 켜주세요.</p>
                    </div>
                </div>
            ) : (
                <div className={styles.metaConnectionGrid}>
                    {metaState.connections.map(connection => (
                        <article key={connection.id} className={styles.metaConnectionCard}>
                            <div>
                                <span className={connection.status === 'connected' ? styles.metaStatusOk : styles.metaStatusWarn}>
                                    {META_CONNECTION_STATUS_LABELS[connection.status] || '확인 필요'}
                                </span>
                                <h3>{connection.metaPageName || connection.metaPageId}</h3>
                                <p>페이지 번호 {connection.metaPageId}</p>
                                {(connection.lastError || connection.subscribeError) && (
                                    <small className={styles.metaErrorText}>
                                        {getMetaIssueGuidance(connection.subscribeError || connection.lastError, 'Meta 계정 연결 상태를 확인하고 다시 연결해주세요.')}
                                    </small>
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
                            <details key={form.id} className={styles.metaFormCard}>
                                <summary className={styles.metaFormSummary}>
                                    <div>
                                        <h3>{form.metaFormName || form.metaFormId}</h3>
                                        <p>{connection?.metaPageName || 'Meta 페이지'} · 양식 번호 {form.metaFormId}</p>
                                    </div>
                                    <div className={styles.metaFormSummaryStatus}>
                                        <span className={form.enabled ? styles.metaStatusOk : styles.metaStatusWarn}>
                                            {form.enabled ? '자동 수집 중' : '자동 수집 꺼짐'}
                                        </span>
                                        <span className={styles.metaFormSummaryAction}>
                                            설정 보기
                                            <ChevronDown size={16} aria-hidden="true" />
                                        </span>
                                    </div>
                                </summary>
                                <div className={styles.metaFormBody}>
                                    {form.lastError && (
                                        <p className={styles.metaErrorText}>
                                            {getMetaIssueGuidance(form.lastError, '신청 양식 설정을 확인한 뒤 다시 가져와주세요.')}
                                        </p>
                                    )}
                                    <div className={styles.metaFormTop}>
                                        <label className={styles.switchLabel}>
                                            <input
                                                type="checkbox"
                                                checked={form.enabled}
                                                disabled={!canManageMeta || savingMetaFormId === form.id}
                                                onChange={(event) => void onUpdateFormAction(form, { enabled: event.target.checked })}
                                            />
                                            <span>
                                                자동 수집
                                                <small>새 신청이 들어오면 모객 DB에 바로 등록합니다.</small>
                                            </span>
                                        </label>
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
                                                신청 내역 가져오기
                                            </button>
                                        </div>
                                    </div>
                                    <div className={styles.metaMappingSection}>
                                        <div className={styles.metaMappingIntro}>
                                            <strong>연동 항목</strong>
                                            <p>아래 단어는 Meta 신청 양식의 질문 이름입니다. 같은 뜻의 이름을 쉼표로 구분해두면 해당 모객 DB 항목으로 자동 저장됩니다.</p>
                                            <small>전체 예산은 예산 질문이 하나일 때, 최소·최대 예산은 범위 질문이 따로 있을 때 사용합니다. 보통은 자동 설정된 값을 수정하지 않아도 됩니다.</small>
                                        </div>
                                        <div className={styles.metaMappingGrid}>
                                            {META_FIELD_LABELS.map(field => (
                                                <label key={field.key}>
                                                    {field.label} 항목으로 저장할 질문 이름
                                                    <input
                                                        value={(form.fieldMapping?.[field.key] || []).join(', ')}
                                                        disabled={!canManageMeta || savingMetaFormId === form.id}
                                                        placeholder={field.hint}
                                                        onChange={(event) => onUpdateFieldMappingAction(form.id, field.key, event.target.value)}
                                                    />
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    <div className={styles.metaFormFooter}>
                                        <span>마지막 가져오기: {formatDateTime(form.lastSyncedAt)}</span>
                                        {canManageMeta && (
                                            <button
                                                className={styles.primaryButton}
                                                onClick={() => void onUpdateFormAction(form, { fieldMapping: form.fieldMapping })}
                                                disabled={savingMetaFormId === form.id}
                                            >
                                                {savingMetaFormId === form.id ? '저장 중' : '연동 항목 저장'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </details>
                        );
                    })}
                </div>
            )}

            {metaState.imports.length > 0 && (
                <details className={styles.metaImportLog}>
                    <summary>
                        최근 수집 내역
                        <span>{metaState.imports.length.toLocaleString()}건</span>
                        <ChevronDown size={16} aria-hidden="true" />
                    </summary>
                    <div className={styles.metaImportLogBody}>
                        {metaState.imports.slice(0, 6).map(item => (
                            <div key={item.id}>
                                <span>{META_IMPORT_STATUS_LABELS[item.status] || '확인 필요'}</span>
                                <strong>신청 번호 {item.metaLeadId}</strong>
                                <small>
                                    {item.errorMessage
                                        ? getMetaIssueGuidance(item.errorMessage, '신청 정보의 수집 상태를 확인해주세요.')
                                        : formatDateTime(item.importedAt || item.receivedAt)}
                                </small>
                            </div>
                        ))}
                    </div>
                </details>
            )}
        </section>
    );
}
