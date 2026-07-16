export function withCurrentSelectOption(
    options: readonly string[],
    currentValue: string
): readonly string[] {
    if (!currentValue || options.includes(currentValue)) return options;
    return [...options, currentValue];
}
