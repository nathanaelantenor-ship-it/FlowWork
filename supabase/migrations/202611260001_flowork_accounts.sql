-- Application tables are private to the authenticated account. RPCs own mutations.
create table public.flowork_legal_versions (
  singleton boolean primary key default true check (singleton),
  terms_version text not null,
  privacy_version text not null
);

insert into public.flowork_legal_versions (terms_version, privacy_version)
values ('2026-11-26.1', '2026-11-26.1');

create table public.flowork_legal_acceptances (
  owner_id uuid not null references auth.users(id) on delete cascade,
  terms_version text not null,
  privacy_version text not null,
  accepted_at timestamptz not null default statement_timestamp(),
  primary key (owner_id, terms_version, privacy_version)
);

create table public.flowork_workspaces (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  schema_version smallint not null default 1 check (schema_version = 1),
  revision bigint not null check (revision between 1 and 9007199254740991),
  mutation_id uuid not null,
  data jsonb not null check (
    jsonb_typeof(data) = 'object'
    and octet_length(data::text) <= 4194304
    and data ?& array['profile', 'tasks', 'events', 'crm', 'idv', 'social', 'content', 'study',
      'docs', 'categories', 'finance', 'maps', 'templates', 'clients', 'folders']
    and jsonb_typeof(data->'profile') = 'object'
    and jsonb_typeof(data->'tasks') = 'array'
    and jsonb_typeof(data->'events') = 'array'
    and jsonb_typeof(data->'crm') = 'array'
    and jsonb_typeof(data->'idv') = 'array'
    and jsonb_typeof(data->'social') = 'array'
    and jsonb_typeof(data->'content') = 'array'
    and jsonb_typeof(data->'study') = 'array'
    and jsonb_typeof(data->'docs') = 'array'
    and jsonb_typeof(data->'categories') = 'array'
    and jsonb_typeof(data->'finance') = 'array'
    and jsonb_typeof(data->'maps') = 'array'
    and jsonb_typeof(data->'templates') = 'array'
    and jsonb_typeof(data->'clients') = 'array'
    and jsonb_typeof(data->'folders') = 'array'
  ),
  updated_at timestamptz not null default statement_timestamp()
);

create table public.flowork_privacy_requests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('access', 'correction', 'portability', 'deletion', 'objection', 'information')),
  state text not null default 'received' check (state in ('received', 'processing', 'resolved')),
  created_at timestamptz not null default statement_timestamp()
);

create unique index flowork_one_open_privacy_request_per_kind
  on public.flowork_privacy_requests(owner_id, kind) where state <> 'resolved';

alter table public.flowork_legal_versions enable row level security;
alter table public.flowork_legal_acceptances enable row level security;
alter table public.flowork_workspaces enable row level security;
alter table public.flowork_privacy_requests enable row level security;

revoke all on public.flowork_legal_versions, public.flowork_legal_acceptances,
  public.flowork_workspaces, public.flowork_privacy_requests from public, anon, authenticated;
grant select on public.flowork_legal_versions, public.flowork_legal_acceptances,
  public.flowork_workspaces, public.flowork_privacy_requests to authenticated;

create policy "Authenticated version lookup" on public.flowork_legal_versions
  for select to authenticated using (true);
create policy "Own acceptances" on public.flowork_legal_acceptances
  for select to authenticated using (owner_id = (select auth.uid()));
create policy "Own workspace" on public.flowork_workspaces
  for select to authenticated using (owner_id = (select auth.uid()));
create policy "Own privacy requests" on public.flowork_privacy_requests
  for select to authenticated using (owner_id = (select auth.uid()));

create function public.flowork_accept_terms(accepted_terms text, read_privacy text)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  account_id uuid := auth.uid();
begin
  if account_id is null then raise exception using errcode = '42501', message = 'authentication_required'; end if;
  if not exists (
    select 1 from public.flowork_legal_versions
    where terms_version = accepted_terms and privacy_version = read_privacy
  ) then raise exception using errcode = '22023', message = 'legal_version_changed'; end if;

  insert into public.flowork_legal_acceptances (owner_id, terms_version, privacy_version)
  values (account_id, accepted_terms, read_privacy) on conflict do nothing;
end;
$$;

