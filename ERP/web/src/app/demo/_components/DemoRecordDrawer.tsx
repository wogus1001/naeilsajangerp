'use client';

import { ClipboardList, ExternalLink, FileText, Link2, MessageSquare, Pencil, Trash2, X } from 'lucide-react';
import styles from './DemoDashboardGuide.module.css';

export type DemoRecordField = {
    readonly label: string;
    readonly value: string;
};

type DemoRecordDrawerProps = {
    readonly badge: string;
    readonly title: string;
    readonly description: string;
    readonly fields: readonly DemoRecordField[];
    readonly showLeadWorkflowSections?: boolean;
    readonly primaryActionLabel?: string;
    readonly primaryActionTargetId?: string;
    readonly onPrimaryAction?: () => void;
    readonly onCloseAction: () => void;
};

export function DemoRecordDrawer({
    badge,
    title,
    description,
    fields,
    showLeadWorkflowSections = false,
    primaryActionLabel,
    primaryActionTargetId,
    onPrimaryAction,
    onCloseAction
}: DemoRecordDrawerProps) {
    const currentStatus = getFieldValue(fields, '상태') || '상담중';

    return (
        <div className={styles.demoDrawerBackdrop} onClick={onCloseAction}>
            <aside
                className={styles.demoDrawer}
                aria-label={`${title} 샘플 상세`}
                onClick={event => event.stopPropagation()}
            >
                <header className={styles.demoDrawerHeader}>
                    <div>
                        <span>{badge}</span>
                        <h2>{title}</h2>
                        <p>{description}</p>
                    </div>
                    <button type="button" className={styles.demoDrawerClose} onClick={onCloseAction} aria-label="샘플 상세 닫기">
                        <X size={18} aria-hidden="true" />
                    </button>
                </header>
                <div className={styles.demoDrawerBody}>
                    <div className={styles.demoDrawerQuickActions}>
                        {primaryActionLabel ? (
                            <button
                                type="button"
                                className={styles.demoDrawerQuickPrimary}
                                data-demo-id={primaryActionTargetId}
                                onClick={onPrimaryAction || onCloseAction}
                            >
                                {primaryActionLabel}
                                <ExternalLink size={15} aria-hidden="true" />
                            </button>
                        ) : null}
                        {showLeadWorkflowSections ? (
                            <>
                                <select value={currentStatus} aria-label="상태" onChange={() => undefined}>
                                    {DEMO_LEAD_STATUS_OPTIONS.map(status => (
                                        <option key={status} value={status}>{status}</option>
                                    ))}
                                </select>
                                <button type="button">
                                    <Pencil size={15} aria-hidden="true" />
                                    기본정보 수정
                                </button>
                            </>
                        ) : (
                            <button type="button" onClick={onCloseAction}>
                                닫기
                            </button>
                        )}
                    </div>
                    <section className={styles.demoDrawerSection}>
                        <div className={styles.demoDrawerSectionHeader}>
                            <h3>기본정보</h3>
                        </div>
                        <div className={styles.demoDrawerFields}>
                            {fields.map(field => (
                                <div key={field.label} className={styles.demoDrawerField}>
                                    <span>{field.label}</span>
                                    <strong>{field.value || '-'}</strong>
                                </div>
                            ))}
                        </div>
                    </section>
                    {showLeadWorkflowSections ? (
                        <>
                            <section className={styles.demoDrawerSection}>
                                <div className={styles.demoDrawerSectionTitleRow}>
                                    <h3><MessageSquare size={16} aria-hidden="true" /> 상담 이력</h3>
                                    <span>2건</span>
                                </div>
                                <div className={styles.demoDrawerActivityComposer}>
                                    <select value="전화" aria-label="상담 유형" onChange={() => undefined}>
                                        <option>전화</option>
                                        <option>메모</option>
                                        <option>방문</option>
                                    </select>
                                    <textarea placeholder="상담 내용, 고객 반응, 다음 액션을 기록하세요." onChange={() => undefined} />
                                    <button type="button">이력 추가</button>
                                </div>
                                <div className={styles.demoDrawerTimeline}>
                                    <article>
                                        <div>
                                            <span>고객전환</span>
                                            <time>2026. 06. 24. 오후 03:00</time>
                                        </div>
                                        <p>기존 연결 고객을 전환 완료로 표시</p>
                                        <small>관리자</small>
                                        <div className={styles.demoDrawerTimelineActions}>
                                            <button type="button"><Pencil size={14} aria-hidden="true" /> 수정</button>
                                            <button type="button"><Trash2 size={14} aria-hidden="true" /> 삭제</button>
                                        </div>
                                    </article>
                                    <article>
                                        <div>
                                            <span>상태변경</span>
                                            <time>2026. 06. 24. 오후 02:20</time>
                                        </div>
                                        <p>문의접수에서 상담중으로 변경</p>
                                        <small>관리자</small>
                                    </article>
                                </div>
                            </section>
                            <div className={styles.demoDrawerTwoColumn}>
                                <section className={styles.demoDrawerSection}>
                                    <h3><ClipboardList size={16} aria-hidden="true" /> 업무 관리</h3>
                                    <div className={styles.demoDrawerWorkflowGrid}>
                                        <label>
                                            <span>다음 액션</span>
                                            <select value="상담 후 검토" onChange={() => undefined}>
                                                <option>상담 후 검토</option>
                                                <option>후보지 연결</option>
                                            </select>
                                        </label>
                                        <label>
                                            <span>상담 결과</span>
                                            <select value="관심 있음" onChange={() => undefined}>
                                                <option>관심 있음</option>
                                                <option>추가 확인</option>
                                            </select>
                                        </label>
                                        <label>
                                            <span>다음 연락</span>
                                            <input type="datetime-local" value="2026-06-25T15:00" onChange={() => undefined} />
                                        </label>
                                        <label>
                                            <span>메모</span>
                                            <input value="권리금 조건 확인 필요" onChange={() => undefined} />
                                        </label>
                                    </div>
                                    <button type="button" className={styles.demoDrawerSaveButton}>후속 관리 저장</button>
                                </section>
                                <section className={styles.demoDrawerSection}>
                                    <div className={styles.demoDrawerSectionTitleRow}>
                                        <h3><FileText size={16} aria-hidden="true" /> 정보공개서</h3>
                                        <span>발송 전</span>
                                    </div>
                                    <div>
                                        <p className={styles.demoDrawerMutedText}>정보공개서 발송 이력이 있어야 계약 단계로 변경할 수 있습니다.</p>
                                        <div className={styles.demoDrawerDisclosureBox}>
                                            <strong>미카도 정보공개서</strong>
                                            <span>발송 전 · 수령 확인 전</span>
                                        </div>
                                        <button type="button" className={styles.demoDrawerOutlineButton}>정보공개서 발송</button>
                                    </div>
                                </section>
                            </div>
                            <section className={styles.demoDrawerSection}>
                                <div className={styles.demoDrawerSectionTitleRow}>
                                    <h3><Link2 size={16} aria-hidden="true" /> 연결된 후보지</h3>
                                    <span>1건</span>
                                </div>
                                <div className={styles.demoDrawerLocationBox}>
                                    <strong>강남역 후보지 현장 확인</strong>
                                    <span>서울 강남구 · 검토 예정</span>
                                </div>
                            </section>
                        </>
                    ) : null}
                </div>
            </aside>
        </div>
    );
}

const DEMO_LEAD_STATUS_OPTIONS = ['문의접수', '상담중', '가맹검토', '입지검토', '계약예정', '계약완료', '보류/이탈'] as const;

function getFieldValue(fields: readonly DemoRecordField[], label: string) {
    return fields.find(field => field.label === label)?.value ?? '';
}
