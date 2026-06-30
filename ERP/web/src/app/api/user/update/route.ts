import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedRequesterProfile } from '@/lib/api-auth';
import { isLoginIdSchemaMissing, isValidLoginId, LOGIN_ID_RULE_MESSAGE, normalizeLoginId } from '@/lib/login-id';
import { isValidProfileEmail, normalizeProfileEmail, normalizeProfilePhone } from '@/lib/profile-contact';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

type ResolvedProfile = {
    id: string;
    email: string | null;
    company_id: string | null;
    login_id?: string | null;
};

type ProfileUpdates = {
    name?: string;
    email?: string;
    phone?: string;
    phone_normalized?: string;
};

async function selectProfileById(
    supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
    id: string
): Promise<ResolvedProfile | null> {
    const result = await supabaseAdmin
        .from('profiles')
        .select('id, email, company_id, login_id')
        .eq('id', id)
        .single<ResolvedProfile>();

    if (!isLoginIdSchemaMissing(result.error)) {
        return result.data;
    }

    const fallbackResult = await supabaseAdmin
        .from('profiles')
        .select('id, email, company_id')
        .eq('id', id)
        .single<Omit<ResolvedProfile, 'login_id'>>();

    return fallbackResult.data ? { ...fallbackResult.data, login_id: null } : null;
}

async function selectProfileByEmail(
    supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
    email: string
): Promise<ResolvedProfile | null> {
    const result = await supabaseAdmin
        .from('profiles')
        .select('id, email, company_id, login_id')
        .eq('email', email)
        .single<ResolvedProfile>();

    if (!isLoginIdSchemaMissing(result.error)) {
        return result.data;
    }

    const fallbackResult = await supabaseAdmin
        .from('profiles')
        .select('id, email, company_id')
        .eq('email', email)
        .single<Omit<ResolvedProfile, 'login_id'>>();

    return fallbackResult.data ? { ...fallbackResult.data, login_id: null } : null;
}

