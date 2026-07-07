import { NextResponse } from 'next/server';
import { canAccessCompanyResource, getAuthenticatedRequesterProfile } from '@/lib/api-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
    try {
        const { promotedId, propertyId } = await request.json();

        if (!promotedId || !propertyId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const supabaseAdmin = getSupabaseAdmin();
        const requester = await getAuthenticatedRequesterProfile(supabaseAdmin, request);
        if (!requester) {
            return NextResponse.json({ error: '로그인이 필요합니다.', code: 'AUTH_REQUIRED' }, { status: 401 });
        }

        const [{ data: promotedItem }, { data: property }] = await Promise.all([
            supabaseAdmin
                .from('business_card_promoted')
                .select('*, business_cards(*)')
                .eq('id', promotedId)
                .single(),
            supabaseAdmin
                .from('properties')
                .select('id, company_id, manager_id, data, name')
                .eq('id', propertyId)
                .single()
        ]);

        if (!promotedItem || !property) {
            return NextResponse.json({ error: 'Link target not found' }, { status: 404 });
        }
        if (!canAccessCompanyResource(requester, property)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // 1. Update the Link in business_card_promoted
        const { error: updateError } = await supabaseAdmin
            .from('business_card_promoted')
            .update({ property_id: propertyId })
            .eq('id', promotedId);

        if (updateError) {
            throw updateError;
        }

        // 2. Sync to Property's promotedCustomers list (Optional / Secondary)
        try {
            if (promotedItem && promotedItem.business_cards) {
                const card = promotedItem.business_cards;

                if (property) {
                    const propertyData = isRecord(property.data) ? property.data : {};
                    const currentList = Array.isArray(propertyData.promotedCustomers) ? propertyData.promotedCustomers : [];
                    const exists = currentList.some((customer: unknown) => isRecord(customer) && customer.targetId === card.id);

                    if (!exists) {
                        const newCustomer = {
                            id: new Date().getTime().toString(),
                            date: new Date().toISOString().split('T')[0],
                            name: card.name,
                            type: 'businessCard',
                            classification: card.category || '-',
                            budget: '-',
                            features: card.etc_memo || '-',
                            targetId: card.id,
                            contact: card.mobile || ''
                        };

                        const newList = [...currentList, newCustomer];
                        await supabaseAdmin
                            .from('properties')
                            .update({ data: { ...propertyData, promotedCustomers: newList } })
                            .eq('id', propertyId);
                    }
                }
            }
        } catch (syncError) {
            console.warn('Sync to property failed, but link was successful:', syncError);
            // Continue to return success strictly for the Link action
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Link error:', error);
        return NextResponse.json({ error: 'Link failed' }, { status: 500 });
    }
}