create function public.flowork_save_workspace(expected_revision bigint, next_data jsonb, write_id uuid)
returns table (revision bigint, updated_at timestamptz)
language plpgsql security definer
set search_path = ''
as $$
declare
  account_id uuid := auth.uid();
begin
  if account_id is null then raise exception using errcode = '42501', message = 'authentication_required'; end if;
  if expected_revision is null or expected_revision < 0 or write_id is null or next_data is null
    then raise exception using errcode = '22023', message = 'invalid_workspace_write'; end if;
  if not exists (
    select 1 from public.flowork_legal_acceptances a join public.flowork_legal_versions v
      on a.terms_version = v.terms_version and a.privacy_version = v.privacy_version
    where a.owner_id = account_id
  ) then raise exception using errcode = '42501', message = 'legal_acceptance_required'; end if;

  -- A retry after a network failure can acknowledge the same completed write.
  return query select w.revision, w.updated_at from public.flowork_workspaces w
    where w.owner_id = account_id and w.mutation_id = write_id and w.revision = expected_revision + 1 and w.data = next_data;
  if found then return; end if;

  if expected_revision = 0 then
    return query insert into public.flowork_workspaces as w (owner_id, revision, mutation_id, data)
      values (account_id, 1, write_id, next_data)
      on conflict (owner_id) do nothing returning w.revision, w.updated_at;
  else
    return query update public.flowork_workspaces as w
      set revision = w.revision + 1, mutation_id = write_id, data = next_data, updated_at = statement_timestamp()
      where w.owner_id = account_id and w.revision = expected_revision
      returning w.revision, w.updated_at;
  end if;
  if found then return; end if;

  -- Handles concurrent retries of the same mutation.
  return query select w.revision, w.updated_at from public.flowork_workspaces w
    where w.owner_id = account_id and w.mutation_id = write_id and w.revision = expected_revision + 1 and w.data = next_data;
  if not found then raise exception using errcode = 'P0001', message = 'workspace_revision_conflict'; end if;
end;
$$;

create function public.flowork_request_privacy(request_kind text)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  account_id uuid := auth.uid();
  request_id uuid;
begin
  if account_id is null then raise exception using errcode = '42501', message = 'authentication_required'; end if;
  if request_kind is null or request_kind not in ('access', 'correction', 'portability', 'deletion', 'objection', 'information')
    then raise exception using errcode = '22023', message = 'invalid_request_kind'; end if;
  insert into public.flowork_privacy_requests as r (owner_id, kind)
    values (account_id, request_kind)
    on conflict (owner_id, kind) where state <> 'resolved' do update set kind = excluded.kind
    returning r.id into request_id;
  return request_id;
end;
$$;

revoke all on function public.flowork_accept_terms(text, text),
  public.flowork_save_workspace(bigint, jsonb, uuid), public.flowork_request_privacy(text)
  from public, anon, authenticated;
grant execute on function public.flowork_accept_terms(text, text),
  public.flowork_save_workspace(bigint, jsonb, uuid), public.flowork_request_privacy(text)
  to authenticated;

insert into storage.buckets (id, name, public, file_size_limit)
values ('flowork-private', 'flowork-private', false, 26214400);

-- Files are addressed as <auth user UUID>/<generated asset UUID>.
-- Restrictive policies also prevent unrelated permissive policies bypassing this bucket's boundary.
create policy "Flowork bucket boundary" on storage.objects as restrictive
  for all to public
  using (
    bucket_id <> 'flowork-private' or (
      (storage.foldername(name))[1] = (select auth.uid()::text)
      and coalesce(array_length(storage.foldername(name), 1), 0) = 1
    )
  )
  with check (
    bucket_id <> 'flowork-private' or (
      (storage.foldername(name))[1] = (select auth.uid()::text)
      and coalesce(array_length(storage.foldername(name), 1), 0) = 1
    )
  );

create policy "Flowork own files read" on storage.objects
  for select to authenticated using (bucket_id = 'flowork-private' and owner_id = (select auth.uid()::text));

create policy "Flowork own files upload" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'flowork-private'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and coalesce(array_length(storage.foldername(name), 1), 0) = 1
    and storage.filename(name) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and exists (
      select 1 from public.flowork_legal_acceptances a join public.flowork_legal_versions v
        on a.terms_version = v.terms_version and a.privacy_version = v.privacy_version
      where a.owner_id = (select auth.uid())
    )
  );
