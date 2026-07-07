"use client";

import { AlertCircle } from 'lucide-react';
import { getApiAuthHeaders } from '@/utils/apiAuthHeaders';
import styles from '../page.module.css';
import type { ProfileUser, ShowAlert, ShowConfirm } from './profileTypes';

type WithdrawalSectionProps = {
    readonly user: ProfileUser;
    readonly showAlertAction: ShowAlert;
    readonly showConfirmAction: ShowConfirm;
};

export function WithdrawalSection({ user, showAlertAction, showConfirmAction }: WithdrawalSectionProps) {
    return (
        <div className={styles.section} style={{ borderBottom: 'none' }}>
            <h3 style={{ color: '#fa5252' }}><AlertCircle size={20} /> 회원 탈퇴</h3>
            <p className={styles.sectionDesc}>
                더 이상 서비스를 이용하지 않으시려면 회원 탈퇴를 진행해 주세요.<br />
                탈퇴 시 모든 데이터는 삭제되며 복구할 수 없습니다.
            </p>

            <div style={{
                padding: '20px',
                backgroundColor: '#fff5f5',
                borderRadius: '8px',
                border: '1px solid #ffc9c9',
                marginTop: '15px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontWeight: 'bold', color: '#c92a2a', marginBottom: '4px' }}>계정 삭제</div>
                        <div style={{ fontSize: '13px', color: '#495057' }}>
                            {user.role === 'manager'
                                ? '팀장 권한을 보유 중인 경우, 권한을 변경하거나 위임한 후 탈퇴할 수 있습니다.'
                                : '탈퇴 시 계정과 관련된 모든 정보가 영구적으로 삭제됩니다.'}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            showConfirmAction('정말로 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.', async () => {
                                try {
                                    const userId = user.uid || user.id || '';
                                    const res = await fetch(`/api/users?id=${encodeURIComponent(userId)}`, {
                                        method: 'DELETE',
                                        headers: await getApiAuthHeaders()
                                    });
                                    const data: unknown = await res.json();

                                    if (res.ok) {
                                        showAlertAction('탈퇴가 완료되었습니다. 이용해 주셔서 감사합니다.', 'success', () => {
                                            localStorage.removeItem('user');
                                            window.location.href = '/login';
                                        });
                                    } else {
                                        console.error('Withdraw failed response:', data);
                                        showAlertAction('탈퇴 실패: 서버 응답을 확인해주세요.', 'error');
                                    }
                                } catch (error) {
                                    if (error instanceof Error) {
                                        console.error(error.message);
                                    } else {
                                        console.error(error);
                                    }
                                    showAlertAction('오류가 발생했습니다.', 'error');
                                }
                            }, true);
                        }}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#fa5252',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '600'
                        }}
                    >
                        탈퇴하기
                    </button>
                </div>
            </div>
        </div>
    );
}
