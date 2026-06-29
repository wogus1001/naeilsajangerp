import { NextResponse } from 'next/server';
import {
    resolveSignupApprovalPolicy,
    type SignupApprovalRole,
    type SignupApprovalStatus
} from '@/lib/signup-approval-policy';
import { isValidLoginId, LOGIN_ID_RULE_MESSAGE, normalizeLoginId } from '@/lib/login-id';
import { notifyAdminsOfSignupRequest } from '@/lib/solapi-notifications';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

function normalizePhone(value: unknown): string {
    return String(value ?? '').replace(/\D/g, '');
}

function getText(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { loginId, email: rawEmail, password, passwordConfirm, name: rawName, companyName: rawCompanyName, companyId: rawCompanyId, phone, role: requestedRole } = body;
        const normalizedLoginId = normalizeLoginId(loginId);
        const email = getText(rawEmail).toLowerCase();
        const name = getText(rawName);
        const companyName = getText(rawCompanyName);
        const selectedCompanyId = getText(rawCompanyId);

        if (!normalizedLoginId || !email || !password || !passwordConfirm || !name || !companyName || !phone) {
            return NextResponse.json({ error: '필수 정보를 모두 입력해주세요.' }, { status: 400 });
        }

        if (!isValidLoginId(normalizedLoginId)) {
            return NextResponse.json({ error: LOGIN_ID_RULE_MESSAGE }, { status: 400 });
        }

        const phoneNormalized = normalizePhone(phone);
        if (phoneNormalized.length < 10 || phoneNormalized.length > 11) {
            return NextResponse.json({ error: '휴대폰 번호를 정확히 입력해주세요.' }, { status: 400 });
        }

        if (password.length < 6) {
            return NextResponse.json({ error: '비밀번호는 최소 6자 이상이어야 합니다.' }, { status: 400 });
        }

        if (password !== passwordConfirm) {
            return NextResponse.json({ error: '비밀번호가 다릅니다.' }, { status: 400 });
        }

        if (!email.includes('@')) {
            return NextResponse.json({ error: '이메일 주소에 @를 포함해주세요.' }, { status: 400 });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json({ error: '이메일 형식이 올바르지 않습니다.' }, { status: 400 });
        }

        const trimmedCompanyName = companyName.trim();
        const nfcCompanyName = trimmedCompanyName.normalize('NFC');
        const nfdCompanyName = trimmedCompanyName.normalize('NFD');
        const supabaseAdmin = await getSupabaseAdmin();

        console.log(`[Signup] Attempting to join/create company: "${trimmedCompanyName}"`);

        // 2. Company Logic
        let companyId: string | null = null;
        let isNewCompany = false;
        let finalRole: SignupApprovalRole = 'staff';
        let finalStatus: SignupApprovalStatus = 'pending_approval';
        let message = '가입 요청이 완료되었습니다.';

        let companyResults: { id: string; manager_id: string | null; name: string }[] | null = null;
        let findError: { message?: string } | null = null;

        if (selectedCompanyId) {
            const selectedCompanyResult = await supabaseAdmin
                .from('companies')
                .select('id, manager_id, name')
                .eq('id', selectedCompanyId)
                .maybeSingle<{ id: string; manager_id: string | null; name: string }>();
            if (selectedCompanyResult.error) {
                findError = selectedCompanyResult.error;
            } else if (selectedCompanyResult.data) {
                companyResults = [selectedCompanyResult.data];
            }
        }

        if (!companyResults) {
            // Robust check: Search for company name using ilike to handle minor differences (spaces/normalization)
            const companySearchResult = await supabaseAdmin
                .from('companies')
                .select('id, manager_id, name')
                .or(`name.ilike.${nfcCompanyName},name.ilike.${nfdCompanyName}`)
                .order('created_at', { ascending: true });
            companyResults = companySearchResult.data;
            findError = companySearchResult.error;
        }

        if (findError) {
            console.error('[Signup] Find company error:', findError);
        }

        // Try to find an exact or near-exact match in memory
        let existingCompany: { id: string; manager_id: string | null; name?: string } | null = null;
        if (companyResults && companyResults.length > 0) {
            // First try strict match
            existingCompany = companyResults.find(c =>
                c.name.trim().normalize('NFC') === nfcCompanyName ||
                c.name.trim().normalize('NFD') === nfdCompanyName ||
                c.name.replace(/\s+/g, '') === nfcCompanyName.replace(/\s+/g, '')
            ) ?? null;

            // If still not found, just take the first result as a fallback for ilike matches
            if (!existingCompany) {
                existingCompany = companyResults[0] ?? null;
            }
        }

        if (!existingCompany) {
            console.log(`[Signup] Company "${trimmedCompanyName}" not found. Attempting to create...`);
            // New Company -> Create it
            const { data: newCompany, error: createCompanyError } = await supabaseAdmin
                .from('companies')
                .insert({ name: trimmedCompanyName, status: 'active' })
                .select()
                .single();

            if (createCompanyError) {
                console.error('[Signup] Create company error:', createCompanyError);
                // RACE CONDITION: If it failed because another request created it simultaneously (or hidden char issue)
                if (createCompanyError.code === '23505') {
                    console.log(`[Signup] Duplicate detected (23505). Retrying search for "${trimmedCompanyName}"...`);

                    // Use ilike and limit(1) to be more robust against casing/duplicates
                    const { data: retryFetch } = await supabaseAdmin
                        .from('companies')
                        .select('id, manager_id')
                        .ilike('name', trimmedCompanyName)
                        .limit(1)
                        .maybeSingle();

                    if (retryFetch) {
                        console.log(`[Signup] Retry successful. Found: ${retryFetch.id}`);
                        existingCompany = retryFetch;
                        companyId = existingCompany.id;
                        // Proceed as existing company
                    } else {
                        console.error(`[Signup] Critical: Insert failed with duplicate, but Select returned null. Name: ${trimmedCompanyName}`);
                        return NextResponse.json({ error: `회사를 찾는 데 실패했습니다. (DB 충돌: ${createCompanyError.message})` }, { status: 500 });
                    }
                } else {
                    return NextResponse.json({
                        error: `회사 등록 실패: ${createCompanyError.message}`
                    }, { status: 500 });
                }
            } else {
                console.log(`[Signup] Company created: ${newCompany.id}`);
                companyId = newCompany.id;
                isNewCompany = true;
            }
        } else {
            console.log(`[Signup] Found existing company: ${existingCompany.id}`);
        }

        // If we found an existing company (either first time or after retry)
        if (existingCompany && !companyId) {
            companyId = existingCompany.id;
        }

        if (!companyId) {
            return NextResponse.json({ error: '회사 정보를 확정하지 못했습니다.' }, { status: 500 });
        }

        const { data: duplicateLoginId, error: duplicateLoginIdError } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('company_id', companyId)
            .eq('login_id_normalized', normalizedLoginId)
            .limit(1);

        if (duplicateLoginIdError) {
            console.error('[Signup] Login ID duplicate check error:', duplicateLoginIdError);
            return NextResponse.json({ error: '아이디 중복 확인에 실패했습니다.' }, { status: 500 });
        }

        if ((duplicateLoginId ?? []).length > 0) {
            return NextResponse.json({ error: '이미 사용 중인 아이디입니다.' }, { status: 409 });
        }

        const approvalPolicy = resolveSignupApprovalPolicy({
            companyExists: !isNewCompany,
            companyHasManager: Boolean(existingCompany?.manager_id),
            requestedRole
        });

        if (approvalPolicy.kind === 'reject') {
            return NextResponse.json({ error: approvalPolicy.error }, { status: 400 });
        }

        finalRole = approvalPolicy.role;
        finalStatus = approvalPolicy.status;
        message = approvalPolicy.message;

        // 3. Create Auth User
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true, // Auto confirm since we are using admin
            user_metadata: { name: name, phone: String(phone).trim(), phone_normalized: phoneNormalized }
        });

        if (authError) {
            console.error('Auth create error:', authError);
            const msg = authError.message.toLowerCase();
            if (msg.includes('unique constraint') ||
                msg.includes('already registered') ||
                msg.includes('a user with this email address has already been registered')) {
                return NextResponse.json({ error: '이미 존재하는 이메일입니다.' }, { status: 409 });
            }
            if (msg.includes('password should be at least')) {
                return NextResponse.json({ error: '비밀번호는 최소 6자 이상이어야 합니다.' }, { status: 400 });
            }
            return NextResponse.json({ error: authError.message }, { status: 500 });
        }

        if (!authUser.user) {
            return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
        }

        const userId = authUser.user.id;

        // 4. Update Profile (created by trigger) with correct Role/Company/Status
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update({
                company_id: companyId,
                role: finalRole,
                status: finalStatus,
                name: name,
                phone: String(phone).trim(),
                phone_normalized: phoneNormalized,
                login_id: normalizedLoginId,
                login_id_normalized: normalizedLoginId
            })
            .eq('id', userId);

        if (profileError) {
            console.error('Profile update error:', profileError);
            // Cleanup auth user?
            await supabaseAdmin.auth.admin.deleteUser(userId);
            if (profileError.message?.includes('login_id')) {
                return NextResponse.json({ error: 'SQL 등록 필요: supabase_login_id_migration.sql 적용 후 다시 가입해주세요.' }, { status: 500 });
            }
            return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
        }

        try {
            await notifyAdminsOfSignupRequest({
                companyName: trimmedCompanyName,
                name,
                phone: phoneNormalized
            });
        } catch (error) {
            console.error(
                'Signup admin SMS notification failed:',
                error instanceof Error ? error.message : String(error)
            );
        }

        return NextResponse.json({
            success: true,
            user: {
                id: userId,
                loginId: normalizedLoginId,
                name,
                email, // useful for display
                role: finalRole,
                status: finalStatus,
                companyName: companyName, // Ensure frontend has this!
                companyId: companyId
            },
            message
        });

    } catch (error) {
        console.error('Signup error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
