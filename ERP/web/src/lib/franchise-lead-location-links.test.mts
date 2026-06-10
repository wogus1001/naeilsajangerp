import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    createLeadLocationLink,
    normalizeLeadLocationLinks,
    updateLeadLocationLink
} from './franchise-lead-location-links.js';

test('normalizeLeadLocationLinks keeps only valid linked targets', () => {
    const links = normalizeLeadLocationLinks([
        {
            id: 'link-1',
            targetType: 'franchise_location',
            targetId: 'loc-1',
            status: '제안 완료',
            memo: '  상담 때 보여줌  ',
            createdAt: '2026-06-10T10:00:00.000Z'
        },
        {
            id: 'broken',
            targetType: 'unknown',
            targetId: 'loc-2'
        }
    ]);

    assert.equal(links.length, 1);
    assert.equal(links[0]?.targetType, 'franchise_location');
    assert.equal(links[0]?.status, '제안 완료');
    assert.equal(links[0]?.memo, '상담 때 보여줌');
});

test('createLeadLocationLink defaults manual links to review status', () => {
    const link = createLeadLocationLink({
        id: 'link-1',
        targetType: 'external_property_listing',
        targetId: 'listing-1',
        createdAt: '2026-06-10T10:00:00.000Z',
        createdBy: 'manager-1'
    });

    assert.deepEqual(link, {
        id: 'link-1',
        targetType: 'external_property_listing',
        targetId: 'listing-1',
        status: '검토 예정',
        memo: '',
        createdAt: '2026-06-10T10:00:00.000Z',
        createdBy: 'manager-1'
    });
});

test('manual links allow the same target to be connected more than once', () => {
    const links = [
        createLeadLocationLink({
            id: 'link-1',
            targetType: 'franchise_location',
            targetId: 'loc-1',
            createdAt: '2026-06-10T10:00:00.000Z'
        }),
        createLeadLocationLink({
            id: 'link-2',
            targetType: 'franchise_location',
            targetId: 'loc-1',
            status: '제안 예정',
            createdAt: '2026-06-10T11:00:00.000Z'
        })
    ];

    assert.equal(links.length, 2);
    assert.equal(links[0]?.targetId, links[1]?.targetId);
    assert.notEqual(links[0]?.id, links[1]?.id);
    assert.equal(links[1]?.status, '제안 예정');
});

test('updateLeadLocationLink updates status and trims memo', () => {
    const links = [
        createLeadLocationLink({
            id: 'link-1',
            targetType: 'franchise_location',
            targetId: 'loc-1',
            createdAt: '2026-06-10T10:00:00.000Z'
        })
    ];

    const updated = updateLeadLocationLink(links, 'link-1', {
        status: '관심 있음',
        memo: '  예산 맞음  ',
        updatedAt: '2026-06-10T11:00:00.000Z'
    });

    assert.equal(updated[0]?.status, '관심 있음');
    assert.equal(updated[0]?.memo, '예산 맞음');
    assert.equal(updated[0]?.updatedAt, '2026-06-10T11:00:00.000Z');
});
