export class WorkspaceConflictError extends Error {
  constructor() {
    super('Uma versão mais recente foi salva em outra guia ou dispositivo.');
    this.name = 'WorkspaceConflictError';
  }
}

/** Serialize writes and keep an unacknowledged mutation intact across retries. */
export function createWorkspaceSync({ revision = 0, write, onState, delay = 220, makeId = () => crypto.randomUUID() }) {
  let pending, queued, active, timer, closed = false, conflict = false;
  const notify = state => { if (!closed) onState(state); };
  const cancelTimer = () => { clearTimeout(timer); timer = undefined; };

  function enqueue(data) {
    if (closed) return false;
    queued = structuredClone(data);
    if (conflict) return true;
    notify('pending');
    cancelTimer();
    timer = setTimeout(() => { void flush(); }, delay);
    return true;
  }

  function flush() {
    cancelTimer();
    if (closed || conflict) return Promise.resolve(false);
    if (active) return active;
    const drain = async () => {
      while (!closed && (pending || queued)) {
        if (!pending) {
          pending = { data: queued, revision, id: makeId() };
          queued = undefined;
        }
        notify('saving');
        try {
          const result = await write(pending);
          if (closed) return false;
          if (!Number.isSafeInteger(result) || result !== revision + 1) throw new Error('invalid_workspace_revision');
          revision = result;
          pending = undefined;
        } catch (error) {
          if (closed) return false;
          conflict = error instanceof WorkspaceConflictError;
          notify(conflict ? 'conflict' : 'error');
          return false;
        }
      }
      notify('saved');
      return !closed;
    };
    active = Promise.resolve().then(drain).finally(() => { active = undefined; });
    return active;
  }

  return {
    enqueue,
    flush,
    get dirty() { return Boolean(pending || queued); },
    close() {
      closed = true;
      cancelTimer();
      pending = queued = undefined;
    }
  };
}
