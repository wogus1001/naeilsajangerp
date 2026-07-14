export type WorkIntakeEditKind = 'properties' | 'leadRegistrations' | 'matchingRequests';

type RequiredField = {
    readonly key: string;
    readonly label: string;
};

const REQUIRED_FIELDS: Readonly<Record<WorkIntakeEditKind, readonly RequiredField[]>> = {
    properties: [
        { key: 'desiredCategory', label: '업종' },
        { key: 'address', label: '물건 주소' },
        { key: 'deposit', label: '보증금' },
        { key: 'monthlyRent', label: '월세' }
    ],
    leadRegistrations: [
        { key: 'name', label: '가맹 희망자명' }
    ],
    matchingRequests: [
        { key: 'name', label: '신청자 이름' },
        { key: 'mobile', label: '연락처' },
        { key: 'desiredCategory', label: '희망 업종' },
        { key: 'totalBudget', label: '총 창업 예산' },
        { key: 'desiredRegion', label: '창업 희망 지역' },
        { key: 'ownedPropertyStatus', label: '입점 희망 물건 보유 여부' }
    ]
};

function hasValue(value: unknown): boolean {
    return value !== null && value !== undefined && String(value).trim().length > 0;
}

export function missingWorkIntakeEditFields(
    kind: WorkIntakeEditKind,
    body: Readonly<Record<string, unknown>>
): readonly string[] {
    return REQUIRED_FIELDS[kind]
        .filter(field => !hasValue(body[field.key]))
        .map(field => field.label);
}
