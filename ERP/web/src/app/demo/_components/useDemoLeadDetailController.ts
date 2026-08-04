import React from 'react';
import { useAppDialog } from '@/components/common/AppDialogProvider';
import { LeadDetailPanel, type LeadDetailMode } from '@/components/franchise/leads/LeadDetailPanel';
import type {
    ExternalPropertyListing,
    FranchiseLead,
    FranchiseLocation,
    LeadActivity
} from '@/components/franchise/leads/types';
import {
    buildLeadNextContactAt,
    buildLeadWorkflowDraft,
    LEAD_NEXT_CONTACT_PRESETS,
    suggestLeadNextContactAt,
    type LeadWorkflowDraft
} from '@/lib/franchise-lead-workflow';
import {
    addUniqueLeadLocationLink,
    createLeadLocationLink,
    updateLeadLocationLink,
    type LeadLocationLinkStatus,
    type LeadLocationTargetType
} from '@/lib/franchise-lead-location-links';
import {
    canEnterContractStatus,
    isContractLockedLeadStatus,
    type DisclosureEligibility
} from '@/lib/franchise-disclosure-deliveries';
import { toDatetimeLocalValue } from '@/components/franchise/leads/utils';
import type { DemoActionHandler, DemoRole } from '../demoTypes';
import { DEMO_LEAD_MANAGERS } from './DemoLeadSampleData';
import { useDemoLeadDetailActivity } from './useDemoLeadDetailActivity';

const DEMO_LOCATION_OPTIONS: readonly FranchiseLocation[] = [
    { id: 'demo-location-gangnam-station', name: '강남역 2번 출구 후보지', status: '검토중', region: '서울 강남구', address: '서울 강남구 테헤란로 110', brand: '미카도', locationType: '예정점' },
    { id: 'demo-location-mapo-office', name: '마포 오피스 상권 후보지', status: '검토중', region: '서울 마포구', address: '서울 마포구 마포대로 92', brand: '미카도', locationType: '예정점' },
    { id: 'demo-operation-bundang', name: '미카도 판교점', status: '오픈준비', region: '경기 성남시', address: '경기 성남시 분당구 판교역로 166', brand: '미카도', locationType: '가맹점', contractLeadId: 'demo-candidate-2' },
    { id: 'demo-operation-busan', name: '샘플카페 센텀점', status: '오픈준비', region: '부산 해운대구', address: '부산 해운대구 센텀중앙로 97', brand: '샘플카페', locationType: '가맹점', contractLeadId: 'demo-candidate-4' },
    { id: 'demo-operation-jeju', name: '샘플치킨 제주점', status: '오픈준비', region: '제주 제주시', address: '제주 제주시 연북로 12', brand: '샘플치킨', locationType: '가맹점' }
];

const DEMO_EXTERNAL_LISTINGS: readonly ExternalPropertyListing[] = [{
    id: 'demo-listing-seongsu',
    source: '데모 외부 상가',
    title: '성수 코너 1층 상가',
    address: '서울 성동구 연무장길 24',
    region: '서울 성동구',
    depositAmount: 100_000_000,
    monthlyRent: 7_000_000,
    areaPyeong: '31평',
    floorInfo: '1층'
}];

const DEMO_PARTNER_LOCATION_OPTIONS: readonly FranchiseLocation[] = [
    DEMO_LOCATION_OPTIONS.find(location => location.id === 'demo-location-mapo-office')!,
    {
        id: 'demo-operation-ilsan',
        name: '샘플치킨 일산점',
        status: '운영중',
        region: '경기 고양시',
        address: '경기 고양시 일산동구 중앙로 1205',
        brand: '샘플치킨',
        locationType: '가맹점'
    }
];

type UpdateLeadAction = (
    leadId: string,
    updater: (lead: FranchiseLead) => FranchiseLead
) => void;

