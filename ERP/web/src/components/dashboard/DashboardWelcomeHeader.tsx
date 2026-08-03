type DashboardWelcomeHeaderProps = {
    readonly userName: string;
    readonly date?: Date;
};

const styles = {
    pageTitle: { fontSize: '24px', fontWeight: '800', margin: '0 0 8px 0', color: '#212529' },
    pageSubtitle: { fontSize: '16px', color: '#868e96', margin: 0 },
    dateDisplay: {
        fontSize: '14px',
        color: '#868e96',
        fontWeight: 500,
        backgroundColor: '#f8f9fa',
        padding: '8px 16px',
        borderRadius: '20px'
    }
} as const;

export function DashboardWelcomeHeader({ userName, date = new Date() }: DashboardWelcomeHeaderProps) {
    return (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4 md:gap-0">
            <div>
                <h1 style={styles.pageTitle}>안녕하세요, {userName}님! 👋</h1>
                <p style={styles.pageSubtitle}>오늘도 성공적인 비즈니스를 응원합니다.</p>
            </div>
            <div style={styles.dateDisplay}>
                {date.toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    weekday: 'long'
                })}
            </div>
        </div>
    );
}
