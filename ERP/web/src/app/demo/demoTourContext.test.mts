import assert from 'node:assert/strict';
import test from 'node:test';
import { getDemoTourContextKey } from './demoTourContext.ts';

test('Given a core tour When its route changes Then the overlay context stays stable', () => {
    const leadDbContext = getDemoTourContextKey({
        mode: 'core',
        selectedStoryId: undefined,
        activeFeaturePath: '',
        activeScreen: 'leadDb'
    });
    const locationContext = getDemoTourContextKey({
        mode: 'core',
        selectedStoryId: undefined,
        activeFeaturePath: '',
        activeScreen: 'location'
    });

    assert.equal(leadDbContext, 'core');
    assert.equal(locationContext, leadDbContext);
});

test('Given a story tour When it crosses screens Then the story keeps one overlay context', () => {
    const leadDbContext = getDemoTourContextKey({
        mode: 'story',
        selectedStoryId: 'siteDevelopment',
        activeFeaturePath: '',
        activeScreen: 'leadDb'
    });
    const locationMapContext = getDemoTourContextKey({
        mode: 'story',
        selectedStoryId: 'siteDevelopment',
        activeFeaturePath: '',
        activeScreen: 'locationMap'
    });

    assert.equal(leadDbContext, 'story-siteDevelopment');
    assert.equal(locationMapContext, leadDbContext);
});

test('Given a screen guide When a different surface opens Then a fresh overlay context is used', () => {
    const leadDbContext = getDemoTourContextKey({
        mode: 'screen',
        selectedStoryId: undefined,
        activeFeaturePath: '',
        activeScreen: 'leadDb'
    });
    const featureContext = getDemoTourContextKey({
        mode: 'screen',
        selectedStoryId: undefined,
        activeFeaturePath: '/dashboard/franchise-supervision',
        activeScreen: 'operations'
    });

    assert.equal(leadDbContext, 'screen-leadDb');
    assert.equal(featureContext, 'screen-/dashboard/franchise-supervision');
    assert.notEqual(featureContext, leadDbContext);
});