type UseDemoLeadDetailInput = {
    readonly role?: DemoRole;
    readonly lead: FranchiseLead | null;
    readonly mode: LeadDetailMode;
    readonly updateLeadAction: UpdateLeadAction;
    readonly onCloseAction: () => void;
    readonly onEditAction: (lead: FranchiseLead) => void;
    readonly onPromoteAction: (lead: FranchiseLead) => void;
    readonly onConvertAction: (lead: FranchiseLead) => void;
    readonly onSimulate: DemoActionHandler;
};

export function useDemoLeadDetailController({
    role = 'manager',
    lead,
    mode,
    updateLeadAction,
    onCloseAction,
    onEditAction,
    onPromoteAction,
    onConvertAction,
    onSimulate
}: UseDemoLeadDetailInput): React.ComponentProps<typeof LeadDetailPanel> | null {
    const { showAlert } = useAppDialog();
    const sequenceRef = React.useRef(0);
    const [detailNextContactAt, setDetailNextContactAt] = React.useState('');
    const [workflow, setWorkflow] = React.useState<LeadWorkflowDraft>(() => buildLeadWorkflowDraft(lead));
    const [eligibility, setEligibility] = React.useState<DisclosureEligibility | null>(null);
    const actorName = role === 'partner' ? '협력업체-김재현' : '김담당';
    const activity = useDemoLeadDetailActivity({ lead, updateLeadAction, onSimulate, actorName });

    React.useEffect(() => {
        setDetailNextContactAt(toDatetimeLocalValue(lead?.nextContactAt));
        setWorkflow(buildLeadWorkflowDraft(lead));
        setEligibility(null);
    }, [lead]);

    if (!lead) return null;
    const nextContactPresets = LEAD_NEXT_CONTACT_PRESETS.map(preset => ({
        ...preset,
        value: toDatetimeLocalValue(buildLeadNextContactAt(preset.key))
    }));
    const suggestedNextContactAt = toDatetimeLocalValue(suggestLeadNextContactAt(workflow));
    const updateCurrentLead = (updater: (current: FranchiseLead) => FranchiseLead) => {
        updateLeadAction(lead.id, updater);
    };
    const createActivity = (content: string): LeadActivity => {
        sequenceRef.current += 1;
        return {
            id: `demo-detail-activity-${sequenceRef.current}`,
            type: '메모',
            content,
            createdAt: new Date().toISOString(),
            createdBy: actorName
        };
    };
    const saveWorkflow = async () => {
        const parsedNextContact = detailNextContactAt ? new Date(detailNextContactAt) : null;
        if (parsedNextContact && Number.isNaN(parsedNextContact.getTime())) {
            await showAlert({ title: '입력 확인', message: '다음 연락일 형식이 올바르지 않습니다.', type: 'error' });
            return;
        }
        const nextContactAt = parsedNextContact?.toISOString() || null;
        const activity = createActivity(`연락 관리 저장: ${workflow.nextAction} · ${workflow.consultationResult}`);
        updateCurrentLead(current => ({
            ...current,
            ...workflow,
            churnReason: workflow.churnReason.trim(),
            nextContactAt,
            activityLog: [activity, ...(current.activityLog || [])],
            updatedAt: activity.createdAt
        }));
        await showAlert({ title: '저장 완료', message: '연락 관리 정보를 저장했습니다.', type: 'success' });
    };
    const addLocationLink = async (targetType: LeadLocationTargetType, targetId: string) => {
        sequenceRef.current += 1;
        const currentLinks = lead.locationLinks || [];
        const nextLink = createLeadLocationLink({
            id: `demo-location-link-${sequenceRef.current}`,
            targetType,
            targetId,
            createdAt: new Date().toISOString(),
            createdBy: actorName
        });
        const nextLinks = addUniqueLeadLocationLink(currentLinks, nextLink);
        if (nextLinks === currentLinks) {
            await showAlert('이미 연결된 출점 후보지입니다.');
            return;
        }
        updateCurrentLead(current => ({ ...current, locationLinks: nextLinks }));
    };
    const updateLocation = async (
        linkId: string,
        patch: { readonly status?: LeadLocationLinkStatus; readonly memo?: string }
    ) => {
        updateCurrentLead(current => ({
            ...current,
            locationLinks: updateLeadLocationLink(current.locationLinks || [], linkId, {
                ...patch,
                updatedAt: new Date().toISOString()
            })
        }));
    };
    const removeLocation = async (linkId: string) => {
        updateCurrentLead(current => ({
            ...current,
            locationLinks: (current.locationLinks || []).filter(link => link.id !== linkId)
        }));
    };
    const updateStatus: React.ComponentProps<typeof LeadDetailPanel>['onStatusChangeAction'] = async (currentLead, status) => {
        if (isContractLockedLeadStatus(status) && (!eligibility || !canEnterContractStatus(status, eligibility))) {
            await showAlert({
                title: '정보공개서 확인 필요',
                message: '정보공개서 발송 이력과 14일 대기 기간을 확인해주세요.',
                type: 'info'
            });
            return;
        }
        updateLeadAction(currentLead.id, current => ({ ...current, status }));
    };

    return {
        lead,
        mode,
        userId: role === 'partner' ? 'demo-partner-kim' : 'demo-manager-kim',
        companyName: 'FC ERP 데모 본사',
        convertingLeadId: '',
        detailNextContactAt,
        suggestedNextContactAt,
        nextContactPresets,
        detailWorkflow: workflow,
        isWorkflowSaving: false,
        selectedLocationLinks: lead.locationLinks || [],
        franchiseLocations: role === 'partner' ? DEMO_PARTNER_LOCATION_OPTIONS : DEMO_LOCATION_OPTIONS,
        externalListings: role === 'partner' ? [] : DEMO_EXTERNAL_LISTINGS,
        isLocationMatchLoading: false,
        isLocationLinkSaving: false,
        activityType: activity.activityType,
        activityContent: activity.activityContent,
        isActivitySaving: false,
        relatedCustomers: [],
        relatedCards: [],
        isRelatedLoading: false,
        getManagerNameAction: managerId => {
            if (role === 'partner') {
                return managerId === 'partner-kim' ? '협력업체-김재현' : '담당자 비공개';
            }
            return DEMO_LEAD_MANAGERS.find(manager => manager.id === managerId)?.label || '담당자 선택';
        },
        onCloseAction,
        onPromoteLeadToCandidateAction: onPromoteAction,
        onStatusChangeAction: updateStatus,
        onEditAction,
        onConvertLeadAction: onConvertAction,
        onDetailNextContactAtChangeAction: setDetailNextContactAt,
        onDetailWorkflowChangeAction: next => {
            setWorkflow(next);
            if (!detailNextContactAt) setDetailNextContactAt(toDatetimeLocalValue(suggestLeadNextContactAt(next)));
        },
        onSaveDetailWorkflowAction: saveWorkflow,
        onDisclosureEligibilityChangeAction: setEligibility,
        onContractChecklistSavedAction: () => onSimulate(`${lead.name} 구비서류 저장`),
        onAddLocationLinkAction: addLocationLink,
        onUpdateLocationLinkAction: updateLocation,
        onRemoveLocationLinkAction: removeLocation,
        onActivityTypeChangeAction: activity.setActivityType,
        onActivityContentChangeAction: activity.setActivityContent,
        onAddLeadActivityAction: activity.addActivity,
        onUpdateLeadActivityAction: activity.updateActivity,
        onDeleteLeadActivityAction: activity.deleteActivity,
        onLinkRelatedCustomerAction: async customer => {
            updateCurrentLead(current => ({ ...current, linkedCustomerId: customer.id, linkedCustomerName: customer.name }));
        },
        onLinkRelatedCardAction: async card => {
            updateCurrentLead(current => ({ ...current, linkedBusinessCardId: card.id, linkedBusinessCardName: card.name }));
        }
    };
}
