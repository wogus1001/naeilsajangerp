import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./SupervisionPanelSections.tsx', import.meta.url), 'utf8');

test('Given report processing history When rendered Then it is collapsed in an accessible accordion by default', () => {
    const timelineStart = source.indexOf('<details className={styles.timelineAccordion}>');
    const timelineEnd = source.indexOf('</details>', timelineStart);
    const timelineSource = source.slice(timelineStart, timelineEnd);

    assert.ok(timelineStart > -1);
    assert.match(timelineSource, /<summary className=\{styles\.timelineSummary\}>/);
    assert.match(timelineSource, /이 보고서 처리 이력/);
    assert.doesNotMatch(timelineSource, /\sopen(?:=|\s|>)/);
});

test('Given an existing report When rendering the editor Then only its author can edit or submit it', () => {
    assert.match(source, /props\.report\.createdBy === props\.userId/);
});
