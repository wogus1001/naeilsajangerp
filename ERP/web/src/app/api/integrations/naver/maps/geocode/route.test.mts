import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { RequesterProfile } from '@/lib/api-auth';
import {
    handleNaverMapsGeocodeGET,
    type NaverMapsGeocodeRouteDependencies
} from './route.js';

const requester: RequesterProfile = {
    id: 'staff-1',
    role: 'staff',
    company_id: 'company-1',
    status: 'active'
};

function request(query = '서울 강남구 테헤란로 123'): Request {
    return new Request(`http://localhost/api/integrations/naver/maps/geocode?query=${encodeURIComponent(query)}`);
}

function dependencies(
    overrides: Partial<NaverMapsGeocodeRouteDependencies> = {}
): NaverMapsGeocodeRouteDependencies {
    return {
        config: { clientId: 'client-id', clientSecret: 'client-secret' },
        geocode: async () => ({
            address: '서울특별시 강남구 테헤란로 123',
            lat: 37.5,
            lng: 127.03
        }),
        getRequester: async () => requester,
        ...overrides
    };
}

test('Given no authenticated requester When geocoding an address Then authentication is required', async () => {
    const response = await handleNaverMapsGeocodeGET(request(), dependencies({ getRequester: async () => null }));

    assert.equal(response.status, 401);
});

test('Given an empty address When geocoding Then validation fails before provider access', async () => {
    let providerCalled = false;
    const response = await handleNaverMapsGeocodeGET(request(' '), dependencies({
        geocode: async () => {
            providerCalled = true;
            return null;
        }
    }));

    assert.equal(response.status, 400);
    assert.equal(providerCalled, false);
});

test('Given an excessively long address When geocoding Then provider access is blocked', async () => {
    let providerCalled = false;
    const response = await handleNaverMapsGeocodeGET(request('가'.repeat(301)), dependencies({
        geocode: async () => {
            providerCalled = true;
            return null;
        }
    }));

    assert.equal(response.status, 400);
    assert.equal(providerCalled, false);
});

test('Given missing Naver Maps credentials When geocoding Then configuration guidance is returned', async () => {
    const response = await handleNaverMapsGeocodeGET(request(), dependencies({ config: null }));
    const payload = await response.json();

    assert.equal(response.status, 503);
    assert.equal(payload.message, '네이버 지도 연동 설정이 필요합니다.');
});

test('Given an address with a provider match When geocoding Then coordinates are returned', async () => {
    let receivedAddress = '';
    const response = await handleNaverMapsGeocodeGET(request(), dependencies({
        geocode: async address => {
            receivedAddress = address;
            return { address: '서울특별시 강남구 테헤란로 123', lat: 37.5, lng: 127.03 };
        }
    }));
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(receivedAddress, '서울 강남구 테헤란로 123');
    assert.deepEqual(payload, {
        data: {
            address: '서울특별시 강남구 테헤란로 123',
            lat: 37.5,
            lng: 127.03
        },
        success: true
    });
});

test('Given an address without a provider match When geocoding Then a localized not-found response is returned', async () => {
    const response = await handleNaverMapsGeocodeGET(request(), dependencies({ geocode: async () => null }));

    assert.equal(response.status, 404);
});

test('Given a provider network failure When geocoding Then a localized gateway response is returned', async () => {
    const response = await handleNaverMapsGeocodeGET(request(), dependencies({
        geocode: async () => {
            throw new TypeError('network unavailable');
        }
    }));
    const payload = await response.json();

    assert.equal(response.status, 502);
    assert.equal(payload.message, '네이버 지도에서 주소 위치를 확인하지 못했습니다.');
});

test('Given malformed provider JSON When geocoding Then a localized gateway response is returned', async () => {
    const response = await handleNaverMapsGeocodeGET(request(), dependencies({
        geocode: async () => {
            throw new SyntaxError('Unexpected token');
        }
    }));

    assert.equal(response.status, 502);
});

test('Given concurrent matching addresses When geocoding Then the provider request is shared', async () => {
    let providerCalls = 0;
    let resolveProvider: (position: { address: string; lat: number; lng: number }) => void = () => {
        throw new Error('Provider resolver was not initialized.');
    };
    const sharedDependencies = dependencies({
        geocode: () => {
            providerCalls += 1;
            return new Promise(resolve => {
                resolveProvider = resolve;
            });
        }
    });

    const first = handleNaverMapsGeocodeGET(request(), sharedDependencies);
    const second = handleNaverMapsGeocodeGET(request(), sharedDependencies);
    await Promise.resolve();
    assert.equal(providerCalls, 1);
    resolveProvider({ address: '서울특별시 강남구 테헤란로 123', lat: 37.5, lng: 127.03 });

    assert.deepEqual(await Promise.all([first.then(response => response.status), second.then(response => response.status)]), [200, 200]);
});
