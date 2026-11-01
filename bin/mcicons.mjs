#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
try {
  const args = process.argv.slice(2);
  if (args.includes('--help')) { console.log('mcicons subset --icons diamond,diamond-sword --out ./my-icons'); process.exit(0); }
  if (args[0] !== 'subset') throw new Error('Usage: mcicons subset --icons diamond,diamond-sword --out ./my-icons');
  const value = (flag) => { const i = args.indexOf(flag); return i < 0 ? '' : args[i+1] || ''; };
  const names = [...new Set(value('--icons').split(',').filter(Boolean))];
  if (!names.length || !value('--out')) throw new Error('Both --icons and --out are required');
  const manifest = JSON.parse(await fs.readFile(path.join(root, 'dist/manifest.json')));
  const chosen = names.map((name) => { const item = manifest.items.find((entry) => entry.name === name); if (!item) throw new Error('Unknown icon: '+name); return item; });
  const output = path.resolve(value('--out'));
  if (output === root || output === path.parse(output).root) throw new Error('Use a dedicated subset output directory');
  // Never silently replace an existing directory or user files.
  await fs.mkdir(output);
  await fs.mkdir(path.join(output, 'icons'));
  for (const item of chosen) await fs.copyFile(path.join(root, 'dist/icons', item.file), path.join(output, 'icons', item.file));
  const core = await fs.readFile(path.join(root, 'dist/css/core.css'), 'utf8');
  await fs.writeFile(path.join(output, 'mcicons.css'), core+'\n'+chosen.map((item) => `.mc-${item.name}{--mc-icon:url('icons/${item.file}')}`).join('\n')+'\n');
  await fs.writeFile(path.join(output, 'manifest.json'), JSON.stringify({ version: manifest.version, count: chosen.length, items: chosen },null,2)+'\n');
  for (const file of ['LICENSE', 'ASSET-NOTICE.md']) await fs.copyFile(path.join(root, file), path.join(output, file));
  console.log(`Created ${chosen.length}-icon subset at ${output}`);
} catch (error) { console.error(error.message); process.exitCode = 1; }
