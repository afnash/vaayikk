import { readdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
async function files(dir) { const entries = await readdir(dir, { withFileTypes: true }); const nested = await Promise.all(entries.map(e => e.isDirectory() ? files(path.join(dir, e.name)) : path.join(dir, e.name))); return nested.flat(); }
const all = await files('out');
const assets = all.filter(p => !p.endsWith('.map') && !p.endsWith('sw.js') && !p.endsWith('offline-assets.json') && !p.endsWith('.txt')).map(p => '/' + path.relative('out', p).replaceAll('\\', '/'));
assets.push('/');
const hashes = await Promise.all(all.filter(p => p.endsWith('.js') || p.endsWith('.css') || p.endsWith('.html')).map(p => readFile(p)));
const version = createHash('sha256').update(Buffer.concat(hashes)).digest('hex').slice(0, 12);
await writeFile('out/offline-assets.json', JSON.stringify({ version, assets }));
console.log(`Offline shell prepared: ${assets.length} local assets.`);
