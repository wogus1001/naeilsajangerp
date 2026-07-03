"use client";

import { ArrowRight, BellRing, FileText, MessageSquareText, Send, UsersRound } from 'lucide-react';
import React from 'react';
import type { AlimtalkScenarioRow, AlimtalkTemplateRow } from '@/lib/alimtalk-operations';
import type { SaveAlimtalkPayload } from './AlimtalkOperationsPanel';
import styles from './page.module.css';
import scenarioStyles from './AlimtalkScenariosSection.module.css';

type Props = {
    readonly scenarios: readonly AlimtalkScenarioRow[];
    readonly templates: readonly AlimtalkTemplateRow[];
    readonly onSave: (payload: SaveAlimtalkPayload) => Promise<void>;
};

type ScenarioDraft = {
    readonly fallbackChannel: string;
};

function initialDraft(scenario: AlimtalkScenarioRow): ScenarioDraft {
    return {
        fallbackChannel: scenario.fallback_channel
    };
}

export function AlimtalkScenariosSection({ scenarios, templates, onSave }: Props) {
    const [drafts, setDrafts] = React.useState<Record<string, ScenarioDraft>>({});
    const [savingKey, setSavingKey] = React.useState('');
    const [openTemplateKey, setOpenTemplateKey] = React.useState('');
    const templatesByKey = React.useMemo(() => new Map(templates.map(template => [template.template_key, template])), [templates]);

    React.useEffect(() => {
        setDrafts(Object.fromEntries(scenarios.map(scenario => [scenario.scenario_key, initialDraft(scenario)])));
    }, [scenarios]);

    function updateDraft(key: string, patch: Partial<ScenarioDraft>) {
        setDrafts(current => ({
            ...current,
            [key]: { ...(current[key] || { fallbackChannel: 'none' }), ...patch }
        }));
    }

    async function saveScenario(scenario: AlimtalkScenarioRow) {
        const draft = drafts[scenario.scenario_key] || initialDraft(scenario);
        setSavingKey(scenario.scenario_key);
        try {
            await onSave({
                entity: 'scenario',
                key: scenario.scenario_key,
                enabled: scenario.enabled,
                fallbackChannel: draft.fallbackChannel
            });
        } finally {
            setSavingKey('');
        }
    }

    return (
        <div className={scenarioStyles.boardWrap}>
            <div className={scenarioStyles.board} aria-label="알림톡 발송 시나리오 보드">
            {scenarios.map(scenario => {
                const draft = drafts[scenario.scenario_key] || initialDraft(scenario);
                const template = templatesByKey.get(scenario.template_key);
                const isTemplateOpen = openTemplateKey === scenario.scenario_key;
                return (
                    <article className={scenarioStyles.card} key={scenario.scenario_key}>
                        <div className={scenarioStyles.header}>
                            <div>
                                <div className={scenarioStyles.key}>{scenario.scenario_key}</div>
                                <h3>{scenario.name}</h3>
                            </div>
                            <span className={`${styles.badge} ${scenario.enabled ? styles.badgeGreen : styles.badgeRed}`}>
                                {scenario.enabled ? '사용' : '중지'}
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
                            <button
                                type="button"
                                className={`${scenarioStyles.node} ${scenarioStyles.nodeButton}`}
                                aria-expanded={isTemplateOpen}
                                onClick={() => setOpenTemplateKey(current => current === scenario.scenario_key ? '' : scenario.scenario_key)}
                            >
                                <Send size={16} aria-hidden="true" />
                                <span>템플릿</span>
                                <strong>{scenario.template_key}</strong>
                            </button>
                            <ArrowRight className={scenarioStyles.arrow} size={18} aria-hidden="true" />
                            <div className={scenarioStyles.node}>
                                <MessageSquareText size={16} aria-hidden="true" />
                                <span>대체 채널</span>
                                <strong>{draft.fallbackChannel === 'sms' ? 'SMS' : '없음'}</strong>
                            </div>
                        </div>

                        {isTemplateOpen && (
                            <div className={scenarioStyles.templateDetail}>
                                <div className={scenarioStyles.templateDetailHeader}>
                                    <FileText size={16} aria-hidden="true" />
                                    <div>
                                        <strong>{template?.name || scenario.template_key}</strong>
                                        <span>{template?.template_id || 'Template ID 미등록'}</span>
                                    </div>
                                </div>
                                <div className={scenarioStyles.messagePreview} aria-label={`${template?.name || scenario.template_key} 템플릿 미리보기`}>
                                    <div className={scenarioStyles.messagePreviewCanvas}>
                                        <div className={scenarioStyles.messageChannel}>
                                            <span />
                                            <strong>채널명</strong>
                                        </div>
                                        <div className={scenarioStyles.messageBubble}>
                                            <div className={scenarioStyles.messageBubbleHeader}>알림톡 도착</div>
                                            <pre>{template?.content || '등록된 템플릿 본문이 없습니다.'}</pre>
                                        </div>
                                    </div>
                                </div>
                                <div className={scenarioStyles.templateVariables}>
                                    {(template?.variables || []).map(variable => (
                                        <span key={variable}>#{variable}</span>
                                    ))}
                                    {(template?.variables || []).length === 0 && <span>변수 없음</span>}
                                </div>
                            </div>
                        )}

                        <div className={scenarioStyles.controls}>
                            <label className={scenarioStyles.selectLabel}>
                                대체 발송
                                <select className={styles.control} value={draft.fallbackChannel} onChange={event => updateDraft(scenario.scenario_key, { fallbackChannel: event.currentTarget.value })}>
                                    <option value="none">없음</option>
                                    <option value="sms">SMS</option>
                                </select>
                            </label>
                            <button type="button" className={styles.primaryButton} disabled={savingKey === scenario.scenario_key} onClick={() => void saveScenario(scenario)}>
                                대체 발송 저장
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
