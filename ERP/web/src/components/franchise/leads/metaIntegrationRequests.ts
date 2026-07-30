import { getApiAuthHeaders } from '@/utils/apiAuthHeaders';
import { readApiError, unwrapApiData } from '@/utils/apiResponse';

type RequestMetaAuthorizationUrlInput = {
    readonly requesterId: string;
    readonly companyName: string;
    readonly redirectPath: string;
};

type MetaAuthorizationDependencies = {
    readonly fetcher?: (input: string, init: RequestInit) => Promise<Response>;
    readonly getHeaders?: () => Promise<Headers>;
};

export async function requestMetaAuthorizationUrl(
    input: RequestMetaAuthorizationUrlInput,
    dependencies: MetaAuthorizationDependencies = {}
): Promise<string> {
    const params = new URLSearchParams({
        requesterId: input.requesterId,
        redirect: input.redirectPath,
        response: 'json'
    });
    if (input.companyName) params.set('company', input.companyName);

    const headers = dependencies.getHeaders
        ? await dependencies.getHeaders()
        : await getApiAuthHeaders({ Accept: 'application/json' });
    const response = await (dependencies.fetcher ?? fetch)(
        `/api/integrations/meta/connect?${params.toString()}`,
        { cache: 'no-store', headers }
    );
    const payload = await response.json();
    if (!response.ok) throw new Error(readApiError(payload));

    const data = unwrapApiData<{ readonly authorizationUrl?: string }>(payload);
    if (!data.authorizationUrl) throw new Error('Meta 연결 주소를 받지 못했습니다.');
    return data.authorizationUrl;
}
