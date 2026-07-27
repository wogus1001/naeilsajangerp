import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    discoverMetaBusinessPages,
    readMetaBusinessPageTargetIds
} from './meta-business-page-discovery.js';

void test('readMetaBusinessPageTargetIds returns unique Page targets and excludes ad account targets', () => {
    // Given
    const tokenMetadata = {
        data: {
            granular_scopes: [
                { scope: 'ads_management', target_ids: ['act-123'] },
                { scope: 'pages_show_list', target_ids: ['600785779791577'] },
                { scope: 'leads_retrieval', target_ids: [600785779791577, 'page-2'] },
                { scope: 'public_profile' }
            ]
        }
    };

    // When
    const targetIds = readMetaBusinessPageTargetIds(tokenMetadata);

    // Then
    assert.deepEqual(targetIds, ['600785779791577', 'page-2']);
});

void test('discoverMetaBusinessPages falls back to Business Login targets when accounts are empty', async () => {
    // Given
    const requestedPageIds: string[] = [];

    // When
    const pages = await discoverMetaBusinessPages({
        fetchAccountPages: async () => [],
        fetchTokenMetadata: async () => ({
            data: {
                granular_scopes: [
                    { scope: 'pages_show_list', target_ids: ['600785779791577'] }
                ]
            }
        }),
        fetchTargetPage: async pageId => {
            requestedPageIds.push(pageId);
            return {
                id: pageId,
                name: '내일사장',
                access_token: 'page-token'
            };
        }
    });

    // Then
    assert.deepEqual(requestedPageIds, ['600785779791577']);
    assert.deepEqual(pages, [{
        id: '600785779791577',
        name: '내일사장',
        access_token: 'page-token'
    }]);
});

void test('discoverMetaBusinessPages keeps the standard accounts result without token inspection', async () => {
    // Given
    let inspectedToken = false;
    const accountPage = {
        id: 'page-from-accounts',
        name: '기존 Page',
        access_token: 'page-token'
    };

    // When
    const pages = await discoverMetaBusinessPages({
        fetchAccountPages: async () => [accountPage],
        fetchTokenMetadata: async () => {
            inspectedToken = true;
            return {};
        },
        fetchTargetPage: async () => accountPage
    });

    // Then
    assert.equal(inspectedToken, false);
    assert.deepEqual(pages, [accountPage]);
});