export async function PUT(request: Request) {
    try {

        const body = await request.json();
        const { currentId, newId, name, oldPassword, newPassword, targetUuid, email: rawEmail, phone: rawPhone } = body;

        if (!currentId && !targetUuid) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        const supabaseAdmin = await getSupabaseAdmin();
        const requester = await getAuthenticatedRequesterProfile(supabaseAdmin, request);
        if (!requester) {
            return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
        }

        let profile: ResolvedProfile | null = null;
        let userId = '';

        if (targetUuid) {
            const resolvedProfile = await selectProfileById(supabaseAdmin, String(targetUuid));
            if (resolvedProfile) {
                profile = resolvedProfile;
                userId = resolvedProfile.id;
            }
        }

        if (!profile && currentId) {
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentId);

            if (isUuid) {
                profile = await selectProfileById(supabaseAdmin, String(currentId));
            } else {
                const emailAttempt1 = currentId.includes('@') ? currentId : `${currentId}@example.com`;
                const p1 = await selectProfileByEmail(supabaseAdmin, emailAttempt1);
                if (p1) profile = p1;
                else if (currentId.includes('@')) {
                    profile = await selectProfileByEmail(supabaseAdmin, String(currentId));
                }
            }
        }

        if (!profile) {
            console.error(`User extraction failed. currentId: ${currentId}, targetUuid: ${targetUuid}`);
            return NextResponse.json({
                error: `User not found. (Input: id=${currentId}, uuid=${targetUuid}). The system could not resolve this user. Please try re-logging in.`
            }, { status: 404 });
        }

        const actualEmail = profile.email;
        if (!targetUuid) {
            userId = profile.id;
        }

        if (requester.id !== userId) {
            return NextResponse.json({ error: '본인 정보만 수정할 수 있습니다.' }, { status: 403 });
        }

        const nextEmail = typeof rawEmail === 'string' ? normalizeProfileEmail(rawEmail) : null;
        if (nextEmail !== null && !isValidProfileEmail(nextEmail)) {
            return NextResponse.json({ error: '이메일 형식이 올바르지 않습니다.' }, { status: 400 });
        }

        const nextPhone = typeof rawPhone === 'string' ? String(rawPhone).trim() : null;
        const nextPhoneNormalized = typeof rawPhone === 'string' ? normalizeProfilePhone(rawPhone) : null;
        if (
            typeof rawPhone === 'string' &&
            (!nextPhoneNormalized || nextPhoneNormalized.length < 10 || nextPhoneNormalized.length > 11)
        ) {
            return NextResponse.json({ error: '휴대폰 번호를 정확히 입력해주세요.' }, { status: 400 });
        }

        if (newId && normalizeLoginId(newId) !== normalizeLoginId(profile.login_id || currentId)) {
            const nextLoginId = normalizeLoginId(newId);
            if (!isValidLoginId(nextLoginId)) {
                return NextResponse.json({ error: LOGIN_ID_RULE_MESSAGE }, { status: 400 });
            }

            if (!profile.company_id) {
                return NextResponse.json({ error: '소속 회사 정보가 없어 아이디를 변경할 수 없습니다.' }, { status: 400 });
            }

            const { data: duplicateProfiles, error: duplicateError } = await supabaseAdmin
                .from('profiles')
                .select('id')
                .eq('company_id', profile.company_id)
                .eq('login_id_normalized', nextLoginId)
                .neq('id', userId)
                .limit(1);

            if (duplicateError) {
                if (isLoginIdSchemaMissing(duplicateError)) {
                    return NextResponse.json({
                        error: '아이디 로그인 DB 설정이 필요합니다. supabase_login_id_migration.sql 적용 후 다시 저장해주세요.'
                    }, { status: 500 });
                }
                throw duplicateError;
            }

            if ((duplicateProfiles ?? []).length > 0) {
                return NextResponse.json({ error: '이미 사용 중인 아이디입니다.' }, { status: 409 });
            }

            const { error: updateLoginIdError } = await supabaseAdmin
                .from('profiles')
                .update({
                    login_id: nextLoginId,
                    login_id_normalized: nextLoginId
                })
                .eq('id', userId);

            if (updateLoginIdError) {
                if (isLoginIdSchemaMissing(updateLoginIdError)) {
                    return NextResponse.json({
                        error: '아이디 로그인 DB 설정이 필요합니다. supabase_login_id_migration.sql 적용 후 다시 저장해주세요.'
                    }, { status: 500 });
                }
                throw updateLoginIdError;
            }
        }

        const shouldUpdateEmail = Boolean(nextEmail && nextEmail !== normalizeProfileEmail(actualEmail || ''));
        if (shouldUpdateEmail && nextEmail) {
            const { data: duplicateEmails, error: duplicateEmailError } = await supabaseAdmin
                .from('profiles')
                .select('id')
                .eq('email', nextEmail)
                .neq('id', userId)
                .limit(1);

            if (duplicateEmailError) throw duplicateEmailError;

            if ((duplicateEmails ?? []).length > 0) {
                return NextResponse.json({ error: '이미 사용 중인 이메일입니다.' }, { status: 409 });
            }
        }

        if (newPassword) {
            if (!oldPassword) {
                return NextResponse.json({ error: '기존 비밀번호를 입력해주세요.' }, { status: 401 });
            }

            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
            const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
            const supabase = createClient(supabaseUrl, supabaseAnonKey);

            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: actualEmail || '',
                password: oldPassword
            });

            if (signInError) {
                return NextResponse.json({ error: '기존 비밀번호가 일치하지 않습니다.' }, { status: 401 });
            }

            if (newPassword.length < 6) {
                return NextResponse.json({ error: '새 비밀번호는 최소 6자 이상이어야 합니다.' }, { status: 400 });
            }

            const { error: updatePwdError } = await supabaseAdmin.auth.admin.updateUserById(userId, { password: newPassword });
            if (updatePwdError) {
                if (updatePwdError.message.includes('Password should be at least')) {
                    return NextResponse.json({ error: '비밀번호는 최소 6자 이상이어야 합니다.' }, { status: 400 });
                }
                throw updatePwdError;
            }
        }

        if (shouldUpdateEmail && nextEmail) {
            const { error: updateEmailError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
                email: nextEmail,
                email_confirm: true
            });

            if (updateEmailError) {
                const message = updateEmailError.message.toLowerCase();
                if (message.includes('already') || message.includes('unique') || message.includes('duplicate')) {
                    return NextResponse.json({ error: '이미 사용 중인 이메일입니다.' }, { status: 409 });
                }
                throw updateEmailError;
            }
        }

        const updates: ProfileUpdates = {};
        if (typeof name === 'string') updates.name = name;
        if (nextEmail) updates.email = nextEmail;
        if (nextPhone !== null && nextPhoneNormalized !== null) {
            updates.phone = nextPhone;
            updates.phone_normalized = nextPhoneNormalized;
        }

        if (Object.keys(updates).length > 0) {
            await supabaseAdmin.from('profiles').update(updates).eq('id', userId);
        }

        let finalProfileResult = await supabaseAdmin
            .from('profiles')
            .select(`*, company:companies(name, logo_url)`)
            .eq('id', userId)
            .single();

        if (finalProfileResult.error) {
            finalProfileResult = await supabaseAdmin
                .from('profiles')
                .select(`*, company:companies(name)`)
                .eq('id', userId)
                .single();
        }

        const finalProfile = finalProfileResult.data;
        if (!finalProfile) {
            return NextResponse.json({ error: '사용자 정보를 다시 불러오지 못했습니다.' }, { status: 500 });
        }

        return NextResponse.json({
            user: {
                id: finalProfile.login_id || newId || currentId,
                name: finalProfile.name,
                email: finalProfile.email,
                phone: finalProfile.phone || '',
                role: finalProfile.role,
                status: finalProfile.status,
                companyName: finalProfile.company?.name || '',
                companyLogoUrl: finalProfile.company?.logo_url || '',
                companyId: finalProfile.company_id
            }
        });

    } catch (error: unknown) {
        console.error('Update user/profile route error:', error);
        const message = error instanceof Error ? error.message : JSON.stringify(error);
        return NextResponse.json({
            error: `서버 오류가 발생했습니다: ${message}`
        }, { status: 500 });
    }
}
