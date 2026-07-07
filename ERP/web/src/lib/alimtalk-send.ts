import { SolapiMessageService, type DetailGroupMessageResponse, type RequestSendOneMessageSchema } from 'solapi';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSolapiNotificationConfig, normalizeSolapiPhone } from './solapi-notifications';
import {
    buildAlimtalkVariables,
    cleanString,
    isMissingAlimtalkSchemaError,
    resolveAlimtalkBlockReason,
    toMonthStartIso,
    type AlimtalkCompanySettingConfigRow,
    type AlimtalkScenarioConfigRow,
    type AlimtalkScenarioKey,
    type AlimtalkSendInput,
    type AlimtalkSendResult,
    type AlimtalkSendStatus,
    type AlimtalkTemplateConfigRow
} from './alimtalk-send-support';
export {
    ALIMTALK_SCENARIO_KEYS,
    buildAlimtalkVariables,
    formatAlimtalkDate,
    resolveAlimtalkBlockReason,
    type AlimtalkRecipient,
    type AlimtalkScenarioKey,
    type AlimtalkSendInput,
    type AlimtalkSendResult
} from './alimtalk-send-support';

type AlimtalkConfig =
    | {
        readonly ready: true;
        readonly scenario: AlimtalkScenarioConfigRow;
        readonly template: AlimtalkTemplateConfigRow;
        readonly companySetting: AlimtalkCompanySettingConfigRow | null;
        readonly monthlySendCount: number;
    }
    | { readonly ready: false; readonly reason: string };

type SendLogInput = {
    readonly input: AlimtalkSendInput;
    readonly templateKey: string;
    readonly recipientPhone: string;
    readonly status: AlimtalkSendStatus;
    readonly providerMessageId?: string;
    readonly errorMessage?: string;
    readonly sentAt: string;
};

async function fetchAlimtalkConfig(
    supabaseAdmin: SupabaseClient,
    scenarioKey: AlimtalkScenarioKey,
    companyId: string | null,
    now: Date
): Promise<AlimtalkConfig> {
    const { data: scenario, error: scenarioError } = await supabaseAdmin
        .from('alimtalk_scenarios')
        .select('scenario_key, template_key, enabled, fallback_channel')
        .eq('scenario_key', scenarioKey)
        .maybeSingle<AlimtalkScenarioConfigRow>();
    if (scenarioError) {
        if (isMissingAlimtalkSchemaError(scenarioError)) return { ready: false, reason: 'AlimTalk SQL is not applied' };
        throw scenarioError;
    }
    if (!scenario) return { ready: false, reason: 'scenario is missing' };

    const { data: template, error: templateError } = await supabaseAdmin
        .from('alimtalk_templates')
        .select('template_key, template_id, channel_id, status, enabled')
        .eq('template_key', scenario.template_key)
        .maybeSingle<AlimtalkTemplateConfigRow>();
    if (templateError) throw templateError;
    if (!template) return { ready: false, reason: 'template is missing' };

    const [settingResult, countResult] = await Promise.all([
        companyId
            ? supabaseAdmin
                .from('alimtalk_company_settings')
                .select('enabled, monthly_limit')
                .eq('company_id', companyId)
                .maybeSingle<AlimtalkCompanySettingConfigRow>()
            : Promise.resolve({ data: null, error: null }),
        companyId
            ? supabaseAdmin
                .from('alimtalk_send_logs')
                .select('id', { count: 'exact', head: true })
                .eq('company_id', companyId)
                .eq('status', 'success')
                .gte('sent_at', toMonthStartIso(now))
            : Promise.resolve({ count: 0, error: null })
    ]);
    if (settingResult.error) throw settingResult.error;
    if (countResult.error) throw countResult.error;

    return {
        ready: true,
        scenario,
        template,
        companySetting: settingResult.data,
        monthlySendCount: countResult.count || 0
    };
}

