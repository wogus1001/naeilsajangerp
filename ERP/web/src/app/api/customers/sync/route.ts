
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireCompanyOperatorRequester } from '@/lib/admin-route-auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const adminGuard = await requireCompanyOperatorRequester(supabaseAdmin, request);
        if (!adminGuard.ok) return adminGuard.response;

        const body: unknown = await request.json();
        const requestedCompanyId = typeof body === 'object' && body !== null && 'companyId' in body && typeof body.companyId === 'string'
            ? body.companyId.trim()
            : '';
        const companyId = adminGuard.requester.company_id;
        if (!companyId) return NextResponse.json({ error: '회사 소속을 확인할 수 없습니다.' }, { status: 403 });
        if (requestedCompanyId && requestedCompanyId !== companyId) {
            return NextResponse.json({ error: '다른 회사 데이터는 동기화할 수 없습니다.' }, { status: 403 });
        }

        // Fetch all customers (Optimize: Filter by company if provided)
        const query = supabaseAdmin.from('customers').select('id, name, data, manager_id, mobile')
            .eq('company_id', companyId);

        const { data: customers, error } = await query;
        if (error) throw error;

        // 0. Pre-fetch Company Properties for Validation & Linking
        // We fetch ALL properties for this company to ensure we validate links correctly.
        const propQuery = supabaseAdmin.from('properties').select('id, name, data, company_id')
            .eq('company_id', companyId);

        // Limit to prevent OOM
        const { data: properties } = await propQuery.limit(5000);

        // Build Lookup Maps
        const propertyIdMap = new Set(properties?.map(p => p.id));
        const propertyNameMap = new Map(); // Name -> Property Object
        if (properties) {
            properties.forEach(p => {
                if (p.name) propertyNameMap.set(p.name.trim(), p);
            });
        }

        let historySynced = 0;
        let promotedSynced = 0;
        let promotedLinked = 0;

        // Fetch Profiles for User Info (to assign schedule color/owner)
        // We need the manager's company info.
        // Cache manager info
        const managerMap = new Map();

        for (const customer of customers) {
            const history = customer.data?.history || [];
            const promoted = customer.data?.promotedProperties || [];

            if (history.length === 0 && promoted.length === 0) continue;

            const managerId = customer.manager_id;
            let userInfo = managerMap.get(managerId);
            if (managerId && !userInfo) {
                const { data: u } = await supabaseAdmin.from('profiles').select('id, company_id, name')
                    .eq('id', managerId).eq('company_id', companyId).eq('status', 'active').single();
                if (u) {
                    userInfo = { userId: u.id, companyId: u.company_id, userName: u.name };
                    managerMap.set(managerId, userInfo);
                }
            }

            // 1. Sync History -> Schedules
            // Logic: Check if schedule exists. If not, create.
            // Deduplication Key: businessCardId (customer_id) + date + content
            let cardUpdated = false;

            // 1. Sync History -> Schedules
            if (history.length > 0) {
                // Fetch existing schedules for this customer to minimize inserts
                const { data: existingSchedules } = await supabaseAdmin
                    .from('schedules')
                    .select('date, title')
                    .eq('company_id', companyId)
                    .eq('customer_id', customer.id)
                    .eq('type', 'work');

                const existingSet = new Set(existingSchedules?.map(s => `${s.date}_${s.title}`) || []);

                const newSchedules = [];
                for (const h of history) {
                    const title = `[고객작업] ${customer.name} - ${h.content}`;
                    const key = `${h.date}_${title}`;

                    if (!existingSet.has(key)) {
                        newSchedules.push({
                            title: title,
                            date: h.date,
                            scope: 'work',
                            status: 'completed',
                            details: h.details || '',
                            type: 'work',
                            color: '#ff922b', // Orange for Customer Work
                            customer_id: customer.id,
                            user_id: userInfo?.userId || null,
                            company_id: companyId
                        });
                        existingSet.add(key); // Prevent dups in batch
                    }
                }

                if (newSchedules.length > 0) {
                    const { error: schedError } = await supabaseAdmin.from('schedules').insert(newSchedules);
                    if (!schedError) historySynced += newSchedules.length;
                    else console.error('Schedule insert error:', schedError);
                }
            }
            // 2. Sync History -> Properties (Link Related Items)
            if (history.length > 0) {
                for (let h of history) {
                    // Auto-Healing: Check if targetId is valid (exists in THIS company)
                    if (h.targetId && !propertyIdMap.has(h.targetId)) {
                        h.targetId = null; // Reset invalid ID
                        cardUpdated = true;
                    }

                    // Try to link (if missing or just reset)
                    if (!h.targetId && h.relatedProperty) {
                        const prop = propertyNameMap.get(h.relatedProperty.trim());

                        if (prop) {
                            h.targetId = prop.id;
                            h.relatedProperty = prop.name; // Normalize Name
                            cardUpdated = true;

                            // Reverse Sync: Add to Property History immediately
                            const pData = (prop as any).data || {};
                            const pHistory = pData.workHistory || [];

                            const exists = pHistory.some((ph: any) => {
                                const d1 = ph.date ? String(ph.date).replace(/T/, ' ').substring(0, 10) : '';
                                const d2 = h.date ? String(h.date).replace(/T/, ' ').substring(0, 10) : '';
                                const c1 = (ph.content || '').trim();
                                const c2 = (h.content || '').trim();
                                return d1 === d2 && c1 === c2;
                            });

                            if (!exists) {
                                const newWorkHistory = {
                                    id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                                    date: h.date,
                                    manager: h.manager || h.worker,
                                    content: h.content,
                                    details: h.details || '',
                                    targetType: 'customer',
                                    targetKeyword: customer.name,
                                    targetId: customer.id
                                };

                                await supabaseAdmin
                                    .from('properties')
                                    .update({ data: { ...pData, workHistory: [...pHistory, newWorkHistory] } })
                                    .eq('id', prop.id).eq('company_id', companyId);
                            }
                        }
                    }
                }
                if (cardUpdated) {
                    await supabaseAdmin
                        .from('customers')
                        .update({ data: customer.data })
                        .eq('id', customer.id).eq('company_id', companyId);
                }
            }

            // 2. Sync Promoted -> Properties (Link & Add to Property List)
            if (promoted.length > 0) {

                for (let i = 0; i < promoted.length; i++) {
                    const p = promoted[i];

                    // Auto-Healing: Check if targetId is valid
                    if (p.propertyId && !propertyIdMap.has(p.propertyId)) {
                        p.propertyId = null;
                        p.isSynced = false;
                        cardUpdated = true;
                    }

                    // 1. Resolve Property ID if missing
                    let targetProp = null;
                    if (p.propertyId) {
                        targetProp = propertyIdMap.has(p.propertyId) ? properties?.find(pr => pr.id === p.propertyId) : null;
                    } else if (p.itemName) {
                        targetProp = propertyNameMap.get(p.itemName.trim());
                        if (targetProp) {
                            p.propertyId = targetProp.id;
                            p.id = targetProp.id; // Use Property ID as ID? Existing logic seems to do this, though maybe risky for list keys.
                            p.itemName = targetProp.name;
                            p.isSynced = true;
                            p.budget = customer.data?.budget || p.amount || '-';
                            cardUpdated = true;
                            promotedLinked++;
                        }
                    }

                    // 2. Reverse Sync: Ensure it exists in Property's list (Always Run if Prop found)
                    if (targetProp) {
                        const pData = targetProp.data || {};
                        const pList = pData.promotedCustomers || [];

                        const existsIndex = pList.findIndex((c: any) => {
                            if (c.targetId === customer.id && c.promotedId === p.id) return true; // Exact Header ID Match
                            if (c.targetId === customer.id) return true; // Target Match
                            // Fallback: Name + Contact (for legacy)
                            if (!c.targetId && c.name === customer.name && c.contact === customer.mobile) return true;
                            return false;
                        });

                        const newPromo = {
                            promotedId: p.id || Date.now(), // Unique ID for the promoted item row in Customer
                            id: Date.now().toString() + Math.random().toString(36).substr(2, 5), // Unique ID for the row in Property table
                            date: p.date,
                            name: customer.name,
                            type: 'customer',
                            classification: customer.data?.class || '-',
                            budget: customer.data?.budget || p.amount || '-',
                            features: customer.data?.feature || customer.data?.memo || '',
                            targetId: customer.id,
                            contact: customer.mobile
                        };

                        if (existsIndex === -1) {
                            // Add new
                                await supabaseAdmin
                                    .from('properties')
                                    .update({ data: { ...pData, promotedCustomers: [...pList, newPromo] } })
                                    .eq('id', targetProp.id)
                                    .eq('company_id', companyId);
                        } else {
                            // Update existing (Fix missing data or fields) - OPTIONAL but good for "Consistency"
                            // Only update if critical fields are missing to avoid overwriting manual edits?
                            // User complained about "Unstable", implies missing.
                            // Let's just Ensure it is present.
                            // If we want to force-update "features" to fix previous bugs, we should update.
                            const existing = pList[existsIndex];
                            const shouldUpdate =
                                !existing.targetId ||
                                existing.features === `[추진] ${customer.name}` || // Fix old buggy data
                                !existing.features;

                            if (shouldUpdate) {
                                pList[existsIndex] = {
                                    ...existing,
                                    targetId: customer.id,
                                    promotedId: p.id,
                                    features: newPromo.features // Apply fix
                                };
                                await supabaseAdmin
                                    .from('properties')
                                    .update({ data: { ...pData, promotedCustomers: pList } })
                                    .eq('id', targetProp.id)
                                    .eq('company_id', companyId);
                            }
                        }
                    }
                }
            }


            if (cardUpdated) {
                await supabaseAdmin
                    .from('customers')
                    .update({ data: customer.data })
                    .eq('id', customer.id)
                    .eq('company_id', companyId);
            }
        }

        // 3. Reverse Sync (Scoped by existing Fetch)
        if (properties) {
            // Build Customer Map for fast lookup
            const customerMap = new Map<string, any>();
            customers.forEach((c: any) => customerMap.set(c.id, c));

            // Iterate Properties
            for (const prop of properties) {
                const pHistory = prop.data?.workHistory || [];
                if (pHistory.length === 0) continue;

                for (const h of pHistory) {
                    // Only process items targeting a Customer
                    if (h.targetType === 'customer' && h.targetId) {
                        const customer = customerMap.get(h.targetId);
                        if (customer) {
                            const cData = customer.data || {};
                            const cHistory = cData.history || [];

                            // Check Deduplication (Date + Content)
                            const exists = cHistory.some((ch: any) => {
                                const d1 = ch.date ? String(ch.date).replace(/T/, ' ').substring(0, 10) : '';
                                const d2 = h.date ? String(h.date).replace(/T/, ' ').substring(0, 10) : '';
                                const c1 = (ch.content || '').trim();
                                const c2 = (h.content || '').trim();
                                return d1 === d2 && c1 === c2;
                            });

                            if (!exists) {
                                // Add to Customer History
                                const newHistory = {
                                    id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                                    date: h.date,
                                    relatedProperty: prop.name,
                                    targetId: prop.id, // Link back to Property
                                    content: h.content,
                                    details: h.details,
                                    manager: h.manager,
                                    isSynced: true
                                };

                                cHistory.push(newHistory);
                                cData.history = cHistory; // Update ref

                                // Persist
                                await supabaseAdmin
                                    .from('customers')
                                    .update({ data: cData })
                                    .eq('id', customer.id)
                                    .eq('company_id', companyId);

                                historySynced++;
                            }
                        }
                    }
                }
            }
        }

        return NextResponse.json({
            success: true,
            results: {
                history: { matched: historySynced },
                promoted: { linkFound: promotedLinked }
            }
        });

    } catch (error: any) {
        console.error('Sync error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
