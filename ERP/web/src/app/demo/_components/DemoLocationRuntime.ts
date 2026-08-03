import type { FranchiseBrandSearchSource } from '@/components/franchise/FranchiseBrandSelector';
import type { KakaoAddressLookupSource, KakaoAddressResult } from '@/components/franchise/KakaoAddressSearch';
import type { LocationInteractionRuntime } from '@/components/franchise/market-insights/locationInteractionRuntime';
import type { FranchiseLocationMessage, FranchiseLocationMessageSummary } from '@/components/franchise/market-insights/locationMessageTypes';
import type { FranchiseBrand } from '@/lib/franchise-brands';
import { normalizeMeetingToolDraft, toMeetingToolPresetData, type MeetingToolDraft, type MeetingToolPreset } from '@/lib/franchise-location-meeting-tool';
import { makeMeetingToolVersionTitle, type MeetingToolVersion } from '@/lib/franchise-location-meeting-tool-versions';

const DEMO_ADDRESSES: readonly KakaoAddressResult[] = [
    {
        address: '서울 강남구 테헤란로 123',
        roadAddress: '서울 강남구 테헤란로 123',
        jibunAddress: '서울 강남구 역삼동 735',
        region: '서울 강남구',
        latitude: 37.4982,
        longitude: 127.0281,
        buildingName: '강남 비즈니스센터',
        zoneNo: '06134',
        addressType: 'R'
    },
    {
        address: '서울 성동구 아차산로 89',
        roadAddress: '서울 성동구 아차산로 89',
        jibunAddress: '서울 성동구 성수동2가 300',
        region: '서울 성동구',
        latitude: 37.5446,
        longitude: 127.0557,
        buildingName: '성수 코너빌딩',
        zoneNo: '04793',
        addressType: 'R'
    },
    {
        address: '서울 송파구 올림픽로 99',
        roadAddress: '서울 송파구 올림픽로 99',
        jibunAddress: '서울 송파구 잠실동 40',
        region: '서울 송파구',
        latitude: 37.5147,
        longitude: 127.1059,
        buildingName: '송파 대로빌딩',
        zoneNo: '05510',
        addressType: 'R'
    }
];

const DEMO_BRANDS: readonly FranchiseBrand[] = [
    {
        id: 'brand-mikado',
        brandName: '미카도',
        industry: '외식',
        businessType: '일식',
        categoryMajor: '외식',
        categoryMiddle: '일식',
        categorySmall: '초밥',
        recommendedKeywords: ['일식', '초밥'],
        source: 'demo',
        isSaved: true
    },
    {
        id: 'brand-cafe',
        brandName: '샘플카페',
        industry: '외식',
        businessType: '카페',
        categoryMajor: '외식',
        categoryMiddle: '커피',
        categorySmall: '카페',
        recommendedKeywords: ['카페', '커피'],
        source: 'demo',
        isSaved: true
    }
];

export const DEMO_ADDRESS_LOOKUP_SOURCE: KakaoAddressLookupSource = {
    search: async ({ query }) => {
        const normalizedQuery = query.trim().toLocaleLowerCase('ko-KR');
        return DEMO_ADDRESSES.filter(result => [
            result.address,
            result.roadAddress,
            result.jibunAddress,
            result.region,
            result.buildingName
        ].some(value => value.toLocaleLowerCase('ko-KR').includes(normalizedQuery)));
    }
};

export const DEMO_BRAND_SEARCH_SOURCE: FranchiseBrandSearchSource = {
    search: async ({ query }) => {
        const normalizedQuery = query.trim().toLocaleLowerCase('ko-KR');
        if (!normalizedQuery) return DEMO_BRANDS;
        return DEMO_BRANDS.filter(brand => [
            brand.brandName,
            brand.industry || '',
            brand.businessType || '',
            brand.categoryMiddle || ''
        ].some(value => value.toLocaleLowerCase('ko-KR').includes(normalizedQuery)));
    }
};

type DemoLocationRuntimeState = {
    readonly messages: Map<string, FranchiseLocationMessage[]>;
    readonly meetingTools: Map<string, MeetingToolDraft>;
    presets: MeetingToolPreset[];
    readonly versions: Map<string, MeetingToolVersion[]>;
    sequence: number;
};

class DemoLocationRecordNotFoundError extends Error {
    constructor(messageId: string) {
        super(`Demo location message was not found: ${messageId}`);
        this.name = 'DemoLocationRecordNotFoundError';
    }
}

function nextIdentity(state: DemoLocationRuntimeState, prefix: string) {
    state.sequence += 1;
    return {
        id: `${prefix}-${state.sequence}`,
        timestamp: `2026-07-30T00:${String(state.sequence).padStart(2, '0')}:00.000Z`
    };
}

function summarizeMessages(
    locationId: string,
    messages: readonly FranchiseLocationMessage[]
): FranchiseLocationMessageSummary {
    return {
        locationId,
        totalCount: messages.length,
        openRequestCount: messages.filter(message => message.kind === 'request' && message.requestStatus === 'open').length,
        latestMessageAt: messages[0]?.createdAt || null
    };
}

