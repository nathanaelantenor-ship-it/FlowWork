import { readFile, writeFile } from 'node:fs/promises';

const directory = new URL('../src/workspace/', import.meta.url);
const parts = ['data', 'ui', 'finance', 'organize', 'content', 'clients', 'exports', 'actions'];
const scripts = await Promise.all(parts.map(part => readFile(new URL(part + '.js', directory), 'utf8')));
await writeFile(new URL('generated.js', directory),
  '// Generated from the workspace modules. Edit the originals.\n' +
  'export function mountWorkspace(services, savedWorkspace) {\n' +
  scripts.join('\n\n') +
  '\nreturn workspaceHandle;\n}\n'
);
