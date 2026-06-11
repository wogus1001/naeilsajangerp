const EXTERNAL_IMPORT_MODES = ['auto-created', 'auto-updated', 'manual-promoted'] as const;

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(record: Readonly<Record<string, unknown>>, key: string): string {
    const value = record[key];
    return typeof value === 'string' ? value.trim() : '';
}

export function isExternalCollectedProperty(property: unknown): boolean {
    if (!isRecord(property)) return false;

    const processStatus = readString(property, 'processStatus');
    const externalImportMode = readString(property, 'externalImportMode');

    return processStatus.includes('외부수집')
        || Boolean(readString(property, 'externalSource'))
        || Boolean(readString(property, 'externalListingId'))
        || EXTERNAL_IMPORT_MODES.some(mode => mode === externalImportMode);
}
