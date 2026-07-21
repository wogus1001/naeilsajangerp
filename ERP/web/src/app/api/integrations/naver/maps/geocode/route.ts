import { getAuthenticatedRequesterProfile, type RequesterProfile } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import {
    geocodeNaverAddress,
    NaverMapsProviderError,
    readNaverMapsCredentials,
    type NaverGeocodePosition,
    type NaverMapsCredentials
} from '@/lib/naver-maps-geocoding';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const MAX_GEOCODE_QUERY_LENGTH = 300;
const pendingGeocodes = new Map<string, Promise<NaverGeocodePosition | null>>();

export type NaverMapsGeocodeRouteDependencies = {
    readonly config: NaverMapsCredentials | null;
    readonly geocode: (address: string, credentials: NaverMapsCredentials) => Promise<NaverGeocodePosition | null>;
    readonly getRequester: (request: Request) => Promise<RequesterProfile | null>;
};

function defaultDependencies(): NaverMapsGeocodeRouteDependencies {
    const supabaseAdmin = getSupabaseAdmin();
    return {
        config: readNaverMapsCredentials(),
        geocode: geocodeNaverAddress,
        getRequester: request => getAuthenticatedRequesterProfile(supabaseAdmin, request)
    };
}

function geocodeOnce(
    query: string,
    credentials: NaverMapsCredentials,
    dependencies: NaverMapsGeocodeRouteDependencies
): Promise<NaverGeocodePosition | null> {
    const pending = pendingGeocodes.get(query);
    if (pending) return pending;

    const request = dependencies.geocode(query, credentials).finally(() => {
        if (pendingGeocodes.get(query) === request) pendingGeocodes.delete(query);
    });
    pendingGeocodes.set(query, request);
    return request;
}

export async function handleNaverMapsGeocodeGET(
    request: Request,
    dependencies: NaverMapsGeocodeRouteDependencies = defaultDependencies()
) {
    const requester = await dependencies.getRequester(request);
    if (!requester) return fail(401, 'AUTH_REQUIRED', '로그인이 필요합니다.');

    const query = new URL(request.url).searchParams.get('query')?.trim() || '';
    if (!query) return fail(400, 'VALIDATION_ERROR', '주소를 입력해주세요.');
    if (query.length > MAX_GEOCODE_QUERY_LENGTH) {
        return fail(400, 'VALIDATION_ERROR', '주소는 300자 이하로 입력해주세요.');
    }
    if (!dependencies.config) return fail(503, 'INTERNAL_ERROR', '네이버 지도 연동 설정이 필요합니다.');

    try {
        const position = await geocodeOnce(query, dependencies.config, dependencies);
        if (!position) return fail(404, 'NOT_FOUND', '주소의 지도 위치를 찾지 못했습니다.');
        return ok(position);
    } catch (error) {
        if (
            error instanceof NaverMapsProviderError
            || error instanceof DOMException
            || error instanceof SyntaxError
            || error instanceof TypeError
        ) {
            return fail(502, 'INTERNAL_ERROR', '네이버 지도에서 주소 위치를 확인하지 못했습니다.');
        }
        throw error;
    }
}

export async function GET(request: Request) {
    return handleNaverMapsGeocodeGET(request);
}
