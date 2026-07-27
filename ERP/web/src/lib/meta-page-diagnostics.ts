export type MetaGraphPage = {
    readonly id: string;
    readonly name?: string;
    readonly access_token?: string;
    readonly tasks?: readonly string[];
    readonly category?: string;
};

export type MetaPageDiscoveryDiagnostic = {
    readonly id: string;
    readonly name: string;
    readonly hasAccessToken: boolean;
    readonly tasks: readonly string[];
};

export function buildMetaPageDiscoveryDiagnostics(
    pages: readonly MetaGraphPage[]
): readonly MetaPageDiscoveryDiagnostic[] {
    return pages.map(page => ({
        id: page.id,
        name: page.name || page.id,
        hasAccessToken: Boolean(page.access_token),
        tasks: page.tasks || []
    }));
}
