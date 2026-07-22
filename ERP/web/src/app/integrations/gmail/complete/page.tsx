import {
    GMAIL_OAUTH_RESULT_MESSAGE_TYPE,
    type GmailOAuthResultMessage
} from '@/lib/gmail-oauth-flow';
import { GmailOAuthCompleteClient } from './GmailOAuthCompleteClient';

type PageProps = {
    readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined): string | undefined {
    return Array.isArray(value) ? value[0] : value;
}

export default async function GmailOAuthCompletePage({ searchParams }: PageProps) {
    const params = await searchParams;
    const result: GmailOAuthResultMessage = {
        type: GMAIL_OAUTH_RESULT_MESSAGE_TYPE,
        gmail: firstValue(params.gmail) === 'connected' ? 'connected' : 'error',
        ...(firstValue(params.email) ? { email: firstValue(params.email) } : {}),
        ...(firstValue(params.reason) ? { reason: firstValue(params.reason) } : {})
    };
    return <GmailOAuthCompleteClient result={result} />;
}
