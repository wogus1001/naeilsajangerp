import assert from 'node:assert/strict';
import { test } from 'node:test';
import { paginateWorkIntakeItems, parseWorkIntakeQuery } from './work-intake-query.js';

type Row = {
    readonly title: string;
    readonly status: string;
    readonly date: string;
    readonly author: string;
};

const adapter = {
    getSearchFields: (row: Row) => [row.title, row.author],
    getStatus: (row: Row) => row.status,
    getDate: (row: Row) => row.date
};

test('Given work intake rows When filtering by search status and date Then only matching rows remain', () => {
    const query = parseWorkIntakeQuery(new URLSearchParams({
        search: '강남',
        status: '공실',
        from: '2026-07-01',
        to: '2026-07-31'
    }));
    const result = paginateWorkIntakeItems<Row>([
        { title: '강남 입점 요청', status: '공실', date: '2026-07-15T00:00:00.000Z', author: '김팀장' },
        { title: '강남 입점 요청', status: '영업중', date: '2026-07-15T00:00:00.000Z', author: '김팀장' },
        { title: '마포 입점 요청', status: '공실', date: '2026-07-15T00:00:00.000Z', author: '김팀장' },
        { title: '강남 입점 요청', status: '공실', date: '2026-08-01T00:00:00.000Z', author: '김팀장' }
    ], query, adapter);

    assert.deepEqual(result.items.map(row => row.title), ['강남 입점 요청']);
    assert.equal(result.meta.total, 1);
});

test('Given many work intake rows When paginating Then page metadata is clamped', () => {
    const query = parseWorkIntakeQuery(new URLSearchParams({ page: '3', pageSize: '2' }));
    const rows: readonly Row[] = [
        { title: '1', status: '공실', date: '2026-07-01', author: 'a' },
        { title: '2', status: '공실', date: '2026-07-02', author: 'a' },
        { title: '3', status: '공실', date: '2026-07-03', author: 'a' }
    ];
    const result = paginateWorkIntakeItems<Row>(rows, query, adapter);

    assert.deepEqual(result.items.map(row => row.title), ['3']);
    assert.deepEqual(result.meta, { page: 2, pageSize: 2, total: 3, pageCount: 2 });
});

test('Given invalid query numbers When parsing Then safe defaults are used', () => {
    const query = parseWorkIntakeQuery(new URLSearchParams({ page: '0', pageSize: '500' }));

    assert.equal(query.page, 1);
    assert.equal(query.pageSize, 50);
});
