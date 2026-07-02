"use client";

import React from 'react';
import type { AlimtalkTemplateRow } from '@/lib/alimtalk-operations';
import type { SaveAlimtalkPayload } from './AlimtalkOperationsPanel';
import styles from './page.module.css';

type Props = {
    readonly templates: readonly AlimtalkTemplateRow[];
    readonly onSave: (payload: SaveAlimtalkPayload) => Promise<void>;
};

type TemplateDraft = {
    readonly templateId: string;
    readonly channelId: string;
    readonly status: string;
    readonly enabled: boolean;
};

function initialDraft(template: AlimtalkTemplateRow): TemplateDraft {
    return {
        templateId: template.template_id,
        channelId: template.channel_id,
        status: template.status,
        enabled: template.enabled
    };
}

function statusLabel(status: string): string {
    switch (status) {
        case 'approved':
            return '승인완료';
        case 'rejected':
            return '반려';
        case 'paused':
            return '중지';
        case 'draft':
            return '초안';
        default:
            return '신청중';
    }
}

export function AlimtalkTemplatesSection({ templates, onSave }: Props) {
    const [drafts, setDrafts] = React.useState<Record<string, TemplateDraft>>({});
    const [savingKey, setSavingKey] = React.useState('');

    React.useEffect(() => {
        setDrafts(Object.fromEntries(templates.map(template => [template.template_key, initialDraft(template)])));
    }, [templates]);

    function updateDraft(key: string, patch: Partial<TemplateDraft>) {
        setDrafts(current => ({
            ...current,
            [key]: { ...(current[key] || { templateId: '', channelId: '', status: 'submitted', enabled: false }), ...patch }
        }));
    }

    async function saveTemplate(template: AlimtalkTemplateRow) {
        const draft = drafts[template.template_key] || initialDraft(template);
        setSavingKey(template.template_key);
        try {
            await onSave({
                entity: 'template',
                key: template.template_key,
                templateId: draft.templateId,
                channelId: draft.channelId,
                status: draft.status,
                enabled: draft.enabled
            });
        } finally {
            setSavingKey('');
        }
    }

    return (
        <div className={styles.tableWrap}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>템플릿</th>
                        <th>상태</th>
                        <th>Template ID</th>
                        <th>Channel ID</th>
                        <th>사용</th>
                        <th>변수</th>
                        <th>관리</th>
                    </tr>
                </thead>
                <tbody>
                    {templates.map(template => {
                        const draft = drafts[template.template_key] || initialDraft(template);
                        return (
                            <tr key={template.template_key}>
                                <td>
                                    <div className={styles.strongText}>{template.name}</div>
                                    <div className={styles.mutedText}>{template.template_key}</div>
                                </td>
                                <td>
                                    <select className={styles.control} value={draft.status} onChange={event => updateDraft(template.template_key, { status: event.currentTarget.value })}>
                                        <option value="submitted">신청중</option>
                                        <option value="approved">승인완료</option>
                                        <option value="rejected">반려</option>
                                        <option value="paused">중지</option>
                                        <option value="draft">초안</option>
                                    </select>
                                    <div className={styles.mutedText}>{statusLabel(draft.status)}</div>
                                </td>
                                <td><input className={styles.field} value={draft.templateId} onChange={event => updateDraft(template.template_key, { templateId: event.currentTarget.value })} placeholder="SOLAPI templateId" /></td>
                                <td><input className={styles.field} value={draft.channelId} onChange={event => updateDraft(template.template_key, { channelId: event.currentTarget.value })} placeholder="Kakao channelId" /></td>
                                <td>
                                    <label className={styles.actions}>
                                        <input type="checkbox" checked={draft.enabled} onChange={event => updateDraft(template.template_key, { enabled: event.currentTarget.checked })} />
                                        <span>사용</span>
                                    </label>
                                </td>
                                <td>{(template.variables || []).join(', ') || '-'}</td>
                                <td>
                                    <button type="button" className={styles.primaryButton} disabled={savingKey === template.template_key} onClick={() => void saveTemplate(template)}>
                                        저장
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                    {templates.length === 0 && <tr><td className={styles.empty} colSpan={7}>템플릿이 없습니다.</td></tr>}
                </tbody>
            </table>
        </div>
    );
}
