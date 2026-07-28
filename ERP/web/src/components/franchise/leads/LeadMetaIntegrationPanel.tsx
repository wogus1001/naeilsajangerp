"use client";

import type { ReactNode } from 'react';
import { ChevronDown, Link2, RefreshCw } from 'lucide-react';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import { getMetaFormReadiness } from '@/lib/meta-lead-field-mapping';
import type { MetaFieldKey } from '@/lib/meta-lead-field-mapping';
import { formatDateTime } from './utils';
import { getMetaIssueGuidance, META_CONNECTION_STATUS_LABELS, META_IMPORT_STATUS_LABELS } from './metaIntegrationGuidance';
import { MetaFormFieldMapping } from './MetaFormFieldMapping';
import type { MetaConnection, MetaFormOperation, MetaIntegrationState, MetaLeadForm } from './types';

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
    readonly savingMetaFormOperation: MetaFormOperation | null;
    readonly dirtyMetaFormIds: ReadonlySet<string>;
    readonly renderManagerOptionsAction: (selectedManagerId?: string) => ReactNode;
    readonly onRefreshAction: () => void | Promise<void>;
    readonly onStartConnectAction: () => void;
    readonly onSyncAction: (formId?: string) => void | Promise<void>;
    readonly onDisconnectConnectionAction: (connection: MetaConnection) => void | Promise<void>;
    readonly onRefreshFormQuestionsAction: (form: MetaLeadForm) => void | Promise<void>;
    readonly onReplaceQuestionMappingAction: (formId: string, mapping: MetaLeadForm['fieldMapping']) => void;
    readonly onUpdateFormAction: (form: MetaLeadForm, updates: MetaFormUpdate) => void | Promise<void>;
    readonly onUpdateQuestionMappingAction: (formId: string, sourceKey: string, target: MetaFieldKey | null) => void;
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
    savingMetaFormOperation,
    dirtyMetaFormIds,
    renderManagerOptionsAction,
    onRefreshAction,
    onStartConnectAction,
    onSyncAction,
    onDisconnectConnectionAction,
    onRefreshFormQuestionsAction,
    onReplaceQuestionMappingAction,
    onUpdateFormAction,
    onUpdateQuestionMappingAction
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
                        const readiness = getMetaFormReadiness({
                            questions: form.questions,
                            mapping: form.fieldMapping,
                            defaultManagerId: form.defaultManagerId
                        });
                        const isSaving = savingMetaFormId === form.id;
                        const isMappingDirty = dirtyMetaFormIds.has(form.id);
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
                                                disabled={
                                                    !canManageMeta ||
                                                    isSaving ||
                                                    (!form.enabled && (isMappingDirty || !readiness.ready))
                                                }
                                                onChange={(event) => void onUpdateFormAction(form, {
                                                    enabled: event.target.checked
                                                })}
                                            />
                                            <span>
                                                자동 수집
                                                <small>
                                                    {isMappingDirty && !form.enabled
                                                        ? '신청 항목 연결을 저장한 뒤 자동 수집을 켜주세요.'
                                                        : readiness.ready || form.enabled
                                                            ? '새 신청이 들어오면 모객 DB에 바로 등록합니다.'
                                                            : '이름, 연락처, 기본 담당자를 연결한 뒤 켤 수 있습니다.'}
                                                </small>
                                            </span>
                                        </label>
                                        <div className={styles.metaFormControls}>
                                            <label>
                                                기본 담당자
                                                <select
                                                    value={form.defaultManagerId || ''}
                                                    disabled={!canManageMeta || isSaving}
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
                                    <MetaFormFieldMapping
                                        form={form}
                                        canManageMeta={canManageMeta}
                                        isSaving={isSaving}
                                        savingOperation={isSaving ? savingMetaFormOperation : null}
                                        isDirty={isMappingDirty}
                                        onRefreshQuestionsAction={onRefreshFormQuestionsAction}
                                        onReplaceMappingAction={onReplaceQuestionMappingAction}
                                        onUpdateQuestionAction={onUpdateQuestionMappingAction}
                                        onSaveMappingAction={(targetForm, mapping) => (
                                            onUpdateFormAction(targetForm, { fieldMapping: mapping })
                                        )}
                                    />
                                    <div className={styles.metaFormFooter}>
                                        <span>마지막 가져오기: {formatDateTime(form.lastSyncedAt)}</span>
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