async function hasExistingSendLog(
    supabaseAdmin: SupabaseClient,
    input: AlimtalkSendInput,
    recipientPhone: string
): Promise<boolean> {
    if (!input.companyId || !input.sourceType || !input.sourceId || !recipientPhone) return false;
    const { data, error } = await supabaseAdmin
        .from('alimtalk_send_logs')
        .select('id')
        .eq('company_id', input.companyId)
        .eq('scenario_key', input.scenarioKey)
        .eq('source_type', input.sourceType)
        .eq('source_id', input.sourceId)
        .eq('recipient_phone', recipientPhone)
        .limit(1);
    if (error) throw error;
    return Boolean(data && data.length > 0);
}

async function writeSendLog(supabaseAdmin: SupabaseClient, log: SendLogInput): Promise<void> {
    const { error } = await supabaseAdmin.from('alimtalk_send_logs').insert({
        company_id: log.input.companyId,
        scenario_key: log.input.scenarioKey,
        template_key: log.templateKey,
        source_type: log.input.sourceType,
        source_id: log.input.sourceId,
        recipient_profile_id: log.input.recipient.profileId || null,
        recipient_name: log.input.recipient.name,
        recipient_phone: log.recipientPhone,
        status: log.status,
        provider_message_id: log.providerMessageId || '',
        error_message: log.errorMessage || '',
        variables: buildAlimtalkVariables(log.input.variables),
        sent_at: log.sentAt,
        created_at: log.sentAt
    });
    if (error && error.code !== '23505') throw error;
}

function getProviderMessageId(response: DetailGroupMessageResponse): string {
    return cleanString(response.messageList?.[0]?.messageId);
}

export async function sendAlimtalkNotification(
    supabaseAdmin: SupabaseClient,
    input: AlimtalkSendInput
): Promise<AlimtalkSendResult> {
    const now = input.now ?? new Date();
    const sentAt = now.toISOString();
    const recipientPhone = normalizeSolapiPhone(input.recipient.phone);
    const config = await fetchAlimtalkConfig(supabaseAdmin, input.scenarioKey, input.companyId, now);
    if (!config.ready) return { status: 'skipped', reason: config.reason };

    const provider = getSolapiNotificationConfig();
    const blockReason = resolveAlimtalkBlockReason({
        scenario: config.scenario,
        template: config.template,
        companySetting: config.companySetting,
        monthlySendCount: config.monthlySendCount,
        recipientPhone,
        providerEnabled: provider.enabled
    });
    if (blockReason) {
        await writeSendLog(supabaseAdmin, {
            input,
            templateKey: config.template.template_key,
            recipientPhone,
            status: 'blocked',
            errorMessage: blockReason,
            sentAt
        });
        return { status: 'blocked', reason: blockReason };
    }
    if (!provider.enabled) return { status: 'skipped', reason: 'provider disabled' };
    if (await hasExistingSendLog(supabaseAdmin, input, recipientPhone)) {
        return { status: 'skipped', reason: 'already sent for source' };
    }

    try {
        const messageService = new SolapiMessageService(provider.apiKey, provider.apiSecret);
        const message: RequestSendOneMessageSchema = {
            to: recipientPhone,
            from: provider.senderPhone,
            type: 'ATA',
            kakaoOptions: {
                pfId: config.template.channel_id,
                templateId: config.template.template_id,
                variables: buildAlimtalkVariables(input.variables),
                disableSms: config.scenario.fallback_channel !== 'sms'
            }
        };
        const response = await messageService.send(message);
        await writeSendLog(supabaseAdmin, {
            input,
            templateKey: config.template.template_key,
            recipientPhone,
            status: 'success',
            providerMessageId: getProviderMessageId(response),
            sentAt
        });
        return { status: 'success', reason: 'sent' };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'AlimTalk send failed';
        await writeSendLog(supabaseAdmin, {
            input,
            templateKey: config.template.template_key,
            recipientPhone,
            status: 'failed',
            errorMessage: message.slice(0, 1000),
            sentAt
        });
        return { status: 'failed', reason: message };
    }
}
