const KOREAN_DIGITS = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'] as const;
const SMALL_UNITS = ['', '십', '백', '천'] as const;
const LARGE_UNITS = ['', '만', '억', '조'] as const;

export function normalizeAmountInput(value: string | number | null | undefined): number | null {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (!value) return null;

    const digits = value.replace(/[^\d]/g, '');
    if (!digits) return null;

    const parsed = Number(digits);
    return Number.isFinite(parsed) ? parsed : null;
}

function convertUnderTenThousand(value: number): string {
    let result = '';
    const padded = value.toString().padStart(4, '0');

    for (let index = 0; index < padded.length; index += 1) {
        const digit = Number(padded[index]);
        if (digit === 0) continue;

        const unitIndex = padded.length - index - 1;
        result += `${KOREAN_DIGITS[digit]}${SMALL_UNITS[unitIndex]}`;
    }

    return result;
}

export function numberToKoreanCurrency(value: string | number | null | undefined): string {
    const amount = normalizeAmountInput(value);
    if (amount === null) return '';
    if (amount === 0) return '영원';

    const groups: string[] = [];
    let rest = Math.floor(amount);

    while (rest > 0) {
        groups.push(convertUnderTenThousand(rest % 10000));
        rest = Math.floor(rest / 10000);
    }

    const korean = groups
        .map((group, index) => (group ? `${group}${LARGE_UNITS[index]}` : ''))
        .reverse()
        .join('');

    return `${korean}원`;
}

export function formatAmount(value: string | number | null | undefined): string {
    const amount = normalizeAmountInput(value);
    return amount === null ? '' : amount.toLocaleString('ko-KR');
}
