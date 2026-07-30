type MetaPermissionDiagnostic = {
    readonly permission: string;
    readonly status: string;
};

type MetaPageWithoutTokenFields = {
    readonly id: string;
    readonly name: string;
    readonly tasks: readonly string[];
};

export type MetaOAuthDiagnostics = {
    readonly permissions: readonly MetaPermissionDiagnostic[];
    readonly pagesWithoutTokenFields: readonly MetaPageWithoutTokenFields[];
};

export type MetaOAuthDiagnosticsResult =
    | { readonly kind: 'success'; readonly diagnostics: MetaOAuthDiagnostics }
    | { readonly kind: 'failure'; readonly message: string };

class MetaOAuthDiagnosticsRequestError extends Error {
    readonly status: number;

    constructor(status: number, message: string) {
        super(message);
        this.name = 'MetaOAuthDiagnosticsRequestError';
        this.status = status;
    }
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readRows(payload: unknown): readonly unknown[] {
    if (!isRecord(payload)) return [];
    const data = payload['data'];
    return Array.isArray(data) ? data : [];
}

function readStringList(value: unknown): readonly string[] {
    return Array.isArray(value)
        ? value.filter((item): item is string => typeof item === 'string')
        : [];
}

function readGraphErrorMessage(payload: unknown): string {
    if (!isRecord(payload)) return '';
    const error = payload['error'];
    if (!isRecord(error)) return '';
    return typeof error['message'] === 'string' ? error['message'] : '';
}

export function buildMetaOAuthDiagnostics(
    permissionPayload: unknown,
    pagePayload: unknown
): MetaOAuthDiagnostics {
    const permissions = readRows(permissionPayload).flatMap(row => {
        if (!isRecord(row)) return [];
        const permission = row['permission'];
        const status = row['status'];
        return typeof permission === 'string' && typeof status === 'string'
            ? [{ permission, status }]
            : [];
    });
    const pagesWithoutTokenFields = readRows(pagePayload).flatMap(row => {
        if (!isRecord(row) || typeof row['id'] !== 'string') return [];
        return [{
            id: row['id'],
            name: typeof row['name'] === 'string' ? row['name'] : row['id'],
            tasks: readStringList(row['tasks'])
        }];
    });

    return { permissions, pagesWithoutTokenFields };
}

async function fetchMetaGraphDiagnostics(path: string, userAccessToken: string): Promise<unknown> {
    const graphVersion = process.env.META_GRAPH_API_VERSION || 'v25.0';
    const url = new URL(`https://graph.facebook.com/${graphVersion}${path}`);
    url.searchParams.set('access_token', userAccessToken);
    const response = await fetch(url);
    const payload: unknown = await response.json();

    if (!response.ok) {
        throw new MetaOAuthDiagnosticsRequestError(
            response.status,
            readGraphErrorMessage(payload) || `Meta diagnostics failed: ${response.status}`
        );
    }
    return payload;
}

export async function fetchMetaOAuthDiagnostics(
    userAccessToken: string
): Promise<MetaOAuthDiagnosticsResult> {
    try {
        const [permissionPayload, pagePayload] = await Promise.all([
            fetchMetaGraphDiagnostics('/me/permissions', userAccessToken),
            fetchMetaGraphDiagnostics('/me/accounts?fields=id,name,tasks', userAccessToken)
        ]);
        return {
            kind: 'success',
            diagnostics: buildMetaOAuthDiagnostics(permissionPayload, pagePayload)
        };
    } catch (error) {
        return {
            kind: 'failure',
            message: error instanceof Error ? error.message : 'Unknown Meta OAuth diagnostics failure'
        };
    }
}
