import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import {
    LeadDetailRuntimeProvider,
    useLeadDetailRuntime
} from './LeadDetailRuntimeProvider.js';
import { LIVE_LEAD_DETAIL_RUNTIME } from './leadDetailLiveRuntime.js';
import type { LeadDetailRuntime } from './leadDetailRuntime.js';
import { createTestLeadDetailRuntime } from './leadDetailRuntimeFixture.test-support.js';

test('Given no provider When the lead detail subtree renders Then the context resolves the live runtime', () => {
    const markup = renderToStaticMarkup(<RuntimeIdentityProbe />);

    assert.match(markup, /data-disclosure="live"/);
    assert.match(markup, /data-checklist="live"/);
});

test('Given a scoped provider When one domain is injected Then only that domain replaces the live runtime', () => {
    const fixture = createTestLeadDetailRuntime();
    const markup = renderToStaticMarkup(
        <LeadDetailRuntimeProvider runtime={{ checklist: fixture.checklist }}>
            <RuntimeIdentityProbe fixture={fixture} />
        </LeadDetailRuntimeProvider>
    );

    assert.match(markup, /data-disclosure="live"/);
    assert.match(markup, /data-checklist="fixture"/);
});

function RuntimeIdentityProbe({
    fixture
}: {
    readonly fixture?: LeadDetailRuntime;
}) {
    const runtime = useLeadDetailRuntime();
    return (
        <output
            data-disclosure={runtime.disclosure === LIVE_LEAD_DETAIL_RUNTIME.disclosure
                ? 'live'
                : 'fixture'}
            data-checklist={runtime.checklist === fixture?.checklist
                ? 'fixture'
                : 'live'}
        />
    );
}
