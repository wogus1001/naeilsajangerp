import crypto from 'crypto';
import { randomUUID } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
    DEFAULT_FRANCHISE_LEAD_STATUS,
    normalizeLeadPhone
} from '@/lib/franchise-leads';

export const META_LEAD_SOURCE = 'Meta Lead Ads';
export const META_LEAD_SOURCE_TYPE = 'meta-lead-ad';

export type MetaFieldMapping = {
    name: string[];
    mobile: string[];
    desiredRegion: string[];
    budget: string[];
    budgetMin: string[];
    budgetMax: string[];
    interestedBrand: string[];
    memo: string[];
};

export type MetaLeadImportResult = {
    status: 'created' | 'updated' | 'duplicate' | 'skipped' | 'error';
    leadId?: string | null;
    message?: string;
};

type MetaGraphPage = {
    id: string;
    name?: string;
    access_token?: string;
    tasks?: string[];
    category?: string;
};

type MetaGraphForm = {
    id: string;
    name?: string;
    status?: string;
    created_time?: string;
};

type MetaLeadField = {
    name: string;
    values?: string[];
};

export type MetaLeadPayload = {
    id?: string;
    leadgen_id?: string;
    created_time?: string;
    ad_id?: string;
    ad_name?: string;
    campaign_id?: string;
    campaign_name?: string;
    form_id?: string;
    platform?: string;
    field_data?: MetaLeadField[];
    custom_disclaimer_responses?: unknown;
    [key: string]: unknown;
};

export const DEFAULT_META_FIELD_MAPPING: MetaFieldMapping = {
    name: ['full_name', 'name', 'first_name', 'last_name', '이름', '성명', '후보자명'],
    mobile: ['phone_number', 'phone', 'mobile', '연락처', '휴대폰', '전화번호', '핸드폰'],
    desiredRegion: ['desired_region', 'region', 'area', 'location', '희망지역', '관심지역', '지역'],
    budget: ['budget', 'startup_budget', '예산', '창업예산', '창업예산(만원)'],
    budgetMin: ['budget_min', 'min_budget', '예산최소', '예산최소(만원)', '최소예산'],
    budgetMax: ['budget_max', 'max_budget', '예산최대', '예산최대(만원)', '최대예산'],
    interestedBrand: ['brand', 'interested_brand', '관심브랜드', '브랜드'],
    memo: ['memo', 'message', 'comment', '문의내용', '메모', '비고']
};

const GRAPH_FIELDS = [
    'created_time',
    'id',
    'ad_id',
    'ad_name',
    'campaign_id',
    'campaign_name',
    'form_id',
    'platform',
    'field_data',
    'custom_disclaimer_responses'
].join(',');

function getGraphVersion() {
    return process.env.META_GRAPH_API_VERSION || 'v25.0';
}

function getGraphBaseUrl() {
    return `https://graph.facebook.com/${getGraphVersion()}`;
}

function getEncryptionKey() {
    const raw = process.env.META_TOKEN_ENCRYPTION_KEY || process.env.META_APP_SECRET || '';
    if (!raw) {
        throw new Error('META_TOKEN_ENCRYPTION_KEY is required');
    }
    return crypto.createHash('sha256').update(raw).digest();
}

export function encryptMetaToken(token: string) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
    const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [iv, tag, encrypted].map(part => part.toString('base64url')).join('.');
}

export function decryptMetaToken(value: string) {
    const [ivRaw, tagRaw, encryptedRaw] = value.split('.');
    if (!ivRaw || !tagRaw || !encryptedRaw) {
        throw new Error('Invalid encrypted Meta token');
    }

    const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        getEncryptionKey(),
        Buffer.from(ivRaw, 'base64url')
    );
    decipher.setAuthTag(Buffer.from(tagRaw, 'base64url'));
    return Buffer.concat([
        decipher.update(Buffer.from(encryptedRaw, 'base64url')),
        decipher.final()
    ]).toString('utf8');
}

