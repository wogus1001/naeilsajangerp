import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveLeadWorkspaceTransition } from './leadWorkspaceState.js';

test('resolveLeadWorkspaceTransition forces contract-complete filter for contract owner workspace', () => {
    assert.deepEqual(
        resolveLeadWorkspaceTransition({
            currentTab: 'dashboard',
            nextTab: 'contractOwners',
            currentStatusFilter: '전체',
            currentLeadDbLayer: 'raw_intake',
            currentViewMode: 'pipeline'
        }),
        {
            workspaceTab: 'contractOwners',
            statusFilter: '계약완료',
            leadDbLayer: 'candidate',
            viewMode: 'table'
        }
    );
});

test('resolveLeadWorkspaceTransition clears contract-complete filter when leaving contract owner workspace', () => {
    assert.deepEqual(
        resolveLeadWorkspaceTransition({
            currentTab: 'contractOwners',
            nextTab: 'dashboard',
            currentStatusFilter: '계약완료',
            currentLeadDbLayer: 'candidate',
            currentViewMode: 'table'
        }),
        {
            workspaceTab: 'dashboard',
            statusFilter: '전체',
            leadDbLayer: 'candidate',
            viewMode: 'table'
        }
    );
});

test('resolveLeadWorkspaceTransition opens raw intake by default when entering DB workspace', () => {
    assert.deepEqual(
        resolveLeadWorkspaceTransition({
            currentTab: 'dashboard',
            nextTab: 'db',
            currentStatusFilter: '전체',
            currentLeadDbLayer: 'candidate',
            currentViewMode: 'pipeline'
        }),
        {
            workspaceTab: 'db',
            statusFilter: '전체',
            leadDbLayer: 'raw_intake',
            viewMode: 'table'
        }
    );
});

test('resolveLeadWorkspaceTransition preserves existing filters for normal workspace changes', () => {
    assert.deepEqual(
        resolveLeadWorkspaceTransition({
            currentTab: 'db',
            nextTab: 'dashboard',
            currentStatusFilter: '상담중',
            currentLeadDbLayer: 'candidate',
            currentViewMode: 'tasks'
        }),
        {
            workspaceTab: 'dashboard',
            statusFilter: '상담중',
            leadDbLayer: 'candidate',
            viewMode: 'tasks'
        }
    );
});
