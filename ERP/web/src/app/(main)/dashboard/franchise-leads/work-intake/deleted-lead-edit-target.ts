import { LEAD_REGISTRATION_INITIAL_FORM } from '@/lib/franchise-lead-registration';
import { normalizeLeadStatus } from '@/lib/franchise-leads';
import { firstText } from './deleted-record-details';
import { readNullableNumber, toDatetimeInput, toManwonInput, type DeletedEditContext } from './deleted-record-edit-utils';
import type { DeletedWorkIntakeItem, WorkIntakeEditTarget } from './types';

export function buildDeletedLeadEditTarget(
    record: DeletedWorkIntakeItem,
    context: DeletedEditContext
): WorkIntakeEditTarget {
    const { row, data, managerId, authorId, createdAt } = context;
    const archivedStatus = firstText(row.status);
    const form = {
        ...LEAD_REGISTRATION_INITIAL_FORM,
        name: firstText(row.name, record.title),
        mobile: firstText(row.mobile),
        source: firstText(data.registrationSource, row.source),
        status: normalizeLeadStatus(archivedStatus),
        grade: firstText(row.grade),
        desiredRegion: firstText(row.desired_region),
        budgetMin: toManwonInput(row.budget_min),
        budgetMax: toManwonInput(row.budget_max),
        interestedBrand: firstText(row.interested_brand),
        managerId,
        nextContactAt: toDatetimeInput(row.next_contact_at),
        memo: firstText(row.memo)
    };
    return {
        kind: 'leadRegistrations',
        item: {
            id: record.sourceId,
            managerId,
            authorId,
            managerName: '',
            name: form.name,
            mobile: form.mobile,
            source: form.source,
            status: form.status,
            archivedStatus,
            grade: form.grade,
            desiredRegion: form.desiredRegion,
            budgetMin: readNullableNumber(row.budget_min),
            budgetMax: readNullableNumber(row.budget_max),
            interestedBrand: form.interestedBrand,
            memo: form.memo,
            nextContactAt: firstText(row.next_contact_at),
            promotedAt: firstText(row.promoted_at),
            promotedLeadId: firstText(row.promoted_lead_id),
            createdAt,
            canEdit: false,
            canDelete: false,
            form
        }
    };
}
