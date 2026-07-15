import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createAppDialogQueue } from './appDialogQueue.js';

test('dialog queue resolves each request once without dismissing the next dialog', () => {
    const activeMessages: Array<string | null> = [];
    const results: Array<{ message: string; result: boolean }> = [];
    const queue = createAppDialogQueue<{ message: string; resolve: (result: boolean) => void }>(request => {
        activeMessages.push(request?.message ?? null);
    });

    queue.enqueue({ message: 'first', resolve: result => results.push({ message: 'first', result }) });
    queue.enqueue({ message: 'second', resolve: result => results.push({ message: 'second', result }) });
    queue.resolveActive(true);

    assert.deepEqual(activeMessages, ['first', 'second']);
    assert.deepEqual(results, [{ message: 'first', result: true }]);

    queue.resolveActive(false);
    assert.deepEqual(activeMessages, ['first', 'second', null]);
    assert.deepEqual(results, [
        { message: 'first', result: true },
        { message: 'second', result: false }
    ]);
});

test('disposing the dialog queue settles active and pending requests as cancelled', () => {
    const results: boolean[] = [];
    const queue = createAppDialogQueue<{ resolve: (result: boolean) => void }>(() => undefined);

    queue.enqueue({ resolve: result => results.push(result) });
    queue.enqueue({ resolve: result => results.push(result) });
    queue.dispose();

    assert.deepEqual(results, [false, false]);
});
