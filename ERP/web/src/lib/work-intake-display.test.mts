import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatWorkIntakePropertyMeta } from './work-intake-display.js';

test('Given a work intake property has an author When rendering metadata Then company, author, and status are shown together', () => {
    assert.equal(
        formatWorkIntakePropertyMeta({ companyName: '미래', authorName: '김팀장', status: '공실' }),
        '미래 / 작성자 김팀장 / 공실'
    );
});

test('Given a work intake property has no author When rendering metadata Then the existing company and status line is preserved', () => {
    assert.equal(
        formatWorkIntakePropertyMeta({ companyName: '미래', authorName: '', status: '공실' }),
        '미래 / 공실'
    );
});
