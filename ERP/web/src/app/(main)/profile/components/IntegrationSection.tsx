"use client";

import { Save } from 'lucide-react';
import styles from '../page.module.css';
import type { ProfileUser, ShowAlert, ShowConfirm, UcansignStatus } from './profileTypes';

type IntegrationSectionProps = {
    readonly user: ProfileUser;
    readonly ucansignStatus: UcansignStatus;
    readonly showAlertAction: ShowAlert;
    readonly showConfirmAction: ShowConfirm;
};

export function IntegrationSection({
    user,
    ucansignStatus,
    showAlertAction,
    showConfirmAction
}: IntegrationSectionProps) {
    return (
        <div className={styles.section}>
            <h3><Save size={20} /> 서비스 연동</h3>

            <div className={styles.integrationCard}>
                <div>
                    <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px', color: '#343a40' }}>
                        <span>유캔싸인 (UCanSign)</span>
                        {ucansignStatus.connected && (
                            <span style={{
                                fontSize: '11px',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                backgroundColor: '#e3f2fd',
                                color: '#1864ab',
                                fontWeight: '600'
                            }}>
                                CONNECTED
                            </span>
                        )}
                    </div>
                    <div style={{ fontSize: '14px', color: '#868e96', lineHeight: '1.4' }}>
                        전자계약 서비스를 위해 계정을 연동합니다.<br />
                        {ucansignStatus.connected
                            ? <span style={{ color: '#2b8a3e', fontWeight: '600' }}>
                                {ucansignStatus.linkedAt ? `연동 일시: ${new Date(ucansignStatus.linkedAt).toLocaleDateString()}` : '연동됨'}
                            </span>
                            : '현재 연동된 계정이 없습니다.'}
                    </div>
                </div>

                {!ucansignStatus.connected ? (
                    <button
                        type="button"
                        onClick={() => window.location.href = `/api/ucansign/auth?userId=${user.id || ''}`}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#228be6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '600',
                            boxShadow: '0 2px 5px rgba(34, 139, 230, 0.2)'
                        }}
                    >
                        연동하기
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={() => {
                            showConfirmAction('정말 연동을 해제하시겠습니까?', async () => {
                                try {
                                    const res = await fetch(`/api/ucansign/disconnect?userId=${user.id || ''}`, { method: 'DELETE' });
                                    if (res.ok) {
                                        showAlertAction('연동이 해제되었습니다.', 'success', () => window.location.reload());
                                    } else {
                                        showAlertAction('해제 실패', 'error');
                                    }
                                } catch (error) {
                                    if (error instanceof Error) {
                                        console.error(error.message);
                                    } else {
                                        console.error(error);
                                    }
                                    showAlertAction('오류 발생', 'error');
                                }
                            }, true);
                        }}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: 'white',
                            color: '#fa5252',
                            border: '1px solid #fa5252',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '600'
                        }}
                    >
                        연동 해제
                    </button>
                )}
            </div>
        </div>
    );
}
