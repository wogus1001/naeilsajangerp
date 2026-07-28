type LeadPrivateTableValueProps = {
    readonly value: string;
    readonly className?: string;
};

export function LeadPrivateTableValue({ value, className }: LeadPrivateTableValueProps) {
    return <span className={className}>{value}</span>;
}
