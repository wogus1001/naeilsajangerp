import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';

// --- CONFIGURATION ---
const OLD_SUPABASE_URL = 'https://qcyeoicgkpdooqurufyr.supabase.co';
const OLD_SUPABASE_SERVICE_ROLE_KEY = process.env.OLD_SUPABASE_SERVICE_ROLE_KEY;

const NEW_SUPABASE_URL = 'https://ocskrmbtpxsgeeukjimr.supabase.co';
const NEW_SUPABASE_SERVICE_ROLE_KEY = process.env.NEW_SUPABASE_SERVICE_ROLE_KEY;

if (!OLD_SUPABASE_SERVICE_ROLE_KEY || !NEW_SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('OLD_SUPABASE_SERVICE_ROLE_KEY and NEW_SUPABASE_SERVICE_ROLE_KEY are required.');
}

const oldClient = createClient(OLD_SUPABASE_URL, OLD_SUPABASE_SERVICE_ROLE_KEY);
const newClient = createClient(NEW_SUPABASE_URL, NEW_SUPABASE_SERVICE_ROLE_KEY);

async function migrate() {
    console.log('🚀 Starting migration: Sydney -> Seoul');

    // 1. Migrate COMPANIES
    console.log('--- Migrating Companies ---');
    const { data: companies, error: compErr } = await oldClient.from('companies').select('*');
    if (compErr) throw compErr;
    if (companies?.length) {
        const { error: insErr } = await newClient.from('companies').upsert(companies);
        if (insErr) console.error('Error migrating companies:', insErr);
        else console.log(`✅ Migrated ${companies.length} companies`);
    }

    // 2. Migrate AUTH USERS (via Admin API)
    console.log('--- Migrating Auth Users ---');
    const { data: { users }, error: usersErr } = await oldClient.auth.admin.listUsers();
    if (usersErr) throw usersErr;

    for (const user of users) {
        console.log(`Migrating user: ${user.email} (${user.id})`);
        const temporaryPassword = randomBytes(32).toString('base64url');
        const { data: newUser, error: createErr } = await newClient.auth.admin.createUser({
            id: user.id,
            email: user.email,
            email_confirm: true,
            user_metadata: user.user_metadata,
            password: temporaryPassword,
        });
        if (createErr) {
            if (createErr.message.includes('already exists')) {
                console.log(`   User ${user.email} already exists in new DB.`);
            } else {
                console.error(`   ❌ Error creating user ${user.email}:`, createErr.message);
            }
        } else {
            console.log(`   ✅ Created user ${user.email}`);
        }
    }

    // 3. Migrate PROFILES
    console.log('--- Migrating Profiles ---');
    const { data: profiles, error: profErr } = await oldClient.from('profiles').select('*');
    if (profErr) throw profErr;
    if (profiles?.length) {
        const { error: insErr } = await newClient.from('profiles').upsert(profiles);
        if (insErr) console.error('Error migrating profiles:', insErr);
        else console.log(`✅ Migrated ${profiles.length} profiles`);
    }

    // 4. Migrate CUSTOMERS
    console.log('--- Migrating Customers ---');
    const { data: customers, error: custErr } = await oldClient.from('customers').select('*');
    if (custErr) throw custErr;
    if (customers?.length) {
        const { error: insErr } = await newClient.from('customers').upsert(customers);
        if (insErr) console.error('Error migrating customers:', insErr);
        else console.log(`✅ Migrated ${customers.length} customers`);
    }

    // 5. Migrate PROPERTIES
    console.log('--- Migrating Properties ---');
    const { data: properties, error: propErr } = await oldClient.from('properties').select('*');
    if (propErr) throw propErr;
    if (properties?.length) {
        const { error: insErr } = await newClient.from('properties').upsert(properties);
        if (insErr) console.error('Error migrating properties:', insErr);
        else console.log(`✅ Migrated ${properties.length} properties`);
    }

    // 6. Migrate MEMOS
    console.log('--- Migrating Memos ---');
    const { data: memos, error: memoErr } = await oldClient.from('memos').select('*');
    if (memoErr) throw memoErr;
    if (memos?.length) {
        const { error: insErr } = await newClient.from('memos').upsert(memos);
        if (insErr) console.error('Error migrating memos:', insErr);
        else console.log(`✅ Migrated ${memos.length} memos`);
    }

    // 7. Migrate NOTICES
    console.log('--- Migrating Notices ---');
    const { data: notices, error: noticeErr } = await oldClient.from('notices').select('*');
    if (noticeErr) throw noticeErr;
    if (notices?.length) {
        const { error: insErr } = await newClient.from('notices').upsert(notices);
        if (insErr) console.error('Error migrating notices:', insErr);
        else console.log(`✅ Migrated ${notices.length} notices`);
    }

    // 8. Migrate CONTRACTS
    console.log('--- Migrating Contracts ---');
    const { data: contracts, error: contractErr } = await oldClient.from('contracts').select('*');
    if (contractErr) throw contractErr;
    if (contracts?.length) {
        const { error: insErr } = await newClient.from('contracts').upsert(contracts);
        if (insErr) console.error('Error migrating contracts:', insErr);
        else console.log(`✅ Migrated ${contracts.length} contracts`);
    }

    // 9. Migrate SCHEDULES
    console.log('--- Migrating Schedules ---');
    const { data: schedules, error: schedErr } = await oldClient.from('schedules').select('*');
    if (schedErr) throw schedErr;
    if (schedules?.length) {
        const { error: insErr } = await newClient.from('schedules').upsert(schedules);
        if (insErr) console.error('Error migrating schedules:', insErr);
        else console.log(`✅ Migrated ${schedules.length} schedules`);
    }

    console.log('🏁 Migration finished!');
}

migrate().catch(err => {
    console.error('💥 Migration failed:', err);
    process.exit(1);
});
