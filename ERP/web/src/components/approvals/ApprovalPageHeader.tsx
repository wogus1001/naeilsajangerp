type ApprovalPageHeaderProps = {
    readonly title: string;
    readonly description: string;
    readonly action?: React.ReactNode;
};

export function ApprovalPageHeader({ title, description, action }: ApprovalPageHeaderProps) {
    return (
        <div className="approval-page-header">
            <div>
                <h2>{title}</h2>
                <p>{description}</p>
            </div>
            {action}
        </div>
    );
}
