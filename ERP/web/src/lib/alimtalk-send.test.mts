import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
    writeDuplicateSafeAlimtalkSendLog,
    type AlimtalkSendLogDedupKey,
    type AlimtalkSendLogPatch,
    type AlimtalkSendLogRepository,
    type AlimtalkSendLogRow
} from './alimtalk-send-log';

class InMemorySendLogRepository implements AlimtalkSendLogRepository {
    row: AlimtalkSendLogRow | null;
    insertAttempts = 0;
    updateAttempts = 0;

    constructor(row: AlimtalkSendLogRow | null) {
        this.row = row;
    }

    async insert(row: AlimtalkSendLogRow): Promise<boolean> {
        this.insertAttempts += 1;
        if (this.row) return true;
        this.row = row;
        return false;
    }

    async findStatus(_key: AlimtalkSendLogDedupKey): Promise<AlimtalkSendLogRow['status'] | null> {
        return this.row?.status ?? null;
    }

    async updateNonFinal(_key: AlimtalkSendLogDedupKey, patch: AlimtalkSendLogPatch): Promise<void> {
        this.updateAttempts += 1;
        if (!this.row || this.row.status === 'success' || this.row.status === 'fallback_sms') return;
        this.row = { ...this.row, ...patch, created_at: this.row.created_at, template_key: this.row.template_key };
    }
}

function createSendLogRow(status: AlimtalkSendLogRow['status']): AlimtalkSendLogRow {
    return {
        company_id: 'company-1',
        created_at: '2026-07-09T00:00:00.000Z',
        error_message: '',
        provider_message_id: 'provider-1',
        recipient_name: '점주',
        recipient_phone: '0212345678',
        recipient_profile_id: null,
        scenario_key: 'owner_account_created',
        sent_at: '2026-07-09T00:00:00.000Z',
        source_id: 'account-1',
        source_type: 'owner-account-created',
        status,
        template_key: 'owner_account_created',
        variables: { '#{임시비밀번호}': '[마스킹]' }
    };
}

test('Given final send log When writing duplicate blocked log Then existing success is not overwritten', async () => {
    const repository = new InMemorySendLogRepository(createSendLogRow('success'));
    await writeDuplicateSafeAlimtalkSendLog(repository, {
        ...createSendLogRow('blocked'),
        error_message: 'recipient phone must be a mobile number'
    });

    assert.equal(repository.insertAttempts, 1);
    assert.equal(repository.updateAttempts, 0);
    assert.equal(repository.row?.status, 'success');
    assert.deepEqual(repository.row?.variables, { '#{임시비밀번호}': '[마스킹]' });
});

test('Given failed send log When writing duplicate blocked log Then retry state is updated', async () => {
    const repository = new InMemorySendLogRepository(createSendLogRow('failed'));
    await writeDuplicateSafeAlimtalkSendLog(repository, {
        ...createSendLogRow('blocked'),
        error_message: 'recipient phone must be a mobile number'
    });

    assert.equal(repository.insertAttempts, 1);
    assert.equal(repository.updateAttempts, 1);
    assert.equal(repository.row?.status, 'blocked');
    assert.equal(repository.row?.error_message, 'recipient phone must be a mobile number');
});

test('Given no send log When writing first log Then row is inserted without duplicate update', async () => {
    const repository = new InMemorySendLogRepository(null);
    await writeDuplicateSafeAlimtalkSendLog(repository, createSendLogRow('success'));

    assert.equal(repository.insertAttempts, 1);
    assert.equal(repository.updateAttempts, 0);
    assert.equal(repository.row?.status, 'success');
});
