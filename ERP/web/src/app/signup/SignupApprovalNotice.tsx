type SignupApprovalNoticeProps = {
    readonly title: string;
    readonly description: string;
};

export function SignupApprovalNotice({ title, description }: SignupApprovalNoticeProps) {
    return (
        <div style={{
            marginTop: '8px',
            padding: '14px',
            borderRadius: '10px',
            border: '1px solid #dbe4ff',
            backgroundColor: '#f8fbff'
        }}>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#191f28', marginBottom: '6px' }}>
                {title}
            </div>
            <p style={{ fontSize: '12px', color: '#6b7684', lineHeight: 1.5, margin: 0 }}>
                {description}
            </p>
        </div>
    );
}
