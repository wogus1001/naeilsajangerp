import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    addUniqueLeadLocationLink,
    buildLeadLocationLinkView,
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

test('addUniqueLeadLocationLink prevents duplicate target connections', () => {
    const existingLinks = [
        createLeadLocationLink({
            id: 'link-1',
            targetType: 'franchise_location',
            targetId: 'loc-1',
            createdAt: '2026-06-10T10:00:00.000Z'
        })
    ];
    const nextLink = createLeadLocationLink({
            id: 'link-2',
            targetType: 'franchise_location',
            targetId: 'loc-1',
            status: '제안 예정',
            createdAt: '2026-06-10T11:00:00.000Z'
        });
    const links = addUniqueLeadLocationLink(existingLinks, nextLink);

    assert.equal(links.length, 1);
    assert.equal(links[0]?.id, 'link-1');
    assert.equal(links[0]?.status, '검토 예정');
});

test('addUniqueLeadLocationLink prepends a new target connection', () => {
    const existingLinks = [
        createLeadLocationLink({
            id: 'link-1',
            targetType: 'franchise_location',
            targetId: 'loc-1',
            createdAt: '2026-06-10T10:00:00.000Z'
        })
    ];
    const nextLink = createLeadLocationLink({
        id: 'link-2',
        targetType: 'external_property_listing',
        targetId: 'listing-1',
        status: '제안 예정',
        createdAt: '2026-06-10T11:00:00.000Z'
    });

    const links = addUniqueLeadLocationLink(existingLinks, nextLink);

    assert.equal(links.length, 2);
    assert.equal(links[0]?.id, 'link-2');
    assert.equal(links[1]?.id, 'link-1');
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

test('Given operational stores When building the lead location view Then they are excluded from new candidates', () => {
    const view = buildLeadLocationLinkView([
        { id: 'store-opening', locationType: '가맹점', status: '오픈준비' },
        { id: 'store-active', locationType: '예정점', status: '운영중' }
    ], []);

    assert.deepEqual(view.candidateOptions, []);
});

test('Given planning locations When building the lead location view Then planned review and opening candidates remain available', () => {
    const locations = [
        { id: 'candidate-planned', locationType: '예정점', status: '' },
        { id: 'candidate-review', locationType: '', status: '검토중' },
        { id: 'candidate-opening', locationType: '', status: '오픈준비' }
    ];

    const view = buildLeadLocationLinkView(locations, []);

    assert.deepEqual(view.candidateOptions, locations);
});

test('Given a linked candidate promoted to an operational store When building the lead location view Then the existing link remains resolvable', () => {
    const promotedLocation = {
        id: 'promoted-store',
        locationType: '가맹점',
        status: '운영중'
    };
    const existingLink = createLeadLocationLink({
        id: 'link-promoted',
        targetType: 'franchise_location',
        targetId: promotedLocation.id,
        createdAt: '2026-08-04T09:00:00.000Z'
    });

    const view = buildLeadLocationLinkView([promotedLocation], [existingLink]);

    assert.deepEqual(view.candidateOptions, []);
    assert.equal(view.linkedLocationsById.get(promotedLocation.id), promotedLocation);
});
