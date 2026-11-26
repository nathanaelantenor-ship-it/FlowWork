import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkspaceSync, WorkspaceConflictError } from '../src/workspace/sync.js';

test('flush waits for acknowledged data; logout would keep a failed mutation pending',async () => {
  const observed = [], writes = [];
  let fail = true;
  const sync = createWorkspaceSync({ revision:3, delay:60000, onState:s=>observed.push(s), write:async op=>{
    writes.push(op);
    if(fail){fail=false;throw Error('Offline')}
    return op.revision+1;
  }});
  sync.enqueue({docs:['primeiro']});
  assert.equal(await sync.flush(),false);
  assert.equal(sync.dirty,true);
  sync.enqueue({docs:['segundo']});
  assert.equal(await sync.flush(),true);
  assert.equal(sync.dirty,false);
  assert.equal(writes[0].id,writes[1].id);
  assert.equal(writes[0].revision,3);
  assert.equal(writes[2].revision,4);
  assert.deepEqual(writes[2].data,{docs:['segundo']});
  assert.equal(observed.at(-1),'saved');
  sync.close();
});

test('conflict never overwrites remote data',async () => {
  const observed=[];
  let writes=0;
  const sync=createWorkspaceSync({ delay:60000, onState:s=>observed.push(s), write:async ()=>{
    writes++;throw new WorkspaceConflictError();
  }});
  sync.enqueue({version:'guia A'});
  assert.equal(await sync.flush(),false);
  assert.equal(observed.at(-1),'conflict');
  sync.enqueue({version:'guia A, edição local'});
  assert.equal(await sync.flush(),false);
  assert.equal(writes,1);
  sync.close();
});
