export const adminUsersStyles = {
    container: { padding: '32px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'var(--font-pretendard)' },
    header: { marginBottom: '24px' },
    title: { fontSize: '24px', fontWeight: '800', margin: '0 0 8px 0', color: '#212529' },
    subtitle: { fontSize: '16px', color: '#868e96', margin: 0 },
    tabContainer: { display: 'flex', gap: '12px', marginBottom: '24px', borderBottom: '1px solid #dee2e6' },
    tab: {
        padding: '12px 20px',
        fontSize: '15px',
        fontWeight: 600,
        cursor: 'pointer',
        borderBottom: '2px solid transparent',
        color: '#868e96',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
    },
    activeTab: {
        borderBottom: '2px solid #1971c2',
        color: '#1971c2'
    },
    badge: {
        backgroundColor: '#fa5252',
        color: 'white',
        fontSize: '11px',
        padding: '2px 6px',
        borderRadius: '10px',
        fontWeight: 700
    },
    tableContainer: {
        backgroundColor: 'white',
        borderRadius: '12px',
        border: '1px solid #e9ecef',
        overflowX: 'auto',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
    },
    table: { width: '100%', minWidth: '900px', borderCollapse: 'collapse' as const, fontSize: '14px' },
    th: {
        textAlign: 'left' as const,
        padding: '16px',
        borderBottom: '1px solid #e9ecef',
        color: '#868e96',
        fontWeight: 600,
        fontSize: '13px',
        backgroundColor: '#f8f9fa'
    },
    td: { padding: '16px', borderBottom: '1px solid #f1f3f5', color: '#495057' },
    tr: { transition: 'background-color 0.2s' },
    actionBtn: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        borderRadius: '6px',
        border: 'none',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: 600
    },
    approveBtn: { backgroundColor: '#e6fcf5', color: '#0ca678' },
    statusBadge: { padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }
} as const;
