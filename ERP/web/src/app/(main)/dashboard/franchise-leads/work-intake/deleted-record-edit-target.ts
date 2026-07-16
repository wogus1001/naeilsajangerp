import { buildDeletedLeadEditTarget } from './deleted-lead-edit-target';
import { buildDeletedMatchingEditTarget } from './deleted-matching-edit-target';
import { buildDeletedPropertyEditTarget } from './deleted-property-edit-target';
import { firstText, readSnapshotData, readSnapshotRow } from './deleted-record-details';
import type { DeletedEditContext } from './deleted-record-edit-utils';
import type { DeletedWorkIntakeItem, WorkIntakeEditTarget } from './types';

export function buildDeletedRecordEditTarget(record: DeletedWorkIntakeItem): WorkIntakeEditTarget | null {
    const row = readSnapshotRow(record);
    const context: DeletedEditContext = {
        row,
        data: readSnapshotData(record),
        managerId: firstText(row.manager_id),
        authorId: firstText(row.created_by, row.manager_id),
        createdAt: firstText(row.created_at)
    };

    if (record.kind === 'properties') return buildDeletedPropertyEditTarget(record, context);
    if (record.kind === 'leadRegistrations') return buildDeletedLeadEditTarget(record, context);
    if (record.kind === 'matchingRequests') return buildDeletedMatchingEditTarget(record, context);
    return null;
}
