import { getApiAuthHeaders } from '@/utils/apiAuthHeaders';
import { readApiError } from '@/utils/apiResponse';
import type { WorkIntakeEditTarget } from './types';

type EditFormState = {
    readonly name: string;
    readonly mobile: string;
    readonly email: string;
    readonly status: string;
    readonly desiredRegion: string;
    readonly desiredBrand: string;
    readonly desiredCategory: string;
    readonly budgetMin: string;
    readonly budgetMax: string;
    readonly totalBudget: string;
    readonly deposit: string;
    readonly monthlyRent: string;
    readonly address: string;
    readonly ownedPropertyStatus: string;
    readonly matchPriority: string;
    readonly urgency: string;
    readonly memo: string;
};

export type { EditFormState };

function toManwon(won: number | null): string {
    if (won === null) return '';
    return String(Math.round(won / 10000));
}

export function buildInitialEditForm(target: WorkIntakeEditTarget): EditFormState {
    if (target.kind === 'properties') {
        return {
            name: target.item.name,
            mobile: '',
            email: '',
            status: target.item.status,
            desiredRegion: target.item.region,
            desiredBrand: target.item.desiredBrand,
            desiredCategory: target.item.desiredCategory,
            budgetMin: '',
            budgetMax: '',
            totalBudget: '',
            deposit: target.item.deposit,
            monthlyRent: target.item.monthlyRent,
            address: target.item.address,
            ownedPropertyStatus: '',
            matchPriority: '',
            urgency: '',
            memo: ''
        };
    }
    if (target.kind === 'leadRegistrations') {
        return {
            name: target.item.name,
            mobile: target.item.mobile,
            email: '',
            status: target.item.status,
            desiredRegion: target.item.desiredRegion,
            desiredBrand: target.item.interestedBrand,
            desiredCategory: '',
            budgetMin: toManwon(target.item.budgetMin),
            budgetMax: toManwon(target.item.budgetMax),
            totalBudget: '',
            deposit: '',
            monthlyRent: '',
            address: '',
            ownedPropertyStatus: '',
            matchPriority: '',
            urgency: '',
            memo: target.item.memo
        };
    }
    return {
        name: target.item.name,
        mobile: target.item.mobile,
        email: target.item.email,
        status: '',
        desiredRegion: target.item.desiredRegion,
        desiredBrand: target.item.interestedBrand,
        desiredCategory: target.item.desiredCategory,
        budgetMin: '',
        budgetMax: '',
        totalBudget: target.item.totalBudget,
        deposit: '',
        monthlyRent: '',
        address: '',
        ownedPropertyStatus: target.item.ownedPropertyStatus,
        matchPriority: target.item.matchPriority,
        urgency: target.item.urgency,
        memo: target.item.memo
    };
}

async function readPayload(response: Response): Promise<unknown> {
    return await response.json();
}

export async function saveWorkIntakeEdit(target: WorkIntakeEditTarget, form: EditFormState, requesterId: string): Promise<void> {
    if (target.kind === 'properties') {
        const response = await fetch(`/api/properties?id=${encodeURIComponent(target.item.id)}`, {
            method: 'PUT',
            headers: await getApiAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({
                requesterId,
                name: form.name,
                status: form.status,
                address: form.address,
                operationType: '물건등록',
                region: form.desiredRegion,
                desiredBrand: form.desiredBrand,
                brand: form.desiredBrand,
                desiredCategory: form.desiredCategory,
                category: form.desiredCategory,
                deposit: form.deposit,
                monthlyRent: form.monthlyRent
            })
        });
        const payload = await readPayload(response);
        if (!response.ok) throw new Error(readApiError(payload));
        return;
    }

    if (target.kind === 'leadRegistrations') {
        const response = await fetch(`/api/franchise-lead-registration-requests/${encodeURIComponent(target.item.id)}`, {
            method: 'PUT',
            headers: await getApiAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({
                requesterId,
                name: form.name,
                mobile: form.mobile,
                status: form.status,
                desiredRegion: form.desiredRegion,
                budgetMin: form.budgetMin,
                budgetMax: form.budgetMax,
                interestedBrand: form.desiredBrand,
                memo: form.memo
            })
        });
        const payload = await readPayload(response);
        if (!response.ok) throw new Error(readApiError(payload));
        return;
    }

    const response = await fetch('/api/franchise-leads', {
        method: 'PUT',
        headers: await getApiAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
            requesterId,
            id: target.item.id,
            name: form.name,
            mobile: form.mobile,
            desiredRegion: form.desiredRegion,
            interestedBrand: form.desiredBrand,
            memo: form.memo,
            email: form.email,
            desiredCategory: form.desiredCategory,
            totalBudget: form.totalBudget,
            ownedPropertyStatus: form.ownedPropertyStatus,
            matchPriority: form.matchPriority,
            urgency: form.urgency
        })
    });
    const payload = await readPayload(response);
    if (!response.ok) throw new Error(readApiError(payload));
}
