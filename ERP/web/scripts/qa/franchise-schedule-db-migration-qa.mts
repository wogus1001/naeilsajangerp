import { readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { Client } from 'pg';

type QaResult = {
    readonly status: 'PASS' | 'PENDING_EXTERNAL';
    readonly detail: string;
};

const REQUIRED_BOOTSTRAP_FILES = [
    'supabase_schema.sql',
    'supabase_franchise_supervision_migration.sql',
    'supabase_franchise_supervision_v2_migration.sql',
    'supabase_franchise_approval_calendar_migration.sql',
    'supabase_franchise_schedule_prepare_migration.sql',
    'supabase_franchise_schedule_cutover_migration.sql',
    'supabase_franchise_schedule_cutover_rollback.sql'
] as const;

async function main(): Promise<void> {
    const url = process.env.TEST_DATABASE_URL?.trim();
    if (!url) {
        printResult({ status: 'PENDING_EXTERNAL', detail: 'TEST_DATABASE_URL is absent; DB migration QA was not run.' });
        return;
    }

    const parsed = new URL(url);
    if (!/_franchise_schedule_qa_/i.test(parsed.pathname)) {
        throw new Error('TEST_DATABASE_URL database name must contain _franchise_schedule_qa_.');
    }

    const client = new Client({ connectionString: url });
    await client.connect();
    try {
        await assertCreateRole(client);
        await assertEmptyDatabase(client);
        await bootstrapRoles(client);
        if (process.argv.includes('--bootstrap-from-repo')) {
            await runSqlFiles(client, REQUIRED_BOOTSTRAP_FILES);
        }
        await assertServiceRoleRpcGrants(client);
        printResult({ status: 'PASS', detail: `Applied ${REQUIRED_BOOTSTRAP_FILES.length} repository SQL files against redacted QA database.` });
    } finally {
        await client.end();
    }
}

async function assertCreateRole(client: Client): Promise<void> {
    const result = await client.query<{ readonly rolsuper: boolean; readonly rolcreaterole: boolean }>(
        'select rolsuper, rolcreaterole from pg_roles where rolname = current_user'
    );
    const role = result.rows[0];
    if (!role?.rolsuper && !role?.rolcreaterole) {
        printResult({ status: 'PENDING_EXTERNAL', detail: 'TEST_DATABASE_URL user lacks CREATEROLE; DB migration QA was not run.' });
        process.exitCode = 0;
        throw new PendingExternalStop();
    }
}

async function assertEmptyDatabase(client: Client): Promise<void> {
    const result = await client.query<{ readonly count: string }>(
        "select count(*) from information_schema.tables where table_schema not in ('pg_catalog', 'information_schema')"
    );
    if (result.rows[0]?.count !== '0') throw new Error('TEST_DATABASE_URL must point at a database with zero non-system tables.');
}

async function bootstrapRoles(client: Client): Promise<void> {
    for (const role of ['anon', 'authenticated', 'service_role']) {
        await client.query(`do $$ begin if not exists (select 1 from pg_roles where rolname = '${role}') then create role ${role} nologin; end if; end $$;`);
    }
    await client.query('create schema if not exists auth');
    await client.query('create table if not exists auth.users (id uuid primary key)');
    await client.query("create or replace function auth.uid() returns uuid language sql stable as $$ select null::uuid $$");
    await client.query("create or replace function auth.role() returns text language sql stable as $$ select current_user::text $$");
}

async function runSqlFiles(client: Client, files: readonly string[]): Promise<void> {
    for (const file of files) {
        const path = join(process.cwd(), file);
        const sql = readFileSync(path, 'utf8');
        if (!sql.trim()) throw new Error(`${basename(file)} is empty.`);
        await client.query(sql);
    }
}

async function assertServiceRoleRpcGrants(client: Client): Promise<void> {
    const result = await client.query<{ readonly routine_name: string; readonly service_role_can_execute: boolean; readonly public_can_execute: boolean }>(`
        select
          p.proname as routine_name,
          has_function_privilege('service_role', p.oid, 'execute') as service_role_can_execute,
          has_function_privilege('public', p.oid, 'execute') as public_can_execute
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.proname in (
            'create_franchise_visit_with_schedule',
            'persist_franchise_approval_with_schedule',
            'persist_franchise_report_with_schedule',
            'persist_franchise_corrective_action'
          )
    `);
    for (const row of result.rows) {
        if (!row.service_role_can_execute || row.public_can_execute) {
            throw new Error(`Unexpected RPC execute grant for ${row.routine_name}.`);
        }
    }
    if (result.rows.length !== 4) throw new Error('Expected four franchise schedule RPCs.');
}

function printResult(result: QaResult): void {
    console.log(`${result.status} ${result.detail}`);
}

class PendingExternalStop extends Error {
    readonly name = 'PendingExternalStop';
}

main().catch(error => {
    if (error instanceof PendingExternalStop) return;
    console.error(error instanceof Error ? error.message : 'Unknown DB migration QA failure');
    process.exitCode = 1;
});
