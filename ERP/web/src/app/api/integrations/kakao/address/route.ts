import { getRequesterProfile } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const KAKAO_LOCAL_ADDRESS_URL = 'https://dapi.kakao.com/v2/local/search/address.json';

type KakaoAddressPart = {
    address_name?: string;
    region_1depth_name?: string;
    region_2depth_name?: string;
    region_3depth_name?: string;
    main_address_no?: string;
    sub_address_no?: string;
};

type KakaoRoadAddressPart = {
    address_name?: string;
    region_1depth_name?: string;
    region_2depth_name?: string;
    region_3depth_name?: string;
    road_name?: string;
    main_building_no?: string;
    sub_building_no?: string;
    building_name?: string;
    zone_no?: string;
};

type KakaoAddressDocument = {
    address_name?: string;
    address_type?: string;
    x?: string;
    y?: string;
    address?: KakaoAddressPart | null;
    road_address?: KakaoRoadAddressPart | null;
};

type KakaoAddressResponse = {
    documents?: KakaoAddressDocument[];
    meta?: {
        total_count?: number;
        pageable_count?: number;
        is_end?: boolean;
    };
};

function cleanString(value: unknown): string {
    return String(value || '').trim();
}

function parseNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function getKakaoRestApiKey() {
    return process.env.KAKAO_REST_API_KEY || process.env.KAKAO_LOCAL_REST_API_KEY || '';
}

function normalizeRegion(document: KakaoAddressDocument) {
    const road = document.road_address;
    const address = document.address;
    const first = cleanString(road?.region_1depth_name || address?.region_1depth_name);
    const second = cleanString(road?.region_2depth_name || address?.region_2depth_name);
    if (first && second) return `${first} ${second}`;

    const fallback = cleanString(road?.address_name || address?.address_name || document.address_name);
    const tokens = fallback.split(/\s+/).filter(Boolean);
    return tokens.slice(0, 2).join(' ');
}

function mapAddressResult(document: KakaoAddressDocument) {
    const roadAddress = cleanString(document.road_address?.address_name);
    const jibunAddress = cleanString(document.address?.address_name || document.address_name);
    const address = roadAddress || jibunAddress;

    return {
        address,
        roadAddress,
        jibunAddress,
        region: normalizeRegion(document),
        latitude: parseNumber(document.y),
        longitude: parseNumber(document.x),
        buildingName: cleanString(document.road_address?.building_name),
        zoneNo: cleanString(document.road_address?.zone_no),
        addressType: cleanString(document.address_type)
    };
}

export async function GET(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const { searchParams } = new URL(request.url);
        const query = cleanString(searchParams.get('query'));
        const apiKey = getKakaoRestApiKey();

        if (!query || query.length < 2) {
            return fail(400, 'VALIDATION_ERROR', '검색할 주소를 2글자 이상 입력해주세요.');
        }
        if (!apiKey) {
            return fail(400, 'VALIDATION_ERROR', 'KAKAO_REST_API_KEY is required for address search');
        }

        const requesterProfile = await getRequesterProfile(supabaseAdmin, request);
        if (!requesterProfile) {
            return fail(401, 'AUTH_REQUIRED', 'requesterId is required');
        }

        const url = new URL(KAKAO_LOCAL_ADDRESS_URL);
        url.searchParams.set('query', query);
        url.searchParams.set('analyze_type', 'similar');
        url.searchParams.set('size', '10');

        const response = await fetch(url.toString(), {
            headers: {
                Authorization: `KakaoAK ${apiKey}`
            },
            cache: 'no-store'
        });

        if (!response.ok) {
            const message = await response.text().catch(() => '');
            console.error('Kakao address search error:', response.status, message);
            return fail(502, 'INTERNAL_ERROR', 'Kakao 주소 검색 호출에 실패했습니다.');
        }

        const payload = await response.json() as KakaoAddressResponse;
        const results = (payload.documents || [])
            .map(mapAddressResult)
            .filter(result => result.address && result.latitude !== null && result.longitude !== null);

        return ok({
            results,
            total: payload.meta?.total_count || results.length
        });
    } catch (error) {
        console.error('Kakao address search route error:', error);
        return fail(500, 'INTERNAL_ERROR', '주소 검색 중 오류가 발생했습니다.');
    }
}
