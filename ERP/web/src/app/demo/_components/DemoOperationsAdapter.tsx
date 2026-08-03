'use client';

import React from 'react';
import { useAppDialog } from '@/components/common/AppDialogProvider';
import { isOperationalLocation, toLocationFormState } from '@/components/franchise/operations/format';
import {
    FranchiseOperationsWorkspace,
    type FranchiseOperationsWorkspaceActions,
    type FranchiseOperationsWorkspaceModel
} from '@/components/franchise/operations/FranchiseOperationsWorkspace';
import {
    EMPTY_LOCATION_FORM,
    type FranchiseLocation,
    type LocationFormState
} from '@/components/franchise/operations/types';
import type { DemoActionHandler, DemoRole, DemoScreenId } from '../demoTypes';
import { selectDemoOperationLocations } from './DemoFranchiseSampleData';
import {
    DEMO_ADDRESS_LOOKUP_SOURCE,
    DEMO_BRAND_SEARCH_SOURCE
} from './DemoLocationRuntime';
import {
    applyDemoOperationAddress,
    applyDemoOperationBrand,
    deleteDemoOperation,
    getDemoOperationCounts,
    saveDemoOperationForm,
    updateDemoOperationStatus
} from './DemoOperationsState';
import { DemoGuideTarget, DemoGuidedLayout } from './DemoScreenGuide';

type DemoOperationsAdapterProps = {
    readonly role: DemoRole;
    readonly onScreenChange: (screen: DemoScreenId) => void;
    readonly onSimulate: DemoActionHandler;
};

export function DemoOperationsAdapter({ role, onScreenChange, onSimulate }: DemoOperationsAdapterProps) {
    const { showAlert, showConfirm } = useAppDialog();
    const initialLocations = React.useMemo(() => selectDemoOperationLocations(role), [role]);
    const [locations, setLocations] = React.useState<readonly FranchiseLocation[]>(initialLocations);
    const [locationForm, setLocationForm] = React.useState<LocationFormState>(EMPTY_LOCATION_FORM);
    const [isSaving, setIsSaving] = React.useState(false);
    const [deletingLocationId, setDeletingLocationId] = React.useState('');
    const [updatingStatusId, setUpdatingStatusId] = React.useState('');
    const nextIdRef = React.useRef(initialLocations.length + 1);
    const operationalLocations = React.useMemo(() => locations.filter(isOperationalLocation), [locations]);
    const counts = React.useMemo(() => getDemoOperationCounts(locations), [locations]);

    const resetLocationForm = () => setLocationForm(EMPTY_LOCATION_FORM);
    const updateLocationForm = (patch: Partial<LocationFormState>) => {
        setLocationForm(current => ({ ...current, ...patch }));
    };
    const saveLocation = () => {
        if (!locationForm.name.trim()) {
            void showAlert({ title: '가맹점 저장', message: '가맹점명을 입력해주세요.', type: 'error' });
            return;
        }
        if (!locationForm.region.trim() && !locationForm.address.trim()) {
            void showAlert({ title: '가맹점 저장', message: '지역 또는 주소를 입력해주세요.', type: 'error' });
            return;
        }
        const isEditing = Boolean(locationForm.id);
        setIsSaving(true);
        const result = saveDemoOperationForm({
            locations,
            form: locationForm,
            fallbackId: `demo-operation-local-${nextIdRef.current}`,
            timestamp: new Date().toISOString()
        });
        if (!isEditing) nextIdRef.current += 1;
        setLocations(result.locations);
        resetLocationForm();
        setIsSaving(false);
        onSimulate(isEditing ? `${result.location.name} 정보를 수정했습니다.` : `${result.location.name}을 등록했습니다.`);
    };
    const editLocation = (location: FranchiseLocation) => {
        setLocationForm(toLocationFormState(location));
        onSimulate(`${location.name} 수정 양식을 열었습니다.`);
    };
    const updateLocationStatus: FranchiseOperationsWorkspaceActions['updateLocationStatus'] = (location, status) => {
        setUpdatingStatusId(location.id);
        setLocations(current => updateDemoOperationStatus(current, location.id, status));
        setUpdatingStatusId('');
        onSimulate(`${location.name} 상태를 ${status}(으)로 변경했습니다.`);
    };
    const confirmDeleteLocation: FranchiseOperationsWorkspaceActions['confirmDeleteLocation'] = (location) => (
        showConfirm({
            title: '가맹점 정보 삭제',
            message: `${location.name} 가맹점 정보를 삭제할까요? 데모의 로컬 목록에서만 삭제됩니다.`,
            confirmText: '삭제',
            isDanger: true
        })
    );
    const deleteLocation = (location: FranchiseLocation) => {
        setDeletingLocationId(location.id);
        setLocations(current => deleteDemoOperation(current, location.id));
        if (locationForm.id === location.id) resetLocationForm();
        setDeletingLocationId('');
        onSimulate(`${location.name} 샘플 가맹점을 삭제했습니다.`);
    };
    const model: FranchiseOperationsWorkspaceModel = {
        userId: 'demo-manager',
        companyName: '민티아',
        locationForm,
        isSaving,
        deletingLocationId,
        updatingStatusId,
        locations: operationalLocations,
        counts
    };
    const actions: FranchiseOperationsWorkspaceActions = {
        updateLocationForm,
        resetLocationForm,
        saveLocation,
        editLocation,
        selectAddress: result => setLocationForm(current => applyDemoOperationAddress(current, result)),
        selectBrand: brand => setLocationForm(current => applyDemoOperationBrand(current, brand)),
        confirmDeleteLocation,
        deleteLocation,
        updateLocationStatus,
        openOwnerPortal: location => onSimulate(`${location.name} 점주 계정 화면은 로그인 데모에서 별도로 안내됩니다.`)
    };

    return (
        <div data-demo-id="operations-panel">
            <DemoGuidedLayout screen="operations" onScreenChange={onScreenChange}>
                <DemoGuideTarget marker={1} targetId="operations-summary" label="가맹 운영 작업공간">
                    <div data-demo-id="operations-list">
                        <div data-demo-id="operations-guide-link">
                            <FranchiseOperationsWorkspace
                                model={model}
                                actions={actions}
                                addressLookupSource={DEMO_ADDRESS_LOOKUP_SOURCE}
                                brandSearchSource={DEMO_BRAND_SEARCH_SOURCE}
                            />
                        </div>
                    </div>
                </DemoGuideTarget>
            </DemoGuidedLayout>
        </div>
    );
}
