"use client";

import { ArrowRight, BellRing, CheckCircle2, MessageSquareText, Send, UsersRound } from 'lucide-react';
import React from 'react';
import type { AlimtalkScenarioRow } from '@/lib/alimtalk-operations';
import type { SaveAlimtalkPayload } from './AlimtalkOperationsPanel';
import styles from './page.module.css';
import scenarioStyles from './AlimtalkScenariosSection.module.css';

type Props = {
    readonly scenarios: readonly AlimtalkScenarioRow[];
    readonly onSave: (payload: SaveAlimtalkPayload) => Promise<void>;
};

type ScenarioDraft = {
    readonly enabled: boolean;
    readonly fallbackChannel: string;
};

function initialDraft(scenario: AlimtalkScenarioRow): ScenarioDraft {
    return {
        enabled: scenario.enabled,
        fallbackChannel: scenario.fallback_channel
    };
}

export function AlimtalkScenariosSection({ scenarios, onSave }: Props) {
    const [drafts, setDrafts] = React.useState<Record<string, ScenarioDraft>>({});
    const [savingKey, setSavingKey] = React.useState('');
    const recipients = React.useMemo(() => Array.from(new Set(scenarios.map(scenario => scenario.recipient_label))), [scenarios]);
    const enabledScenarioCount = scenarios.filter(scenario => (drafts[scenario.scenario_key] || initialDraft(scenario)).enabled).length;

    React.useEffect(() => {
        setDrafts(Object.fromEntries(scenarios.map(scenario => [scenario.scenario_key, initialDraft(scenario)])));
    }, [scenarios]);

    function updateDraft(key: string, patch: Partial<ScenarioDraft>) {
        setDrafts(current => ({
            ...current,
            [key]: { ...(current[key] || { enabled: false, fallbackChannel: 'none' }), ...patch }
        }));
    }

    async function saveScenario(scenario: AlimtalkScenarioRow) {
        const draft = drafts[scenario.scenario_key] || initialDraft(scenario);
        setSavingKey(scenario.scenario_key);
        try {
            await onSave({
                entity: 'scenario',
                key: scenario.scenario_key,
                enabled: draft.enabled,
                fallbackChannel: draft.fallbackChannel
            });
        } finally {
            setSavingKey('');
        }
    }

    return (
        <div className={scenarioStyles.boardWrap}>
            <section className={scenarioStyles.overview} aria-label="전체 알림톡 발송 플로우">
                <div className={scenarioStyles.overviewHeader}>
                    <div>
                        <h3>전체 발송 플로우</h3>
                        <p>업무 이벤트 발생 시 템플릿을 매칭하고, 대상자에게 알림톡을 발송합니다.</p>
                    </div>
                    <span>현재 목록 {enabledScenarioCount} / {scenarios.length}개 사용</span>
                </div>
                <div className={scenarioStyles.overviewFlow}>
                    <div className={scenarioStyles.overviewColumn}>
                        <strong>업무 이벤트</strong>
                        {scenarios.map(scenario => (
                            <span key={scenario.scenario_key}>{scenario.trigger_label}</span>
                        ))}
                    </div>
                    <ArrowRight className={scenarioStyles.overviewArrow} size={20} aria-hidden="true" />
                    <div className={scenarioStyles.overviewHub}>
                        <MessageSquareText size={18} aria-hidden="true" />
                        <strong>알림톡 발송 엔진</strong>
                        <span>템플릿 매칭 · 변수 치환 · 상태 기록</span>
                    </div>
                    <ArrowRight className={scenarioStyles.overviewArrow} size={20} aria-hidden="true" />
                    <div className={scenarioStyles.overviewColumn}>
                        <strong>수신 대상</strong>
                        {recipients.map(recipient => (
                            <span key={recipient}>{recipient}</span>
                        ))}
                    </div>
                    <ArrowRight className={scenarioStyles.overviewArrow} size={20} aria-hidden="true" />
                    <div className={scenarioStyles.overviewColumn}>
                        <strong>운영 관리</strong>
                        <span>Fallback SMS</span>
                        <span>발송 로그</span>
                        <span>회사별 발송량</span>
                    </div>
                </div>
            </section>

            <div className={scenarioStyles.board} aria-label="알림톡 발송 시나리오 보드">
            {scenarios.map(scenario => {
                const draft = drafts[scenario.scenario_key] || initialDraft(scenario);
                return (
                    <article className={scenarioStyles.card} key={scenario.scenario_key}>
                        <div className={scenarioStyles.header}>
                            <div>
                                <div className={scenarioStyles.key}>{scenario.scenario_key}</div>
                                <h3>{scenario.name}</h3>
                            </div>
                            <span className={`${styles.badge} ${draft.enabled ? styles.badgeGreen : styles.badgeRed}`}>
                                {draft.enabled ? '사용' : '중지'}
                            </span>
                        </div>

                        <div className={scenarioStyles.flow} aria-label={`${scenario.name} 발송 흐름`}>
                            <div className={scenarioStyles.node}>
                                <BellRing size={16} aria-hidden="true" />
                                <span>트리거</span>
                                <strong>{scenario.trigger_label}</strong>
                            </div>
                            <ArrowRight className={scenarioStyles.arrow} size={18} aria-hidden="true" />
                            <div className={scenarioStyles.node}>
                                <UsersRound size={16} aria-hidden="true" />
                                <span>수신자</span>
                                <strong>{scenario.recipient_label}</strong>
                            </div>
                            <ArrowRight className={scenarioStyles.arrow} size={18} aria-hidden="true" />
                            <div className={scenarioStyles.node}>
                                <Send size={16} aria-hidden="true" />
                                <span>템플릿</span>
                                <strong>{scenario.template_key}</strong>
                            </div>
                            <ArrowRight className={scenarioStyles.arrow} size={18} aria-hidden="true" />
                            <div className={scenarioStyles.node}>
                                <MessageSquareText size={16} aria-hidden="true" />
                                <span>대체 채널</span>
                                <strong>{draft.fallbackChannel === 'sms' ? 'SMS' : '없음'}</strong>
                            </div>
                        </div>

                        <div className={scenarioStyles.controls}>
                            <label className={scenarioStyles.switchControl}>
                                <input type="checkbox" checked={draft.enabled} onChange={event => updateDraft(scenario.scenario_key, { enabled: event.currentTarget.checked })} />
                                <CheckCircle2 size={16} aria-hidden="true" />
                                <span>시나리오 사용</span>
                            </label>
                            <label className={scenarioStyles.selectLabel}>
                                대체 발송
                                <select className={styles.control} value={draft.fallbackChannel} onChange={event => updateDraft(scenario.scenario_key, { fallbackChannel: event.currentTarget.value })}>
                                    <option value="none">없음</option>
                                    <option value="sms">SMS</option>
                                </select>
                            </label>
                            <button type="button" className={styles.primaryButton} disabled={savingKey === scenario.scenario_key} onClick={() => void saveScenario(scenario)}>
                                저장
                            </button>
                        </div>
                    </article>
                );
            })}
            {scenarios.length === 0 && <div className={styles.empty}>시나리오가 없습니다.</div>}
            </div>
        </div>
    );
}
