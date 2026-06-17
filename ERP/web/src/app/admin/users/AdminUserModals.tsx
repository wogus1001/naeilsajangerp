"use client";

type AdminUserModalsProps = {
    readonly deleteTargetId: string | null;
    readonly resetTargetId: string | null;
    readonly newPassword: string;
    readonly resetLoading: boolean;
    readonly onCancelDelete: () => void;
    readonly onConfirmDelete: () => void;
    readonly onCancelReset: () => void;
    readonly onPasswordChange: (value: string) => void;
    readonly onConfirmReset: () => void;
};

const overlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
} as const;

const modalStyle = {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
} as const;

const cancelButtonStyle = {
    padding: '8px 16px',
    borderRadius: '6px',
    border: '1px solid #ddd',
    backgroundColor: 'white',
    cursor: 'pointer'
} as const;

export function AdminUserModals({
    deleteTargetId,
    resetTargetId,
    newPassword,
    resetLoading,
    onCancelDelete,
    onConfirmDelete,
    onCancelReset,
    onPasswordChange,
    onConfirmReset
}: AdminUserModalsProps) {
    return (
        <>
            {deleteTargetId && (
                <div style={overlayStyle}>
                    <div style={{ ...modalStyle, width: '320px' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '18px' }}>사용자 삭제</h3>
                        <p style={{ color: '#666', marginBottom: '24px' }}>정말 이 사용자를 삭제하시겠습니까?</p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <button onClick={onCancelDelete} style={cancelButtonStyle}>취소</button>
                            <button onClick={onConfirmDelete} style={{ ...cancelButtonStyle, border: 'none', backgroundColor: '#fa5252', color: 'white' }}>삭제</button>
                        </div>
                    </div>
                </div>
            )}
            {resetTargetId && (
                <div style={overlayStyle}>
                    <div style={{ ...modalStyle, width: '360px' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '18px' }}>비밀번호 변경</h3>
                        <p style={{ color: '#666', marginBottom: '16px', fontSize: '14px' }}>
                            새로운 비밀번호를 입력하세요. <br />
                            (변경 후 즉시 적용됩니다)
                        </p>
                        <input
                            type="password"
                            placeholder="새 비밀번호 (6자 이상)"
                            value={newPassword}
                            onChange={event => onPasswordChange(event.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px',
                                borderRadius: '6px',
                                border: '1px solid #dee2e6',
                                marginBottom: '20px',
                                fontSize: '14px'
                            }}
                            autoFocus
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <button onClick={onCancelReset} style={cancelButtonStyle}>취소</button>
                            <button
                                onClick={onConfirmReset}
                                disabled={resetLoading}
                                style={{
                                    ...cancelButtonStyle,
                                    border: 'none',
                                    backgroundColor: '#228be6',
                                    color: 'white',
                                    opacity: resetLoading ? 0.7 : 1
                                }}
                            >
                                {resetLoading ? '변경 중...' : '변경하기'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
