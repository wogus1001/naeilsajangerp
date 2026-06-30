import { Save, Trash2 } from 'lucide-react';
import type { MeetingToolPreset } from '@/lib/franchise-location-meeting-tool';
import styles from './LocationMeetingTool.module.css';

type LocationMeetingToolPresetPanelProps = {
    readonly presets: readonly MeetingToolPreset[];
    readonly selectedPresetId: string;
    readonly presetName: string;
    readonly presetLoading: boolean;
    readonly presetSaving: boolean;
    readonly selectedPreset: MeetingToolPreset | null;
    readonly onSelectPreset: (presetId: string) => void;
    readonly onPresetNameChange: (name: string) => void;
    readonly onApplyPreset: () => void;
    readonly onSavePreset: () => void;
    readonly onDeletePreset: () => void;
};

export function LocationMeetingToolPresetPanel({
    presets,
    selectedPresetId,
    presetName,
    presetLoading,
    presetSaving,
    selectedPreset,
    onSelectPreset,
    onPresetNameChange,
    onApplyPreset,
    onSavePreset,
    onDeletePreset
}: LocationMeetingToolPresetPanelProps) {
    return (
        <div className={styles.meetingToolPresetBar}>
            <div className={styles.meetingToolPresetIntro}>
                <div className={styles.meetingToolPresetTitleLine}>
                    <strong>분석표 프리셋</strong>
                    <span className={styles.meetingToolPresetBadge}>회사 공용</span>
                </div>
                <span>목표매출 1~3차 시나리오와 비용 항목을 저장해 다른 후보지에 재사용합니다.</span>
            </div>
            <label>
                불러오기
                <select
                    value={selectedPresetId}
                    onChange={(event) => onSelectPreset(event.target.value)}
                    disabled={presetLoading || presets.length === 0}
                >
                    <option value="">{presetLoading ? '불러오는 중' : '프리셋 선택'}</option>
                    {presets.map(preset => (
                        <option key={preset.id} value={preset.id}>{preset.name}</option>
                    ))}
                </select>
            </label>
            <label>
                프리셋명
                <input
                    value={presetName}
                    onChange={(event) => onPresetNameChange(event.target.value)}
                    placeholder="예: 기본 수익비율"
                />
            </label>
            <div className={styles.meetingToolPresetActions}>
                <button type="button" className={styles.secondaryButton} onClick={onApplyPreset} disabled={!selectedPreset || presetSaving}>
                    적용
                </button>
                <button type="button" className={styles.secondaryButton} onClick={onSavePreset} disabled={presetSaving}>
                    <Save size={14} /> {presetSaving ? '저장 중' : '프리셋 저장'}
                </button>
                <button type="button" className={styles.dangerOutlineButton} onClick={onDeletePreset} disabled={!selectedPresetId || presetSaving}>
                    <Trash2 size={14} /> 삭제
                </button>
            </div>
        </div>
    );
}
