import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

test('Given a demo workspace When a shared component uses app dialogs Then the demo runtime provides the dialog context', () => {
    const shellSource = readFileSync(new URL('./DemoShell.tsx', import.meta.url), 'utf8');
    const providerSource = readFileSync(new URL('./DemoRuntimeProviders.tsx', import.meta.url), 'utf8');

    assert.match(shellSource, /<DemoRuntimeProviders>/);
    assert.match(shellSource, /<\/DemoRuntimeProviders>/);
    assert.match(providerSource, /<AppDialogProvider>/);
    assert.match(providerSource, /<LeadDetailRuntimeProvider runtime=\{leadDetailRuntime\}>/);
    assert.match(providerSource, /createDemoLeadDetailRuntime/);
});
