export const META_LEAD_ADS_OAUTH_SCOPES = [
    'ads_management',
    'leads_retrieval',
    'pages_manage_ads',
    'pages_manage_metadata',
    'pages_read_engagement',
    'pages_show_list'
] as const;

interface MetaOAuthAuthorizeUrlInput {
    readonly appId: string;
    readonly redirectUri: string;
    readonly state: string;
    readonly graphVersion: string;
    readonly businessLoginConfigId?: string;
}

export function buildMetaOAuthAuthorizeUrl(input: MetaOAuthAuthorizeUrlInput): URL {
    const authUrl = new URL(`https://www.facebook.com/${input.graphVersion}/dialog/oauth`);
    authUrl.searchParams.set('client_id', input.appId);
    authUrl.searchParams.set('redirect_uri', input.redirectUri);
    authUrl.searchParams.set('state', input.state);
    authUrl.searchParams.set('response_type', 'code');

    const businessLoginConfigId = input.businessLoginConfigId?.trim();
    if (businessLoginConfigId) {
        authUrl.searchParams.set('config_id', businessLoginConfigId);
        authUrl.searchParams.set('override_default_response_type', 'true');
        return authUrl;
    }

    authUrl.searchParams.set('auth_type', 'rerequest');
    authUrl.searchParams.set('scope', META_LEAD_ADS_OAUTH_SCOPES.join(','));
    return authUrl;
}
