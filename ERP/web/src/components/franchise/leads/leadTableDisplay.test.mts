import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    formatLeadTableMobile,
    formatLeadTableName,
    formatLeadTableText
} from './leadTableDisplay.js';

test('Given Meta test-tool placeholders When a lead row is displayed Then business-friendly values are shown', () => {
    assert.equal(formatLeadTableName('<test lead: dummy data for full_name>'), 'Meta 테스트 신청자');
    assert.equal(formatLeadTableMobile('<test lead: dummy data for phone_number>'), '-');
    assert.equal(formatLeadTableText('<test lead: dummy data for desired_region>'), '-');
    assert.equal(formatLeadTableText('<test lead: dummy data for interested_brand>'), '-');
    assert.equal(formatLeadTableText('<test lead: dummy data for memo>'), '-');
});

test('Given normal lead values When a lead row is displayed Then the original values are preserved', () => {
    assert.equal(formatLeadTableName('김가맹'), '김가맹');
    assert.equal(formatLeadTableMobile('010-1234-5678'), '010-1234-5678');
    assert.equal(formatLeadTableText('서울 송파구'), '서울 송파구');
});
