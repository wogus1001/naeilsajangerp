'use client';

import React from 'react';
import { AlertModal } from '@/components/common/AlertModal';
import {
    createApprovalDelegation,
    deleteApprovalDelegation,
    deleteApprovalMembership,
    deleteApprovalOrganizationUnit,
    fetchApprovalOrganization,
    saveApprovalOrganization,
    type ApprovalDelegationInput,
    type ApprovalOrganizationPatch
} from './approvalApi';
import { ApprovalDelegationsSection } from './ApprovalDelegationsSection';
import { ApprovalPageHeader } from './ApprovalPageHeader';
import type {
    ApprovalMembership,
    ApprovalOrganization,
    ApprovalOrganizationUnit
} from './approvalTypes';
import { OrganizationMembershipsSection } from './OrganizationMembershipsSection';
import { OrganizationUnitsSection } from './OrganizationUnitsSection';
import styles from './ApprovalSettings.module.css';

const EMPTY_ORGANIZATION: ApprovalOrganization = { canManageOrganization: false, requesterProfileId: '', people: [], units: [], memberships: [], roleAssignments: [], delegations: [] };
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

    async function removeOrganizationUnit(id: string) {
        setSaving(true);
        try {
            await deleteApprovalOrganizationUnit(id);
            setResult({ message: '조직을 삭제했습니다.', type: 'success' });
            await load();
        } catch (caught) {
            setResult({ message: caught instanceof Error ? caught.message : '조직을 삭제하지 못했습니다.', type: 'error' });
        } finally {
            setSaving(false);
        }
    }

    async function removeMembership(id: string) {
        setSaving(true);
        try {
            await deleteApprovalMembership(id);
            setResult({ message: '구성원 소속을 해제했습니다.', type: 'success' });
            await load();
        } catch (caught) {
            setResult({ message: caught instanceof Error ? caught.message : '구성원 소속을 해제하지 못했습니다.', type: 'error' });
        } finally {
            setSaving(false);
        }
    }

    return (
        <section className={styles.page}>
            <ApprovalPageHeader description="팀장은 부서와 구성원을 관리하고, 모든 구성원은 부재 시 대신 결재할 사람을 설정할 수 있습니다." title="조직과 결재 설정" />
            {loading ? <div className={styles.loading}>설정을 불러오는 중입니다.</div> : (
                <div className={`${styles.settingsGrid} ${organization.canManageOrganization ? '' : styles.singleColumn}`}>
                    {organization.canManageOrganization && <OrganizationUnitsSection disabled={saving} onDelete={id => void removeOrganizationUnit(id)} onSave={(unit: Partial<ApprovalOrganizationUnit>) => void patchOrganization({ units: [unit] })} people={organization.people} units={organization.units} />}
                    {organization.canManageOrganization && <OrganizationMembershipsSection disabled={saving} memberships={organization.memberships} onDelete={id => void removeMembership(id)} onSave={(membership: Partial<ApprovalMembership>) => void patchOrganization({ memberships: [membership] })} people={organization.people} units={organization.units} />}
                    <ApprovalDelegationsSection delegations={organization.delegations} disabled={saving} onCreate={input => void createDelegation(input)} onDelete={id => void removeDelegation(id)} people={organization.people} requesterProfileId={organization.requesterProfileId} />
                </div>
            )}
            <AlertModal isOpen={result !== null} message={result?.message ?? ''} onClose={() => setResult(null)} title={result?.type === 'success' ? '저장 완료' : '처리 실패'} type={result?.type} />
        </section>
    );
}
