import assert from 'node:assert/strict';
import test from 'node:test';
import { getDemoTourDestination } from './demoTourDestination.ts';

test('Given a screen step When resolving its destination Then the feature surface is cleared', () => {
    const destination = getDemoTourDestination({
        id: 'screen-step',
        screen: 'location',
        targetId: 'location-list',
        targetSelector: '[data-demo-id="location-master"]',
        title: 'screen',
        description: 'screen'
    }, 'leadDb');

    assert.deepEqual(destination, { kind: 'screen', screen: 'location' });
});

test('Given a feature step When resolving its destination Then the production-like feature path is selected', () => {
    const destination = getDemoTourDestination({
        id: 'feature-step',
        featurePath: '/dashboard/franchise-supervision',
        targetId: 'supervision-overview',
        targetSelector: 'section[aria-label="슈퍼바이징 운영 리포트"]',
        title: 'feature',
        description: 'feature'
    }, 'operations');

    assert.deepEqual(destination, {
        kind: 'feature',
        path: '/dashboard/franchise-supervision',
        screen: 'operations'
    });
});

test('Given a guide step without an explicit route When resolving it Then the current screen remains active', () => {
    const destination = getDemoTourDestination({
        id: 'guide-step',
        targetId: 'guide-target',
        title: 'guide',
        description: 'guide'
    }, 'contractOwners');

    assert.deepEqual(destination, { kind: 'screen', screen: 'contractOwners' });
});
