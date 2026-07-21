import assert from 'node:assert/strict';
import { test } from 'node:test';
import { geocodeNaverAddress, parseNaverGeocodeResponse } from './naver-maps-geocoding.js';

test('Given a Naver road-address match When parsing provider data Then coordinates are normalized', () => {
    assert.deepEqual(parseNaverGeocodeResponse({
        addresses: [{
            jibunAddress: '서울특별시 강남구 역삼동 1',
            roadAddress: '서울특별시 강남구 테헤란로 123',
            x: '127.0300000',
            y: '37.5000000'
        }]
    }), {
        address: '서울특별시 강남구 테헤란로 123',
        lat: 37.5,
        lng: 127.03
    });
});

test('Given a provider match without coordinates When parsing provider data Then no position is returned', () => {
    assert.equal(parseNaverGeocodeResponse({ addresses: [{ roadAddress: '서울특별시 강남구 테헤란로 123' }] }), null);
});

test('Given a recently geocoded address When requested sequentially Then the provider result is reused', async () => {
    const originalFetch = globalThis.fetch;
    let providerCalls = 0;
    globalThis.fetch = async () => {
        providerCalls += 1;
        return new Response(JSON.stringify({
            addresses: [{
                roadAddress: '서울특별시 강남구 봉은사로 524',
                x: '127.1025',
                y: '37.5126'
            }]
        }), { status: 200 });
    };

    try {
        const credentials = { clientId: 'cache-test-client', clientSecret: 'cache-test-secret' };
        await geocodeNaverAddress('서울특별시 강남구 봉은사로 524', credentials);
        await geocodeNaverAddress('서울특별시 강남구 봉은사로 524', credentials);
        assert.equal(providerCalls, 1);
    } finally {
        globalThis.fetch = originalFetch;
    }
});
