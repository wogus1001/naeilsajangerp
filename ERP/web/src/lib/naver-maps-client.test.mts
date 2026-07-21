import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    buildNaverMapSearchUrl,
    loadNaverMapsSdk,
    parseNaverGeocodeApiResponse
} from './naver-maps-client.js';

test('Given a successful API envelope When parsing geocode data Then a map position is returned', () => {
    const position = parseNaverGeocodeApiResponse({
        data: { address: '서울특별시 강남구 테헤란로 123', lat: 37.5, lng: 127.03 },
        success: true
    });

    assert.deepEqual(position, {
        address: '서울특별시 강남구 테헤란로 123',
        lat: 37.5,
        lng: 127.03
    });
});

test('Given a malformed API envelope When parsing geocode data Then no position is returned', () => {
    assert.equal(parseNaverGeocodeApiResponse({ data: { lat: '37.5', lng: 127.03 } }), null);
});

test('Given a Korean address When building an external map link Then the address is encoded', () => {
    assert.equal(
        buildNaverMapSearchUrl('서울 강남구 테헤란로 123'),
        'https://map.naver.com/p/search/%EC%84%9C%EC%9A%B8%20%EA%B0%95%EB%82%A8%EA%B5%AC%20%ED%85%8C%ED%97%A4%EB%9E%80%EB%A1%9C%20123'
    );
});

test('Given an SDK load failure When loading again Then the failed script is replaced and retried', async () => {
    const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
    const originalScriptElement = Object.getOwnPropertyDescriptor(globalThis, 'HTMLScriptElement');
    const originalNaver = Object.getOwnPropertyDescriptor(globalThis, 'naver');
    let currentScript: FakeScript | null = null;
    let appendCount = 0;

    class FakeScript extends EventTarget {
        id = '';
        async = false;
        src = '';

        remove() {
            if (currentScript === this) currentScript = null;
        }
    }

    Object.defineProperty(globalThis, 'HTMLScriptElement', { configurable: true, value: FakeScript });
    Object.defineProperty(globalThis, 'document', {
        configurable: true,
        value: {
            createElement: () => new FakeScript(),
            getElementById: () => currentScript,
            head: {
                appendChild: (script: FakeScript) => {
                    appendCount += 1;
                    currentScript = script;
                    queueMicrotask(() => {
                        if (appendCount === 1) {
                            script.dispatchEvent(new Event('error'));
                            return;
                        }
                        Object.defineProperty(globalThis, 'naver', {
                            configurable: true,
                            value: { maps: { Map: class FakeMap {} } }
                        });
                        script.dispatchEvent(new Event('load'));
                    });
                    return script;
                }
            }
        }
    });

    try {
        await assert.rejects(loadNaverMapsSdk('public-client-id'));
        await loadNaverMapsSdk('public-client-id');
        assert.equal(appendCount, 2);
    } finally {
        restoreGlobal('document', originalDocument);
        restoreGlobal('HTMLScriptElement', originalScriptElement);
        restoreGlobal('naver', originalNaver);
    }
});

function restoreGlobal(name: string, descriptor: PropertyDescriptor | undefined) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else Reflect.deleteProperty(globalThis, name);
}
