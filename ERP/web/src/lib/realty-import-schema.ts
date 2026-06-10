export type ExternalListingScopePayload = {
    readonly company_id: string | null;
    readonly requester_id?: string;
};

export function buildExternalListingScopePayload(params: {
    readonly companyId: string | null;
    readonly requesterId: string;
    readonly supportsRequesterId: boolean;
}): ExternalListingScopePayload {
    if (!params.supportsRequesterId) {
        return {
            company_id: params.companyId
        };
    }

    return {
        company_id: params.companyId,
        requester_id: params.requesterId
    };
}

export function canPersistRequesterScopedListing(companyId: string | null, supportsRequesterId: boolean): boolean {
    return Boolean(companyId) || supportsRequesterId;
}
