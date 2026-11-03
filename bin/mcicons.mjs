#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
try {
  const args = process.argv.slice(2);
  if (args.includes('--help')) { console.log('mcicons subset --icons diamond,diamond-sword --out ./my-icons [--format png|svg] [--embed]\nSVG + --embed creates one offline stylesheet without image requests. Existing output is never overwritten.'); process.exit(0); }
  if (args[0] !== 'subset') throw new Error('Usage: mcicons subset --icons diamond,diamond-sword --out ./my-icons');
  const value = (flag) => { const i = args.indexOf(flag); return i < 0 ? '' : args[i+1] || ''; };
  const flags = new Set(['--icons', '--out', '--format']);
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--embed') continue;
    if (!flags.has(args[i]) || !args[i+1] || args[i+1].startsWith('--')) throw new Error('Unknown or incomplete option: ' + args[i]);
    i++;
  }
  const format = value('--format') || 'png';
  if (!['png', 'svg'].includes(format)) throw new Error('Format must be png or svg');
  const embed = args.includes('--embed');
  if (embed && format !== 'svg') throw new Error('--embed requires --format svg');
  const names = [...new Set(value('--icons').split(',').filter(Boolean))];
  if (!names.length || !value('--out')) throw new Error('Both --icons and --out are required');
  const manifest = JSON.parse(await fs.readFile(path.join(root, 'dist/manifest.json')));
  const chosen = names.map((name) => { const item = manifest.items.find((entry) => entry.name === name); if (!item) throw new Error('Unknown icon: '+name); return item; });
  const output = path.resolve(value('--out'));
  if (output === root || output === path.parse(output).root) throw new Error('Use a dedicated subset output directory');
  // Create any missing parent directories, but never silently replace an
  // existing output directory or the user's files.
  await fs.mkdir(path.dirname(output), { recursive: true });
  try {
    await fs.mkdir(output);
  } catch (error) {
    throw new Error(
      error.code === 'EEXIST'
        ? `Output directory already exists: ${output}. Choose a new path; existing files are never overwritten.`
        : error.message,
    );
  }
  const rules = [];
  if (!embed) await fs.mkdir(path.join(output, 'icons'));
  for (const item of chosen) {
    const file = format === 'svg' ? item.svg : item.file;
    const source = path.join(root, 'dist', format === 'svg' ? 'svg' : 'icons', file);
    if (!embed) await fs.copyFile(source, path.join(output, 'icons', file));
    const url = embed ? 'data:image/svg+xml,' + encodeURIComponent(await fs.readFile(source, 'utf8')).replaceAll("'", '%27').replaceAll('(', '%28').replaceAll(')', '%29') : `icons/${file}`;
    rules.push(`.mc-${item.name}{--mc-icon:url('${url}')}`);
  }
  const core = await fs.readFile(path.join(root, 'dist/css/core.css'), 'utf8');
  await fs.writeFile(path.join(output, 'mcicons.css'), core+'\n'+rules.join('\n')+'\n');
  await fs.writeFile(path.join(output, 'manifest.json'), JSON.stringify({ version: manifest.version, format, embedded: embed, count: chosen.length, items: chosen },null,2)+'\n');
  for (const file of ['LICENSE', 'ASSET-NOTICE.md']) await fs.copyFile(path.join(root, file), path.join(output, file));
  console.log(`Created ${chosen.length}-icon subset at ${output}`);
} catch (error) { console.error(error.message); process.exitCode = 1; }
