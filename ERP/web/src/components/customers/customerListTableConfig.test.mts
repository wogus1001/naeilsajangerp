import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    CUSTOMER_LIST_COLUMNS,
    DEFAULT_CUSTOMER_COLUMN_PREFERENCES,
    getCustomerListRenderedColumns,
    getLatestCustomerWork,
    moveCustomerListColumn,
    normalizeCustomerColumnPreferences,
    reorderCustomerListColumns,
    toggleCustomerListColumn
} from './customerListTableConfig.js';
import { getCustomerListSortValue } from './customerListTableValues.js';

test('Given multiple customer work entries When the latest work is selected Then its date and content are returned together', () => {
    const latestWork = getLatestCustomerWork([
        { date: '2026-08-04', content: '첫 상담 진행' },
        { date: '2026-08-06', content: '명함 문자 발송' },
        { date: '2026-08-05', content: '조건 재확인' }
    ]);

    assert.deepEqual(latestWork, {
        date: '2026-08-06',
        content: '명함 문자 발송'
    });
});

test('Given work entries on the same date When the latest work is selected Then the first saved entry is kept', () => {
    const latestWork = getLatestCustomerWork([
        { date: '2026-08-06', content: '오후 후속 연락' },
        { date: '2026-08-06', content: '오전 최초 연락' }
    ]);

    assert.deepEqual(latestWork, {
        date: '2026-08-06',
        content: '오후 후속 연락'
    });
});

test('Given no customer work entry When the latest work is selected Then empty display values are returned', () => {
    assert.deepEqual(getLatestCustomerWork([]), {
        date: '-',
        content: '-'
    });
});

test('Given default customer columns When the table opens Then work date and work content are visible', () => {
    assert.deepEqual(
        CUSTOMER_LIST_COLUMNS
            .filter(column => column.key === 'latestWorkDate' || column.key === 'latestWorkContent')
            .map(column => ({ key: column.key, defaultVisible: column.defaultVisible })),
        [
            { key: 'latestWorkDate', defaultVisible: true },
            { key: 'latestWorkContent', defaultVisible: true }
        ]
    );
});

test('Given customer list columns When the table renders Then the favorite column stays before No', () => {
    const renderedColumns = getCustomerListRenderedColumns(DEFAULT_CUSTOMER_COLUMN_PREFERENCES);

    assert.deepEqual(renderedColumns.slice(0, 3), ['star', 'no', 'name']);
});

test('Given customer column preferences When a column is toggled Then optional columns hide and the customer name remains visible', () => {
    const hiddenWorkContent = toggleCustomerListColumn(
        DEFAULT_CUSTOMER_COLUMN_PREFERENCES,
        'latestWorkContent'
    );
    const attemptedHiddenName = toggleCustomerListColumn(hiddenWorkContent, 'name');

    assert.equal(hiddenWorkContent.visible.includes('latestWorkContent'), false);
    assert.equal(attemptedHiddenName.visible.includes('name'), true);
});

test('Given customer column order When a column moves up or down Then only its position changes', () => {
    const movedUp = moveCustomerListColumn(
        DEFAULT_CUSTOMER_COLUMN_PREFERENCES,
        'latestWorkContent',
        'up'
    );
    const movedBackDown = moveCustomerListColumn(movedUp, 'latestWorkContent', 'down');

    assert.equal(
        movedUp.order.indexOf('latestWorkContent'),
        DEFAULT_CUSTOMER_COLUMN_PREFERENCES.order.indexOf('latestWorkContent') - 1
    );
    assert.deepEqual(movedBackDown.order, DEFAULT_CUSTOMER_COLUMN_PREFERENCES.order);
    assert.deepEqual(new Set(movedUp.visible), new Set(DEFAULT_CUSTOMER_COLUMN_PREFERENCES.visible));
});

test('Given customer column order When a column is dragged onto another column Then it moves to that position', () => {
    const reordered = reorderCustomerListColumns(
        DEFAULT_CUSTOMER_COLUMN_PREFERENCES,
        'latestWorkContent',
        'name'
    );

    assert.equal(reordered.order[0], 'no');
    assert.equal(reordered.order[1], 'latestWorkContent');
    assert.equal(reordered.order[2], 'name');
    assert.deepEqual(reordered.visible, reordered.order);
});

test('Given malformed saved preferences When they are restored Then valid choices remain and missing columns are appended', () => {
    const restored = normalizeCustomerColumnPreferences({
        order: ['latestWorkContent', 'unknown', 'name', 'latestWorkContent'],
        visible: ['latestWorkContent', 'unknown']
    });

    assert.equal(restored.order[0], 'latestWorkContent');
    assert.equal(restored.order[1], 'name');
    assert.equal(new Set(restored.order).size, CUSTOMER_LIST_COLUMNS.length);
    assert.equal(restored.visible.includes('latestWorkContent'), true);
    assert.equal(restored.visible.includes('name'), true);
});

test('Given customer work history When a work column is sorted Then the latest matching value is used', () => {
    const customer = {
        id: 'customer-1',
        name: '김고객',
        grade: 'manage',
        gender: 'M' as const,
        class: '',
        status: '',
        feature: '',
        address: '',
        mobile: '',
        companyPhone: '',
        wantedDepositMin: '',
        wantedDepositMax: '',
        wantedRentMin: '',
        wantedRentMax: '',
        wantedItem: '',
        wantedIndustry: '',
        wantedArea: '',
        createdAt: '2026-08-01',
        updatedAt: '2026-08-06',
        managerId: '',
        history: [
            { date: '2026-08-06', content: '최신 작업' },
            { date: '2026-08-05', content: '이전 작업' }
        ]
    };

    assert.equal(getCustomerListSortValue(customer, 'latestWorkDate', {}), '2026-08-06');
    assert.equal(getCustomerListSortValue(customer, 'latestWorkContent', {}), '최신 작업');
});
