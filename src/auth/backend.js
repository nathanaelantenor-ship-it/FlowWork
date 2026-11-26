import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';
import { WorkspaceConflictError } from '../workspace/sync.js';

const bucket = 'flowork-private';
const workspaceFields = 'schema_version,revision,data';
const assetId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const authOptions = { flowType: 'pkce', detectSessionInUrl: false };

export function createBackend() {
  if (!config.ready) return null;
  const storageKey = 'flowork-auth';
  const store = key => key === storageKey+'-code-verifier' ? window.sessionStorage : window.localStorage;
  const storage = {
    getItem:key => store(key).getItem(key),
    setItem:(key,value) => store(key).setItem(key,value),
    removeItem:key => store(key).removeItem(key)
  };
  return createClient(config.url, config.publishableKey, { auth: { ...authOptions, storageKey, storage } });
}

export function createRecoveryBackend() {
  return createClient(config.url, config.publishableKey, {
    auth: { ...authOptions, storageKey: 'flowork-recovery', persistSession: false, autoRefreshToken: false }
  });
}

export async function accountSnapshot(client, owner) {
  const [version, accept, workspace] = await Promise.all([
    client.from('flowork_legal_versions').select('terms_version,privacy_version').single(),
    client.from('flowork_legal_acceptances').select('terms_version,privacy_version,accepted_at').eq('owner_id', owner),
    client.from('flowork_workspaces').select(workspaceFields).eq('owner_id', owner).maybeSingle()
  ]);
  const error = version.error || accept.error || workspace.error;
  if (error) throw error;
  return { version: version.data, acceptances: accept.data, workspace: workspace.data };
}

export function accountStorage(client, owner, signal) {
  const storage = client.storage.from(bucket);
  return {
    async write({ revision, data, id }) {
      const result = await client.rpc('flowork_save_workspace', {
        expected_revision: revision, next_data: data, write_id: id
      }).abortSignal(signal).single();
      if (result.error?.message === 'workspace_revision_conflict') throw new WorkspaceConflictError();
      if (result.error) throw result.error;
      return Number(result.data.revision);
    },
    async file(action, id, blob) {
      if (signal.aborted || !assetId.test(id)) throw new Error('invalid_file_access');
      const path = owner + '/' + id;
      if (action === 'get') {
        const result = await storage.download(path);
        if (result.error) throw result.error;
        if (signal.aborted) throw new Error('session_closed');
        return result.data;
      }
      if (action !== 'put' || !blob || blob.size > 25 * 1024 * 1024) throw new Error('invalid_file_upload');
      // Files are downloaded as blobs. Only recognized image types are rendered as images.
      const images = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif']);
      const result = await storage.upload(path, blob, {
        contentType: images.has(blob.type) ? blob.type : 'application/octet-stream',
        cacheControl: '0', upsert: false
      });
      if (result.error) throw result.error;
      if (signal.aborted) throw new Error('session_closed');
      return id;
    }
  };
}

export async function privacyRequests(client) {
  const result = await client.from('flowork_privacy_requests')
    .select('id,kind,state,created_at').order('created_at', { ascending: false });
  if (result.error) throw result.error;
  return result.data;
}
