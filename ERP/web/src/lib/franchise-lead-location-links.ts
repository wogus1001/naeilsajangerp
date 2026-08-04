export const LEAD_LOCATION_TARGET_TYPES = ['franchise_location', 'external_property_listing'] as const;
export const LEAD_LOCATION_LINK_STATUSES = ['검토 예정', '제안 예정', '제안 완료', '관심 있음', '보류', '거절'] as const;

export type LeadLocationTargetType = typeof LEAD_LOCATION_TARGET_TYPES[number];
export type LeadLocationLinkStatus = typeof LEAD_LOCATION_LINK_STATUSES[number];

export type LeadLocationLink = {
    readonly id: string;
    readonly targetType: LeadLocationTargetType;
    readonly targetId: string;
    readonly status: LeadLocationLinkStatus;
    readonly memo: string;
    readonly createdAt: string;
    readonly createdBy?: string;
    readonly updatedAt?: string;
};

export type LeadLocationLinkViewLocation = {
    readonly id: string;
    readonly locationType?: string | null;
    readonly status?: string | null;
};

export type LeadLocationLinkView<T extends LeadLocationLinkViewLocation> = {
    readonly candidateOptions: readonly T[];
    readonly linkedLocationsById: ReadonlyMap<string, T>;
};

type LeadLocationLinkInput = {
    readonly id: string;
    readonly targetType: LeadLocationTargetType;
    readonly targetId: string;
    readonly status?: LeadLocationLinkStatus;
    readonly memo?: string;
    readonly createdAt: string;
    readonly createdBy?: string;
};

const OPERATIONAL_LOCATION_TYPES = ['직영점', '가맹점'] as const;
const OPERATIONAL_LOCATION_STATUSES = ['운영중', '휴점', '폐점'] as const;
const CANDIDATE_LOCATION_STATUSES = ['검토중', '오픈준비'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isTargetType(value: unknown): value is LeadLocationTargetType {
    return LEAD_LOCATION_TARGET_TYPES.some(type => type === value);
}

export function isLeadLocationLinkStatus(value: unknown): value is LeadLocationLinkStatus {
    return LEAD_LOCATION_LINK_STATUSES.some(status => status === value);
}

export function isLeadLocationCandidate(location: LeadLocationLinkViewLocation): boolean {
    const locationType = String(location.locationType || '').trim();
    const status = String(location.status || '').trim();
    const isOperational = OPERATIONAL_LOCATION_TYPES.some(type => type === locationType)
        || OPERATIONAL_LOCATION_STATUSES.some(candidateStatus => candidateStatus === status);
    if (isOperational) return false;
    return locationType === '예정점'
        || CANDIDATE_LOCATION_STATUSES.some(candidateStatus => candidateStatus === status);
}

export function buildLeadLocationLinkView<T extends LeadLocationLinkViewLocation>(
    locations: readonly T[],
    links: readonly LeadLocationLink[]
): LeadLocationLinkView<T> {
    const linkedLocationIds = new Set(
        links.flatMap(link => link.targetType === 'franchise_location' ? [link.targetId] : [])
    );
    return {
        candidateOptions: locations.filter(isLeadLocationCandidate),
        linkedLocationsById: new Map(
            locations
                .filter(location => linkedLocationIds.has(location.id))
                .map(location => [location.id, location])
        )
    };
}

export function normalizeLeadLocationLinks(value: unknown): readonly LeadLocationLink[] {
    if (!Array.isArray(value)) return [];

    return value.flatMap(item => {
        if (!isRecord(item)) return [];
        const id = String(item.id || '').trim();
        const targetId = String(item.targetId || '').trim();
        if (!id || !targetId || !isTargetType(item.targetType)) return [];

        return [{
            id,
            targetType: item.targetType,
            targetId,
            status: isLeadLocationLinkStatus(item.status) ? item.status : '검토 예정',
            memo: String(item.memo || '').trim(),
            createdAt: String(item.createdAt || new Date().toISOString()),
            createdBy: typeof item.createdBy === 'string' ? item.createdBy : undefined,
            updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : undefined
        }];
    });
}

export function createLeadLocationLink(input: LeadLocationLinkInput): LeadLocationLink {
    return {
        id: input.id,
        targetType: input.targetType,
        targetId: input.targetId,
        status: input.status || '검토 예정',
        memo: input.memo?.trim() || '',
        createdAt: input.createdAt,
        createdBy: input.createdBy
    };
}

export function addUniqueLeadLocationLink(
    links: readonly LeadLocationLink[],
    nextLink: LeadLocationLink
): readonly LeadLocationLink[] {
    const alreadyLinked = links.some(link => {
        return link.targetType === nextLink.targetType && link.targetId === nextLink.targetId;
    });
    return alreadyLinked ? links : [nextLink, ...links];
}

export function updateLeadLocationLink(
    links: readonly LeadLocationLink[],
    linkId: string,
    patch: Partial<Pick<LeadLocationLink, 'status' | 'memo' | 'updatedAt'>>
): readonly LeadLocationLink[] {
    return links.map(link => {
        if (link.id !== linkId) return link;
        return {
            ...link,
            ...(patch.status ? { status: patch.status } : {}),
            ...(patch.memo !== undefined ? { memo: patch.memo.trim() } : {}),
            ...(patch.updatedAt ? { updatedAt: patch.updatedAt } : {})
        };
    });
}
