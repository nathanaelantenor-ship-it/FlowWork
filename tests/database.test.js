import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const M1 = '11111111-1111-1111-1111-111111111111';
const M2 = '22222222-2222-2222-2222-222222222222';
const M3 = '33333333-3333-3333-3333-333333333333';
const version = '2026-11-26.1';
const emptyWorkspace = Object.fromEntries(['tasks','events','crm','idv','social','content','study','docs','categories','finance','maps','templates','clients','folders'].map(key => [key, []]));
const data = doc => ({ ...emptyWorkspace, profile: {name:'Conta A'}, docs: doc?[{name:doc}]:[] });
const migration = new URL('../supabase/migrations/202611260001_flowork_accounts.sql',import.meta.url);

test('PostgreSQL preserves an account and isolates its records and files', async t => {
  const pg = new PGlite();
  t.after(() => pg.close());
  await pg.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create schema storage;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      'select nullif(current_setting(''request.jwt.claim.sub'', true),'''')::uuid';
    grant usage on schema auth,storage to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint);
    create table storage.objects (bucket_id text, name text, owner_id text default auth.uid()::text);
    alter table storage.objects enable row level security;
    grant select, insert, update, delete on storage.objects to authenticated;
    create function storage.foldername(name text) returns text[] language sql immutable
      as 'select (string_to_array(name,''/''))[1:cardinality(string_to_array(name,''/''))-1]';
    create function storage.filename(name text) returns text language sql immutable
      as 'select reverse(split_part(reverse(name),''/'',1))';
  `);
  await pg.query('insert into auth.users values ($1),($2)',[A,B]);
  await pg.exec(await readFile(migration,'utf8'));

  const as = async (role, id = '') => {
    await pg.exec('reset role');
    await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);
    if (role) await pg.exec('set role '+role);
  };
  const accept = (terms=version,privacy=version) => pg.query('select public.flowork_accept_terms($1,$2)',[terms,privacy]);
  const save = (rev,payload,mutation) => pg.query('select * from public.flowork_save_workspace($1,$2::jsonb,$3)',[rev,JSON.stringify(payload),mutation]);
  const read = () => pg.query('select * from public.flowork_workspaces');
  const upload = (path) => pg.query("insert into storage.objects (bucket_id,name) values ('flowork-private',$1)",[path]);

  await as('anon');
  await assert.rejects(read,/permission denied/);
  await assert.rejects(accept,/permission denied/);

  await as('authenticated',A);
  await assert.rejects(save(0,data(),M1),/legal_acceptance_required/);
  await assert.rejects(upload(A+'/'+M1),/row-level security/);
  await assert.rejects(accept('old',version),/legal_version_changed/);
  await accept();
  await accept();
  assert.equal((await pg.query('select * from public.flowork_legal_acceptances')).rows.length,1);
  assert.equal(Number((await save(0,data('Briefing privado'),M1)).rows[0].revision),1);
  assert.equal(Number((await save(0,data('Briefing privado'),M1)).rows[0].revision),1);
  await assert.rejects(save(0,data('Sobrescrever'),M2),/workspace_revision_conflict/);
  await assert.rejects(save(1,{},M2),/check constraint/);
  await assert.rejects(pg.query("update public.flowork_workspaces set data='{}'"),/permission denied/);
  await upload(A+'/'+M1);
  await assert.rejects(upload(B+'/'+M1),/row-level security/);

  await as('authenticated',B);
  assert.equal((await read()).rows.length,0);
  assert.equal((await pg.query('select * from storage.objects')).rows.length,0);
  assert.equal((await pg.query('select * from public.flowork_legal_acceptances')).rows.length,0);
  await accept();
  await save(0,{...data('Registros B'),profile:{name:'Conta B'}},M2);
  await assert.rejects(upload(A+'/'+M2),/row-level security/);

  await as('anon');
  await assert.rejects(read,/permission denied/);

  await as('authenticated',A);
  assert.equal((await read()).rows[0].data.docs[0].name,'Briefing privado');
  assert.equal((await pg.query('select * from storage.objects')).rows.length,1);
  assert.equal(Number((await save(1,data('Briefing revisado'),M3)).rows[0].revision),2);
  await assert.rejects(save(1,data('Guia atrasada'),M2),/workspace_revision_conflict/);

  const request = () => pg.query("select public.flowork_request_privacy('deletion') as id");
  const protocol=(await request()).rows[0].id;
  assert.equal((await request()).rows[0].id,protocol);
  assert.equal((await read()).rows[0].data.docs[0].name,'Briefing revisado');
  await as('authenticated',B);
  assert.equal((await pg.query('select * from public.flowork_privacy_requests')).rows.length,0);
});
