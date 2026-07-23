import assert from 'node:assert/strict';
import test from 'node:test';
import { createSignupAuthUserWithRetry } from './signup-auth-user';

const RETRYABLE_JWT_ERROR = 'invalid JWT: unable to parse or verify signature, token is unverifiable: error while executing keyfunc: unrecognized JWK kid <nil> for algorithm ES256';

test('Given repeated JWT verification failures When creating a signup user Then the internal error is not exposed', async () => {
    let attempts = 0;
    const result = await createSignupAuthUserWithRetry(async () => {
        attempts += 1;
        return {
            data: { user: null },
            error: { message: RETRYABLE_JWT_ERROR }
        };
    });

    assert.equal(attempts, 2);
    assert.ok(result.error);
    assert.equal(result.error.status, 503);
    assert.equal(result.error.message, '인증 서버 연결이 원활하지 않습니다. 잠시 후 다시 시도해주세요.');
    assert.doesNotMatch(result.error.message, /jwt|jwk|es256/i);
});