export function verifyMetaWebhookSignature(body: string, signature: string | null) {
    const appSecret = process.env.META_APP_SECRET;
    if (!appSecret) return false;
    if (!signature?.startsWith('sha256=')) return false;

    const expected = `sha256=${crypto
        .createHmac('sha256', appSecret)
        .update(body, 'utf8')
        .digest('hex')}`;

    const expectedBuffer = Buffer.from(expected, 'utf8');
    const actualBuffer = Buffer.from(signature, 'utf8');
    return expectedBuffer.length === actualBuffer.length && crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

export function canManageMetaIntegration(profile: { role: string | null; company_id: string | null } | null) {
    return profile?.role === 'admin' || profile?.role === 'manager';
}

export function sanitizeMetaConnection(row: any) {
    if (!row) return null;
    const data = row.data || {};
    return {
        id: row.id,
        companyId: row.company_id,
        connectedBy: row.connected_by,
        metaUserId: row.meta_user_id,
        metaPageId: row.meta_page_id,
        metaPageName: row.meta_page_name,
        status: row.status,
        tokenExpiresAt: row.token_expires_at,
        lastSyncAt: row.last_sync_at,
        lastWebhookAt: row.last_webhook_at,
        lastError: row.last_error,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        pageCategory: data.pageCategory || '',
        subscribeError: data.subscribeError || ''
    };
}

export function sanitizeMetaForm(row: any) {
    if (!row) return null;
    return {
        id: row.id,
        companyId: row.company_id,
        connectionId: row.connection_id,
        metaFormId: row.meta_form_id,
        metaFormName: row.meta_form_name,
        enabled: Boolean(row.enabled),
        defaultManagerId: row.default_manager_id,
        fieldMapping: normalizeFieldMapping(row.field_mapping),
        lastSyncedAt: row.last_synced_at,
        lastError: row.last_error,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        data: row.data || {}
    };
}

export function sanitizeMetaImport(row: any) {
    if (!row) return null;
    return {
        id: row.id,
        companyId: row.company_id,
        connectionId: row.connection_id,
        formId: row.form_id,
        metaLeadId: row.meta_lead_id,
        franchiseLeadId: row.franchise_lead_id,
        status: row.status,
        errorMessage: row.error_message,
        receivedAt: row.received_at,
        importedAt: row.imported_at,
        createdAt: row.created_at
    };
}

export function normalizeFieldMapping(value: unknown): MetaFieldMapping {
    const raw = (value && typeof value === 'object' ? value : {}) as Partial<Record<keyof MetaFieldMapping, unknown>>;
    const next = { ...DEFAULT_META_FIELD_MAPPING };

    (Object.keys(next) as Array<keyof MetaFieldMapping>).forEach(key => {
        const candidate = raw[key];
        if (Array.isArray(candidate)) {
            const normalized = candidate.map(item => String(item).trim()).filter(Boolean);
            if (normalized.length > 0) next[key] = normalized;
        } else if (typeof candidate === 'string') {
            const normalized = candidate.split(',').map(item => item.trim()).filter(Boolean);
            if (normalized.length > 0) next[key] = normalized;
        }
    });

    return next;
}

function cleanString(value: unknown) {
    if (value === null || value === undefined) return '';
    return String(value).trim();
}

function normalizeKey(value: string) {
    return value.trim().normalize('NFC').toLowerCase();
}

function parseNullableNumber(value: unknown): number | null {
    const raw = cleanString(value);
    if (!raw) return null;

    const compact = raw.replace(/,/g, '');
    const eokMatch = compact.match(/(-?\d+(?:\.\d+)?)\s*억/);
    const manMatch = compact.match(/(-?\d+(?:\.\d+)?)\s*만/);

    if (eokMatch || manMatch) {
        const eok = eokMatch ? Number(eokMatch[1]) * 100_000_000 : 0;
        const man = manMatch ? Number(manMatch[1]) * 10_000 : 0;
        const total = eok + man;
        return Number.isFinite(total) ? total : null;
    }

    const parsed = Number(compact.replace(/[^\d.-]/g, ''));
    if (!Number.isFinite(parsed)) return null;
    if (raw.includes('원') && !raw.includes('만원')) return parsed;
    return Math.abs(parsed) > 0 && Math.abs(parsed) < 1_000_000 ? parsed * 10_000 : parsed;
}

function parseBudgetRange(value: unknown) {
    const raw = cleanString(value);
    const numbers = raw.match(/-?\d+(?:\.\d+)?(?:,\d{3})*/g)?.map(parseNullableNumber).filter((num): num is number => num !== null) || [];
    return {
        min: numbers[0] ?? null,
        max: numbers[1] ?? null
    };
}

function getFieldMap(fieldData: MetaLeadField[] | undefined) {
    const map = new Map<string, string>();

    (fieldData || []).forEach(field => {
        const value = (field.values || []).map(cleanString).filter(Boolean).join(', ');
        if (!field.name || !value) return;
        map.set(normalizeKey(field.name), value);
    });

    return map;
}

function pickMappedValue(fieldMap: Map<string, string>, keys: string[]) {
    for (const key of keys) {
        const value = fieldMap.get(normalizeKey(key));
        if (value) return value;
    }
    return '';
}

export function mapMetaLeadToFranchiseLead(lead: MetaLeadPayload, mappingValue: unknown) {
    const mapping = normalizeFieldMapping(mappingValue);
    const fieldMap = getFieldMap(lead.field_data);
    const firstName = pickMappedValue(fieldMap, ['first_name']);
    const lastName = pickMappedValue(fieldMap, ['last_name']);
    const mappedBudget = parseBudgetRange(pickMappedValue(fieldMap, mapping.budget));
    const budgetMin = parseNullableNumber(pickMappedValue(fieldMap, mapping.budgetMin)) ?? mappedBudget.min;
    const budgetMax = parseNullableNumber(pickMappedValue(fieldMap, mapping.budgetMax)) ?? mappedBudget.max;
    const name = pickMappedValue(fieldMap, mapping.name) || [firstName, lastName].filter(Boolean).join(' ');

    return {
        name,
        mobile: pickMappedValue(fieldMap, mapping.mobile),
        desiredRegion: pickMappedValue(fieldMap, mapping.desiredRegion),
        budgetMin,
        budgetMax,
        interestedBrand: pickMappedValue(fieldMap, mapping.interestedBrand),
        memo: pickMappedValue(fieldMap, mapping.memo),
        fields: Object.fromEntries(fieldMap)
    };
}

async function graphFetch<T>(path: string, params: Record<string, string | undefined>, init?: RequestInit): Promise<T> {
    const url = new URL(`${getGraphBaseUrl()}${path}`);
    Object.entries(params).forEach(([key, value]) => {
        if (value) url.searchParams.set(key, value);
    });

    const response = await fetch(url, init);
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || payload?.error) {
        throw new Error(payload?.error?.message || `Meta Graph API failed: ${response.status}`);
    }

    return payload as T;
}

