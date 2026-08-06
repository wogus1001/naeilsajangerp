import assert from 'node:assert/strict';
import test from 'node:test';
import {
    DEMO_STORIES,
    DEMO_STORY_ORDER,
    selectDemoStoriesForRole
} from './demoStories.ts';

test('Given the manager demo When choosing a job story Then four distinct workflows are available', () => {
    const stories = selectDemoStoriesForRole('manager');

    assert.deepEqual(stories.map(story => story.id), DEMO_STORY_ORDER);
    assert.equal(new Set(stories.map(story => story.id)).size, 4);
    assert.equal(stories.every(story => story.steps.length >= 7), true);
});

test('Given a job story When checking its steps Then every step points to one valid demo destination', () => {
    for (const story of Object.values(DEMO_STORIES)) {
        for (const step of story.steps) {
            const destinationCount = Number('screen' in step) + Number('featurePath' in step);
            assert.equal(destinationCount, 1);
            assert.equal(Boolean(step.targetId), true);
            assert.equal(Boolean(step.targetSelector), true);
        }
    }
});

test('Given the four job stories When comparing their destinations Then the full franchise lifecycle is covered', () => {
    assert.deepEqual(
        Array.from(new Set(DEMO_STORIES.sales.steps.map(step => 'screen' in step ? step.screen : undefined).filter(Boolean))),
        ['leadDb']
    );
    assert.deepEqual(
        Array.from(new Set(DEMO_STORIES.siteDevelopment.steps.map(step => 'screen' in step ? step.screen : undefined).filter(Boolean))),
        ['leadDb', 'location', 'locationMap']
    );
    assert.deepEqual(
        Array.from(new Set(
            DEMO_STORIES.openingOperations.steps
                .map(step => 'featurePath' in step ? step.featurePath : undefined)
                .filter(Boolean)
        )),
        [
            '/dashboard/franchise-leads/labor-planning',
            '/dashboard/franchise-operations/schedule',
            '/dashboard/franchise-operations/owner-portal'
        ]
    );
    assert.deepEqual(
        Array.from(new Set(
            DEMO_STORIES.headOffice.steps
                .map(step => 'featurePath' in step ? step.featurePath : undefined)
                .filter(Boolean)
        )),
        [
            '/dashboard/franchise-supervision',
            '/dashboard/franchise-vendors',
            '/contracts/vendor',
            '/contracts/electronic',
            '/dashboard/franchise-operations/owner-portal'
        ]
    );
});

test('Given the franchise sales story When workflow notes are complete Then disclosure delivery is explained before promotion', () => {
    const salesSteps = DEMO_STORIES.sales.steps;
    const workflowIndex = salesSteps.findIndex(step => step.targetId === 'lead-detail-workflow');
    const disclosureIndex = salesSteps.findIndex(step => step.targetId === 'lead-detail-disclosure');
    const promotionIndex = salesSteps.findIndex(step => step.targetId === 'lead-db-promote-action');

    assert.equal(salesSteps.length, 8);
    assert.equal(disclosureIndex, workflowIndex + 1);
    assert.equal(promotionIndex, disclosureIndex + 1);
    assert.equal(
        salesSteps[disclosureIndex]?.targetSelector,
        '[role="dialog"][aria-labelledby="franchise-lead-detail-title"] section[aria-label="가맹 희망자 정보공개서"]'
    );
});

test('Given a restricted partner role When selecting stories Then internal headquarters workflows stay hidden', () => {
    assert.deepEqual(selectDemoStoriesForRole('partner'), []);
    assert.equal(selectDemoStoriesForRole('admin').length, 4);
});
