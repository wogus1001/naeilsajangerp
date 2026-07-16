export type PropertyAreaUnit = 'squareMeter' | 'pyeong';

export type PropertyAreaValues = {
    readonly input: string;
    readonly unit: PropertyAreaUnit;
    readonly squareMeter: string;
    readonly pyeong: string;
};

const SQUARE_METERS_PER_PYEONG = 3.305785;

export function normalizeDecimalText(value: string): string {
    const cleaned = value.replace(/[^\d.]/g, '');
    const [first = '', ...rest] = cleaned.split('.');
    if (rest.length === 0) return first;
    return `${first}.${rest.join('')}`;
}

export function normalizeMoneyText(value: string): string {
    return value.replace(/\D/g, '');
}

export function formatMoneyText(value: string): string {
    const digits = normalizeMoneyText(value);
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function trimNumber(value: number): string {
    if (!Number.isFinite(value)) return '';
    return value.toFixed(2).replace(/\.?0+$/, '');
}

function parseDecimal(value: string): number | null {
    const normalized = normalizeDecimalText(value);
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
}

export function readPropertyAreaUnit(value: string): PropertyAreaUnit {
    return value === 'pyeong' || value === '평' ? 'pyeong' : 'squareMeter';
}

export function convertPrivateAreaValue(value: string, fromUnit: PropertyAreaUnit, toUnit: PropertyAreaUnit): string {
    if (fromUnit === toUnit) return normalizeDecimalText(value);
    const parsed = parseDecimal(value);
    if (parsed === null) return '';
    const converted = fromUnit === 'pyeong'
        ? parsed * SQUARE_METERS_PER_PYEONG
        : parsed / SQUARE_METERS_PER_PYEONG;
    return trimNumber(converted);
}

export function buildPrivateAreaValues(value: string, unitValue: string): PropertyAreaValues {
    const unit = readPropertyAreaUnit(unitValue);
    const normalized = normalizeDecimalText(value);
    const parsed = parseDecimal(normalized);
    if (parsed === null) {
        return { input: normalized, unit, squareMeter: '', pyeong: '' };
    }

    return {
        input: normalized,
        unit,
        squareMeter: unit === 'pyeong' ? trimNumber(parsed * SQUARE_METERS_PER_PYEONG) : trimNumber(parsed),
        pyeong: unit === 'pyeong' ? trimNumber(parsed) : trimNumber(parsed / SQUARE_METERS_PER_PYEONG)
    };
}

export function buildAreaHint(value: string, unitValue: string): string {
    const area = buildPrivateAreaValues(value, unitValue);
    if (!area.squareMeter || !area.pyeong) return '평 또는 ㎡로 입력할 수 있습니다.';
    return area.unit === 'pyeong'
        ? `약 ${area.squareMeter}㎡`
        : `약 ${area.pyeong}평`;
}

export function formatByteSize(bytes: number): string {
    if (bytes >= 1024 * 1024) return `${trimNumber(bytes / 1024 / 1024)}MB`;
    if (bytes >= 1024) return `${trimNumber(bytes / 1024)}KB`;
    return `${bytes}B`;
}