export async function exchangeMetaCode(code: string, redirectUri: string) {
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    if (!appId || !appSecret) {
        throw new Error('META_APP_ID and META_APP_SECRET are required');
    }

    const shortToken = await graphFetch<{ access_token: string; expires_in?: number }>('/oauth/access_token', {
        client_id: appId,
        client_secret: appSecret,
        redirect_uri: redirectUri,
        code
    });

    const longToken = await graphFetch<{ access_token: string; expires_in?: number }>('/oauth/access_token', {
        grant_type: 'fb_exchange_token',
        client_id: appId,
        client_secret: appSecret,
        fb_exchange_token: shortToken.access_token
    });

    return longToken;
}

export async function fetchMetaPages(userAccessToken: string) {
    const pages = await graphFetch<{ data?: MetaGraphPage[] }>('/me/accounts', {
        fields: 'id,name,access_token,tasks,category',
        access_token: userAccessToken
    });

    return pages.data || [];
}

export async function fetchMetaForms(pageId: string, pageAccessToken: string) {
    const forms = await graphFetch<{ data?: MetaGraphForm[] }>(`/${pageId}/leadgen_forms`, {
        fields: 'id,name,status,created_time',
        access_token: pageAccessToken
    });

    return forms.data || [];
}

export async function subscribeMetaPageToLeadgen(pageId: string, pageAccessToken: string) {
    const url = new URL(`${getGraphBaseUrl()}/${pageId}/subscribed_apps`);
    url.searchParams.set('subscribed_fields', 'leadgen');
    url.searchParams.set('access_token', pageAccessToken);

    const response = await fetch(url, { method: 'POST' });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.error) {
        throw new Error(payload?.error?.message || 'Failed to subscribe Meta page to leadgen');
    }

    return payload;
}

export async function fetchMetaLeadById(leadgenId: string, pageAccessToken: string) {
    return graphFetch<MetaLeadPayload>(`/${leadgenId}`, {
        fields: GRAPH_FIELDS,
        access_token: pageAccessToken
    });
}

export async function fetchMetaFormLeads(formId: string, pageAccessToken: string, after?: string) {
    const params: Record<string, string | undefined> = {
        fields: GRAPH_FIELDS,
        limit: '100',
        access_token: pageAccessToken
    };
    if (after) params.after = after;

    return graphFetch<{ data?: MetaLeadPayload[]; paging?: { cursors?: { after?: string }; next?: string } }>(`/${formId}/leads`, params);
}

