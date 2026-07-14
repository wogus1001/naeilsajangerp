import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ApprovalHistoryContent } from './ApprovalHistoryContent.js';

test('Given document events When rendering history Then it is collapsed by default and keeps the event count', () => {
    const html = renderToStaticMarkup(createElement(ApprovalHistoryContent, {
        events: [
            {
                actorName: '김담당',
                createdAt: '2026-07-13T09:30:00+09:00',
                id: 'event-1',
                message: '문서를 제출했습니다.',
                type: 'submit'
            },
            {
                actorName: '이팀장',
                createdAt: '2026-07-13T10:10:00+09:00',
                id: 'event-2',
                message: '결재를 승인했습니다.',
                type: 'approve'
            }
        ]
    }));

    assert.match(html, /^<details/);
    assert.doesNotMatch(html, /^<details[^>]*\sopen(?:=|\s|>)/);
    assert.match(html, /처리 이력/);
    assert.match(html, /2건/);
});
