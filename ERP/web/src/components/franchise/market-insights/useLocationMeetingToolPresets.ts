import React from 'react';
import { useAppDialog } from '@/components/common/AppDialogProvider';
import {
    applyMeetingToolPreset,
    type MeetingToolCostKey,
    type MeetingToolDraft,
    type MeetingToolPreset
} from '@/lib/franchise-location-meeting-tool';
import { isDemoApiBlockedError } from './locationMeetingToolDialogUtils';
import {
    deleteLocationMeetingToolPresetRequest,
    fetchLocationMeetingToolPresetsRequest,
    saveLocationMeetingToolPresetRequest
} from './locationMasterRequests';

type UseLocationMeetingToolPresetsParams = {
    readonly open: boolean;
    readonly companyId: string;
    readonly locationId: string;
    readonly draft: MeetingToolDraft;
    readonly setDraft: React.Dispatch<React.SetStateAction<MeetingToolDraft>>;
    readonly setRatioInputValues: React.Dispatch<React.SetStateAction<Record<MeetingToolCostKey, string>>>;
    readonly setMessage: (message: string) => void;
};

export function useLocationMeetingToolPresets({
    open,
    companyId,
    locationId,
    draft,
    setDraft,
    setRatioInputValues,
    setMessage
}: UseLocationMeetingToolPresetsParams) {
    const { showConfirm } = useAppDialog();
    const [presets, setPresets] = React.useState<readonly MeetingToolPreset[]>([]);
    const [selectedPresetId, setSelectedPresetId] = React.useState('');
    const [presetName, setPresetName] = React.useState('');
    const [presetLoading, setPresetLoading] = React.useState(false);
    const [presetSaving, setPresetSaving] = React.useState(false);

    React.useEffect(() => {
        if (!open || !locationId) {
            setPresets([]);
            setSelectedPresetId('');
            setPresetName('');
            setPresetLoading(false);
            return;
        }
        let alive = true;
        setPresets([]);
        setSelectedPresetId('');
        setPresetName('');
        setPresetLoading(true);
        fetchLocationMeetingToolPresetsRequest({ companyId })
            .then(nextPresets => {
                if (alive) setPresets(nextPresets);
            })
            .catch(error => {
                if (!alive) return;
                if (isDemoApiBlockedError(error)) {
                    setPresets([]);
                    return;
                }
                setMessage(error instanceof Error ? error.message : '분석표 프리셋을 불러오지 못했습니다.');
            })
            .finally(() => {
                if (alive) setPresetLoading(false);
            });

        return () => {
            alive = false;
        };
    }, [companyId, locationId, open, setMessage]);

    const selectedPreset = presets.find(preset => preset.id === selectedPresetId) || null;

    const selectPreset = (presetId: string) => {
        const preset = presets.find(item => item.id === presetId) || null;
        setSelectedPresetId(presetId);
        if (preset) setPresetName(preset.name);
    };

    const applySelectedPreset = () => {
        if (!selectedPreset) return;
        setRatioInputValues({});
        setDraft(prev => applyMeetingToolPreset(prev, selectedPreset));
        setPresetName(selectedPreset.name);
        setMessage('분석표 프리셋을 적용했습니다. 후보지 리포트에 반영하려면 저장을 눌러주세요.');
    };

    const savePreset = async () => {
        const name = presetName.trim();
        if (!name) {
            setMessage('프리셋명을 입력해주세요.');
            return;
        }
        setPresetSaving(true);
        setMessage('');
        try {
            const savedPreset = await saveLocationMeetingToolPresetRequest({ companyId, name, meetingTool: draft });
            setPresets(prev => {
                const withoutSame = prev.filter(preset => preset.id !== savedPreset.id && preset.name !== savedPreset.name);
                return [savedPreset, ...withoutSame];
            });
            setSelectedPresetId(savedPreset.id);
            setPresetName(savedPreset.name);
            setMessage('분석표 프리셋으로 저장했습니다.');
        } catch (error) {
            if (isDemoApiBlockedError(error)) {
                setMessage('데모에서는 프리셋 저장이 비활성화되어 있습니다.');
                return;
            }
            setMessage(error instanceof Error ? error.message : '분석표 프리셋 저장에 실패했습니다.');
        } finally {
            setPresetSaving(false);
        }
    };

    const deletePreset = async () => {
        if (!selectedPresetId) return;
        const confirmed = await showConfirm({
            message: '선택한 분석표 프리셋을 삭제할까요?',
            title: '분석표 프리셋 삭제',
            confirmText: '삭제',
            isDanger: true
        });
        if (!confirmed) return;
        setPresetSaving(true);
        setMessage('');
        try {
            await deleteLocationMeetingToolPresetRequest({ presetId: selectedPresetId });
            setPresets(prev => prev.filter(preset => preset.id !== selectedPresetId));
            setSelectedPresetId('');
            setPresetName('');
            setMessage('분석표 프리셋을 삭제했습니다.');
        } catch (error) {
            if (isDemoApiBlockedError(error)) {
                setMessage('데모에서는 프리셋 삭제가 비활성화되어 있습니다.');
                return;
            }
            setMessage(error instanceof Error ? error.message : '분석표 프리셋 삭제에 실패했습니다.');
        } finally {
            setPresetSaving(false);
        }
    };

    return {
        presets,
        selectedPresetId,
        presetName,
        presetLoading,
        presetSaving,
        selectedPreset,
        selectPreset,
        setPresetName,
        applySelectedPreset,
        savePreset,
        deletePreset
    };
}
