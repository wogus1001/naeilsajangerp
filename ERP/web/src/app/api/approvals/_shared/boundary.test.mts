import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    ApprovalInputError,
    parseAction,
    parseInboxQuery,
    parseOptionalUuid,
    parseRequiredText,
    parseUuidArray
} from './boundary.js';

const profileId = '11111111-1111-4111-8111-111111111111';

test('Given malformed identifiers When parsing approval input Then validation stops at the boundary', () => {
    assert.throws(() => parseOptionalUuid('not-a-uuid', 'companyId'), ApprovalInputError);
    assert.throws(() => parseUuidArray([profileId, 'bad'], 'readerProfileIds'), ApprovalInputError);
});

test('Given duplicate UUIDs When parsing an actor list Then values are normalized and deduplicated', () => {
    assert.deepEqual(parseUuidArray([`  ${profileId.toUpperCase()}  `, profileId], 'readerProfileIds'), [profileId]);
});

test('Given blank or oversized text When parsing a required field Then validation fails', () => {
    assert.throws(() => parseRequiredText('   ', 'title', 200), ApprovalInputError);
    assert.throws(() => parseRequiredText('x'.repeat(201), 'title', 200), ApprovalInputError);
});

test('Given approval actions When parsing Then only the standard action surface is accepted', () => {
    assert.equal(parseAction('acknowledge'), 'acknowledge');
    assert.equal(parseAction('saveDraft'), 'saveDraft');
    assert.throws(() => parseAction('cancel'), ApprovalInputError);
});

test('Given inbox filters and pagination When parsing Then bounds and defaults are deterministic', () => {
    const parsed = parseInboxQuery(new URL('http://localhost/api/approvals/inbox?filter=received&page=2&pageSize=25&query=%EC%A7%80%EC%B6%9C&status=approved&from=2026-07-01&to=2026-07-31').searchParams);
    assert.deepEqual(parsed, {
        filter: 'received',
        page: 2,
        pageSize: 25,
        query: '지출',
        status: 'approved',
        from: '2026-07-01',
        to: '2026-07-31'
    });

    assert.deepEqual(parseInboxQuery(new URL('http://localhost/api/approvals/inbox').searchParams), {
        filter: 'waiting',
        page: 1,
        pageSize: 20,
        query: '',
        status: 'all',
        from: '',
        to: ''
    });
    assert.throws(
        () => parseInboxQuery(new URL('http://localhost/api/approvals/inbox?filter=all&pageSize=101').searchParams),
        ApprovalInputError
    );
    assert.throws(
        () => parseInboxQuery(new URL('http://localhost/api/approvals/inbox?status=unknown').searchParams),
        ApprovalInputError
    );
    assert.throws(
        () => parseInboxQuery(new URL('http://localhost/api/approvals/inbox?from=2026-07-31&to=2026-07-01').searchParams),
        ApprovalInputError
    );
});
