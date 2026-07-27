import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildMetaPageDiscoveryDiagnostics } from './meta-page-diagnostics';

void test('Meta Page 발견 진단은 토큰을 노출하지 않고 연결 가능 여부만 반환한다', () => {
    // Given
    const pages = [
        {
            id: 'page-with-token',
            name: '내일사장',
            access_token: 'secret-page-token',
            tasks: ['ADVERTISE', 'LEADGEN']
        },
        {
            id: 'page-without-token',
            name: '권한 누락 페이지'
        }
    ];

    // When
    const diagnostics = buildMetaPageDiscoveryDiagnostics(pages);

    // Then
    assert.deepEqual(diagnostics, [
        {
            id: 'page-with-token',
            name: '내일사장',
            hasAccessToken: true,
            tasks: ['ADVERTISE', 'LEADGEN']
        },
        {
            id: 'page-without-token',
            name: '권한 누락 페이지',
            hasAccessToken: false,
            tasks: []
        }
    ]);
    assert.equal(JSON.stringify(diagnostics).includes('secret-page-token'), false);
});
