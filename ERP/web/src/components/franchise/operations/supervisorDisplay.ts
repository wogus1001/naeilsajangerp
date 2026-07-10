import { getUserRoleLabel } from '@/lib/user-role-policy';
import type { SupervisionSupervisorOption } from './supervisionTypes';

type SupervisorIdentity = Pick<SupervisionSupervisorOption, 'email' | 'loginId' | 'name' | 'role'>;

export function getSupervisorIdentityLabel(supervisor: Pick<SupervisorIdentity, 'email' | 'loginId'>): string {
    return supervisor.loginId || supervisor.email || '';
}

export function getSupervisorRoleLabel(supervisor: Pick<SupervisorIdentity, 'role'>): string {
    return getUserRoleLabel(supervisor.role);
}

export function getDuplicateSupervisorNames(supervisors: readonly Pick<SupervisionSupervisorOption, 'name'>[]): ReadonlySet<string> {
    const counts = new Map<string, number>();
    supervisors.forEach(supervisor => {
        const name = supervisor.name.trim();
        if (!name) return;
        counts.set(name, (counts.get(name) || 0) + 1);
    });
    return new Set([...counts.entries()].filter(([, count]) => count > 1).map(([name]) => name));
}

export function formatSupervisorOptionLabel(
    supervisor: SupervisorIdentity,
    duplicateNames: ReadonlySet<string>
): string {
    const name = supervisor.name || '이름 미등록';
    const roleLabel = getSupervisorRoleLabel(supervisor);
    const identityLabel = duplicateNames.has(name) ? getSupervisorIdentityLabel(supervisor) : '';
    return [name, roleLabel, identityLabel].filter(Boolean).join(' · ');
}