export async function upsertMetaPagesAndForms(
    supabaseAdmin: SupabaseClient,
    options: {
        companyId: string;
        connectedBy: string;
        metaUserId?: string;
        userAccessToken: string;
    }
) {
    const pages = await fetchMetaPages(options.userAccessToken);
    const savedConnections: any[] = [];
    const savedForms: any[] = [];

    for (const page of pages) {
        if (!page.id || !page.access_token) continue;

        let status = 'connected';
        let subscribeError = '';
        try {
            await subscribeMetaPageToLeadgen(page.id, page.access_token);
        } catch (error) {
            status = 'needs_setup';
            subscribeError = error instanceof Error ? error.message : 'Page subscription failed';
        }

        const encryptedToken = encryptMetaToken(page.access_token);
        const { data: connection, error } = await supabaseAdmin
            .from('meta_lead_connections')
            .upsert({
                company_id: options.companyId,
                connected_by: options.connectedBy,
                meta_user_id: options.metaUserId || null,
                meta_page_id: page.id,
                meta_page_name: page.name || page.id,
                access_token_encrypted: encryptedToken,
                status,
                last_error: subscribeError || null,
                updated_at: new Date().toISOString(),
                data: {
                    pageCategory: page.category || '',
                    pageTasks: page.tasks || [],
                    subscribeError
                }
            }, { onConflict: 'company_id,meta_page_id' })
            .select()
            .single();

        if (error) throw error;
        savedConnections.push(connection);

        let forms: MetaGraphForm[] = [];
        try {
            forms = await fetchMetaForms(page.id, page.access_token);
        } catch (error) {
            await supabaseAdmin
                .from('meta_lead_connections')
                .update({
                    status: 'needs_setup',
                    last_error: error instanceof Error ? error.message : 'Failed to fetch forms',
                    updated_at: new Date().toISOString()
                })
                .eq('id', connection.id);
            continue;
        }

        for (const form of forms) {
            if (!form.id) continue;
            const { data: savedForm, error: formError } = await supabaseAdmin
                .from('meta_lead_forms')
                .upsert({
                    company_id: options.companyId,
                    connection_id: connection.id,
                    meta_form_id: form.id,
                    meta_form_name: form.name || form.id,
                    default_manager_id: options.connectedBy,
                    field_mapping: DEFAULT_META_FIELD_MAPPING,
                    updated_at: new Date().toISOString(),
                    data: {
                        metaStatus: form.status || '',
                        metaCreatedTime: form.created_time || ''
                    }
                }, { onConflict: 'company_id,meta_form_id' })
                .select()
                .single();

            if (formError) throw formError;
            savedForms.push(savedForm);
        }
    }

    return { connections: savedConnections, forms: savedForms };
}

async function recordMetaImport(
    supabaseAdmin: SupabaseClient,
    options: {
        companyId: string;
        connectionId?: string | null;
        formId?: string | null;
        metaLeadId: string;
        franchiseLeadId?: string | null;
        status: string;
        errorMessage?: string | null;
        payload?: Record<string, unknown>;
        importedAt?: string | null;
    }
) {
    const { error } = await supabaseAdmin
        .from('meta_lead_imports')
        .upsert({
            company_id: options.companyId,
            connection_id: options.connectionId || null,
            form_id: options.formId || null,
            meta_lead_id: options.metaLeadId,
            franchise_lead_id: options.franchiseLeadId || null,
            status: options.status,
            error_message: options.errorMessage || null,
            payload: options.payload || {},
            imported_at: options.importedAt || null,
            received_at: new Date().toISOString()
        }, { onConflict: 'company_id,meta_lead_id' });

    if (error) throw error;
}

function buildMetaData(lead: MetaLeadPayload, mapped: ReturnType<typeof mapMetaLeadToFranchiseLead>, connection: any, form: any) {
    const leadgenId = String(lead.id || lead.leadgen_id || '');
    return {
        sourceType: META_LEAD_SOURCE_TYPE,
        sourceId: leadgenId,
        meta: {
            leadgenId,
            pageId: connection.meta_page_id,
            pageName: connection.meta_page_name,
            formId: form.meta_form_id,
            formName: form.meta_form_name,
            createdTime: lead.created_time || null,
            adId: lead.ad_id || null,
            adName: lead.ad_name || null,
            campaignId: lead.campaign_id || null,
            campaignName: lead.campaign_name || null,
            platform: lead.platform || null,
            fields: mapped.fields,
            raw: lead
        }
    };
}