function createState(): DemoLocationRuntimeState {
    const draft = normalizeMeetingToolDraft(null);
    const seededMessage: FranchiseLocationMessage = {
        id: 'demo-message-request-gangnam',
        companyId: 'demo-company',
        locationId: 'demo-location-gangnam-station',
        authorId: 'demo-manager',
        authorName: '김담당',
        body: '임대인에게 권리금 조정 가능 여부를 확인해주세요.',
        kind: 'request',
        requestStatus: 'open',
        resolvedBy: null,
        resolvedByName: '',
        resolvedAt: null,
        createdAt: '2026-07-29T09:00:00.000Z',
        updatedAt: '2026-07-29T09:00:00.000Z'
    };
    return {
        messages: new Map([[seededMessage.locationId, [seededMessage]]]),
        meetingTools: new Map(),
        presets: [{
            id: 'demo-preset-standard',
            name: '표준 검토안',
            ...toMeetingToolPresetData(draft),
            createdAt: '2026-07-29T08:00:00.000Z',
            updatedAt: '2026-07-29T08:00:00.000Z'
        }],
        versions: new Map(),
        sequence: 0
    };
}

export function createDemoLocationRuntime(): LocationInteractionRuntime {
    const state = createState();
    return {
        fetchMessageSummaries: async ({ locationIds }) => locationIds.map(locationId => (
            summarizeMessages(locationId, state.messages.get(locationId) || [])
        )),
        fetchMessages: async ({ locationId }) => {
            const messages = state.messages.get(locationId) || [];
            return { messages: [...messages], summary: summarizeMessages(locationId, messages) };
        },
        createMessage: async ({ locationId, body, kind }) => {
            const identity = nextIdentity(state, 'demo-message');
            const message: FranchiseLocationMessage = {
                id: identity.id,
                companyId: 'demo-company',
                locationId,
                authorId: 'demo-manager',
                authorName: '데모 담당자',
                body: body.trim(),
                kind,
                requestStatus: kind === 'request' ? 'open' : null,
                resolvedBy: null,
                resolvedByName: '',
                resolvedAt: null,
                createdAt: identity.timestamp,
                updatedAt: identity.timestamp
            };
            const messages = [message, ...(state.messages.get(locationId) || [])];
            state.messages.set(locationId, messages);
            return { message, messages: [...messages], summary: summarizeMessages(locationId, messages) };
        },
        updateRequestStatus: async ({ messageId, requestStatus }) => {
            for (const [locationId, messages] of state.messages) {
                const current = messages.find(message => message.id === messageId);
                if (!current) continue;
                const identity = nextIdentity(state, 'demo-message-update');
                const message: FranchiseLocationMessage = {
                    ...current,
                    requestStatus,
                    resolvedBy: requestStatus === 'done' ? 'demo-manager' : null,
                    resolvedByName: requestStatus === 'done' ? '데모 담당자' : '',
                    resolvedAt: requestStatus === 'done' ? identity.timestamp : null,
                    updatedAt: identity.timestamp
                };
                const updated = messages.map(item => item.id === messageId ? message : item);
                state.messages.set(locationId, updated);
                return { message, messages: [...updated], summary: summarizeMessages(locationId, updated) };
            }
            throw new DemoLocationRecordNotFoundError(messageId);
        },
        saveMeetingTool: async ({ locationId, meetingTool }) => {
            const identity = nextIdentity(state, 'demo-report');
            const saved = { ...meetingTool, updatedAt: identity.timestamp };
            state.meetingTools.set(locationId, saved);
            return saved;
        },
        fetchPresets: async () => [...state.presets],
        savePreset: async ({ name, meetingTool }) => {
            const identity = nextIdentity(state, 'demo-preset');
            const preset: MeetingToolPreset = {
                id: identity.id,
                name: name.trim(),
                ...toMeetingToolPresetData(meetingTool),
                createdAt: identity.timestamp,
                updatedAt: identity.timestamp
            };
            state.presets = [preset, ...state.presets.filter(item => item.name !== preset.name)];
            return preset;
        },
        deletePreset: async ({ presetId }) => {
            state.presets = state.presets.filter(preset => preset.id !== presetId);
        },
        fetchVersions: async (locationId) => [...(state.versions.get(locationId) || [])],
        saveVersion: async ({ locationId, title, meetingTool }) => {
            const versions = state.versions.get(locationId) || [];
            const versionNumber = versions.length + 1;
            const identity = nextIdentity(state, 'demo-version');
            const version: MeetingToolVersion = {
                id: identity.id,
                companyId: 'demo-company',
                locationId,
                versionNumber,
                title: makeMeetingToolVersionTitle(versionNumber, title),
                meetingTool,
                createdBy: 'demo-manager',
                createdAt: identity.timestamp
            };
            state.versions.set(locationId, [version, ...versions]);
            return version;
        }
    };
}
