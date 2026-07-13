'use client';

import React from 'react';
import { AlertModal } from '@/components/common/AlertModal';
import {
    createApprovalDelegation,
    deleteApprovalDelegation,
    fetchApprovalOrganization,
    saveApprovalOrganization,
    type ApprovalDelegationInput,
    type ApprovalOrganizationPatch
} from './approvalApi';
import { ApprovalDelegationsSection } from './ApprovalDelegationsSection';
import { ApprovalPageHeader } from './ApprovalPageHeader';
import { ApprovalRolesSection } from './ApprovalRolesSection';
import type {
    ApprovalMembership,
    ApprovalOrganization,
    ApprovalOrganizationUnit,
    ApprovalRoleAssignment
} from './approvalTypes';
import { OrganizationMembershipsSection } from './OrganizationMembershipsSection';
import { OrganizationUnitsSection } from './OrganizationUnitsSection';
import styles from './ApprovalSettings.module.css';

const EMPTY_ORGANIZATION: ApprovalOrganization = { people: [], units: [], memberships: [], roleAssignments: [], delegations: [] };
type ResultModal = { readonly message: string; readonly type: 'success' | 'error' };

export function ApprovalSettingsPage() {
    const [organization, setOrganization] = React.useState<ApprovalOrganization>(EMPTY_ORGANIZATION);
    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);
    const [result, setResult] = React.useState<ResultModal | null>(null);

    const load = React.useCallback(async () => {
        setLoading(true);
        try {
            setOrganization(await fetchApprovalOrganization());
        } catch (caught) {
            setResult({ message: caught instanceof Error ? caught.message : '조직·결재 설정을 불러오지 못했습니다.', type: 'error' });
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => { void load(); }, [load]);

    async function patchOrganization(patch: ApprovalOrganizationPatch) {
        setSaving(true);
        try {
            await saveApprovalOrganization(patch);
            setResult({ message: '조직·결재 설정을 저장했습니다.', type: 'success' });
            await load();
        } catch (caught) {
            setResult({ message: caught instanceof Error ? caught.message : '설정을 저장하지 못했습니다.', type: 'error' });
        } finally {
            setSaving(false);
        }
    }

    async function createDelegation(input: ApprovalDelegationInput) {
        setSaving(true);
        try {
            await createApprovalDelegation(input);
            setResult({ message: '결재 위임을 등록했습니다.', type: 'success' });
            await load();
        } catch (caught) {
            setResult({ message: caught instanceof Error ? caught.message : '결재 위임을 등록하지 못했습니다.', type: 'error' });
        } finally {
            setSaving(false);
        }
    }

    async function removeDelegation(id: string) {
        setSaving(true);
        try {
            await deleteApprovalDelegation(id);
            setResult({ message: '결재 위임을 해제했습니다.', type: 'success' });
            await load();
        } catch (caught) {
            setResult({ message: caught instanceof Error ? caught.message : '결재 위임을 해제하지 못했습니다.', type: 'error' });
        } finally {
            setSaving(false);
        }
    }

    return (
        <section className={styles.page}>
            <ApprovalPageHeader description="부서, 소속, 결재 역할과 부재 시 위임 범위를 회사 기준으로 관리합니다." title="조직·결재 설정" />
            {loading ? <div className={styles.loading}>설정을 불러오는 중입니다.</div> : (
                <div className={styles.settingsGrid}>
                    <OrganizationUnitsSection disabled={saving} onSave={(unit: Partial<ApprovalOrganizationUnit>) => void patchOrganization({ units: [unit] })} people={organization.people} units={organization.units} />
                    <OrganizationMembershipsSection disabled={saving} memberships={organization.memberships} onSave={(membership: Partial<ApprovalMembership>) => void patchOrganization({ memberships: [membership] })} people={organization.people} units={organization.units} />
                    <ApprovalRolesSection disabled={saving} onSave={(role: Partial<ApprovalRoleAssignment>) => void patchOrganization({ roleAssignments: [role] })} people={organization.people} roles={organization.roleAssignments} units={organization.units} />
                    <ApprovalDelegationsSection delegations={organization.delegations} disabled={saving} onCreate={input => void createDelegation(input)} onDelete={id => void removeDelegation(id)} people={organization.people} />
                </div>
            )}
            <AlertModal isOpen={result !== null} message={result?.message ?? ''} onClose={() => setResult(null)} title={result?.type === 'success' ? '저장 완료' : '처리 실패'} type={result?.type} />
        </section>
    );
}