export async function importMetaLead(
    supabaseAdmin: SupabaseClient,
    connection: any,
    form: any,
    lead: MetaLeadPayload
): Promise<MetaLeadImportResult> {
    const metaLeadId = String(lead.id || lead.leadgen_id || '');
    if (!metaLeadId) {
        return { status: 'error', message: 'Meta lead ID is missing' };
    }

    const { data: existingImport } = await supabaseAdmin
        .from('meta_lead_imports')
        .select('id, status, franchise_lead_id')
        .eq('company_id', connection.company_id)
        .eq('meta_lead_id', metaLeadId)
        .maybeSingle();

    if (existingImport && ['created', 'updated', 'duplicate'].includes(existingImport.status)) {
        return {
            status: 'duplicate',
            leadId: existingImport.franchise_lead_id,
            message: 'Meta lead already imported'
        };
    }

    const managerId = form.default_manager_id || connection.connected_by;
    if (!managerId) {
        await recordMetaImport(supabaseAdmin, {
            companyId: connection.company_id,
            connectionId: connection.id,
            formId: form.id,
            metaLeadId,
            status: 'error',
            errorMessage: 'Default manager is missing',
            payload: { lead }
        });
        return { status: 'error', message: 'Default manager is missing' };
    }

    const mapped = mapMetaLeadToFranchiseLead(lead, form.field_mapping);
    if (!mapped.name && !mapped.mobile) {
        await recordMetaImport(supabaseAdmin, {
            companyId: connection.company_id,
            connectionId: connection.id,
            formId: form.id,
            metaLeadId,
            status: 'skipped',
            errorMessage: 'Name and mobile are both missing',
            payload: { lead, mapped }
        });
        return { status: 'skipped', message: 'Name and mobile are both missing' };
    }

    const mobileNormalized = normalizeLeadPhone(mapped.mobile);
    const metaData = buildMetaData(lead, mapped, connection, form);
    const now = new Date().toISOString();

    if (mobileNormalized) {
        const { data: existingLead, error: existingError } = await supabaseAdmin
            .from('franchise_leads')
            .select('*')
            .eq('company_id', connection.company_id)
            .eq('mobile_normalized', mobileNormalized)
            .maybeSingle();

        if (existingError) throw existingError;

        if (existingLead) {
            const nextData = {
                ...(existingLead.data || {}),
                meta: {
                    ...((existingLead.data || {}).meta || {}),
                    ...metaData.meta
                }
            };

            const { data: updatedLead, error: updateError } = await supabaseAdmin
                .from('franchise_leads')
                .update({
                    data: nextData,
                    updated_at: now
                })
                .eq('id', existingLead.id)
                .select()
                .single();

            if (updateError) throw updateError;

            await recordMetaImport(supabaseAdmin, {
                companyId: connection.company_id,
                connectionId: connection.id,
                formId: form.id,
                metaLeadId,
                franchiseLeadId: updatedLead.id,
                status: 'updated',
                payload: { lead, mapped },
                importedAt: now
            });

            return { status: 'updated', leadId: updatedLead.id };
        }
    }

    const activityId = randomUUID();
    const { data: insertedLead, error: insertError } = await supabaseAdmin
        .from('franchise_leads')
        .insert({
            id: randomUUID(),
            company_id: connection.company_id,
            manager_id: managerId,
            name: mapped.name || mapped.mobile || 'Meta Lead',
            mobile: mapped.mobile,
            mobile_normalized: mobileNormalized,
            source: META_LEAD_SOURCE,
            status: DEFAULT_FRANCHISE_LEAD_STATUS,
            grade: '',
            desired_region: mapped.desiredRegion,
            budget_min: mapped.budgetMin,
            budget_max: mapped.budgetMax,
            interested_brand: mapped.interestedBrand,
            memo: mapped.memo,
            created_at: lead.created_time ? new Date(lead.created_time).toISOString() : now,
            updated_at: now,
            data: {
                ...metaData,
                activityLog: [{
                    id: activityId,
                    type: '메모',
                    content: `Meta Lead Ads에서 자동 등록 (${form.meta_form_name || form.meta_form_id})`,
                    createdAt: now,
                    createdBy: 'Meta Lead Ads'
                }]
            }
        })
        .select()
        .single();

    if (insertError) throw insertError;

    await recordMetaImport(supabaseAdmin, {
        companyId: connection.company_id,
        connectionId: connection.id,
        formId: form.id,
        metaLeadId,
        franchiseLeadId: insertedLead.id,
        status: 'created',
        payload: { lead, mapped },
        importedAt: now
    });

    return { status: 'created', leadId: insertedLead.id };
}

export async function importMetaLeadWithLogging(
    supabaseAdmin: SupabaseClient,
    connection: any,
    form: any,
    lead: MetaLeadPayload
) {
    const metaLeadId = String(lead.id || lead.leadgen_id || '');
    try {
        return await importMetaLead(supabaseAdmin, connection, form, lead);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Meta lead import failed';
        if (metaLeadId) {
            await recordMetaImport(supabaseAdmin, {
                companyId: connection.company_id,
                connectionId: connection.id,
                formId: form.id,
                metaLeadId,
                status: 'error',
                errorMessage: message,
                payload: { lead }
            });
        }
        throw error;
    }
}
