import {
    DEFAULT_META_FIELD_MAPPING,
    normalizeMetaLeadQuestions,
    suggestMetaFieldMapping,
    type MetaLeadQuestion
} from '@/lib/meta-lead-field-mapping';

export type MetaDiscoveredForm = {
    readonly id: string;
    readonly name?: string;
    readonly status?: string;
    readonly created_time?: string;
    readonly questions?: unknown;
};

type ExistingMetaFormForDiscovery = {
    readonly data?: unknown;
};

type MetaFormDiscoveryWriteInput = {
    readonly companyId: string;
    readonly connectionId: string;
    readonly connectedBy: string;
    readonly discoveredForm: MetaDiscoveredForm;
    readonly existingForm?: ExistingMetaFormForDiscovery | null;
};

type MetaFormDiscoveryValues = Record<string, unknown> & {
    readonly data: Record<string, unknown> & {
        readonly questions: readonly MetaLeadQuestion[];
    };
};

export type MetaFormDiscoveryWrite =
    | { readonly kind: 'insert'; readonly values: MetaFormDiscoveryValues }
    | { readonly kind: 'update'; readonly values: MetaFormDiscoveryValues };

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function planMetaFormDiscoveryWrite(input: MetaFormDiscoveryWriteInput): MetaFormDiscoveryWrite {
    const questions = normalizeMetaLeadQuestions(input.discoveredForm.questions);
    const existingData = isRecord(input.existingForm?.data) ? input.existingForm.data : {};
    const shared: MetaFormDiscoveryValues = {
        company_id: input.companyId,
        connection_id: input.connectionId,
        meta_form_id: input.discoveredForm.id,
        meta_form_name: input.discoveredForm.name || input.discoveredForm.id,
        data: {
            ...existingData,
            metaStatus: input.discoveredForm.status || '',
            metaCreatedTime: input.discoveredForm.created_time || '',
            questions
        }
    };

    if (input.existingForm) {
        return { kind: 'update', values: shared };
    }

    return {
        kind: 'insert',
        values: {
            ...shared,
            enabled: false,
            default_manager_id: input.connectedBy,
            field_mapping: questions.length > 0
                ? suggestMetaFieldMapping(questions)
                : DEFAULT_META_FIELD_MAPPING
        }
    };
}
