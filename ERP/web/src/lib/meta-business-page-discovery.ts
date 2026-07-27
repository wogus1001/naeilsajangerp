import type { MetaGraphPage } from '@/lib/meta-page-diagnostics';

export const META_ACCOUNT_PAGE_FIELDS = 'id,name,access_token,tasks,category';
export const META_TARGET_PAGE_FIELDS = 'id,name,access_token,category';

const META_PAGE_GRANULAR_SCOPES = new Set([
    'leads_retrieval',
    'pages_manage_ads',
    'pages_manage_metadata',
    'pages_read_engagement',
    'pages_show_list'
]);

type MetaBusinessPageDiscoveryInput = {
    readonly fetchAccountPages: () => Promise<readonly MetaGraphPage[]>;
    readonly fetchTokenMetadata: () => Promise<unknown>;
    readonly fetchTargetPage: (pageId: string) => Promise<MetaGraphPage>;
};

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readTargetId(value: unknown): string | null {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) {
        return String(value);
    }
    return null;
}

export function readMetaBusinessPageTargetIds(payload: unknown): readonly string[] {
    if (!isRecord(payload) || !isRecord(payload['data'])) return [];
    const granularScopes = payload['data']['granular_scopes'];
    if (!Array.isArray(granularScopes)) return [];

    const targetIds = granularScopes.flatMap(scopeEntry => {
        if (!isRecord(scopeEntry)) return [];
        const scope = scopeEntry['scope'];
        if (typeof scope !== 'string' || !META_PAGE_GRANULAR_SCOPES.has(scope)) return [];
        const targets = scopeEntry['target_ids'];
        if (!Array.isArray(targets)) return [];
        return targets.flatMap(target => {
            const targetId = readTargetId(target);
            return targetId ? [targetId] : [];
        });
    });

    return [...new Set(targetIds)];
}

export async function discoverMetaBusinessPages(
    input: MetaBusinessPageDiscoveryInput
): Promise<readonly MetaGraphPage[]> {
    const accountPages = await input.fetchAccountPages();
    if (accountPages.length > 0) return accountPages;

    const tokenMetadata = await input.fetchTokenMetadata();
    const targetIds = readMetaBusinessPageTargetIds(tokenMetadata);
    return Promise.all(targetIds.map(pageId => input.fetchTargetPage(pageId)));
}
