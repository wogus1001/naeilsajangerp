export function getMetaProviderDenialReason(providerReason: unknown) {
    return providerReason ? 'provider_denied' : null;
}

export function getMetaCallbackFailureReason(_error: unknown) {
    return 'callback_failed';
}
