import type { LoaderOptions } from 'react-kakao-maps-sdk';

export const KAKAO_MAP_LOADER_OPTIONS = {
    appkey: process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY || '26c1197bae99e17f8c1f3e688e22914d',
    libraries: ['clusterer', 'drawing', 'services'],
    url: 'https://dapi.kakao.com/v2/maps/sdk.js'
} satisfies LoaderOptions;
