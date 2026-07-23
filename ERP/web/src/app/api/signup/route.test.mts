import assert from 'node:assert/strict';
import test from 'node:test';
import { POST } from './route';

const RETRYABLE_JWT_ERROR = 'invalid JWT: unable to parse or verify signature, token is unverifiable: error while executing keyfunc: unrecognized JWK kid <nil> for algorithm ES256';

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}

test('Given a transient JWT verification failure When signing up Then the server retries before returning an error', async (context) => {
    const originalFetch = globalThis.fetch;
    const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const originalServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    let authCreateAttempts = 0;

    context.after(() => {
        globalThis.fetch = originalFetch;
        if (originalUrl === undefined) {
            delete process.env.NEXT_PUBLIC_SUPABASE_URL;
        } else {
            process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
        }
        if (originalServiceKey === undefined) {
            delete process.env.SUPABASE_SERVICE_ROLE_KEY;
        } else {
            process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceKey;
        }
    });

    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://signup-retry.test';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test-key';
    globalThis.fetch = async (input, init) => {
        const request = new Request(input, init);
        const url = new URL(request.url);

        if (url.pathname === '/rest/v1/companies') {
            return jsonResponse({
                id: 'company-1',
                manager_id: null,
                name: '테스트'
            });
        }

        if (url.pathname === '/rest/v1/profiles' && request.method === 'GET') {
            return jsonResponse([]);
        }

        if (url.pathname === '/auth/v1/admin/users') {
            authCreateAttempts += 1;
            if (authCreateAttempts === 1) {
                return jsonResponse({ code: 'bad_jwt', message: RETRYABLE_JWT_ERROR }, 403);
            }
            return jsonResponse({
                id: 'user-1',
                email: 'retry@example.test',
                app_metadata: {},
                user_metadata: {}
            });
        }

        if (url.pathname === '/rest/v1/profiles' && request.method === 'PATCH') {
            return new Response(null, { status: 204 });
        }

        return jsonResponse([]);
    };

    const response = await POST(new Request('http://localhost/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            loginId: 'retryuser',
            email: 'retry@example.test',
            password: 'signup-password',
            passwordConfirm: 'signup-password',
            name: '가입 테스트',
            companyName: '테스트',
            companyId: 'company-1',
            phone: '010-1234-5678',
            role: 'staff'
        })
    }));
    const payload: unknown = await response.json();

    assert.equal(authCreateAttempts, 2);
    assert.equal(response.status, 200);
    assert.ok(typeof payload === 'object' && payload !== null && 'success' in payload);
    assert.equal(payload.success, true);
    assert.equal('error' in payload ? payload.error : undefined, undefined);
});
