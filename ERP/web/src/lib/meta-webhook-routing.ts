export type MetaWebhookConnectionCandidate = {
    readonly id: string;
    readonly company_id: string;
};

export type MetaWebhookFormCandidate = {
    readonly id: string;
    readonly company_id: string;
    readonly connection_id: string;
};

export type MetaWebhookTarget =
    | {
        readonly status: 'matched';
        readonly connection: MetaWebhookConnectionCandidate;
        readonly form: MetaWebhookFormCandidate;
    }
    | { readonly status: 'missing' }
    | { readonly status: 'ambiguous' };

type ResolvedMetaWebhookCandidate = {
    readonly connection: MetaWebhookConnectionCandidate;
    readonly form: MetaWebhookFormCandidate;
};

export function resolveMetaWebhookTarget(
    connections: readonly MetaWebhookConnectionCandidate[],
    forms: readonly MetaWebhookFormCandidate[]
): MetaWebhookTarget {
    const connectionsById = new Map(connections.map(connection => [connection.id, connection]));
    const candidates = forms
        .map(form => {
            const connection = connectionsById.get(form.connection_id);
            if (!connection || connection.company_id !== form.company_id) return null;
            return { connection, form };
        })
        .filter((candidate): candidate is ResolvedMetaWebhookCandidate => (
            candidate !== null
        ));

    if (candidates.length === 0) return { status: 'missing' };
    if (candidates.length > 1) return { status: 'ambiguous' };
    return {
        status: 'matched',
        connection: candidates[0].connection,
        form: candidates[0].form
    };
}
