import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildMetaOAuthDiagnostics } from './meta-oauth-diagnostics';

void test('Meta OAuth 진단은 권한 상태와 토큰 필드 없는 Page 목록만 반환한다', () => {
    // Given
    const permissionPayload = {
        data: [
            { permission: 'pages_show_list', status: 'declined' },
            { permission: 'leads_retrieval', status: 'granted' }
        ]
    };
    const pagePayload = {
        data: [
            {
                id: 'page-1',
                name: '내일사장',
                access_token: 'secret-page-token',
                tasks: ['ADVERTISE', 'LEADGEN']
            }
        ]
    };

    // When
    const diagnostics = buildMetaOAuthDiagnostics(permissionPayload, pagePayload);

    // Then
    assert.deepEqual(diagnostics, {
        permissions: [
            { permission: 'pages_show_list', status: 'declined' },
            { permission: 'leads_retrieval', status: 'granted' }
        ],
        pagesWithoutTokenFields: [
            {
                id: 'page-1',
                name: '내일사장',
                tasks: ['ADVERTISE', 'LEADGEN']
            }
        ]
    });
    assert.equal(JSON.stringify(diagnostics).includes('secret-page-token'), false);
});
