import React from 'react';
import {
    getMeetingToolDefaultsFromLocation,
    normalizeMeetingToolDraft,
    type MeetingToolCostKey,
    type MeetingToolDraft
} from '@/lib/franchise-location-meeting-tool';
import type { MeetingToolVersion } from '@/lib/franchise-location-meeting-tool-versions';
import type { FranchiseLocation } from './locationMasterTypes';
import { isDemoApiBlockedError } from './locationMeetingToolDialogUtils';
import {
    fetchLocationMeetingToolVersionsRequest,
    saveLocationMeetingToolVersionRequest
} from './locationMeetingToolVersionRequests';

type UseLocationMeetingToolVersionsParams = {
    readonly open: boolean;
    readonly locationId: string;
    readonly location: FranchiseLocation | null;
    readonly draft: MeetingToolDraft;
    readonly setDraft: React.Dispatch<React.SetStateAction<MeetingToolDraft>>;
    readonly setRatioInputValues: React.Dispatch<React.SetStateAction<Record<MeetingToolCostKey, string>>>;
    readonly setMessage: (message: string) => void;
};

export function useLocationMeetingToolVersions({
    open,
    locationId,
    location,
    draft,
    setDraft,
    setRatioInputValues,
    setMessage
}: UseLocationMeetingToolVersionsParams) {
    const [versions, setVersions] = React.useState<readonly MeetingToolVersion[]>([]);
    const [versionTitle, setVersionTitle] = React.useState('');
    const [versionLoading, setVersionLoading] = React.useState(false);
    const [versionSaving, setVersionSaving] = React.useState(false);

    React.useEffect(() => {
        if (!open || !locationId) {
            setVersions([]);
            setVersionTitle('');
            setVersionLoading(false);
            return;
        }
        let alive = true;
        setVersions([]);
        setVersionTitle('');
        setVersionLoading(true);
        fetchLocationMeetingToolVersionsRequest(locationId)
            .then(nextVersions => {
                if (alive) setVersions(nextVersions);
            })
            .catch(error => {
                if (!alive) return;
                if (isDemoApiBlockedError(error)) {
                    setVersions([]);
                    return;
                }
                setMessage(error instanceof Error ? error.message : '리포트 버전 이력을 불러오지 못했습니다.');
            })
            .finally(() => {
                if (alive) setVersionLoading(false);
            });

        return () => {
            alive = false;
        };
    }, [locationId, open, setMessage]);

    const saveVersion = async () => {
        if (!locationId) return;
        setVersionSaving(true);
        setMessage('');
        try {
            const savedVersion = await saveLocationMeetingToolVersionRequest({
                locationId,
                meetingTool: draft,
                title: versionTitle
            });
            setVersions(prev => [savedVersion, ...prev.filter(version => version.id !== savedVersion.id)]);
            setVersionTitle('');
            setMessage('현재 입력값을 리포트 버전으로 저장했습니다.');
        } catch (error) {
            if (isDemoApiBlockedError(error)) {
                setMessage('데모에서는 리포트 버전 저장이 비활성화되어 있습니다.');
                return;
            }
            setMessage(error instanceof Error ? error.message : '리포트 버전 저장에 실패했습니다.');
        } finally {
            setVersionSaving(false);
        }
    };

    const loadVersion = (version: MeetingToolVersion) => {
        if (!location) return;
        setRatioInputValues({});
        setDraft(normalizeMeetingToolDraft(version.meetingTool, getMeetingToolDefaultsFromLocation(location)));
        setMessage('리포트 버전 이력을 불러왔습니다. 후보지 현재안에 반영하려면 저장을 눌러주세요.');
    };

    return {
        versions,
        versionTitle,
        versionLoading,
        versionSaving,
        setVersionTitle,
        saveVersion,
        loadVersion
    };
}
