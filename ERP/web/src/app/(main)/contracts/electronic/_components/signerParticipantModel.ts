import type { CompanyTemplateParticipant, CompanyTemplateRole } from '@/lib/electronic-contracts/company-template';
import {
    inferSignerDeliveryMethod,
    normalizeSignerContact,
    signerContactPolicyMessage,
    validateSignerContact,
    type SignerDeliveryMethod
} from '@/lib/electronic-contracts/signer-contact-policy';

export {
    inferSignerDeliveryMethod,
    normalizeSignerContact,
    signerContactPolicyMessage,
    validateSignerContact
};
export type { SignerDeliveryMethod };

export type SignerParticipantInput = CompanyTemplateParticipant & {
    readonly deliveryMethod: SignerDeliveryMethod;
};

export type SignerParticipantField = 'name' | 'contact';

export type SignerParticipantIssue = {
    readonly roleKey: string;
    readonly field: SignerParticipantField;
    readonly message: string;
};

export type SignerParticipantIssueMap = Readonly<Record<string, Partial<Record<SignerParticipantField, string>>>>;

export type SignerParticipantValidationResult =
    | {
        readonly ok: true;
        readonly participants: readonly SignerParticipantInput[];
    }
    | {
        readonly ok: false;
        readonly issues: readonly SignerParticipantIssue[];
    };

const ORDER_LABELS: readonly string[] = [
    '첫 번째',
    '두 번째',
    '세 번째',
    '네 번째',
    '다섯 번째',
    '여섯 번째',
    '일곱 번째',
    '여덟 번째',
    '아홉 번째',
    '열 번째'
];

export function signerOrderLabel(order: number): string {
    const index = Math.max(1, Math.trunc(order)) - 1;
    return ORDER_LABELS[index] || `${index + 1}번째`;
}

export function toSignerParticipantInput(participant: CompanyTemplateParticipant): SignerParticipantInput {
    const deliveryMethod = inferSignerDeliveryMethod(participant.contact);
    return {
        ...participant,
        contact: normalizeSignerContact(deliveryMethod, participant.contact),
        deliveryMethod
    };
}

export function signerParticipantsFromRecord(
    participants: Record<string, CompanyTemplateParticipant>
): Record<string, SignerParticipantInput> {
    return Object.fromEntries(
        Object.entries(participants).map(([roleKey, participant]) => [roleKey, toSignerParticipantInput(participant)])
    );
}

export function createEmptySignerParticipants(
    roles: readonly Pick<CompanyTemplateRole, 'roleKey'>[]
): Record<string, SignerParticipantInput> {
    return Object.fromEntries(
        roles.map(role => [role.roleKey, {
            roleKey: role.roleKey,
            name: '',
            contact: '',
            deliveryMethod: 'email' as const
        }])
    );
}

export function requiredSignerRoleKeys(
    roles: readonly Pick<CompanyTemplateRole, 'required' | 'roleKey'>[]
): ReadonlySet<string> {
    return new Set(roles.filter(role => role.required).map(role => role.roleKey));
}

export function signerParticipantIssueMap(issues: readonly SignerParticipantIssue[]): SignerParticipantIssueMap {
    const issueMap: Record<string, Partial<Record<SignerParticipantField, string>>> = {};
    for (const issue of issues) {
        issueMap[issue.roleKey] = {
            ...(issueMap[issue.roleKey] || {}),
            [issue.field]: issue.message
        };
    }
    return issueMap;
}

export function validateSignerParticipants(
    participants: readonly SignerParticipantInput[],
    requiredRoleKeys: ReadonlySet<string>
): SignerParticipantValidationResult {
    const issues: SignerParticipantIssue[] = [];
    const normalizedParticipants = participants.map(participant => {
        const name = participant.name.trim();
        const contact = normalizeSignerContact(participant.deliveryMethod, participant.contact);
        const isRequired = requiredRoleKeys.has(participant.roleKey);

        if (isRequired && !name) {
            issues.push({
                roleKey: participant.roleKey,
                field: 'name',
                message: '이름 또는 회사명을 입력해주세요.'
            });
        }

        if ((isRequired || contact) && !validateSignerContact(participant.deliveryMethod, contact)) {
            issues.push({
                roleKey: participant.roleKey,
                field: 'contact',
                message: participant.deliveryMethod === 'email'
                    ? '올바른 이메일 주소를 입력해주세요.'
                    : '휴대폰 번호는 01012345678처럼 숫자 10~11자리로 입력해주세요.'
            });
        }

        return {
            ...participant,
            name,
            contact
        };
    });

    if (issues.length > 0) {
        return {
            ok: false,
            issues
        };
    }

    return {
        ok: true,
        participants: normalizedParticipants
    };
}
