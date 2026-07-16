import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    isMissingWorkIntakeDeleteSnapshotRpcError,
    WORK_INTAKE_DELETE_HISTORY_FAILED_MESSAGE,
    WORK_INTAKE_DELETE_HISTORY_UNAVAILABLE_MESSAGE,
    WORK_INTAKE_DELETE_RPC_NAME
} from './[kind]/[id]/route.js';
import { WORK_INTAKE_DELETED_RECORD_SELECT, WORK_INTAKE_PROPERTY_SELECT } from './route.js';

test('Given work intake properties are loaded When selecting rows Then manager_id is included for author display', () => {
    assert.match(WORK_INTAKE_PROPERTY_SELECT, /(?:^|, )manager_id(?:,|$)/);
});

test('Given admin deleted records are loaded When selecting rows Then audit fields are included', () => {
    for (const field of ['kind', 'source_id', 'deleted_by', 'title', 'summary', 'snapshot', 'deleted_at']) {
        assert.match(WORK_INTAKE_DELETED_RECORD_SELECT, new RegExp(`(?:^|, )${field}(?:,|$)`));
    }
});

test('Given work intake records are deleted When invoking the API Then the snapshot RPC is the delete contract', () => {
    assert.equal(WORK_INTAKE_DELETE_RPC_NAME, 'delete_franchise_work_intake_record_with_snapshot');
});

test('Given delete history SQL is missing When deleting Then the original record remains protected', () => {
    assert.equal(WORK_INTAKE_DELETE_HISTORY_UNAVAILABLE_MESSAGE, '삭제 목록 저장 기능을 확인할 수 없어 삭제하지 않았습니다. SQL 적용 상태와 Supabase 스키마 캐시를 확인해주세요.');
    assert.equal(WORK_INTAKE_DELETE_HISTORY_FAILED_MESSAGE, '삭제 이력 저장 중 오류가 발생해 삭제하지 못했습니다. 잠시 후 다시 시도해주세요.');
    assert.equal(isMissingWorkIntakeDeleteSnapshotRpcError({
        code: 'PGRST202',
        message: 'Could not find the function public.delete_franchise_work_intake_record_with_snapshot in the schema cache'
    }), true);
    assert.equal(isMissingWorkIntakeDeleteSnapshotRpcError({
        code: '23503',
        message: 'foreign key violation'
    }), false);
});
