import { Megaphone } from 'lucide-react';

type MaintenanceScreenProps = {
    readonly message?: string;
};

export function MaintenanceScreen({ message }: MaintenanceScreenProps) {
    return (
        <div style={{
            height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8f9fa',
            fontFamily: 'var(--font-pretendard)', textAlign: 'center', padding: '20px'
        }}>
            <div style={{ backgroundColor: '#fff5f5', color: '#fa5252', padding: '16px', borderRadius: '50%', marginBottom: '24px' }}>
                <Megaphone size={48} />
            </div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#212529', marginBottom: '16px' }}>시스템 점검 중</h1>
            <p style={{ fontSize: '18px', color: '#495057', lineHeight: 1.6, maxWidth: '500px' }}>
                {message || "더 나은 서비스를 위해 시스템 정기 점검을 진행하고 있습니다. 잠시 후 다시 접속해주세요."}
            </p>
            <div style={{ marginTop: '32px', fontSize: '14px', color: '#adb5bd' }}>
                관리자 문의: admin@naeilsajang.com
            </div>
        </div>
    );
}
