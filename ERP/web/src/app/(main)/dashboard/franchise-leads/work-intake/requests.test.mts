import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MATCHING_REQUEST_INITIAL_FORM } from '@/lib/franchise-matching-request';
import { PROPERTY_REGISTRATION_INITIAL_FORM } from '@/lib/franchise-property-registration';
import { buildInitialEditForm, buildWorkIntakeEditRequestBody } from './requests.js';
import type { MatchingRequestItem, PropertyItem, WorkIntakeEditTarget } from './types.js';

const propertyItem: PropertyItem = {
    id: 'property-1',
    companyName: '미래',
    managerId: 'author-1',
    authorId: 'author-1',
    authorName: '작성자',
    name: '입점 요청',
    status: '공실',
    address: '서울',
    region: '서울',
    desiredBrand: '브랜드',
    desiredCategory: '카페',
    deposit: '1000',
    monthlyRent: '100',
    createdAt: '2026-06-30T00:00:00.000Z',
    canEdit: true,
    canDelete: true,
    form: PROPERTY_REGISTRATION_INITIAL_FORM
};

const matchingItem: MatchingRequestItem = {
    id: 'matching-1',
    managerId: 'author-2',
    authorId: 'author-2',
    managerName: '작성자',
    name: '예비 창업자',
    mobile: '010-0000-0000',
    email: '',
    status: '신규',
    desiredRegion: '서울',
    desiredCategory: '카페',
    interestedBrand: '브랜드',
    totalBudget: '5000',
    ownedPropertyStatus: '',
    matchPriority: '',
    urgency: '',
    memo: '',
    createdAt: '2026-06-30T00:00:00.000Z',
    canEdit: true,
    canDelete: true,
    form: MATCHING_REQUEST_INITIAL_FORM
};

test('Given a team lead edits a property intake When building request body Then the original author remains managerId', () => {
    const target: WorkIntakeEditTarget = { kind: 'properties', item: propertyItem };
    const body = buildWorkIntakeEditRequestBody(target, buildInitialEditForm(target), 'team-lead-1');

    assert.equal(body.requesterId, 'team-lead-1');
    assert.equal(body.managerId, 'author-1');
});

test('Given a team lead edits a matching request When building request body Then the original author remains managerId', () => {
    const target: WorkIntakeEditTarget = { kind: 'matchingRequests', item: matchingItem };
    const body = buildWorkIntakeEditRequestBody(target, buildInitialEditForm(target), 'team-lead-1');

    assert.equal(body.requesterId, 'team-lead-1');
    assert.equal(body.managerId, 'author-2');
});
