export type OrganizationDeleteDependencies = {
    readonly children: number;
    readonly memberships: number;
    readonly roles: number;
};

export type OrganizationDeleteEntity = 'unit' | 'membership' | 'role';

export function parseOrganizationDeleteEntity(value: string | null): OrganizationDeleteEntity | null {
    if (value === null || value === 'unit') return 'unit';
    if (value === 'membership' || value === 'role') return value;
    return null;
}

export function organizationDeleteBlockerMessage(dependencies: OrganizationDeleteDependencies): string {
    if (dependencies.children > 0) {
        return '하위 조직이 있습니다. 하위 조직을 먼저 이동하거나 삭제해 주세요.';
    }
    if (dependencies.memberships > 0) {
        return '소속 구성원이 있습니다. 구성원 소속을 먼저 해제하거나 다른 조직으로 변경해 주세요.';
    }
    if (dependencies.roles > 0) {
        return '이 조직을 사용하는 결재 담당자가 있습니다. 결재 담당자 지정을 먼저 해제하거나 다른 조직으로 변경해 주세요.';
    }
    return '';
}
