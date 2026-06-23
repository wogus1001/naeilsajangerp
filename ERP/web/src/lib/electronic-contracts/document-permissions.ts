export type ElectronicContractActor = {
    readonly id: string;
    readonly role: string | null;
    readonly companyId?: string | null;
};

export type ElectronicContractOwnership = {
    readonly sentByProfileId: string | null;
    readonly companyId?: string | null;
};

export function canDeleteElectronicContract(
    actor: ElectronicContractActor,
    contract: ElectronicContractOwnership
): boolean {
    if (actor.role === 'admin') return true;
    return Boolean(contract.sentByProfileId && contract.sentByProfileId === actor.id);
}

export function canCancelElectronicContract(
    actor: ElectronicContractActor,
    contract: ElectronicContractOwnership
): boolean {
    if (actor.role === 'admin') return true;
    return Boolean(contract.sentByProfileId && contract.sentByProfileId === actor.id);
}

export function canViewElectronicContract(
    actor: ElectronicContractActor,
    contract: ElectronicContractOwnership
): boolean {
    if (actor.role === 'admin') return true;
    if (contract.sentByProfileId && contract.sentByProfileId === actor.id) return true;
    return Boolean(actor.companyId && contract.companyId && actor.companyId === contract.companyId);
}

export function isElectronicContractCancelableStatus(status: string | null | undefined): boolean {
    return status === 'sent' || status === 'sending';
}
